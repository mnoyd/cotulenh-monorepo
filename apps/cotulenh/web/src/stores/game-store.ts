import { create } from 'zustand';

import { CoTuLenh } from '@cotulenh/core';
import type { GameData, GameStateData, GameStatus, PendingActionData } from '@/lib/types/game';
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
  redPlayer: { id: string; name: string; rating: number; ratingGamesPlayed: number } | null;
  bluePlayer: { id: string; name: string; rating: number; ratingGamesPlayed: number } | null;
  deploySubmitted: boolean;
  opponentDeploySubmitted: boolean;
  lastSeenSeq: number;
  pendingMove: string | null;
  moveError: string | null;
  timeoutClaimSent: boolean;
  pendingDrawOffer: 'sent' | 'received' | null;
  pendingTakeback: 'sent' | 'received' | null;
  rematchStatus: 'idle' | 'sent' | 'received' | 'accepted' | 'declined' | 'expired';
  rematchNewGameId: string | null;

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
  resign: () => Promise<void>;
  offerDraw: () => Promise<void>;
  acceptDraw: () => Promise<void>;
  declineDraw: () => Promise<void>;
  expireDrawOffer: () => Promise<void>;
  requestTakeback: () => Promise<void>;
  acceptTakeback: () => Promise<void>;
  declineTakeback: () => Promise<void>;
  expireTakeback: () => Promise<void>;
  handleDrawOffer: (offeringColor: 'red' | 'blue') => void;
  handleDrawDeclined: () => void;
  handleDrawExpired: () => void;
  handleTakebackRequest: (requestingColor: 'red' | 'blue') => void;
  handleTakebackAccept: (fen: string) => void;
  handleTakebackDeclined: () => void;
  handleTakebackExpired: () => void;
  offerRematch: () => Promise<void>;
  acceptRematch: () => Promise<void>;
  declineRematch: () => Promise<void>;
  expireRematchOffer: () => Promise<void>;
  handleRematchOffer: (offeringColor: 'red' | 'blue') => void;
  handleRematchAccepted: (newGameId: string) => void;
  handleRematchDeclined: () => void;
  handleRematchExpired: () => void;
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

