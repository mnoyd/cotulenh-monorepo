/**
 * Reactive lobby realtime wrapper — uses Svelte 5 $state to make
 * lobby challenge events reactive in components. Core logic lives in lobby-realtime-core.ts.
 */
import {
  subscribeToLobby as coreSubscribe,
  unsubscribeFromLobby as coreUnsubscribe,
  onLobbyChallengeEvent,
  _setLobbyStateCallback
} from './lobby-realtime-core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LobbyChallengeEvent } from './lobby-realtime-core';

/** Reactive event counter — increments on each event to trigger reactivity */
let eventCounter = $state(0);

/** Latest event for consumers */
let latestEvent = $state<LobbyChallengeEvent | null>(null);

// Sync core events into $state
_setLobbyStateCallback(() => {
  eventCounter++;
});

/**
 * Subscribe to lobby realtime events.
 */
export function subscribeToLobby(supabase: SupabaseClient): void {
  coreSubscribe(supabase);
}

/**
 * Unsubscribe from lobby realtime events.
 */
export function unsubscribeFromLobby(): void {
  coreUnsubscribe();
  latestEvent = null;
}

/**
 * Get the event counter (reactive — triggers re-render on new events).
 */
export function getLobbyEventCounter(): number {
  return eventCounter;
}

/**
 * Get the latest lobby event (reactive).
 */
export function getLatestLobbyEvent(): LobbyChallengeEvent | null {
  return latestEvent;
}

/**
 * Register a callback for lobby challenge events. Keeps latestEvent in sync.
 * Returns an unsubscribe function.
 */
export function onLobbyRealtimeEvent(callback: (event: LobbyChallengeEvent) => void): () => void {
  return onLobbyChallengeEvent((event) => {
    latestEvent = event;
    callback(event);
  });
}

// Re-export types
export type {
  LobbyChallengeEvent,
  LobbyChallengeInsertEvent,
  LobbyChallengeUpdateEvent,
  LobbyChallengeDeleteEvent
} from './lobby-realtime-core';
