import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@cotulenh/common';

/** Broadcast event name used for all game messages on the channel. */
export const GAME_MESSAGE_EVENT = 'game-message';

type SenderMetadata = { senderId: string };

/**
 * Discriminated union of all game messages exchanged over a Supabase Realtime
 * broadcast channel during an online game.
 *
 * The `event` field acts as the discriminant.
 */
export type GameMessage =
  // Gameplay
  | (SenderMetadata & { event: 'move'; san: string; clock: number; seq: number; sentAt: number })
  | (SenderMetadata & { event: 'ack'; seq: number })
  | (SenderMetadata & { event: 'sync-request'; expectedSeq: number })
  // Game end
  | (SenderMetadata & { event: 'resign' })
  | (SenderMetadata & { event: 'claim-victory' })
  | (SenderMetadata & { event: 'abort' })
  // Draw
  | (SenderMetadata & { event: 'draw-offer' })
  | (SenderMetadata & { event: 'draw-accept' })
  | (SenderMetadata & { event: 'draw-decline' })
  // Dispute
  | (SenderMetadata & { event: 'dispute'; san: string; pgn: string })
  // Reconnection
  | (SenderMetadata & {
      event: 'sync';
      fen: string;
      pgn: string;
      clock: { red: number; blue: number };
      seq: number;
    })
  // Post-game
  | (SenderMetadata & { event: 'rematch' })
  | (SenderMetadata & { event: 'rematch-accept' })
  | (SenderMetadata & { event: 'rematch-decline' });

/** Extract the event literal type from GameMessage. */
export type GameMessageEvent = GameMessage['event'];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isGameMessage(value: unknown): value is GameMessage {
  if (
    !isObjectRecord(value) ||
    typeof value.event !== 'string' ||
    typeof value.senderId !== 'string' ||
    value.senderId.length === 0
  ) {
    return false;
  }

  switch (value.event) {
    case 'move':
      return (
        typeof value.san === 'string' &&
        isFiniteNonNegativeNumber(value.clock) &&
        isPositiveInteger(value.seq) &&
        isFiniteNonNegativeNumber(value.sentAt)
      );
    case 'ack':
      return isPositiveInteger(value.seq);
    case 'sync-request':
      return isPositiveInteger(value.expectedSeq);
    case 'dispute':
      return typeof value.san === 'string' && typeof value.pgn === 'string';
    case 'sync':
      return (
        typeof value.fen === 'string' &&
        typeof value.pgn === 'string' &&
        isPositiveInteger(value.seq) &&
        isObjectRecord(value.clock) &&
        isFiniteNonNegativeNumber(value.clock.red) &&
        isFiniteNonNegativeNumber(value.clock.blue)
      );
    case 'resign':
    case 'claim-victory':
    case 'abort':
    case 'draw-offer':
    case 'draw-accept':
    case 'draw-decline':
    case 'rematch':
    case 'rematch-accept':
    case 'rematch-decline':
      return true;
    default:
      return false;
  }
}

/**
 * Send a typed game message over a Supabase Realtime broadcast channel.
 *
 * @param channel - A subscribed Supabase RealtimeChannel
 * @param msg - The GameMessage to send
 */
export async function sendGameMessage(
  channel: RealtimeChannel,
  msg: GameMessage
): Promise<void> {
  try {
    const result = await channel.send({
      type: 'broadcast',
      event: GAME_MESSAGE_EVENT,
      payload: msg
    });

    if (result !== 'ok') {
      logger.error('Failed to send game message', { event: msg.event, result });
    }
  } catch (error) {
    logger.error('Failed to send game message', { event: msg.event, error });
  }
}

/**
 * Register a listener for typed game messages on a Supabase Realtime broadcast channel.
 *
 * Must be called **before** `channel.subscribe()` — Supabase requires listeners
 * to be registered before subscription.
 *
 * @param channel - A Supabase RealtimeChannel (not yet subscribed)
 * @param handler - Callback invoked with each received GameMessage
 * @returns The channel (for chaining)
 */
export function onGameMessage(
  channel: RealtimeChannel,
  handler: (msg: GameMessage) => void
): RealtimeChannel {
  return channel.on('broadcast', { event: GAME_MESSAGE_EVENT }, (payload) => {
    const received = payload.payload;

    if (!isGameMessage(received)) {
      logger.error('Received invalid game message payload', { payload: received });
      return;
    }

    handler(received);
  });
}
