import { create } from 'zustand';

import { CoTuLenh } from '@cotulenh/core';
import type { GameData, GameStateData, GameStatus } from '@/lib/types/game';
import { createClient } from '@/lib/supabase/browser';

type ClientPhase = 'idle' | 'deploying' | 'playing' | 'ended';

type GameStore = {
  engine: CoTuLenh | null;
  phase: ClientPhase;
  moveHistory: string[];
  clocks: { red: number; blue: number } | null;
  lastSyncTime: number | null;
  activeColor: 'red' | 'blue' | null;
  clockRunning: boolean;
  myColor: 'red' | 'blue' | null;
  gameId: string | null;
  gameStatus: GameStatus | null;
  winner: 'red' | 'blue' | null;
  resultReason: string | null;
  redPlayer: { id: string; name: string; rating: number } | null;
  bluePlayer: { id: string; name: string; rating: number } | null;
  deploySubmitted: boolean;
  opponentDeploySubmitted: boolean;
  lastSeenSeq: number;
  pendingMove: string | null;
  moveError: string | null;
  timeoutClaimSent: boolean;

  initializeGame: (gameId: string, gameData: GameData) => void;
  initializeEngine: (fen: string) => void;
  makeMove: (san: string) => Promise<{ success: boolean; error?: string }>;
  rollbackMove: () => void;
  applyOpponentMove: (san: string, fen: string) => void;
  syncClocks: (red: number, blue: number) => void;
  setLastSeenSeq: (seq: number) => void;
  getLegalMoves: (square: string) => string[];
  getDisplayClocks: () => { red: number; blue: number } | null;
  handleGameEnd: (
    status: GameStatus,
    winner: 'red' | 'blue' | null,
    resultReason: string | null
  ) => void;
  deployMove: (from: string, to: string, pieceType?: string) => unknown | null;
  cancelDeploy: () => void;
  commitDeploy: () => string[] | null;
  setDeploySubmitted: (submitted: boolean) => void;
  setOpponentDeploySubmitted: (color: 'r' | 'b') => void;
  applyDeployCommit: (redSans: string[], blueSans: string[], fen: string) => void;
  syncFromServerState: (state: GameStateData) => void;
  submitDeploy: (sans: string[]) => Promise<{ success: boolean; error?: string }>;
  getDeployablePieces: () => Array<{ type: string; color: string }>;
  getDeployProgress: () => { current: number; total: number };
  claimTimeout: () => Promise<void>;
  reset: () => void;
};

const TERMINAL_STATUSES: GameStatus[] = [
  'aborted',
  'checkmate',
  'resign',
  'timeout',
  'stalemate',
  'draw',
  'dispute'
];

function resolveClientPhase(dbStatus: GameStatus, gamePhase: 'deploying' | 'playing'): ClientPhase {
  if (TERMINAL_STATUSES.includes(dbStatus)) return 'ended';
  if (dbStatus === 'started') return gamePhase;
  return 'idle';
}

