import { describe, it, expect, vi, beforeEach, expectTypeOf } from 'vitest';
import {
  sendGameMessage,
  onGameMessage,
  GAME_MESSAGE_EVENT,
  type GameMessage
} from './messages';

vi.mock('@cotulenh/common', () => ({
  logger: { error: vi.fn(), info: vi.fn() }
}));

function createMockChannel() {
  const broadcastHandlers: Array<(payload: { payload: unknown }) => void> = [];

  const channel = {
    send: vi.fn().mockResolvedValue('ok'),
    on: vi
      .fn()
      .mockImplementation(
        (
          _type: string,
          _opts: { event: string },
          handler: (payload: { payload: unknown }) => void
        ) => {
          broadcastHandlers.push(handler);
          return channel;
        }
      ),
    _simulateBroadcast: (msg: unknown) => {
      broadcastHandlers.forEach((h) => h({ payload: msg }));
    }
  };

  return channel;
}

describe('GameMessage helpers', () => {
  let channel: ReturnType<typeof createMockChannel>;
  const senderId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
    channel = createMockChannel();
  });

  describe('sendGameMessage', () => {
    it('sends a move message via broadcast', async () => {
      const msg: GameMessage = {
        event: 'move',
        senderId,
        san: 'e4',
        clock: 290000,
        seq: 1,
        sentAt: Date.now()
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendGameMessage(channel as any, msg);

      expect(channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: GAME_MESSAGE_EVENT,
        payload: msg
      });
    });

    it('sends a resign message', async () => {
      const msg: GameMessage = { event: 'resign', senderId };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendGameMessage(channel as any, msg);

      expect(channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: GAME_MESSAGE_EVENT,
        payload: msg
      });
    });

    it('sends an ack message with seq', async () => {
      const msg: GameMessage = { event: 'ack', senderId, seq: 3 };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendGameMessage(channel as any, msg);

      expect(channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: GAME_MESSAGE_EVENT,
        payload: msg
      });
    });

    it('sends a sync-request message with expectedSeq', async () => {
      const msg: GameMessage = { event: 'sync-request', senderId, expectedSeq: 4 };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendGameMessage(channel as any, msg);

      expect(channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: GAME_MESSAGE_EVENT,
        payload: msg
      });
    });

    it('sends a sync message with full state', async () => {
      const msg: GameMessage = {
        event: 'sync',
        senderId,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
        pgn: '1. e4',
        clock: { red: 290000, blue: 300000 },
        seq: 1
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendGameMessage(channel as any, msg);

      expect(channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: GAME_MESSAGE_EVENT,
        payload: msg
      });
    });

    it('logs error when send fails', async () => {
      channel.send.mockResolvedValue('error');
      const { logger } = await import('@cotulenh/common');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendGameMessage(channel as any, { event: 'resign', senderId });

      expect(logger.error).toHaveBeenCalledWith('Failed to send game message', {
        event: 'resign',
        result: 'error'
      });
    });

    it('logs error when channel.send throws', async () => {
      const sendError = new Error('network unavailable');
      channel.send.mockRejectedValue(sendError);
      const { logger } = await import('@cotulenh/common');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendGameMessage(channel as any, { event: 'resign', senderId });

      expect(logger.error).toHaveBeenCalledWith('Failed to send game message', {
        event: 'resign',
        error: sendError
      });
    });
  });

  describe('onGameMessage', () => {
    it('registers a broadcast listener for game-message event', () => {
      const handler = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onGameMessage(channel as any, handler);

      expect(channel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: GAME_MESSAGE_EVENT },
        expect.any(Function)
      );
    });

    it('returns the channel for chaining', () => {
      const handler = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = onGameMessage(channel as any, handler);

      expect(result).toBe(channel);
    });

    it('delivers received messages to the handler', () => {
      const handler = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onGameMessage(channel as any, handler);

      const msg: GameMessage = {
        event: 'move',
        senderId,
        san: 'Nf3',
        clock: 285000,
        seq: 2,
        sentAt: Date.now()
      };
      channel._simulateBroadcast(msg);

      expect(handler).toHaveBeenCalledWith(msg);
    });

    it('delivers draw-offer messages', () => {
      const handler = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onGameMessage(channel as any, handler);

      const msg: GameMessage = { event: 'draw-offer', senderId };
      channel._simulateBroadcast(msg);

      expect(handler).toHaveBeenCalledWith(msg);
    });

    it('delivers dispute messages with pgn', () => {
      const handler = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onGameMessage(channel as any, handler);

      const msg: GameMessage = {
        event: 'dispute',
        senderId,
        san: 'Qxf7#',
        pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#'
      };
      channel._simulateBroadcast(msg);

      expect(handler).toHaveBeenCalledWith(msg);
    });

    it('delivers rematch-accept with newGameId', () => {
      const handler = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onGameMessage(channel as any, handler);

      const msg: GameMessage = {
        event: 'rematch-accept',
        senderId,
        newGameId: 'new-game-123'
      };
      channel._simulateBroadcast(msg);

      expect(handler).toHaveBeenCalledWith(msg);
    });

    it('delivers sync-request messages', () => {
      const handler = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onGameMessage(channel as any, handler);

      const msg: GameMessage = {
        event: 'sync-request',
        senderId,
        expectedSeq: 6
      };
      channel._simulateBroadcast(msg);

      expect(handler).toHaveBeenCalledWith(msg);
    });

    it('ignores invalid payloads and logs error', async () => {
      const handler = vi.fn();
      const { logger } = await import('@cotulenh/common');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onGameMessage(channel as any, handler);
      channel._simulateBroadcast({ event: 'move', senderId, san: 'e4' });

      expect(handler).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Received invalid game message payload', {
        payload: { event: 'move', senderId, san: 'e4' }
      });
    });
  });

  describe('GAME_MESSAGE_EVENT constant', () => {
    it('equals "game-message"', () => {
      expect(GAME_MESSAGE_EVENT).toBe('game-message');
    });
  });

  describe('GameMessage type safety', () => {
    it('enforces move payload field types', () => {
      type MoveMessage = Extract<GameMessage, { event: 'move' }>;
      expectTypeOf<MoveMessage>().toMatchTypeOf<{
        event: 'move';
        senderId: string;
        san: string;
        clock: number;
        seq: number;
        sentAt: number;
      }>();
    });

    it('enforces sync payload clock structure', () => {
      type SyncMessage = Extract<GameMessage, { event: 'sync' }>;
      expectTypeOf<SyncMessage>().toMatchTypeOf<{
        event: 'sync';
        senderId: string;
        fen: string;
        pgn: string;
        clock: { red: number; blue: number };
        seq: number;
      }>();
    });

    it('rejects invalid message shapes at compile-time', () => {
      // @ts-expect-error move requires sentAt
      const invalidMove: GameMessage = {
        event: 'move',
        senderId,
        san: 'e4',
        clock: 1000,
        seq: 1
      };
      // @ts-expect-error ack requires seq
      const invalidAck: GameMessage = { event: 'ack', senderId };
      // @ts-expect-error sync-request requires expectedSeq
      const invalidSyncRequest: GameMessage = { event: 'sync-request', senderId };
      // @ts-expect-error rematch-accept requires newGameId
      const invalidRematchAccept: GameMessage = { event: 'rematch-accept', senderId };
      void invalidMove;
      void invalidAck;
      void invalidSyncRequest;
      void invalidRematchAccept;
    });
  });
});
