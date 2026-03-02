import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@cotulenh/common';
import type { GameConfig } from './types';

/** Realtime invitation event types */
export interface InvitationReceivedEvent {
  type: 'received';
  id: string;
  fromUser: string;
  gameConfig: GameConfig;
  inviteCode: string;
  createdAt: string;
}

export interface InvitationStatusChangedEvent {
  type: 'statusChanged';
  id: string;
  newStatus: string;
  /** Only present when invitation was accepted */
  gameId?: string;
}

export interface InvitationDeletedEvent {
  type: 'deleted';
  id: string;
}

export type InvitationRealtimeEvent =
  | InvitationReceivedEvent
  | InvitationStatusChangedEvent
  | InvitationDeletedEvent;

/** Callback for invitation events */
type InvitationEventCallback = (event: InvitationRealtimeEvent) => void;

/** Current channel reference */
let invitationChannel: ReturnType<SupabaseClient['channel']> | null = null;

/** Event callbacks */
const eventCallbacks = new Set<InvitationEventCallback>();

/** State change callback for reactive wrapper */
type StateChangeCallback = () => void;
let stateChangeCallback: StateChangeCallback | null = null;

function notifyCallbacks(event: InvitationRealtimeEvent) {
  for (const cb of eventCallbacks) {
    cb(event);
  }
  stateChangeCallback?.();
}

/**
 * Register the reactive state callback — called from realtime.svelte.ts
 */
export function _setRealtimeStateCallback(cb: StateChangeCallback | null): void {
  stateChangeCallback = cb;
}

/**
 * Subscribe to invitation realtime events for a user.
 * Listens for:
 * - INSERT on game_invitations where to_user = me (new invitation received)
 * - UPDATE on game_invitations where from_user = me (sent invitation status changed)
 * - UPDATE on game_invitations where to_user = me (received invitation cancelled by sender changing status)
 * - DELETE on game_invitations where to_user = me (sender deleted/cancelled invitation)
 */
export function subscribeToInvitations(supabase: SupabaseClient, userId: string): void {
  if (invitationChannel) {
    return;
  }

  const channel = supabase
    .channel(`user:${userId}:invitations`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_invitations',
        filter: `to_user=eq.${userId}`
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        notifyCallbacks({
          type: 'received',
          id: row.id as string,
          fromUser: row.from_user as string,
          gameConfig: row.game_config as GameConfig,
          inviteCode: row.invite_code as string,
          createdAt: row.created_at as string
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_invitations',
        filter: `from_user=eq.${userId}`
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        notifyCallbacks({
          type: 'statusChanged',
          id: row.id as string,
          newStatus: row.status as string
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'game_invitations',
        filter: `to_user=eq.${userId}`
      },
      (payload) => {
        const row = payload.old as Record<string, unknown>;
        notifyCallbacks({
          type: 'deleted',
          id: row.id as string
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Invitation realtime channel subscribed');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logger.error(new Error(`Invitation channel: ${status}`), 'Invitation realtime error');
      }
    });

  invitationChannel = channel;
}

/**
 * Unsubscribe from invitation realtime events.
 */
export function unsubscribeFromInvitations(): void {
  if (invitationChannel) {
    invitationChannel.unsubscribe();
    invitationChannel = null;
  }
  eventCallbacks.clear();
}

/**
 * Register a callback for invitation events.
 * Returns an unsubscribe function.
 */
export function onInvitationEvent(callback: InvitationEventCallback): () => void {
  eventCallbacks.add(callback);
  return () => {
    eventCallbacks.delete(callback);
  };
}
