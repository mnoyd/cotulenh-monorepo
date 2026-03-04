/**
 * Reactive invitation realtime wrapper — uses Svelte 5 $state to make
 * invitation events reactive in components. Core logic lives in realtime-core.ts.
 */
import {
  subscribeToInvitations as coreSubscribe,
  unsubscribeFromInvitations as coreUnsubscribe,
  onInvitationEvent,
  _setRealtimeStateCallback
} from './realtime-core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InvitationRealtimeEvent } from './realtime-core';

/** Reactive event counter — increments on each event to trigger reactivity */
let eventCounter = $state(0);

/** Latest event for consumers */
let latestEvent = $state<InvitationRealtimeEvent | null>(null);

// Sync core events into $state
_setRealtimeStateCallback(() => {
  eventCounter++;
});

/**
 * Subscribe to invitation realtime events.
 */
export function subscribeToInvitations(supabase: SupabaseClient, userId: string): void {
  coreSubscribe(supabase, userId);
}

/**
 * Unsubscribe from invitation realtime events.
 */
export function unsubscribeFromInvitations(): void {
  coreUnsubscribe();
  latestEvent = null;
}

/**
 * Get the event counter (reactive — triggers re-render on new events).
 */
export function getInvitationEventCounter(): number {
  return eventCounter;
}

/**
 * Get the latest invitation event (reactive).
 */
export function getLatestInvitationEvent(): InvitationRealtimeEvent | null {
  return latestEvent;
}

/**
 * Register a callback for invitation events. Keeps latestEvent in sync.
 * Returns an unsubscribe function.
 */
export function onInvitationRealtimeEvent(
  callback: (event: InvitationRealtimeEvent) => void
): () => void {
  return onInvitationEvent((event) => {
    latestEvent = event;
    callback(event);
  });
}

// Re-export types
export type {
  InvitationRealtimeEvent,
  InvitationReceivedEvent,
  InvitationStatusChangedEvent,
  InvitationDeletedEvent
} from './realtime-core';
