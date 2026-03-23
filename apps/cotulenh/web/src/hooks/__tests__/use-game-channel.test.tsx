import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

import { useGameStore } from '@/stores/game-store';

type ChannelHandler = (event: { payload: unknown }) => void;
type MockChannel = {
  on: (type: string, config: { event: string }, cb: ChannelHandler) => MockChannel;
  subscribe: () => MockChannel;
};

const {
  handlers,
  mockChannel,
  removeChannel
}: {
  handlers: Record<string, ChannelHandler>;
  mockChannel: MockChannel;
  removeChannel: ReturnType<typeof vi.fn>;
} = vi.hoisted(() => {
  const handlers: Record<string, ChannelHandler> = {};
  const mockChannel = {} as MockChannel;
  mockChannel.on = vi.fn(
    (_: string, config: { event: string }, cb: ChannelHandler): MockChannel => {
      handlers[config.event] = cb;
      return mockChannel;
    }
  );
  mockChannel.subscribe = vi.fn((): MockChannel => mockChannel);
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

  it('processes draw offer lifecycle events', async () => {
    const handleDrawOffer = vi.fn();
    const handleDrawExpired = vi.fn();
    const handleDrawDeclined = vi.fn();

    useGameStore.setState({
      handleDrawOffer,
      handleDrawExpired,
      handleDrawDeclined
    });

    render(<Harness gameId="game-3" />);

    act(() => {
      handlers.draw_offer({
        payload: {
          type: 'draw_offer',
          payload: { offering_color: 'blue' },
          seq: 12
        }
      });
      handlers.draw_offer_expired({
        payload: {
          type: 'draw_offer_expired',
          payload: {},
          seq: 13
        }
      });
      handlers.draw_declined({
        payload: {
          type: 'draw_declined',
          payload: {},
          seq: 14
        }
      });
    });

    await Promise.resolve();

    expect(handleDrawOffer).toHaveBeenCalledWith('blue');
    expect(handleDrawExpired).toHaveBeenCalledOnce();
    expect(handleDrawDeclined).toHaveBeenCalledOnce();
  });

  it('processes takeback lifecycle events', async () => {
    const handleTakebackRequest = vi.fn();
    const handleTakebackAccept = vi.fn();
    const handleTakebackDeclined = vi.fn();
    const handleTakebackExpired = vi.fn();

    useGameStore.setState({
      handleTakebackRequest,
      handleTakebackAccept,
      handleTakebackDeclined,
      handleTakebackExpired
    });

    render(<Harness gameId="game-4" />);

    act(() => {
      handlers.takeback_request({
        payload: {
          type: 'takeback_request',
          payload: { requesting_color: 'blue', move_count: 2 },
          seq: 15
        }
      });
      handlers.takeback_accept({
        payload: {
          type: 'takeback_accept',
          payload: { fen: 'rewound-fen' },
          seq: 16
        }
      });
      handlers.takeback_declined({
        payload: {
          type: 'takeback_declined',
          payload: {},
          seq: 17
        }
      });
      handlers.takeback_expired({
        payload: {
          type: 'takeback_expired',
          payload: {},
          seq: 18
        }
      });
    });

    await Promise.resolve();

    expect(handleTakebackRequest).toHaveBeenCalledWith('blue');
    expect(handleTakebackAccept).toHaveBeenCalledWith('rewound-fen');
    expect(handleTakebackDeclined).toHaveBeenCalledOnce();
    expect(handleTakebackExpired).toHaveBeenCalledOnce();
  });

  it('processes rematch lifecycle events', async () => {
    const handleRematchOffer = vi.fn();
    const handleRematchAccepted = vi.fn();
    const handleRematchDeclined = vi.fn();
    const handleRematchExpired = vi.fn();

    useGameStore.setState({
      handleRematchOffer,
      handleRematchAccepted,
      handleRematchDeclined,
      handleRematchExpired
    });

    render(<Harness gameId="game-5" />);

    act(() => {
      handlers.rematch_offer({
        payload: {
          type: 'rematch_offer',
          payload: { offering_color: 'blue' },
          seq: 20
        }
      });
      handlers.rematch_accepted({
        payload: {
          type: 'rematch_accepted',
          payload: { new_game_id: 'new-game-abc' },
          seq: 21
        }
      });
      handlers.rematch_declined({
        payload: {
          type: 'rematch_declined',
          payload: {},
          seq: 22
        }
      });
      handlers.rematch_expired({
        payload: {
          type: 'rematch_expired',
          payload: {},
          seq: 23
        }
      });
    });

    await Promise.resolve();

    expect(handleRematchOffer).toHaveBeenCalledWith('blue');
    expect(handleRematchAccepted).toHaveBeenCalledWith('new-game-abc');
    expect(handleRematchDeclined).toHaveBeenCalledOnce();
    expect(handleRematchExpired).toHaveBeenCalledOnce();
  });
});
