import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { GameData } from '@/lib/types/game';

import { useGameStore } from '../game-store';

// Mock CoTuLenh engine
const mockMove = vi.fn();
const mockUndo = vi.fn();
const mockFen = vi.fn();
const mockHistory = vi.fn();
const mockMoves = vi.fn();
const mockTurn = vi.fn();
const mockCommitSession = vi.fn();
const mockCancelSession = vi.fn();
const mockGetDeployState = vi.fn();
const mockGetSession = vi.fn();
const mockCanCommitSession = vi.fn();

vi.mock('@cotulenh/core', () => ({
  CoTuLenh: vi.fn().mockImplementation(() => ({
    move: mockMove,
    undo: mockUndo,
    fen: mockFen,
    history: mockHistory,
    moves: mockMoves,
    turn: mockTurn,
    commitSession: mockCommitSession,
    cancelSession: mockCancelSession,
    getDeployState: mockGetDeployState,
    getSession: mockGetSession,
    canCommitSession: mockCanCommitSession
  })),
  DEFAULT_POSITION: 'default_fen r - - 0 1'
}));

// Mock supabase browser client
const mockGetAuthSession = vi.fn();
const mockInvoke = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    auth: { getSession: mockGetAuthSession },
    functions: { invoke: mockInvoke },
    from: mockFrom
  })
}));

const mockPlayingGameData: GameData = {
  id: 'game-play-1',
  status: 'started',
  red_player: { id: 'p1', display_name: 'Nguoi choi 1', rating: 1500 },
  blue_player: { id: 'p2', display_name: 'Nguoi choi 2', rating: 1600 },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-03-17T00:00:00Z',
  winner: null,
  result_reason: null,
  game_state: {
    move_history: ['deploy1', 'deploy2'],
    fen: 'playing_fen r - - 0 1',
    phase: 'playing',
    clocks: { red: 600000, blue: 600000 }
  }
};

function initPlayingState() {
  useGameStore.getState().initializeGame('game-play-1', mockPlayingGameData);
  useGameStore.getState().initializeEngine(mockPlayingGameData.game_state.fen);
}