function deriveClockState(
  phase: ClientPhase,
  engine: CoTuLenh | null
): {
  activeColor: 'red' | 'blue' | null;
  clockRunning: boolean;
} {
  if (phase !== 'playing' || !engine) {
    return { activeColor: null, clockRunning: false };
  }
  const turn = engine.turn();
  return {
    activeColor: turn === 'r' ? 'red' : 'blue',
    clockRunning: true
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  phase: 'idle',
  moveHistory: [],
  clocks: null,
  lastSyncTime: null,
  activeColor: null,
  clockRunning: false,
  myColor: null,
  gameId: null,
  gameStatus: null,
  winner: null,
  resultReason: null,
  redPlayer: null,
  bluePlayer: null,
  deploySubmitted: false,
  opponentDeploySubmitted: false,
  lastSeenSeq: 0,
  pendingMove: null,
  moveError: null,
  timeoutClaimSent: false,

  setLastSeenSeq: (seq) => {
    set({ lastSeenSeq: seq });
  },

  initializeGame: (gameId, gameData) => {
    const clientPhase = resolveClientPhase(gameData.status, gameData.game_state.phase);

    set({
      gameId,
      gameStatus: gameData.status,
      phase: clientPhase,
      moveHistory: gameData.game_state.move_history,
      clocks: gameData.game_state.clocks,
      lastSyncTime: Date.now(),
      myColor: gameData.my_color,
      winner: gameData.winner ?? null,
      resultReason: gameData.result_reason ?? null,
      redPlayer: {
        id: gameData.red_player.id,
        name: gameData.red_player.display_name,
        rating: gameData.red_player.rating
      },
      bluePlayer: {
        id: gameData.blue_player.id,
        name: gameData.blue_player.display_name,
        rating: gameData.blue_player.rating
      }
    });
  },

  initializeEngine: (fen) => {
    const engine = new CoTuLenh(fen);
    const { phase } = get();
    const clockState = deriveClockState(phase, engine);
    set({ engine, ...clockState });
  },

  makeMove: async (san) => {
    const state = get();
    if (state.phase !== 'playing' || !state.engine || !state.gameId) {
      return { success: false, error: 'Khong the di nuoc nay' };
    }

    // Optimistic: apply move on engine
    const moveResult = state.engine.move(san);
    if (!moveResult) {
      return { success: false, error: 'Nuoc di khong hop le' };
    }

    set({
      moveHistory: [...state.moveHistory, san],
      pendingMove: san,
      moveError: null
    });

    // Send to server for validation
    try {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        get().rollbackMove();
        const { data: serverState } = await supabase
          .from('game_states')
          .select('move_history, fen, phase, clocks')
          .eq('game_id', state.gameId)
          .single();
        if (serverState) {
          get().syncFromServerState(serverState as GameStateData);
        }
        return { success: false, error: 'Chua dang nhap' };
      }

      const response = await supabase.functions.invoke('validate-move', {
        body: { game_id: state.gameId, san }
      });

      if (response.error) {
        get().rollbackMove();
        const { data: serverState } = await supabase
          .from('game_states')
          .select('move_history, fen, phase, clocks')
          .eq('game_id', state.gameId)
          .single();
        if (serverState) {
          get().syncFromServerState(serverState as GameStateData);
        }
        return { success: false, error: response.error.message };
      }

      const data = response.data as {
        data?: { san: string; fen: string; seq: number };
        error?: string;
        code?: string;
      };
      if (!data.data) {
        get().rollbackMove();
        const { data: serverState } = await supabase
          .from('game_states')
          .select('move_history, fen, phase, clocks')
          .eq('game_id', state.gameId)
          .single();
        if (serverState) {
          get().syncFromServerState(serverState as GameStateData);
        }
        const errorMsg =
          data.code === 'WRONG_TURN'
            ? 'Chua den luot ban'
            : data.code === 'ILLEGAL_MOVE'
              ? 'Nuoc di khong hop le'
              : data.code === 'PHASE_MISMATCH'
                ? 'Sai giai doan'
                : (data.error ?? 'Nuoc di khong hop le');
        return { success: false, error: errorMsg };
      }

      set({ pendingMove: null });
      return { success: true };
    } catch {
      get().rollbackMove();
      const supabase = createClient();
      const { data: serverState } = await supabase
        .from('game_states')
        .select('move_history, fen, phase, clocks')
        .eq('game_id', state.gameId)
        .single();
      if (serverState) {
        get().syncFromServerState(serverState as GameStateData);
      }
      return { success: false, error: 'Loi ket noi' };
    }
  },

  rollbackMove: () => {
    const state = get();
    if (!state.pendingMove || !state.engine) return;

    // Undo the last move on engine
    state.engine.undo();
    const rolledBackHistory = state.moveHistory.slice(0, -1);

    set({
      moveHistory: rolledBackHistory,
      pendingMove: null,
      moveError: 'Nuoc di khong hop le'
    });
  },

  applyOpponentMove: (san, fen) => {
    const state = get();
    if (!state.engine) return;

    // Reinitialize engine with server FEN (authoritative)
    const newEngine = new CoTuLenh(fen);
    const pendingMoveConfirmed = state.pendingMove === san;
    const lastSan = state.moveHistory[state.moveHistory.length - 1];
    const alreadyApplied = lastSan === san;
    const clockState = deriveClockState(state.phase, newEngine);
    set({
      engine: newEngine,
      moveHistory: alreadyApplied ? state.moveHistory : [...state.moveHistory, san],
      pendingMove: pendingMoveConfirmed ? null : state.pendingMove,
      ...clockState
    });
  },

  syncClocks: (red, blue) => {
    set({ clocks: { red, blue }, lastSyncTime: Date.now() });
  },

  handleGameEnd: (status, winner, resultReason) => {
    set({
      gameStatus: status,
      winner,
      resultReason,
      phase: 'ended',
      clockRunning: false
    });
  },

  claimTimeout: async () => {
    const { gameId, myColor, timeoutClaimSent } = get();
    if (!gameId || !myColor || timeoutClaimSent) return;

    set({ timeoutClaimSent: true });

    try {
      const supabase = createClient();
      const response = await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'timeout_claim', claiming_color: myColor }
      });

      if (response.error) {
        set({ timeoutClaimSent: false });
      }

      // Response handled via game_end broadcast or clock_sync broadcast
    } catch {
      // Reset flag on network error so claim can be retried
      set({ timeoutClaimSent: false });
    }
  },

  getDisplayClocks: () => {
    const { clocks, lastSyncTime, activeColor, phase } = get();
    if (!clocks) return null;
    if (phase !== 'playing' || !activeColor) return clocks;
    const elapsed = Date.now() - (lastSyncTime ?? Date.now());
    return {
      red: activeColor === 'red' ? Math.max(0, clocks.red - elapsed) : clocks.red,
      blue: activeColor === 'blue' ? Math.max(0, clocks.blue - elapsed) : clocks.blue
    };
  },

  getLegalMoves: (square) => {
    const { engine } = get();
    if (!engine) return [];

    const moves = engine.moves({ square, verbose: true }) as Array<{ to: string }>;
    if (!Array.isArray(moves)) return [];

    return moves.map((m) => m.to);
  },

  deployMove: (from, to, pieceType) => {
    const { engine } = get();
    if (!engine) return null;

    const result = engine.move(
      pieceType
        ? ({ from, to, piece: pieceType, deploy: true } as never)
        : { from, to, deploy: true }
    );
    return result ?? null;
  },

  cancelDeploy: () => {
    const { engine } = get();
    if (!engine) return;

    engine.cancelSession();
  },

  commitDeploy: () => {
    const { engine } = get();
    if (!engine) return null;

    const result = engine.commitSession();
    if (!result.success) return null;

    const history = engine.history();
    return history;
  },

  setDeploySubmitted: (submitted) => {
    set({ deploySubmitted: submitted });
  },

  setOpponentDeploySubmitted: (color) => {
    const { myColor } = get();
    const myColorCode = myColor === 'red' ? 'r' : 'b';

    // Only set if it's the opponent's color
    if (color === myColorCode) return;

    set({ opponentDeploySubmitted: true });
  },

  applyDeployCommit: (redSans, blueSans, fen) => {
    const { engine } = get();
    const nextMoveHistory = [...get().moveHistory, ...redSans, ...blueSans];

    // Reinitialize engine with final FEN if available
    if (engine && fen) {
      const newEngine = new CoTuLenh(fen);
      const clockState = deriveClockState('playing', newEngine);
      set({
        phase: 'playing',
        moveHistory: nextMoveHistory,
        deploySubmitted: false,
        opponentDeploySubmitted: false,
        engine: newEngine,
        lastSyncTime: Date.now(),
        ...clockState
      });
    } else {
      set({
        phase: 'playing',
        moveHistory: nextMoveHistory,
        deploySubmitted: false,
        opponentDeploySubmitted: false,
        clockRunning: true
      });
    }
  },

  syncFromServerState: (serverState) => {
    const current = get();
    const nextPhase = current.gameStatus
      ? resolveClientPhase(current.gameStatus, serverState.phase)
      : current.phase;

    if (current.engine) {
      const newEngine = new CoTuLenh(serverState.fen);
      const clockState = deriveClockState(nextPhase, newEngine);
      set({
        phase: nextPhase,
        moveHistory: serverState.move_history,
        clocks: serverState.clocks,
        lastSyncTime: Date.now(),
        engine: newEngine,
        ...clockState
      });
    } else {
      set({
        phase: nextPhase,
        moveHistory: serverState.move_history,
        clocks: serverState.clocks,
        lastSyncTime: Date.now()
      });
    }
  },

  submitDeploy: async (sans) => {
    const { gameId } = get();
    if (!gameId) return { success: false, error: 'Khong tim thay tran dau' };

    try {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return { success: false, error: 'Chua dang nhap' };

      const response = await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, sans }
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      const data = response.data as { success: boolean; error?: string; code?: string };
      if (!data.success) {
        return { success: false, error: data.error ?? 'Bo tri khong hop le' };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Loi ket noi' };
    }
  },

  getDeployablePieces: () => {
    const { engine } = get();
    if (!engine) return [];

    const deployState = engine.getDeployState();
    if (!deployState) return [];

    return deployState.remainingPieces;
  },

  getDeployProgress: () => {
    const { engine } = get();
    if (!engine) return { current: 0, total: 0 };

    const deployState = engine.getDeployState();
    if (!deployState) return { current: 0, total: 0 };

    const moved = deployState.movedPieces.length;
    const remaining = deployState.remainingPieces.length;
    return { current: moved, total: moved + remaining };
  },

  reset: () => {
    set({
      engine: null,
      phase: 'idle',
      moveHistory: [],
      clocks: null,
      lastSyncTime: null,
      activeColor: null,
      clockRunning: false,
      myColor: null,
      gameId: null,
      gameStatus: null,
      winner: null,
      resultReason: null,
      redPlayer: null,
      bluePlayer: null,
      deploySubmitted: false,
      opponentDeploySubmitted: false,
      lastSeenSeq: 0,
      pendingMove: null,
      moveError: null,
      timeoutClaimSent: false
    });
  }
}));
