import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

import { useGameStore } from '@/stores/game-store';

const {
  handlers,
  mockChannel,
  removeChannel
}: {
  handlers: Record<string, (event: { payload: unknown }) => void>;
  mockChannel: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };
  removeChannel: ReturnType<typeof vi.fn>;
} = vi.hoisted(() => {
  const handlers: Record<string, (event: { payload: unknown }) => void> = {};
  const mockChannel = {
    on: vi.fn((_: string, config: { event: string }, cb: (event: { payload: unknown }) => void) => {
      handlers[config.event] = cb;
      return mockChannel;
    }),
    subscribe: vi.fn(() => mockChannel)
  };
  const removeChannel = vi.fn();
  return { handlers, mockChannel, removeChannel };
});

vi.mock('@/lib/supabase/browser', () => ({
  createClient: vi.fn().mockReturnValue({
    channel: vi.fn(() => mockChannel),
    removeChannel
  })
}));

vi.mock('@/lib/actions/game', () => ({
  getGame: vi.fn().mockResolvedValue({ success: true, data: { game_state: {} } })
}));

import { useGameChannel } from '../use-game-channel';

function Harness({ gameId }: { gameId: string }) {
  useGameChannel(gameId);
  return null;
}

describe('useGameChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(handlers)) delete handlers[key];
    useGameStore.getState().reset();
  });

  it('processes move and clock_sync with the same sequence number', async () => {
    const applyOpponentMove = vi.fn();
    const syncClocks = vi.fn();
    const setLastSeenSeq = vi.fn();

    useGameStore.setState({
      applyOpponentMove,
      syncClocks,
      setLastSeenSeq
    });

    render(<Harness gameId="game-1" />);

    act(() => {
      handlers.move({
        payload: {
          type: 'move',
          payload: { san: 'e2e4', fen: 'fen-after' },
          seq: 10
        }
      });
      handlers.clock_sync({
        payload: {
          type: 'clock_sync',
          payload: { red: 598000, blue: 600000 },
          seq: 10
        }
      });
    });

    await Promise.resolve();

    expect(applyOpponentMove).toHaveBeenCalledWith('e2e4', 'fen-after');
    expect(syncClocks).toHaveBeenCalledWith(598000, 600000);
    expect(setLastSeenSeq).toHaveBeenCalledWith(10);
  });

  it('processes game_end event and updates end state', async () => {
    const handleGameEnd = vi.fn();

    useGameStore.setState({
      handleGameEnd
    });

    render(<Harness gameId="game-2" />);

    act(() => {
      handlers.game_end({
        payload: {
          type: 'game_end',
          payload: {
            status: 'timeout',
            winner: 'red',
            result_reason: null
          },
          seq: 11
        }
      });
    });

    await Promise.resolve();

    expect(handleGameEnd).toHaveBeenCalledWith('timeout', 'red', null);
  });
});
