import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mocks ---
const {
  movesMock,
  moveMock,
  fenMock,
  turnMock,
  isGameOverMock,
  isCheckmateMock,
  historyMock,
  getDeployStateMock,
  commitSessionMock,
  cancelSessionMock,
  canCommitSessionMock,
  CoTuLenhMock,
  selectAiMoveMock
} = vi.hoisted(() => {
  const movesMock = vi.fn().mockReturnValue([]);
  const moveMock = vi.fn().mockReturnValue(null);
  const fenMock = vi.fn().mockReturnValue('test-fen');
  const turnMock = vi.fn().mockReturnValue('r');
  const isGameOverMock = vi.fn().mockReturnValue(false);
  const isCheckmateMock = vi.fn().mockReturnValue(false);
  const isStalemateMock = vi.fn().mockReturnValue(false);
  const isDrawMock = vi.fn().mockReturnValue(false);
  const isCommanderCapturedMock = vi.fn().mockReturnValue(false);
  const historyMock = vi.fn().mockReturnValue([]);
  const getDeployStateMock = vi.fn().mockReturnValue(null);
  const commitSessionMock = vi.fn().mockReturnValue({ success: true });
  const cancelSessionMock = vi.fn();
  const canCommitSessionMock = vi.fn().mockReturnValue(false);

  const CoTuLenhMock = vi.fn(() => ({
    moves: movesMock,
    move: moveMock,
    fen: fenMock,
    turn: turnMock,
    undo: vi.fn(),
    isGameOver: isGameOverMock,
    isCheckmate: isCheckmateMock,
    isStalemate: isStalemateMock,
    isDraw: isDrawMock,
    isCommanderCaptured: isCommanderCapturedMock,
    history: historyMock,
    getDeployState: getDeployStateMock,
    commitSession: commitSessionMock,
    cancelSession: cancelSessionMock,
    canCommitSession: canCommitSessionMock
  }));

  const selectAiMoveMock = vi.fn().mockReturnValue('Ic2-c3');

  return {
    movesMock,
    moveMock,
    fenMock,
    turnMock,
    isGameOverMock,
    isCheckmateMock,
    historyMock,
    getDeployStateMock,
    commitSessionMock,
    cancelSessionMock,
    canCommitSessionMock,
    CoTuLenhMock,
    selectAiMoveMock
  };
});

vi.mock('@cotulenh/core', () => ({
  CoTuLenh: CoTuLenhMock
}));

vi.mock('@/lib/ai-engine', () => ({
  selectAiMove: selectAiMoveMock,
  AI_THINKING_DELAY: { easy: 0, medium: 0, hard: 0 }
}));

import { useAiGameStore } from '../ai-game-store';

