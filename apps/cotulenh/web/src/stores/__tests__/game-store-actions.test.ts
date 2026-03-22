import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { GameData } from '@/lib/types/game';

import { useGameStore } from '../game-store';

// Mock CoTuLenh engine
vi.mock('@cotulenh/core', () => ({
  CoTuLenh: vi.fn().mockImplementation(() => ({
    move: vi.fn().mockReturnValue({}),
    undo: vi.fn(),
    commitSession: vi.fn().mockReturnValue({ success: false }),
    cancelSession: vi.fn(),
    getSession: vi.fn().mockReturnValue(null),
    getDeployState: vi.fn().mockReturnValue(null),
    canCommitSession: vi.fn().mockReturnValue(false),
    fen: vi.fn().mockReturnValue('start'),
    history: vi.fn().mockReturnValue([]),
    moves: vi.fn().mockReturnValue([]),
    turn: vi.fn().mockReturnValue('r')
  })),
  DEFAULT_POSITION: 'default_fen r - - 0 1'
}));

const mockInvoke = vi.fn().mockResolvedValue({ data: {}, error: null });

vi.mock('@/lib/supabase/browser', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } })
    },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) }
  })
}));

const mockPlayingGameData: GameData = {
  id: 'game-actions-1',
  status: 'started',
  red_player: { id: 'p1', display_name: 'Nguoi choi 1', rating: 1500 },
  blue_player: { id: 'p2', display_name: 'Nguoi choi 2', rating: 1600 },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-03-17T00:00:00Z',
  winner: null,
  result_reason: null,
  game_state: {
    move_history: ['e2e4', 'e7e5'],
    fen: 'some-fen',
    phase: 'playing',
    clocks: { red: 600000, blue: 600000 },
    pending_action: null
  }
};

