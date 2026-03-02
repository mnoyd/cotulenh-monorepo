/**
 * Reactive presence wrapper — uses Svelte 5 $state to make
 * online users reactive in components. Core logic lives in presence-core.ts.
 */
import {
  joinLobby as coreJoinLobby,
  leaveLobby as coreLeaveLobby,
  onPresenceChange,
  _setStateChangeCallback
} from './presence-core';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Reactive state for Svelte components */
let onlineUsers = $state(new Set<string>());
let isConnected = $state(false);

// Sync core state changes into $state
_setStateChangeCallback((users, connected) => {
  onlineUsers = users;
  isConnected = connected;
});

/**
 * Join the lobby Presence channel.
 */
export function joinLobby(supabase: SupabaseClient, userId: string): void {
  coreJoinLobby(supabase, userId);
}

/**
 * Leave the lobby Presence channel.
 */
export function leaveLobby(): void {
  coreLeaveLobby();
}

/**
 * Get the current set of online user IDs (reactive via $state).
 */
export function getOnlineUsers(): Set<string> {
  return new Set(onlineUsers);
}

/**
 * Check if a specific user is currently online (reactive via $state).
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * Get whether the lobby connection is active (reactive via $state).
 */
export function getLobbyConnected(): boolean {
  return isConnected;
}

// Re-export callback registration from core
export { onPresenceChange } from './presence-core';
