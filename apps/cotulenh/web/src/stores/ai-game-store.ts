import { create } from 'zustand';

import { CoTuLenh } from '@cotulenh/core';
import { selectAiMove, AI_THINKING_DELAY } from '@/lib/ai-engine';
import type { AiDifficulty } from '@/lib/ai-engine';
import type { GameStatus } from '@/lib/types/game';

type AiGamePhase = 'idle' | 'deploying' | 'playing' | 'ended';

type AiGameStore = {
  engine: CoTuLenh | null;
  phase: AiGamePhase;
  difficulty: AiDifficulty | null;
  playerColor: 'red' | 'blue' | null;
  moveHistory: string[];
  winner: 'red' | 'blue' | null;
  gameStatus: GameStatus | null;
  resultReason: string | null;
  aiThinking: boolean;
  aiMoveTimeoutId: ReturnType<typeof setTimeout> | null;
  deploySubmitted: boolean;
  moveError: string | null;

  startGame: (difficulty: AiDifficulty) => void;
  makePlayerMove: (san: string) => { success: boolean; error?: string };
  deployMove: (from: string, to: string, pieceType?: string) => unknown | null;
  cancelDeploy: () => void;
  commitDeploy: () => string[] | null;
  submitDeploy: () => void;
  getDeployablePieces: () => Array<{ type: string; color: string }>;
  getDeployProgress: () => { current: number; total: number };
  resign: () => void;
  reset: () => void;
};

const initialState = {
  engine: null,
  phase: 'idle' as AiGamePhase,
  difficulty: null as AiDifficulty | null,
  playerColor: null as 'red' | 'blue' | null,
  moveHistory: [] as string[],
  winner: null as 'red' | 'blue' | null,
  gameStatus: null as GameStatus | null,
  resultReason: null as string | null,
  aiThinking: false,
  aiMoveTimeoutId: null as ReturnType<typeof setTimeout> | null,
  deploySubmitted: false,
  moveError: null as string | null
};

export const useAiGameStore = create<AiGameStore>((set, get) => ({
  ...initialState,

  startGame: (difficulty) => {
    const existingTimeoutId = get().aiMoveTimeoutId;
    if (existingTimeoutId) {
      clearTimeout(existingTimeoutId);
    }
    const engine = new CoTuLenh();
    set({
      ...initialState,
      engine,
      phase: 'deploying',
      difficulty,
      playerColor: 'red'
    });
  },

  deployMove: (from, to, pieceType) => {
    const { engine } = get();
    if (!engine) return null;
    const result = engine.move(
      pieceType
        ? ({ from, to, piece: pieceType, deploy: true } as never)
        : { from, to, deploy: true },
      { autoCommit: false }
    );
    if (result) {
      set({ moveError: null });
    }
    return result;
  },

  cancelDeploy: () => {
    const { engine } = get();
    if (!engine) return;
    engine.cancelSession();
    set({ moveError: null });
  },

  commitDeploy: () => {
    const { engine } = get();
    if (!engine) return null;
    const result = engine.commitSession();
    if (result.success) {
      return engine.history() as string[];
    }
    return null;
  },

  getDeployablePieces: () => {
    const { engine } = get();
    if (!engine) return [];
    const state = engine.getDeployState();
    return state?.remainingPieces ?? [];
  },

  getDeployProgress: () => {
    const { engine } = get();
    if (!engine) return { current: 0, total: 0 };
    const state = engine.getDeployState();
    if (!state) return { current: 0, total: 0 };
    const moved = state.movedPieces.length;
    const remaining = state.remainingPieces.length;
    return { current: moved, total: moved + remaining };
  },

  submitDeploy: () => {
    const { engine, difficulty } = get();
    if (!engine || !difficulty) return;

    set({ deploySubmitted: true });

    // Auto-deploy for AI side
    autoDeployAi(engine);

    // Transition to playing phase
    set({
      phase: 'playing',
      moveHistory: engine.history() as string[]
    });
  },

  makePlayerMove: (san) => {
    const { engine, difficulty, phase } = get();
    if (!engine || phase !== 'playing') {
      return { success: false, error: 'Trò chơi chưa bắt đầu' };
    }

    const result = engine.move(san);
    if (!result) {
      return { success: false, error: 'Nước đi không hợp lệ' };
    }

    const history = engine.history() as string[];

    set({ moveHistory: history, moveError: null });

    // Check game over after player move
    if (engine.isGameOver()) {
      handleGameOver(set, get);
      return { success: true };
    }

    // Trigger AI response
    set({ aiThinking: true });
    const delay = AI_THINKING_DELAY[difficulty!];
    const aiMoveTimeoutId = setTimeout(() => {
      makeAiMove(set, get);
    }, delay);
    set({ aiMoveTimeoutId });

    return { success: true };
  },

  resign: () => {
    const { playerColor, aiMoveTimeoutId } = get();
    if (aiMoveTimeoutId) {
      clearTimeout(aiMoveTimeoutId);
    }
    const aiColor = playerColor === 'red' ? 'blue' : 'red';
    set({
      phase: 'ended',
      gameStatus: 'resign',
      winner: aiColor,
      resultReason: 'resign',
      aiThinking: false,
      aiMoveTimeoutId: null
    });
  },

  reset: () => {
    const existingTimeoutId = get().aiMoveTimeoutId;
    if (existingTimeoutId) {
      clearTimeout(existingTimeoutId);
    }
    set({ ...initialState });
  }
}));

