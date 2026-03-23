import { describe, it, expect, beforeEach } from 'vitest';

import type { GameData } from '@/lib/types/game';

import { useGameStore } from '../game-store';

const mockGameData: GameData = {
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
    move_history: [],
    fen: 'start',
    phase: 'deploying',
    clocks: { red: 600, blue: 600 },
    pending_action: null
  }
};

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('starts in idle state', () => {
    const state = useGameStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.gameId).toBeNull();
    expect(state.moveHistory).toEqual([]);
  });

  it('initializes game with deploying phase', () => {
    useGameStore.getState().initializeGame('game-123', mockGameData);
    const state = useGameStore.getState();

    expect(state.gameId).toBe('game-123');
    expect(state.phase).toBe('deploying');
    expect(state.gameStatus).toBe('started');
    expect(state.myColor).toBe('red');
    expect(state.clocks).toEqual({ red: 600, blue: 600 });
    expect(state.redPlayer).toEqual({ id: 'p1', name: 'Nguoi choi 1', rating: 1500 });
    expect(state.bluePlayer).toEqual({ id: 'p2', name: 'Nguoi choi 2', rating: 1600 });
  });

  it('initializes game with playing phase', () => {
    const playingData: GameData = {
      ...mockGameData,
      game_state: { ...mockGameData.game_state, phase: 'playing', move_history: ['e2e4'] }
    };

    useGameStore.getState().initializeGame('game-123', playingData);
    const state = useGameStore.getState();

    expect(state.phase).toBe('playing');
    expect(state.moveHistory).toEqual(['e2e4']);
  });

  it('resolves ended phase from terminal DB statuses', () => {
    const terminalStatuses = [
      'checkmate',
      'resign',
      'timeout',
      'stalemate',
      'draw',
      'aborted',
      'dispute'
    ] as const;

    for (const status of terminalStatuses) {
      useGameStore.getState().reset();
      const data: GameData = {
        ...mockGameData,
        status
      };
      useGameStore.getState().initializeGame('game-123', data);
      expect(useGameStore.getState().phase).toBe('ended');
    }
  });

  it('makeMove returns error in idle phase', async () => {
    const result = await useGameStore.getState().makeMove('e2e4');
    expect(result.success).toBe(false);
    expect(useGameStore.getState().moveHistory).toEqual([]);
  });

  it('makeMove returns error in ended phase', async () => {
    const endedData: GameData = { ...mockGameData, status: 'checkmate' };
    useGameStore.getState().initializeGame('game-123', endedData);
    const result = await useGameStore.getState().makeMove('e2e4');

    expect(result.success).toBe(false);
    expect(useGameStore.getState().moveHistory).toEqual([]);
  });

  it('resets to initial state', () => {
    useGameStore.getState().initializeGame('game-123', mockGameData);
    useGameStore.getState().reset();

    const state = useGameStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.gameId).toBeNull();
    expect(state.moveHistory).toEqual([]);
    expect(state.clocks).toBeNull();
    expect(state.redPlayer).toBeNull();
    expect(state.bluePlayer).toBeNull();
    expect(state.lastSeenSeq).toBe(0);
    expect(state.pendingMove).toBeNull();
    expect(state.moveError).toBeNull();
  });
});