describe('useGameStore - playing phase actions', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.clearAllMocks();
    mockFen.mockReturnValue('some_fen r - - 0 1');
    mockHistory.mockReturnValue([]);
    mockTurn.mockReturnValue('r');
    mockGetAuthSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: null });
  });

  describe('makeMove', () => {
    beforeEach(() => {
      initPlayingState();
    });

    it('applies move optimistically and sends to server', async () => {
      mockMove.mockReturnValue({ san: 'e2e4', from: 'e2', to: 'e4' });
      mockFen.mockReturnValue('new_fen r - - 0 1');
      mockInvoke.mockResolvedValue({
        data: { data: { san: 'e2e4', fen: 'new_fen r - - 0 1', seq: 3 } },
        error: null
      });

      const result = await useGameStore.getState().makeMove('e2e4');

      expect(result.success).toBe(true);
      expect(mockMove).toHaveBeenCalledWith('e2e4');
      expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
        body: { game_id: 'game-play-1', san: 'e2e4' }
      });
      expect(useGameStore.getState().moveHistory).toContain('e2e4');
      expect(useGameStore.getState().pendingMove).toBeNull();
    });

    it('returns error when engine rejects move (illegal)', async () => {
      mockMove.mockReturnValue(null);

      const result = await useGameStore.getState().makeMove('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nuoc di khong hop le');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('rolls back on server rejection', async () => {
      mockMove.mockReturnValue({ san: 'e2e4', from: 'e2', to: 'e4' });
      mockFen.mockReturnValue('new_fen');
      mockInvoke.mockResolvedValue({
        data: { error: 'Not your turn', code: 'WRONG_TURN' },
        error: null
      });

      const initialHistory = [...useGameStore.getState().moveHistory];
      const result = await useGameStore.getState().makeMove('e2e4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chua den luot ban');
      expect(mockUndo).toHaveBeenCalled();
      expect(useGameStore.getState().moveHistory).toEqual(initialHistory);
      expect(useGameStore.getState().pendingMove).toBeNull();
    });

    it('rolls back on server ILLEGAL_MOVE error', async () => {
      mockMove.mockReturnValue({ san: 'e2e4', from: 'e2', to: 'e4' });
      mockFen.mockReturnValue('new_fen');
      mockInvoke.mockResolvedValue({
        data: { error: 'Illegal move', code: 'ILLEGAL_MOVE' },
        error: null
      });

      const result = await useGameStore.getState().makeMove('e2e4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nuoc di khong hop le');
      expect(mockUndo).toHaveBeenCalled();
    });

    it('rolls back on PHASE_MISMATCH error', async () => {
      mockMove.mockReturnValue({ san: 'e2e4', from: 'e2', to: 'e4' });
      mockFen.mockReturnValue('new_fen');
      mockInvoke.mockResolvedValue({
        data: { error: 'Wrong phase', code: 'PHASE_MISMATCH' },
        error: null
      });

      const result = await useGameStore.getState().makeMove('e2e4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sai giai doan');
    });

    it('rolls back on network error', async () => {
      mockMove.mockReturnValue({ san: 'e2e4', from: 'e2', to: 'e4' });
      mockFen.mockReturnValue('new_fen');
      mockInvoke.mockRejectedValue(new Error('Network error'));

      const result = await useGameStore.getState().makeMove('e2e4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Loi ket noi');
      expect(mockUndo).toHaveBeenCalled();
    });

    it('rolls back on auth failure', async () => {
      mockMove.mockReturnValue({ san: 'e2e4', from: 'e2', to: 'e4' });
      mockFen.mockReturnValue('new_fen');
      mockGetAuthSession.mockResolvedValue({ data: { session: null } });

      const result = await useGameStore.getState().makeMove('e2e4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chua dang nhap');
      expect(mockUndo).toHaveBeenCalled();
    });

    it('returns error in non-playing phase', async () => {
      useGameStore.getState().reset();
      const result = await useGameStore.getState().makeMove('e2e4');

      expect(result.success).toBe(false);
      expect(mockMove).not.toHaveBeenCalled();
    });

    it('rolls back on supabase function error', async () => {
      mockMove.mockReturnValue({ san: 'e2e4', from: 'e2', to: 'e4' });
      mockFen.mockReturnValue('new_fen');
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' }
      });

      const result = await useGameStore.getState().makeMove('e2e4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Function error');
      expect(mockUndo).toHaveBeenCalled();
    });
  });

  describe('rollbackMove', () => {
    beforeEach(() => {
      initPlayingState();
    });

    it('undoes engine move and removes from history', () => {
      // Simulate a pending move
      useGameStore.setState({
        moveHistory: ['deploy1', 'deploy2', 'e2e4'],
        pendingMove: 'e2e4'
      });

      useGameStore.getState().rollbackMove();

      expect(mockUndo).toHaveBeenCalled();
      expect(useGameStore.getState().moveHistory).toEqual(['deploy1', 'deploy2']);
      expect(useGameStore.getState().pendingMove).toBeNull();
      expect(useGameStore.getState().moveError).toBe('Nuoc di khong hop le');
    });

    it('does nothing when no pending move', () => {
      useGameStore.getState().rollbackMove();
      expect(mockUndo).not.toHaveBeenCalled();
    });
  });

  describe('applyOpponentMove', () => {
    beforeEach(() => {
      initPlayingState();
    });

    it('reinitializes engine with server FEN and adds move to history', () => {
      const initialHistory = useGameStore.getState().moveHistory;
      useGameStore.getState().applyOpponentMove('d7d5', 'after_opponent_fen');

      const state = useGameStore.getState();
      expect(state.moveHistory).toEqual([...initialHistory, 'd7d5']);
      expect(state.engine).not.toBeNull();
    });

    it('does nothing when engine is not initialized', () => {
      useGameStore.getState().reset();
      useGameStore.getState().applyOpponentMove('d7d5', 'some_fen');
      expect(useGameStore.getState().moveHistory).toEqual([]);
    });
  });

  describe('syncClocks', () => {
    it('updates clock values from server', () => {
      initPlayingState();
      useGameStore.getState().syncClocks(550000, 580000);

      expect(useGameStore.getState().clocks).toEqual({ red: 550000, blue: 580000 });
    });

    it('works even without game initialization', () => {
      useGameStore.getState().syncClocks(100, 200);
      expect(useGameStore.getState().clocks).toEqual({ red: 100, blue: 200 });
    });
  });

  describe('getLegalMoves', () => {
    beforeEach(() => {
      initPlayingState();
    });

    it('returns legal destination squares for a piece', () => {
      mockMoves.mockReturnValue([
        { to: 'e3', from: 'e2', san: 'e3' },
        { to: 'e4', from: 'e2', san: 'e4' }
      ]);

      const moves = useGameStore.getState().getLegalMoves('e2');
      expect(moves).toEqual(['e3', 'e4']);
      expect(mockMoves).toHaveBeenCalledWith({ square: 'e2', verbose: true });
    });

    it('returns empty array when no engine', () => {
      useGameStore.getState().reset();
      const moves = useGameStore.getState().getLegalMoves('e2');
      expect(moves).toEqual([]);
    });

    it('returns empty array for square with no legal moves', () => {
      mockMoves.mockReturnValue([]);
      const moves = useGameStore.getState().getLegalMoves('a1');
      expect(moves).toEqual([]);
    });
  });

  describe('new state fields', () => {
    it('initializes with default values', () => {
      const state = useGameStore.getState();
      expect(state.lastSeenSeq).toBe(0);
      expect(state.pendingMove).toBeNull();
      expect(state.moveError).toBeNull();
    });

    it('resets new fields on reset()', () => {
      useGameStore.setState({ lastSeenSeq: 5, pendingMove: 'e2e4', moveError: 'some error' });
      useGameStore.getState().reset();

      const state = useGameStore.getState();
      expect(state.lastSeenSeq).toBe(0);
      expect(state.pendingMove).toBeNull();
      expect(state.moveError).toBeNull();
    });
  });
});