function makeAiMove(set: (partial: Partial<AiGameStore>) => void, get: () => AiGameStore) {
  const { engine, difficulty, phase } = get();
  if (phase !== 'playing' || !engine || !difficulty) {
    set({ aiThinking: false, aiMoveTimeoutId: null });
    return;
  }

  const fen = engine.fen();
  const aiSan = selectAiMove(fen, difficulty);

  if (!aiSan) {
    set({ aiThinking: false, aiMoveTimeoutId: null });
    return;
  }

  engine.move(aiSan);
  const history = engine.history() as string[];

  set({ moveHistory: history, aiThinking: false, aiMoveTimeoutId: null });

  if (engine.isGameOver()) {
    handleGameOver(set, get);
  }
}

function handleGameOver(set: (partial: Partial<AiGameStore>) => void, get: () => AiGameStore) {
  const { engine } = get();
  if (!engine) return;

  let status: GameStatus = 'draw';
  let winner: 'red' | 'blue' | null = null;
  let reason: string | null = null;

  if (engine.isCheckmate() || engine.isCommanderCaptured()) {
    status = 'checkmate';
    // The player whose turn it is just got mated
    const loserTurn = engine.turn(); // 'r' or 'b'
    winner = loserTurn === 'r' ? 'blue' : 'red';
    reason = 'checkmate';
  } else if (engine.isStalemate()) {
    status = 'stalemate';
    reason = 'stalemate';
  } else if (engine.isDraw()) {
    status = 'draw';
    reason = 'draw';
  }

  set({
    phase: 'ended',
    gameStatus: status,
    winner,
    resultReason: reason
  });
}

function autoDeployAi(engine: CoTuLenh) {
  // Get available deploy moves for AI (blue side)
  // Deploy all pieces using available moves
  const deployMoves = engine.moves({ verbose: true }) as Array<{
    san: string;
    from: string;
    to: string;
    flags: string;
  }>;

  // Apply deploy moves for blue's pieces
  for (const m of deployMoves) {
    if (m.flags.includes('d')) {
      const result = engine.move(m.san);
      if (result) {
        if (engine.canCommitSession()) {
          engine.commitSession();
        }
      }
    }
  }

  // Commit any remaining session
  if (engine.canCommitSession()) {
    engine.commitSession();
  }
}