describe('useGameStore - resign/draw/takeback actions', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('resign', () => {
    it('calls validate-move with resign action', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');

      await useGameStore.getState().resign();

      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-actions-1', action: 'resign' }
      });
    });

    it('does nothing when phase is not playing', async () => {
      useGameStore.getState().initializeGame('game-actions-1', {
        ...mockPlayingGameData,
        status: 'checkmate'
      });

      await useGameStore.getState().resign();
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('offerDraw', () => {
    it('sets pendingDrawOffer to sent optimistically', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');

      const promise = useGameStore.getState().offerDraw();
      expect(useGameStore.getState().pendingDrawOffer).toBe('sent');
      await promise;
    });

    it('does nothing when draw offer already pending', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');
      useGameStore.setState({ pendingDrawOffer: 'sent' });

      await useGameStore.getState().offerDraw();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('resets pendingDrawOffer on error', async () => {
      mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');

      await useGameStore.getState().offerDraw();
      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
    });

    it('rehydrates a sent draw offer from server state', () => {
      useGameStore.getState().initializeGame('game-actions-1', {
        ...mockPlayingGameData,
        game_state: {
          ...mockPlayingGameData.game_state,
          pending_action: {
            type: 'draw_offer',
            color: 'red',
            created_at: '2026-03-20T00:00:00Z'
          }
        }
      });

      expect(useGameStore.getState().pendingDrawOffer).toBe('sent');
      expect(useGameStore.getState().pendingTakeback).toBeNull();
    });
  });

  describe('acceptDraw', () => {
    it('calls validate-move with draw_accept action', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.setState({ pendingDrawOffer: 'received' });

      await useGameStore.getState().acceptDraw();

      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-actions-1', action: 'draw_accept' }
      });
    });

    it('does nothing when no received draw offer', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);

      await useGameStore.getState().acceptDraw();
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('declineDraw', () => {
    it('clears pendingDrawOffer and calls server', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.setState({ pendingDrawOffer: 'received' });

      await useGameStore.getState().declineDraw();

      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-actions-1', action: 'draw_decline' }
      });
    });
  });

  describe('requestTakeback', () => {
    it('sets pendingTakeback to sent optimistically', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');

      const promise = useGameStore.getState().requestTakeback();
      expect(useGameStore.getState().pendingTakeback).toBe('sent');
      await promise;
    });

    it('does nothing when no moves exist', async () => {
      useGameStore.getState().initializeGame('game-actions-1', {
        ...mockPlayingGameData,
        game_state: { ...mockPlayingGameData.game_state, move_history: [] }
      });
      useGameStore.getState().initializeEngine('some-fen');

      await useGameStore.getState().requestTakeback();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('rehydrates a received takeback request from server state', () => {
      useGameStore.getState().initializeGame('game-actions-1', {
        ...mockPlayingGameData,
        game_state: {
          ...mockPlayingGameData.game_state,
          pending_action: {
            type: 'takeback_request',
            color: 'blue',
            move_count: 2,
            created_at: '2026-03-20T00:00:00Z'
          }
        }
      });

      expect(useGameStore.getState().pendingTakeback).toBe('received');
      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
    });
  });

  describe('acceptTakeback', () => {
    it('calls validate-move with takeback_accept action', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.setState({ pendingTakeback: 'received' });

      await useGameStore.getState().acceptTakeback();

      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-actions-1', action: 'takeback_accept' }
      });
    });
  });

  describe('declineTakeback', () => {
    it('clears pendingTakeback and calls server', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.setState({ pendingTakeback: 'received' });

      await useGameStore.getState().declineTakeback();

      expect(useGameStore.getState().pendingTakeback).toBeNull();
      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-actions-1', action: 'takeback_decline' }
      });
    });
  });

  describe('event handlers', () => {
    it('handleDrawOffer sets received when from opponent', () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);

      useGameStore.getState().handleDrawOffer('blue');
      expect(useGameStore.getState().pendingDrawOffer).toBe('received');
    });

    it('handleDrawOffer ignores own draw offer', () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);

      useGameStore.getState().handleDrawOffer('red');
      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
    });

    it('handleDrawDeclined clears pendingDrawOffer', () => {
      useGameStore.setState({ pendingDrawOffer: 'sent' });

      useGameStore.getState().handleDrawDeclined();
      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
    });

    it('handleDrawExpired clears pendingDrawOffer', () => {
      useGameStore.setState({ pendingDrawOffer: 'sent' });

      useGameStore.getState().handleDrawExpired();
      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
    });

    it('handleTakebackRequest sets received when from opponent', () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);

      useGameStore.getState().handleTakebackRequest('blue');
      expect(useGameStore.getState().pendingTakeback).toBe('received');
    });

    it('handleTakebackRequest ignores own request', () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);

      useGameStore.getState().handleTakebackRequest('red');
      expect(useGameStore.getState().pendingTakeback).toBeNull();
    });

    it('handleTakebackAccept undoes last move and clears pending', () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');
      useGameStore.setState({ pendingTakeback: 'received' });

      useGameStore.getState().handleTakebackAccept('new-fen');

      expect(useGameStore.getState().pendingTakeback).toBeNull();
      expect(useGameStore.getState().moveHistory).toEqual(['e2e4']);
    });

    it('handleTakebackDeclined clears pendingTakeback', () => {
      useGameStore.setState({ pendingTakeback: 'sent' });

      useGameStore.getState().handleTakebackDeclined();
      expect(useGameStore.getState().pendingTakeback).toBeNull();
    });

    it('handleTakebackExpired clears pendingTakeback', () => {
      useGameStore.setState({ pendingTakeback: 'sent' });

      useGameStore.getState().handleTakebackExpired();
      expect(useGameStore.getState().pendingTakeback).toBeNull();
    });
  });

  describe('client-side expiry actions', () => {
    it('expireDrawOffer clears local state and notifies the server', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.setState({ pendingDrawOffer: 'sent' });

      await useGameStore.getState().expireDrawOffer();

      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: {
          game_id: 'game-actions-1',
          action: 'expire_pending_action',
          pending_type: 'draw_offer'
        }
      });
    });

    it('expireTakeback clears local state and notifies the server', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.setState({ pendingTakeback: 'sent' });

      await useGameStore.getState().expireTakeback();

      expect(useGameStore.getState().pendingTakeback).toBeNull();
      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: {
          game_id: 'game-actions-1',
          action: 'expire_pending_action',
          pending_type: 'takeback_request'
        }
      });
    });
  });

  describe('reset', () => {
    it('clears new state fields on reset', () => {
      useGameStore.setState({
        pendingDrawOffer: 'sent',
        pendingTakeback: 'received'
      });

      useGameStore.getState().reset();

      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
      expect(useGameStore.getState().pendingTakeback).toBeNull();
    });
  });
});
