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

// Mock supabase browser client
vi.mock('@/lib/supabase/browser', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn() }
  })
}));

const mockPlayingGameData: GameData = {
  id: 'game-end-1',
  status: 'started',
  red_player: { id: 'p1', display_name: 'Nguoi choi 1', rating: 1500 },
  blue_player: { id: 'p2', display_name: 'Nguoi choi 2', rating: 1600 },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-03-17T00:00:00Z',
  winner: null,
  result_reason: null,
  game_state: {
    move_history: ['e2e4'],
    fen: 'some-fen',
    phase: 'playing',
    clocks: { red: 600000, blue: 600000 },
    pending_action: null
  }
};

describe('useGameStore - end state', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  describe('handleGameEnd', () => {
    it('transitions to ended phase on checkmate', () => {
      useGameStore.getState().initializeGame('game-end-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');

      useGameStore.getState().handleGameEnd('checkmate', 'red', null);

      const state = useGameStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.gameStatus).toBe('checkmate');
      expect(state.winner).toBe('red');
      expect(state.resultReason).toBeNull();
      expect(state.clockRunning).toBe(false);
    });

    it('transitions to ended phase on stalemate with null winner', () => {
      useGameStore.getState().initializeGame('game-end-1', mockPlayingGameData);

      useGameStore.getState().handleGameEnd('stalemate', null, null);

      const state = useGameStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.gameStatus).toBe('stalemate');
      expect(state.winner).toBeNull();
    });

    it('transitions to ended phase on timeout', () => {
      useGameStore.getState().initializeGame('game-end-1', mockPlayingGameData);

      useGameStore.getState().handleGameEnd('timeout', 'blue', null);

      const state = useGameStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.gameStatus).toBe('timeout');
      expect(state.winner).toBe('blue');
    });

    it('transitions to ended phase on draw with result reason', () => {
      useGameStore.getState().initializeGame('game-end-1', mockPlayingGameData);

      useGameStore.getState().handleGameEnd('draw', null, 'fifty_move_rule');

      const state = useGameStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.gameStatus).toBe('draw');
      expect(state.winner).toBeNull();
      expect(state.resultReason).toBe('fifty_move_rule');
    });

    it('stops clock running on game end', () => {
      useGameStore.getState().initializeGame('game-end-1', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');

      // Clock should be running in playing phase
      expect(useGameStore.getState().clockRunning).toBe(true);

      useGameStore.getState().handleGameEnd('checkmate', 'red', null);
      expect(useGameStore.getState().clockRunning).toBe(false);
    });
  });

  describe('initializeGame with ended game', () => {
    it('initializes directly into ended phase with winner', () => {
      const endedGameData: GameData = {
        ...mockPlayingGameData,
        status: 'checkmate',
        winner: 'red',
        result_reason: null
      };

      useGameStore.getState().initializeGame('game-end-1', endedGameData);

      const state = useGameStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.winner).toBe('red');
      expect(state.resultReason).toBeNull();
    });

    it('initializes directly into ended phase with draw', () => {
      const endedGameData: GameData = {
        ...mockPlayingGameData,
        status: 'draw',
        winner: null,
        result_reason: 'threefold_repetition'
      };

      useGameStore.getState().initializeGame('game-end-1', endedGameData);

      const state = useGameStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.winner).toBeNull();
      expect(state.resultReason).toBe('threefold_repetition');
    });
  });

  describe('reset clears end state', () => {
    it('clears winner and resultReason on reset', () => {
      useGameStore.getState().initializeGame('game-end-1', mockPlayingGameData);
      useGameStore.getState().handleGameEnd('checkmate', 'red', null);

      expect(useGameStore.getState().winner).toBe('red');

      useGameStore.getState().reset();

      const state = useGameStore.getState();
      expect(state.winner).toBeNull();
      expect(state.resultReason).toBeNull();
      expect(state.phase).toBe('idle');
      expect(state.timeoutClaimSent).toBe(false);
    });
  });
});