function derivePendingActionState(
  pendingAction: PendingActionData | null,
  myColor: 'red' | 'blue' | null
): Pick<GameStore, 'pendingDrawOffer' | 'pendingTakeback' | 'rematchStatus'> {
  if (!pendingAction || !myColor) {
    return { pendingDrawOffer: null, pendingTakeback: null, rematchStatus: 'idle' };
  }

  const ownership = pendingAction.color === myColor ? 'sent' : 'received';

  if (pendingAction.type === 'draw_offer') {
    return { pendingDrawOffer: ownership, pendingTakeback: null, rematchStatus: 'idle' };
  }

  if (pendingAction.type === 'rematch_offer') {
    return { pendingDrawOffer: null, pendingTakeback: null, rematchStatus: ownership };
  }

  return { pendingDrawOffer: null, pendingTakeback: ownership, rematchStatus: 'idle' };
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
  pendingDrawOffer: null,
  pendingTakeback: null,
  rematchStatus: 'idle',
  rematchNewGameId: null,

  setLastSeenSeq: (seq) => {
    set({ lastSeenSeq: seq });
  },

  initializeGame: (gameId, gameData) => {
    const clientPhase = resolveClientPhase(gameData.status, gameData.game_state.phase);
    const pendingActionState = derivePendingActionState(
      gameData.game_state.pending_action,
      gameData.my_color
    );

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
        rating: gameData.red_player.rating,
        ratingGamesPlayed: gameData.red_player.rating_games_played ?? 0
      },
      bluePlayer: {
        id: gameData.blue_player.id,
        name: gameData.blue_player.display_name,
        rating: gameData.blue_player.rating,
        ratingGamesPlayed: gameData.blue_player.rating_games_played ?? 0
      },
      ...pendingActionState
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
          .select('move_history, fen, phase, clocks, pending_action')
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
          .select('move_history, fen, phase, clocks, pending_action')
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
          .select('move_history, fen, phase, clocks, pending_action')
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
        .select('move_history, fen, phase, clocks, pending_action')
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
      clockRunning: false,
      pendingDrawOffer: null,
      pendingTakeback: null
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

  resign: async () => {
    const { gameId, phase } = get();
    if (!gameId || phase !== 'playing') return;

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'resign' }
      });
      // game_end broadcast will handle state transition
    } catch {
      // Network error — no-op, game_end broadcast is authoritative
    }
  },

  offerDraw: async () => {
    const { gameId, phase, pendingDrawOffer } = get();
    if (!gameId || phase !== 'playing' || pendingDrawOffer !== null) return;

    set({ pendingDrawOffer: 'sent' });

    try {
      const supabase = createClient();
      const response = await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'draw_offer' }
      });

      if (response.error) {
        set({ pendingDrawOffer: null });
      }
    } catch {
      set({ pendingDrawOffer: null });
    }
  },

  acceptDraw: async () => {
    const { gameId, pendingDrawOffer } = get();
    if (!gameId || pendingDrawOffer !== 'received') return;

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'draw_accept' }
      });
      // game_end broadcast handles transition
    } catch {
      // No-op
    }
  },

  declineDraw: async () => {
    const { gameId, pendingDrawOffer } = get();
    if (!gameId || pendingDrawOffer !== 'received') return;

    set({ pendingDrawOffer: null });

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'draw_decline' }
      });
    } catch {
      // No-op
    }
  },

  expireDrawOffer: async () => {
    const { gameId, pendingDrawOffer } = get();
    if (!gameId || pendingDrawOffer !== 'sent') return;

    set({ pendingDrawOffer: null });

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'expire_pending_action', pending_type: 'draw_offer' }
      });
    } catch {
      // Local clear is the UX requirement; server expiry is best-effort.
    }
  },

  requestTakeback: async () => {
    const { gameId, phase, moveHistory, pendingTakeback } = get();
    if (!gameId || phase !== 'playing' || moveHistory.length === 0 || pendingTakeback !== null)
      return;

    set({ pendingTakeback: 'sent' });

    try {
      const supabase = createClient();
      const response = await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'takeback_request' }
      });

      if (response.error) {
        set({ pendingTakeback: null });
      }
    } catch {
      set({ pendingTakeback: null });
    }
  },

  acceptTakeback: async () => {
    const { gameId, pendingTakeback } = get();
    if (!gameId || pendingTakeback !== 'received') return;

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'takeback_accept' }
      });
      // takeback_accept broadcast handles state update
    } catch {
      // No-op
    }
  },

  declineTakeback: async () => {
    const { gameId, pendingTakeback } = get();
    if (!gameId || pendingTakeback !== 'received') return;

    set({ pendingTakeback: null });

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'takeback_decline' }
      });
    } catch {
      // No-op
    }
  },

  expireTakeback: async () => {
    const { gameId, pendingTakeback } = get();
    if (!gameId || pendingTakeback !== 'sent') return;

    set({ pendingTakeback: null });

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'expire_pending_action', pending_type: 'takeback_request' }
      });
    } catch {
      // Local clear is the UX requirement; server expiry is best-effort.
    }
  },

  handleDrawOffer: (offeringColor) => {
    const { myColor } = get();
    if (offeringColor !== myColor) {
      set({ pendingDrawOffer: 'received' });
    }
  },

  handleDrawDeclined: () => {
    set({ pendingDrawOffer: null });
  },

  handleDrawExpired: () => {
    set({ pendingDrawOffer: null });
  },

  handleTakebackRequest: (requestingColor) => {
    const { myColor } = get();
    if (requestingColor !== myColor) {
      set({ pendingTakeback: 'received' });
    }
  },

  handleTakebackAccept: (fen) => {
    const currentState = get();
    if (currentState.engine) {
      const newEngine = new CoTuLenh(fen);
      const clockState = deriveClockState(currentState.phase, newEngine);
      set({
        engine: newEngine,
        moveHistory: currentState.moveHistory.slice(0, -1),
        pendingTakeback: null,
        ...clockState
      });
    } else {
      set({ pendingTakeback: null });
    }
  },

  handleTakebackDeclined: () => {
    set({ pendingTakeback: null });
  },

  handleTakebackExpired: () => {
    set({ pendingTakeback: null });
  },

  offerRematch: async () => {
    const { gameId, phase, rematchStatus } = get();
    if (!gameId || phase !== 'ended' || rematchStatus !== 'idle') return;

    set({ rematchStatus: 'sent' });

    try {
      const supabase = createClient();
      const response = await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'rematch_offer' }
      });

      if (response.error) {
        set({ rematchStatus: 'idle' });
      }
    } catch {
      set({ rematchStatus: 'idle' });
    }
  },

  acceptRematch: async () => {
    const { gameId, rematchStatus } = get();
    if (!gameId || rematchStatus !== 'received') return;

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'rematch_accept' }
      });
      // rematch_accepted broadcast handles state update
    } catch {
      // No-op
    }
  },

  declineRematch: async () => {
    const { gameId, rematchStatus } = get();
    if (!gameId || rematchStatus !== 'received') return;

    set({ rematchStatus: 'declined' });

    try {
      const supabase = createClient();
      await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'rematch_decline' }
      });
    } catch {
      // No-op
    }
  },

  expireRematchOffer: async () => {
    const { gameId, rematchStatus } = get();
    if (!gameId || rematchStatus !== 'sent') return;

    try {
      const supabase = createClient();
      const response = await supabase.functions.invoke('validate-move', {
        body: { game_id: gameId, action: 'expire_pending_action', pending_type: 'rematch_offer' }
      });

      if (!response.error) {
        set({ rematchStatus: 'idle' });
      }
    } catch {
      // Keep current state; server expiry is authoritative.
    }
  },

  handleRematchOffer: (offeringColor) => {
    const { myColor } = get();
    if (offeringColor !== myColor) {
      set({ rematchStatus: 'received' });
    }
  },

  handleRematchAccepted: (newGameId) => {
    set({ rematchStatus: 'accepted', rematchNewGameId: newGameId });
  },

  handleRematchDeclined: () => {
    set({ rematchStatus: 'declined', rematchNewGameId: null });
  },

  handleRematchExpired: () => {
    set({ rematchStatus: 'idle', rematchNewGameId: null });
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
    const pendingActionState = derivePendingActionState(
      serverState.pending_action,
      current.myColor
    );

    if (current.engine) {
      const newEngine = new CoTuLenh(serverState.fen);
      const clockState = deriveClockState(nextPhase, newEngine);
      set({
        phase: nextPhase,
        moveHistory: serverState.move_history,
        clocks: serverState.clocks,
        lastSyncTime: Date.now(),
        engine: newEngine,
        ...pendingActionState,
        ...clockState
      });
    } else {
      set({
        phase: nextPhase,
        moveHistory: serverState.move_history,
        clocks: serverState.clocks,
        lastSyncTime: Date.now(),
        ...pendingActionState
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
      timeoutClaimSent: false,
      pendingDrawOffer: null,
      pendingTakeback: null,
      rematchStatus: 'idle',
      rematchNewGameId: null
    });
  }
}));
