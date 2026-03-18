import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

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
  id: 'game-123',
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
    clocks: { red: 600000, blue: 600000 }
  }
};

const mockDeployGameData: GameData = {
  ...mockPlayingGameData,
  game_state: {
    move_history: [],
    fen: 'start',
    phase: 'deploying',
    clocks: { red: 600000, blue: 600000 }
  }
};

describe('Game Store — Clock Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Task 2.1: activeColor derived state
  describe('activeColor', () => {
    it('returns turn color during playing phase', () => {
      useGameStore.getState().initializeGame('game-123', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');
      const state = useGameStore.getState();
      // engine.turn() returns 'r' by mock, odd move count means blue turn but engine is authoritative
      expect(state.activeColor).toBe('red');
    });

    it('returns null during deploying phase', () => {
      useGameStore.getState().initializeGame('game-123', mockDeployGameData);
      useGameStore.getState().initializeEngine('start');
      const state = useGameStore.getState();
      expect(state.activeColor).toBeNull();
    });

    it('returns null during ended phase', () => {
      const endedData: GameData = { ...mockPlayingGameData, status: 'checkmate' };
      useGameStore.getState().initializeGame('game-123', endedData);
      useGameStore.getState().initializeEngine('some-fen');
      const state = useGameStore.getState();
      expect(state.activeColor).toBeNull();
    });

    it('returns null when no engine', () => {
      useGameStore.getState().initializeGame('game-123', mockPlayingGameData);
      const state = useGameStore.getState();
      expect(state.activeColor).toBeNull();
    });
  });

  // Task 2.2: clockRunning derived state
  describe('clockRunning', () => {
    it('returns true during playing phase', () => {
      useGameStore.getState().initializeGame('game-123', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');
      const state = useGameStore.getState();
      expect(state.clockRunning).toBe(true);
    });

    it('returns false during deploying phase', () => {
      useGameStore.getState().initializeGame('game-123', mockDeployGameData);
      useGameStore.getState().initializeEngine('start');
      const state = useGameStore.getState();
      expect(state.clockRunning).toBe(false);
    });

    it('returns false during ended phase', () => {
      const endedData: GameData = { ...mockPlayingGameData, status: 'checkmate' };
      useGameStore.getState().initializeGame('game-123', endedData);
      useGameStore.getState().initializeEngine('some-fen');
      const state = useGameStore.getState();
      expect(state.clockRunning).toBe(false);
    });
  });

  // Task 2.3: syncClocks stores lastSyncTime
  describe('syncClocks', () => {
    it('updates clocks and sets lastSyncTime', () => {
      useGameStore.getState().initializeGame('game-123', mockPlayingGameData);
      const beforeSync = Date.now();
      useGameStore.getState().syncClocks(595000, 598000);
      const state = useGameStore.getState();
      expect(state.clocks).toEqual({ red: 595000, blue: 598000 });
      expect(state.lastSyncTime).toBeGreaterThanOrEqual(beforeSync);
    });
  });

  // Task 2.4: getDisplayClocks selector
  describe('getDisplayClocks', () => {
    it('returns null when clocks are null', () => {
      const clocks = useGameStore.getState().getDisplayClocks();
      expect(clocks).toBeNull();
    });

    it('returns static clocks during deploying phase', () => {
      useGameStore.getState().initializeGame('game-123', mockDeployGameData);
      useGameStore.getState().initializeEngine('start');
      const clocks = useGameStore.getState().getDisplayClocks();
      expect(clocks).toEqual({ red: 600000, blue: 600000 });
    });

    it('returns static clocks during ended phase', () => {
      const endedData: GameData = { ...mockPlayingGameData, status: 'checkmate' };
      useGameStore.getState().initializeGame('game-123', endedData);
      useGameStore.getState().initializeEngine('some-fen');
      const clocks = useGameStore.getState().getDisplayClocks();
      expect(clocks).toEqual({ red: 600000, blue: 600000 });
    });

    it('deducts elapsed time for active player during playing', () => {
      useGameStore.getState().initializeGame('game-123', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');
      // Sync clocks to set lastSyncTime
      useGameStore.getState().syncClocks(600000, 600000);

      // Advance time by 2 seconds
      vi.advanceTimersByTime(2000);

      const clocks = useGameStore.getState().getDisplayClocks();
      // activeColor is 'red' (from mock engine.turn() = 'r'), so red clock decremented
      expect(clocks!.red).toBe(598000);
      expect(clocks!.blue).toBe(600000);
    });

    it('does not go below 0', () => {
      useGameStore.getState().initializeGame('game-123', mockPlayingGameData);
      useGameStore.getState().initializeEngine('some-fen');
      useGameStore.getState().syncClocks(1000, 600000);

      vi.advanceTimersByTime(5000);

      const clocks = useGameStore.getState().getDisplayClocks();
      expect(clocks!.red).toBe(0);
      expect(clocks!.blue).toBe(600000);
    });
  });

  // Task 2.3 (extended): reset resets clock-related state
  describe('reset', () => {
    it('resets lastSyncTime', () => {
      useGameStore.getState().initializeGame('game-123', mockPlayingGameData);
      useGameStore.getState().syncClocks(595000, 598000);
      useGameStore.getState().reset();
      const state = useGameStore.getState();
      expect(state.lastSyncTime).toBeNull();
    });
  });
});
