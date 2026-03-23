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
        pendingTakeback: 'received',
        rematchStatus: 'sent',
        rematchNewGameId: 'some-id'
      });

      useGameStore.getState().reset();

      expect(useGameStore.getState().pendingDrawOffer).toBeNull();
      expect(useGameStore.getState().pendingTakeback).toBeNull();
      expect(useGameStore.getState().rematchStatus).toBe('idle');
      expect(useGameStore.getState().rematchNewGameId).toBeNull();
    });
  });
});

const mockEndedGameData: GameData = {
  id: 'game-ended-1',
  status: 'checkmate',
  red_player: { id: 'p1', display_name: 'Nguoi choi 1', rating: 1500 },
  blue_player: { id: 'p2', display_name: 'Nguoi choi 2', rating: 1600 },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-03-17T00:00:00Z',
  winner: 'red',
  result_reason: null,
  game_state: {
    move_history: ['e2e4', 'e7e5', 'f1c4', 'a7a6', 'q1h5', 'b7b5', 'h5f7'],
    fen: 'ended-fen',
    phase: 'playing',
    clocks: { red: 500000, blue: 400000 },
    pending_action: null
  }
};

describe('useGameStore - rematch actions', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('offerRematch', () => {
    it('sets rematchStatus to sent optimistically', async () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);
      useGameStore.getState().initializeEngine('ended-fen');

      const promise = useGameStore.getState().offerRematch();
      expect(useGameStore.getState().rematchStatus).toBe('sent');
      await promise;
    });

    it('calls validate-move with rematch_offer action', async () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);
      useGameStore.getState().initializeEngine('ended-fen');

      await useGameStore.getState().offerRematch();

      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-ended-1', action: 'rematch_offer' }
      });
    });

    it('does nothing when phase is not ended', async () => {
      useGameStore.getState().initializeGame('game-actions-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');

      await useGameStore.getState().offerRematch();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('does nothing when rematchStatus is not idle', async () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);
      useGameStore.getState().initializeEngine('ended-fen');
      useGameStore.setState({ rematchStatus: 'sent' });

      await useGameStore.getState().offerRematch();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('resets rematchStatus to idle on error', async () => {
      mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);
      useGameStore.getState().initializeEngine('ended-fen');

      await useGameStore.getState().offerRematch();
      expect(useGameStore.getState().rematchStatus).toBe('idle');
    });

    it('rehydrates a sent rematch offer from server state', () => {
      useGameStore.getState().initializeGame('game-ended-1', {
        ...mockEndedGameData,
        game_state: {
          ...mockEndedGameData.game_state,
          pending_action: {
            type: 'rematch_offer',
            color: 'red',
            created_at: '2026-03-23T00:00:00Z'
          }
        }
      });

      expect(useGameStore.getState().rematchStatus).toBe('sent');
    });

    it('rehydrates a received rematch offer from server state', () => {
      useGameStore.getState().initializeGame('game-ended-1', {
        ...mockEndedGameData,
        game_state: {
          ...mockEndedGameData.game_state,
          pending_action: {
            type: 'rematch_offer',
            color: 'blue',
            created_at: '2026-03-23T00:00:00Z'
          }
        }
      });

      expect(useGameStore.getState().rematchStatus).toBe('received');
    });
  });

  describe('acceptRematch', () => {
    it('calls validate-move with rematch_accept action', async () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);
      useGameStore.setState({ rematchStatus: 'received' });

      await useGameStore.getState().acceptRematch();

      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-ended-1', action: 'rematch_accept' }
      });
    });

    it('does nothing when rematchStatus is not received', async () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);

      await useGameStore.getState().acceptRematch();
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('declineRematch', () => {
    it('sets rematchStatus to declined and calls server', async () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);
      useGameStore.setState({ rematchStatus: 'received' });

      await useGameStore.getState().declineRematch();

      expect(useGameStore.getState().rematchStatus).toBe('declined');
      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-ended-1', action: 'rematch_decline' }
      });
    });

    it('does nothing when rematchStatus is not received', async () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);

      await useGameStore.getState().declineRematch();
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('expireRematchOffer', () => {
    it('calls validate-move with rematch expiry action and clears local state on success', async () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);
      useGameStore.setState({ rematchStatus: 'sent' });

      await useGameStore.getState().expireRematchOffer();

      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: {
          game_id: 'game-ended-1',
          action: 'expire_pending_action',
          pending_type: 'rematch_offer'
        }
      });
      expect(useGameStore.getState().rematchStatus).toBe('idle');
    });

    it('keeps sent state when the expiry request fails', async () => {
      mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);
      useGameStore.setState({ rematchStatus: 'sent' });

      await useGameStore.getState().expireRematchOffer();

      expect(useGameStore.getState().rematchStatus).toBe('sent');
    });
  });

  describe('rematch event handlers', () => {
    it('handleRematchOffer sets received when from opponent', () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);

      useGameStore.getState().handleRematchOffer('blue');
      expect(useGameStore.getState().rematchStatus).toBe('received');
    });

    it('handleRematchOffer ignores own offer', () => {
      useGameStore.getState().initializeGame('game-ended-1', mockEndedGameData);

      useGameStore.getState().handleRematchOffer('red');
      expect(useGameStore.getState().rematchStatus).toBe('idle');
    });

    it('handleRematchAccepted sets accepted and stores newGameId', () => {
      useGameStore.getState().handleRematchAccepted('new-game-123');

      expect(useGameStore.getState().rematchStatus).toBe('accepted');
      expect(useGameStore.getState().rematchNewGameId).toBe('new-game-123');
    });

    it('handleRematchDeclined sets declined', () => {
      useGameStore.setState({ rematchStatus: 'sent' });

      useGameStore.getState().handleRematchDeclined();
      expect(useGameStore.getState().rematchStatus).toBe('declined');
    });

    it('handleRematchExpired sets idle (re-enables button)', () => {
      useGameStore.setState({ rematchStatus: 'sent' });

      useGameStore.getState().handleRematchExpired();
      expect(useGameStore.getState().rematchStatus).toBe('idle');
    });
  });
});
