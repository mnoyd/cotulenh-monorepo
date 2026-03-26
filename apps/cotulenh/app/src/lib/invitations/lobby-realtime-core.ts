import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@cotulenh/common';
import type { GameConfig } from './types';

/** Lobby challenge event types */
export interface LobbyChallengeInsertEvent {
  type: 'insert';
  id: string;
  fromUser: string;
  gameConfig: GameConfig;
  createdAt: string;
}

export interface LobbyChallengeUpdateEvent {
  type: 'update';
  id: string;
  newStatus: string;
}

export interface LobbyChallengeDeleteEvent {
  type: 'delete';
  id: string;
}

export type LobbyChallengeEvent =
  | LobbyChallengeInsertEvent
  | LobbyChallengeUpdateEvent
  | LobbyChallengeDeleteEvent;

/** Callback for lobby challenge events */
type LobbyEventCallback = (event: LobbyChallengeEvent) => void;

/** Current channel reference */
let lobbyChannel: ReturnType<SupabaseClient['channel']> | null = null;

/** Event callbacks */
const eventCallbacks = new Set<LobbyEventCallback>();

/** State change callback for reactive wrapper */
type StateChangeCallback = () => void;
let stateChangeCallback: StateChangeCallback | null = null;

function isOpenChallenge(row: Record<string, unknown> | undefined): boolean {
  if (!row) return false;
  return row.to_user === null && row.invite_code === null;
}

function notifyCallbacks(event: LobbyChallengeEvent) {
  for (const cb of eventCallbacks) {
    cb(event);
  }
  stateChangeCallback?.();
}

/**
 * Register the reactive state callback — called from lobby-realtime.svelte.ts
 */
export function _setLobbyStateCallback(cb: StateChangeCallback | null): void {
  stateChangeCallback = cb;
}

/**
 * Subscribe to lobby challenge realtime events.
 * Listens on a global channel for open challenges (to_user IS NULL).
 * Events: INSERT (new challenge), UPDATE (accepted/cancelled/expired), DELETE (removed)
 */
export function subscribeToLobby(supabase: SupabaseClient): void {
  if (lobbyChannel) {
    return;
  }

  const channel = supabase
    .channel('lobby:challenges')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_invitations',
        filter: 'to_user=is.null'
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        // Only process open challenges (no invite_code)
        if (row.invite_code !== null) return;
        notifyCallbacks({
          type: 'insert',
          id: row.id as string,
          fromUser: row.from_user as string,
          gameConfig: row.game_config as GameConfig,
          createdAt: row.created_at as string
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_invitations'
      },
      (payload) => {
        const newRow = payload.new as Record<string, unknown> | undefined;
        const oldRow = payload.old as Record<string, unknown> | undefined;
        if (!isOpenChallenge(oldRow) && !isOpenChallenge(newRow)) return;
        notifyCallbacks({
          type: 'update',
          id: (newRow?.id ?? oldRow?.id) as string,
          newStatus: (newRow?.status ?? oldRow?.status) as string
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'game_invitations'
      },
      (payload) => {
        const oldRow = payload.old as Record<string, unknown> | undefined;
        if (!oldRow || !isOpenChallenge(oldRow)) return;
        notifyCallbacks({
          type: 'delete',
          id: oldRow.id as string
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Lobby realtime channel subscribed');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logger.error(new Error(`Lobby channel: ${status}`), 'Lobby realtime error');
      }
    });

  lobbyChannel = channel;
}

/**
 * Unsubscribe from lobby realtime events.
 */
export function unsubscribeFromLobby(): void {
  if (lobbyChannel) {
    lobbyChannel.unsubscribe();
    lobbyChannel = null;
  }
  eventCallbacks.clear();
}

/**
 * Register a callback for lobby challenge events.
 * Returns an unsubscribe function.
 */
export function onLobbyChallengeEvent(callback: LobbyEventCallback): () => void {
  eventCallbacks.add(callback);
  return () => {
    eventCallbacks.delete(callback);
  };
}
