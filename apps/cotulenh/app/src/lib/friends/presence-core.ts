import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@cotulenh/common';

/** Current lobby channel reference */
let lobbyChannel: ReturnType<SupabaseClient['channel']> | null = null;

/** Online users set — plain variable, wrapped with $state in presence.svelte.ts */
let onlineUsers = new Set<string>();

/** Whether we're currently connected to the lobby */
let connected = false;

/** Reconnect state for exponential backoff */
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;

/** State change callback — called whenever onlineUsers or connected changes */
type StateChangeCallback = (users: Set<string>, isConnected: boolean) => void;
let stateChangeCallback: StateChangeCallback | null = null;

/** Presence change callbacks for external consumers */
type PresenceCallback = (users: Set<string>) => void;
const presenceCallbacks = new Set<PresenceCallback>();

function notifyAll() {
  stateChangeCallback?.(new Set(onlineUsers), connected);
  for (const cb of presenceCallbacks) {
    cb(new Set(onlineUsers));
  }
}

function setOnlineUsers(users: Set<string>) {
  onlineUsers = users;
  notifyAll();
}

function setConnected(value: boolean) {
  connected = value;
  notifyAll();
}

/**
 * Register the reactive state callback — called from presence.svelte.ts
 * to sync plain state into $state runes.
 */
export function _setStateChangeCallback(cb: StateChangeCallback | null): void {
  stateChangeCallback = cb;
}

/**
 * Join the lobby Presence channel — subscribe and track own presence.
 */
export function joinLobby(supabase: SupabaseClient, userId: string): void {
  if (lobbyChannel) {
    return;
  }

  const channel = supabase.channel('lobby', {
    config: { presence: { key: userId } }
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineUsers(new Set(Object.keys(state)));
    })
    .on('presence', { event: 'join' }, ({ key }) => {
      const next = new Set(onlineUsers);
      next.add(key);
      setOnlineUsers(next);
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      const next = new Set(onlineUsers);
      next.delete(key);
      setOnlineUsers(next);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
          setConnected(true);
          reconnectAttempts = 0;
        } catch (error) {
          logger.error(error as Error, 'Failed to track lobby presence');
          setConnected(false);
          scheduleReconnect(supabase, userId);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnected(false);
        scheduleReconnect(supabase, userId);
      } else if (status === 'CLOSED') {
        setConnected(false);
      }
    });

  lobbyChannel = channel;
}

/**
 * Leave the lobby Presence channel — unsubscribe and clean up.
 */
export function leaveLobby(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;

  if (lobbyChannel) {
    lobbyChannel.unsubscribe();
    lobbyChannel = null;
  }

  connected = false;
  onlineUsers = new Set();
  presenceCallbacks.clear();
  notifyAll();
}

/**
 * Get the current set of online user IDs.
 */
export function getOnlineUsers(): Set<string> {
  return new Set(onlineUsers);
}

/**
 * Check if a specific user is currently online.
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * Register a callback for presence changes.
 * Returns an unsubscribe function.
 */
export function onPresenceChange(callback: PresenceCallback): () => void {
  presenceCallbacks.add(callback);
  return () => {
    presenceCallbacks.delete(callback);
  };
}

/**
 * Get whether the lobby connection is active.
 */
export function getLobbyConnected(): boolean {
  return connected;
}

/**
 * Schedule a reconnect with exponential backoff (NFR18).
 */
function scheduleReconnect(supabase: SupabaseClient, userId: string): void {
  if (reconnectTimer) return;

  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
    MAX_RECONNECT_DELAY
  );
  reconnectAttempts++;

  logger.info(`Lobby reconnect scheduled in ${delay}ms (attempt ${reconnectAttempts})`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (lobbyChannel) {
      lobbyChannel.unsubscribe();
      lobbyChannel = null;
    }
    joinLobby(supabase, userId);
  }, delay);
}