describe('useAiGameStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useAiGameStore.getState().reset();
    fenMock.mockReturnValue('test-fen');
    turnMock.mockReturnValue('r');
    isGameOverMock.mockReturnValue(false);
    movesMock.mockReturnValue([]);
    historyMock.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts in idle phase', () => {
      const state = useAiGameStore.getState();
      expect(state.phase).toBe('idle');
      expect(state.engine).toBeNull();
      expect(state.difficulty).toBeNull();
      expect(state.moveHistory).toEqual([]);
      expect(state.playerColor).toBeNull();
      expect(state.winner).toBeNull();
      expect(state.gameStatus).toBeNull();
    });
  });

  describe('startGame', () => {
    it('initializes engine and sets phase to deploying', () => {
      useAiGameStore.getState().startGame('medium');

      const state = useAiGameStore.getState();
      expect(state.phase).toBe('deploying');
      expect(state.difficulty).toBe('medium');
      expect(state.playerColor).toBe('red');
      expect(state.engine).not.toBeNull();
      expect(CoTuLenhMock).toHaveBeenCalled();
    });

    it('resets previous game state when starting new game', () => {
      const store = useAiGameStore.getState();
      store.startGame('easy');
      store.startGame('hard');

      const state = useAiGameStore.getState();
      expect(state.difficulty).toBe('hard');
      expect(state.moveHistory).toEqual([]);
      expect(state.winner).toBeNull();
    });
  });

  describe('deploy phase', () => {
    beforeEach(() => {
      useAiGameStore.getState().startGame('medium');
    });

    it('deployMove calls engine.move with deploy flag', () => {
      moveMock.mockReturnValue({ san: 'I&c2' });
      useAiGameStore.getState().deployMove('c2', 'c3');
      expect(moveMock).toHaveBeenCalledWith(
        { from: 'c2', to: 'c3', deploy: true },
        { autoCommit: false }
      );
    });

    it('deployMove returns null for illegal deploy', () => {
      moveMock.mockReturnValue(null);
      const result = useAiGameStore.getState().deployMove('c2', 'c3');
      expect(result).toBeNull();
    });

    it('cancelDeploy calls engine.cancelSession', () => {
      useAiGameStore.getState().cancelDeploy();
      expect(cancelSessionMock).toHaveBeenCalled();
    });

    it('commitDeploy calls engine.commitSession', () => {
      commitSessionMock.mockReturnValue({ success: true, result: { san: 'deploy' } });
      useAiGameStore.getState().commitDeploy();
      expect(commitSessionMock).toHaveBeenCalled();
    });

    it('getDeployablePieces delegates to engine', () => {
      const pieces = [{ type: 'i', color: 'r' }];
      getDeployStateMock.mockReturnValue({ remainingPieces: pieces, movedPieces: [] });
      const result = useAiGameStore.getState().getDeployablePieces();
      expect(result).toEqual(pieces);
    });

    it('getDeployProgress returns correct counts', () => {
      getDeployStateMock.mockReturnValue({
        remainingPieces: [
          { type: 'i', color: 'r' },
          { type: 't', color: 'r' }
        ],
        movedPieces: [{ type: 'a', color: 'r' }]
      });
      const progress = useAiGameStore.getState().getDeployProgress();
      expect(progress).toEqual({ current: 1, total: 3 });
    });
  });

  describe('submitDeploy', () => {
    beforeEach(() => {
      useAiGameStore.getState().startGame('medium');
    });

    it('transitions to playing phase after player and AI deploy', () => {
      // Player submits deploy
      historyMock.mockReturnValue(['I&c2', 'T&d3']);

      // AI deploy moves available
      movesMock.mockReturnValue([{ san: 'I&h11', from: 'h11', to: 'h10', flags: 'd' }]);
      moveMock.mockReturnValue({ san: 'I&h11' });
      commitSessionMock.mockReturnValue({ success: true });
      canCommitSessionMock.mockReturnValue(true);

      useAiGameStore.getState().submitDeploy();

      const state = useAiGameStore.getState();
      expect(state.phase).toBe('playing');
      expect(state.deploySubmitted).toBe(true);
    });
  });

  describe('playing phase - makePlayerMove', () => {
    beforeEach(() => {
      useAiGameStore.getState().startGame('easy');
      // Force into playing phase
      useAiGameStore.setState({ phase: 'playing' });
      turnMock.mockReturnValue('r'); // player's turn (red)
    });

    it('applies player move and updates state', () => {
      const moveResult = { san: 'Ic2-c3', from: 'c2', to: 'c3' };
      moveMock.mockReturnValue(moveResult);
      fenMock.mockReturnValue('new-fen');
      historyMock.mockReturnValue(['Ic2-c3']);

      useAiGameStore.getState().makePlayerMove('Ic2-c3');

      const state = useAiGameStore.getState();
      expect(moveMock).toHaveBeenCalledWith('Ic2-c3');
      expect(state.moveHistory).toEqual(['Ic2-c3']);
    });

    it('returns error for illegal move', () => {
      moveMock.mockReturnValue(null);
      const result = useAiGameStore.getState().makePlayerMove('invalid');
      expect(result).toEqual({ success: false, error: 'Nước đi không hợp lệ' });
    });

    it('detects game over after player move', () => {
      moveMock.mockReturnValue({ san: 'Ic2-c3' });
      isGameOverMock.mockReturnValue(true);
      isCheckmateMock.mockReturnValue(true);
      turnMock.mockReturnValue('b'); // blue's turn after red move = red checkmated blue
      historyMock.mockReturnValue(['Ic2-c3']);
      fenMock.mockReturnValue('mate-fen');

      useAiGameStore.getState().makePlayerMove('Ic2-c3');

      const state = useAiGameStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.gameStatus).toBe('checkmate');
      expect(state.winner).toBe('red');
    });

    it('triggers AI response after player move', () => {
      moveMock.mockReturnValue({ san: 'Ic2-c3' });
      isGameOverMock.mockReturnValue(false);
      fenMock.mockReturnValue('after-player-fen');
      historyMock.mockReturnValue(['Ic2-c3']);
      turnMock.mockReturnValue('b'); // AI turn

      useAiGameStore.getState().makePlayerMove('Ic2-c3');

      expect(useAiGameStore.getState().aiThinking).toBe(true);

      // Advance timer for AI thinking delay
      vi.advanceTimersByTime(100);

      // AI move should be applied
      selectAiMoveMock.mockReturnValue('Ih11-h10');
      moveMock.mockReturnValue({ san: 'Ih11-h10' });
      historyMock.mockReturnValue(['Ic2-c3', 'Ih11-h10']);
      fenMock.mockReturnValue('after-ai-fen');

      vi.advanceTimersByTime(100);

      const state = useAiGameStore.getState();
      expect(state.aiThinking).toBe(false);
    });
  });

  describe('resign', () => {
    it('ends game with player loss on resign', () => {
      useAiGameStore.getState().startGame('easy');
      useAiGameStore.setState({ phase: 'playing' });

      useAiGameStore.getState().resign();

      const state = useAiGameStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.gameStatus).toBe('resign');
      expect(state.winner).toBe('blue'); // AI wins
    });

    it('cancels pending AI move when resigning', () => {
      useAiGameStore.getState().startGame('easy');
      useAiGameStore.setState({ phase: 'playing' });

      moveMock.mockReturnValue({ san: 'Ic2-c3' });
      historyMock.mockReturnValue(['Ic2-c3']);
      useAiGameStore.getState().makePlayerMove('Ic2-c3');

      useAiGameStore.getState().resign();
      vi.advanceTimersByTime(1000);

      expect(selectAiMoveMock).not.toHaveBeenCalled();
      expect(useAiGameStore.getState().aiThinking).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useAiGameStore.getState().startGame('hard');
      useAiGameStore.getState().reset();

      const state = useAiGameStore.getState();
      expect(state.phase).toBe('idle');
      expect(state.engine).toBeNull();
      expect(state.difficulty).toBeNull();
      expect(state.moveHistory).toEqual([]);
    });

    it('cancels pending AI move when resetting', () => {
      useAiGameStore.getState().startGame('easy');
      useAiGameStore.setState({ phase: 'playing' });

      moveMock.mockReturnValue({ san: 'Ic2-c3' });
      historyMock.mockReturnValue(['Ic2-c3']);
      useAiGameStore.getState().makePlayerMove('Ic2-c3');

      useAiGameStore.getState().reset();
      vi.advanceTimersByTime(1000);

      expect(selectAiMoveMock).not.toHaveBeenCalled();
      expect(useAiGameStore.getState().phase).toBe('idle');
    });
  });
});
