import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { GameData } from '@/lib/types/game';

import { useGameStore } from '../game-store';

// Mock CoTuLenh engine
const mockMove = vi.fn();
const mockCommitSession = vi.fn();
const mockCancelSession = vi.fn();
const mockGetSession = vi.fn();
const mockGetDeployState = vi.fn();
const mockFen = vi.fn();
const mockHistory = vi.fn();
const mockMoves = vi.fn();

vi.mock('@cotulenh/core', () => ({
  CoTuLenh: vi.fn().mockImplementation(() => ({
    move: mockMove,
    commitSession: mockCommitSession,
    cancelSession: mockCancelSession,
    getSession: mockGetSession,
    getDeployState: mockGetDeployState,
    fen: mockFen,
    history: mockHistory,
    moves: mockMoves
  })),
  DEFAULT_POSITION: 'default_fen r - - 0 1'
}));

const mockDeployingGameData: GameData = {
  id: 'game-deploy-1',
  status: 'started',
  red_player: { id: 'p1', display_name: 'Nguoi choi 1', rating: 1500 },
  blue_player: { id: 'p2', display_name: 'Nguoi choi 2', rating: 1600 },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-03-17T00:00:00Z',
  game_state: {
    move_history: [],
    fen: 'default_fen r - - 0 1',
    phase: 'deploying',
    clocks: { red: 600000, blue: 600000 }
  }
};

describe('useGameStore - deploy actions', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.clearAllMocks();
    mockFen.mockReturnValue('some_fen r - - 0 1');
    mockHistory.mockReturnValue([]);
  });

  describe('initializeEngine', () => {
    it('creates engine instance from FEN', () => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine(mockDeployingGameData.game_state.fen);

      const state = useGameStore.getState();
      expect(state.engine).not.toBeNull();
    });

    it('stores engine in state', () => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine('some_fen');

      expect(useGameStore.getState().engine).toBeTruthy();
    });
  });

  describe('deployMove', () => {
    beforeEach(() => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine(mockDeployingGameData.game_state.fen);
    });

    it('calls engine.move with deploy flag and returns result', () => {
      const mockResult = { san: 'Tb1-c3', isDeploy: true, from: 'b1', to: 'c3' };
      mockMove.mockReturnValue(mockResult);

      const result = useGameStore.getState().deployMove('b1', 'c3');

      expect(mockMove).toHaveBeenCalledWith({ from: 'b1', to: 'c3', deploy: true });
      expect(result).toEqual(mockResult);
    });

    it('returns null when engine is not initialized', () => {
      useGameStore.getState().reset();
      const result = useGameStore.getState().deployMove('b1', 'c3');
      expect(result).toBeNull();
    });

    it('returns null when move is invalid', () => {
      mockMove.mockReturnValue(null);
      const result = useGameStore.getState().deployMove('b1', 'z9');
      expect(result).toBeNull();
    });
  });

  describe('cancelDeploy', () => {
    beforeEach(() => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine(mockDeployingGameData.game_state.fen);
    });

    it('calls engine.cancelSession()', () => {
      useGameStore.getState().cancelDeploy();
      expect(mockCancelSession).toHaveBeenCalled();
    });

    it('does nothing when engine is not initialized', () => {
      useGameStore.getState().reset();
      useGameStore.getState().cancelDeploy();
      expect(mockCancelSession).not.toHaveBeenCalled();
    });
  });

  describe('commitDeploy', () => {
    beforeEach(() => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine(mockDeployingGameData.game_state.fen);
    });

    it('calls engine.commitSession() and returns SAN array', () => {
      mockCommitSession.mockReturnValue({
        success: true,
        result: { san: 'deploy-complete' }
      });
      mockHistory.mockReturnValue(['Tb1-c3', 'Ib2-d4']);

      const result = useGameStore.getState().commitDeploy();

      expect(mockCommitSession).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('returns null when engine is not initialized', () => {
      useGameStore.getState().reset();
      const result = useGameStore.getState().commitDeploy();
      expect(result).toBeNull();
    });

    it('returns null when commit fails', () => {
      mockCommitSession.mockReturnValue({ success: false, reason: 'incomplete' });
      const result = useGameStore.getState().commitDeploy();
      expect(result).toBeNull();
    });

    it('does not mark deploySubmitted before server confirms submit', () => {
      mockCommitSession.mockReturnValue({
        success: true,
        result: { san: 'deploy-complete' }
      });
      mockHistory.mockReturnValue(['Tb1-c3']);

      useGameStore.getState().commitDeploy();
      expect(useGameStore.getState().deploySubmitted).toBe(false);
    });
  });

  describe('setOpponentDeploySubmitted', () => {
    beforeEach(() => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
    });

    it('sets opponentDeploySubmitted to true for opponent color', () => {
      useGameStore.getState().setOpponentDeploySubmitted('b');
      expect(useGameStore.getState().opponentDeploySubmitted).toBe(true);
    });

    it('ignores if color matches own color', () => {
      // myColor is red, so 'r' should be ignored
      useGameStore.getState().setOpponentDeploySubmitted('r');
      expect(useGameStore.getState().opponentDeploySubmitted).toBe(false);
    });
  });

  describe('applyDeployCommit', () => {
    beforeEach(() => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine(mockDeployingGameData.game_state.fen);
    });

    it('transitions phase to playing', () => {
      useGameStore.getState().applyDeployCommit(['Tb1-c3'], ['Tb10-c8'], 'final_fen r - - 0 1');

      expect(useGameStore.getState().phase).toBe('playing');
    });

    it('resets deploy state flags', () => {
      useGameStore.getState().commitDeploy();
      useGameStore.getState().setOpponentDeploySubmitted('b');

      useGameStore.getState().applyDeployCommit(['Tb1-c3'], ['Tb10-c8'], 'final_fen r - - 0 1');

      expect(useGameStore.getState().deploySubmitted).toBe(false);
      expect(useGameStore.getState().opponentDeploySubmitted).toBe(false);
    });
  });

  describe('getDeployablepieces', () => {
    beforeEach(() => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine(mockDeployingGameData.game_state.fen);
    });

    it('returns remaining pieces from engine deploy state', () => {
      mockGetDeployState.mockReturnValue({
        remainingPieces: [
          { type: 't', color: 'r' },
          { type: 'i', color: 'r' }
        ],
        isComplete: false,
        canCommit: false
      });

      const pieces = useGameStore.getState().getDeployablePieces();
      expect(pieces).toEqual([
        { type: 't', color: 'r' },
        { type: 'i', color: 'r' }
      ]);
    });

    it('returns empty array when no deploy state', () => {
      mockGetDeployState.mockReturnValue(null);
      const pieces = useGameStore.getState().getDeployablePieces();
      expect(pieces).toEqual([]);
    });
  });

  describe('getDeployProgress', () => {
    beforeEach(() => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine(mockDeployingGameData.game_state.fen);
    });

    it('returns current/total count from deploy state', () => {
      mockGetDeployState.mockReturnValue({
        remainingPieces: [{ type: 't', color: 'r' }],
        movedPieces: [
          { type: 'i', color: 'r' },
          { type: 'a', color: 'r' }
        ],
        isComplete: false,
        canCommit: false
      });

      const progress = useGameStore.getState().getDeployProgress();
      expect(progress).toEqual({ current: 2, total: 3 });
    });

    it('returns zero counts when no deploy state', () => {
      mockGetDeployState.mockReturnValue(null);
      const progress = useGameStore.getState().getDeployProgress();
      expect(progress).toEqual({ current: 0, total: 0 });
    });
  });

  describe('reset clears deploy state', () => {
    it('clears all deploy-related state', () => {
      useGameStore.getState().initializeGame('game-deploy-1', mockDeployingGameData);
      useGameStore.getState().initializeEngine(mockDeployingGameData.game_state.fen);

      useGameStore.getState().reset();

      const state = useGameStore.getState();
      expect(state.engine).toBeNull();
      expect(state.deploySubmitted).toBe(false);
      expect(state.opponentDeploySubmitted).toBe(false);
    });
  });
});
