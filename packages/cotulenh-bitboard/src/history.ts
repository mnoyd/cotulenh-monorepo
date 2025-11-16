/**
 * History and undo structures for CoTuLenh bitboard engine.
 *
 * Implements a two-level undo pattern:
 * - Level 1: Minimal undo info for validation (~50 bytes)
 * - Level 2: Full history for user undo (~500 bytes)
 *
 * This approach optimizes memory usage:
 * - Validating 30 moves: 50 bytes (reused) vs 15 KB (full snapshots)
 * - User history: 500 bytes × moves (acceptable)
 *
 * See: docs/MAKE-UNDO-WITHOUT-HISTORY.md
 */

import type { Bitboard } from './bitboard';
import type { Piece, Color } from './types';
import type { StackData } from './stack-manager';
import type { DeploySession } from './deploy-session';
import type { Move } from './move-generator';

/**
 * Represents changes to a stack during a move.
 * Used for minimal undo information.
 */
export interface StackDelta {
  /** Square where the stack was modified */
  square: number;
  /** Previous stack state (before the move) */
  previousStack?: StackData;
  /** New stack state (after the move) */
  newStack?: StackData;
}

/**
 * Minimal undo information for temporary move execution.
 *
 * Used during legality checking (make/undo pattern).
 * Only stores what changed during the move (~50 bytes).
 *
 * This is Level 1 undo - for validation only, not user undo.
 */
export interface UndoInfo {
  /** The move that was made */
  move: Move;

  /** Piece that was captured, if any */
  captured?: Piece;

  /** Changes to stacks, if any */
  stackChanges?: StackDelta[];

  /** Previous heroic status of the moved piece */
  wasHeroic?: boolean;

  /** Previous air defense zone state (for anti-air pieces) */
  hadAirDefenseZone?: boolean;
}

/**
 * Complete bitboard state snapshot.
 * Used for full history entries.
 */
export interface BitboardSnapshot {
  // Piece type bitboards
  commanders: Bitboard;
  infantry: Bitboard;
  tanks: Bitboard;
  militia: Bitboard;
  engineers: Bitboard;
  artillery: Bitboard;
  antiAir: Bitboard;
  missiles: Bitboard;
  airForce: Bitboard;
  navy: Bitboard;
  headquarters: Bitboard;

  // Color bitboards
  redPieces: Bitboard;
  bluePieces: Bitboard;

  // Combined bitboards
  occupied: Bitboard;

  // Special bitboards
  carriers: Bitboard;
  heroic: Bitboard;
}

/**
 * Complete stack state snapshot.
 * Used for full history entries.
 */
export interface StackSnapshot {
  /** All stacks at the time of the snapshot */
  stacks: StackData[];
}

/**
 * Complete game state snapshot.
 * Used for full history entries.
 */
export interface GameStateSnapshot {
  /** Current turn */
  turn: Color;

  /** Half-move counter (for fifty-move rule) */
  halfMoves: number;

  /** Full move number */
  moveNumber: number;

  /** Commander positions */
  commanders: {
    red: number;
    blue: number;
  };
}

/**
 * Full history entry for user undo/redo.
 *
 * Stores complete state before a move was made (~500 bytes).
 * Allows full restoration of game state.
 *
 * This is Level 2 undo - for user undo/redo operations.
 */
export interface HistoryEntry {
  /** The move that was made */
  move: Move;

  /** Complete bitboard state before the move */
  bitboards: BitboardSnapshot;

  /** Complete stack state before the move */
  stacks: StackSnapshot;

  /** Deploy session state before the move (if any) */
  deploySession?: DeploySession;

  /** Complete game state before the move */
  gameState: GameStateSnapshot;

  /** Timestamp when the move was made */
  timestamp: number;
}

/**
 * Creates a bitboard snapshot from a position.
 *
 * @param position - The position to snapshot
 * @returns Complete bitboard state
 */
export function createBitboardSnapshot(position: any): BitboardSnapshot {
  return {
    commanders: { ...position.commanders },
    infantry: { ...position.infantry },
    tanks: { ...position.tanks },
    militia: { ...position.militia },
    engineers: { ...position.engineers },
    artillery: { ...position.artillery },
    antiAir: { ...position.antiAir },
    missiles: { ...position.missiles },
    airForce: { ...position.airForce },
    navy: { ...position.navy },
    headquarters: { ...position.headquarters },
    redPieces: { ...position.redPieces },
    bluePieces: { ...position.bluePieces },
    occupied: { ...position.occupied },
    carriers: { ...position.carriers },
    heroic: { ...position.heroic }
  };
}

/**
 * Creates a stack snapshot from a position.
 *
 * @param position - The position to snapshot
 * @returns Complete stack state
 */
export function createStackSnapshot(position: any): StackSnapshot {
  const stacks = position.stackManager.getAllStacks().map((stack: StackData) => ({
    square: stack.square,
    carrier: { ...stack.carrier },
    carried: stack.carried.map((p: Piece) => ({ ...p }))
  }));

  return { stacks };
}

/**
 * Creates a game state snapshot.
 *
 * @param turn - Current turn
 * @param halfMoves - Half-move counter
 * @param moveNumber - Full move number
 * @param redCommander - Red commander square
 * @param blueCommander - Blue commander square
 * @returns Complete game state
 */
export function createGameStateSnapshot(
  turn: Color,
  halfMoves: number,
  moveNumber: number,
  redCommander: number,
  blueCommander: number
): GameStateSnapshot {
  return {
    turn,
    halfMoves,
    moveNumber,
    commanders: {
      red: redCommander,
      blue: blueCommander
    }
  };
}

/**
 * Creates a full history entry.
 *
 * @param move - The move being made
 * @param position - The position before the move
 * @param turn - Current turn
 * @param halfMoves - Half-move counter
 * @param moveNumber - Full move number
 * @param redCommander - Red commander square
 * @param blueCommander - Blue commander square
 * @returns Complete history entry
 */
export function createHistoryEntry(
  move: Move,
  position: any,
  turn: Color,
  halfMoves: number,
  moveNumber: number,
  redCommander: number,
  blueCommander: number
): HistoryEntry {
  const deploySession = position.getDeploySession();

  return {
    move,
    bitboards: createBitboardSnapshot(position),
    stacks: createStackSnapshot(position),
    deploySession: deploySession
      ? {
          stackSquare: deploySession.stackSquare,
          originalStack: {
            square: deploySession.originalStack.square,
            carrier: { ...deploySession.originalStack.carrier },
            carried: deploySession.originalStack.carried.map((p: Piece) => ({ ...p }))
          },
          deployedMoves: deploySession.deployedMoves.map((dm: any) => ({
            piece: { ...dm.piece },
            from: dm.from,
            to: dm.to,
            captured: dm.captured ? { ...dm.captured } : undefined
          })),
          remainingPieces: deploySession.remainingPieces.map((p: Piece) => ({ ...p })),
          turn: deploySession.turn
        }
      : undefined,
    gameState: createGameStateSnapshot(turn, halfMoves, moveNumber, redCommander, blueCommander),
    timestamp: Date.now()
  };
}

/**
 * Restores bitboard state from a snapshot.
 *
 * @param position - The position to restore to
 * @param snapshot - The bitboard snapshot
 */
export function restoreBitboardSnapshot(position: any, snapshot: BitboardSnapshot): void {
  position.commanders = { ...snapshot.commanders };
  position.infantry = { ...snapshot.infantry };
  position.tanks = { ...snapshot.tanks };
  position.militia = { ...snapshot.militia };
  position.engineers = { ...snapshot.engineers };
  position.artillery = { ...snapshot.artillery };
  position.antiAir = { ...snapshot.antiAir };
  position.missiles = { ...snapshot.missiles };
  position.airForce = { ...snapshot.airForce };
  position.navy = { ...snapshot.navy };
  position.headquarters = { ...snapshot.headquarters };
  position.redPieces = { ...snapshot.redPieces };
  position.bluePieces = { ...snapshot.bluePieces };
  position.occupied = { ...snapshot.occupied };
  position.carriers = { ...snapshot.carriers };
  position.heroic = { ...snapshot.heroic };
}

/**
 * Restores stack state from a snapshot.
 *
 * @param position - The position to restore to
 * @param snapshot - The stack snapshot
 */
export function restoreStackSnapshot(position: any, snapshot: StackSnapshot): void {
  position.stackManager.clear();

  for (const stack of snapshot.stacks) {
    position.stackManager.createStack(
      { ...stack.carrier },
      stack.carried.map((p: Piece) => ({ ...p })),
      stack.square
    );
  }
}

/**
 * Restores game state from a snapshot.
 *
 * @param snapshot - The game state snapshot
 * @returns The restored game state values
 */
export function restoreGameStateSnapshot(snapshot: GameStateSnapshot): {
  turn: Color;
  halfMoves: number;
  moveNumber: number;
  redCommander: number;
  blueCommander: number;
} {
  return {
    turn: snapshot.turn,
    halfMoves: snapshot.halfMoves,
    moveNumber: snapshot.moveNumber,
    redCommander: snapshot.commanders.red,
    blueCommander: snapshot.commanders.blue
  };
}

/**
 * Executes a move temporarily for validation purposes.
 *
 * This is Level 1 undo - minimal information for legality checking.
 * Returns only what changed during the move (~50 bytes).
 *
 * Used by move generation to check if a move leaves the commander in check.
 *
 * @param position - The position to execute the move on
 * @param move - The move to execute
 * @returns Minimal undo information to reverse the move
 */
export function makeMoveTemporary(position: any, move: Move): UndoInfo {
  const undoInfo: UndoInfo = {
    move: { ...move }
  };

  // Check if the moved piece is heroic (need to restore this)
  const movedPiece = position.getPieceAt(move.from);
  if (movedPiece?.heroic) {
    undoInfo.wasHeroic = true;
  }

  // Check if destination is occupied (capture)
  if (position.isOccupied(move.to)) {
    undoInfo.captured = position.getPieceAt(move.to);
  }

  // Track stack changes
  const stackChanges: StackDelta[] = [];

  // If moving from a stack square, record the stack state
  if (position.stackManager.hasStack(move.from)) {
    const previousStack = position.stackManager.getStack(move.from);
    if (previousStack) {
      stackChanges.push({
        square: move.from,
        previousStack: {
          square: previousStack.square,
          carrier: { ...previousStack.carrier },
          carried: previousStack.carried.map((p: Piece) => ({ ...p }))
        }
      });
    }
  }

  // If moving to a stack square (combination), record the stack state
  if (position.stackManager.hasStack(move.to)) {
    const previousStack = position.stackManager.getStack(move.to);
    if (previousStack) {
      stackChanges.push({
        square: move.to,
        previousStack: {
          square: previousStack.square,
          carrier: { ...previousStack.carrier },
          carried: previousStack.carried.map((p: Piece) => ({ ...p }))
        }
      });
    }
  }

  if (stackChanges.length > 0) {
    undoInfo.stackChanges = stackChanges;
  }

  // Check if the piece has air defense (need to update zones)
  const pieceType = move.piece.type;
  if (pieceType === 'g' || pieceType === 's' || pieceType === 'n') {
    undoInfo.hadAirDefenseZone = true;
  }

  // Execute the move
  // 1. Remove piece from source square
  position.removePiece(move.from);

  // 2. If destination is occupied, remove the captured piece
  if (undoInfo.captured) {
    position.removePiece(move.to);
  }

  // 3. Place piece at destination
  position.placePiece(move.piece, move.to);

  // 4. Update air defense zones if needed
  if (undoInfo.hadAirDefenseZone) {
    position.updateAirDefenseZone(
      move.from,
      move.to,
      pieceType,
      move.piece.heroic || false,
      move.piece.color
    );
  }

  return undoInfo;
}

/**
 * Undoes a temporary move using minimal undo information.
 *
 * This is Level 1 undo - restores only what changed.
 * Used to reverse temporary moves made during legality checking.
 *
 * @param position - The position to undo the move on
 * @param undoInfo - The undo information from makeMoveTemporary
 */
export function undoMoveTemporary(position: any, undoInfo: UndoInfo): void {
  const move = undoInfo.move;

  // 1. Remove piece from destination
  position.removePiece(move.to);

  // 2. Restore captured piece if any
  if (undoInfo.captured) {
    position.placePiece(undoInfo.captured, move.to);
  }

  // 3. Restore piece at source
  const restoredPiece: Piece = {
    ...move.piece,
    heroic: undoInfo.wasHeroic || move.piece.heroic
  };
  position.placePiece(restoredPiece, move.from);

  // 4. Restore stack changes if any
  if (undoInfo.stackChanges) {
    for (const delta of undoInfo.stackChanges) {
      // Destroy any stack that was created
      if (position.stackManager.hasStack(delta.square)) {
        position.stackManager.destroyStack(delta.square);
      }

      // Restore previous stack if it existed
      if (delta.previousStack) {
        position.stackManager.createStack(
          { ...delta.previousStack.carrier },
          delta.previousStack.carried.map((p: Piece) => ({ ...p })),
          delta.square
        );
      }
    }
  }

  // 5. Restore air defense zones if needed
  if (undoInfo.hadAirDefenseZone) {
    position.updateAirDefenseZone(
      move.to,
      move.from,
      move.piece.type,
      move.piece.heroic || false,
      move.piece.color
    );
  }
}

/**
 * Options for making a permanent move.
 */
export interface MakeMovePermanentOptions {
  position: any;
  move: Move;
  turn: Color;
  halfMoves: number;
  moveNumber: number;
  redCommander: number;
  blueCommander: number;
  history: HistoryEntry[];
}

/**
 * Executes a move permanently for user moves.
 *
 * This is Level 2 - full state snapshot for user undo/redo.
 * Saves complete state before executing the move (~500 bytes).
 *
 * Used by the public API when a user makes a move.
 *
 * @param options - Options for making the move
 * @returns The created history entry
 */
export function makeMovePermanent(options: MakeMovePermanentOptions): HistoryEntry {
  const { position, move, turn, halfMoves, moveNumber, redCommander, blueCommander, history } =
    options;
  // Create full history entry before making the move
  const historyEntry = createHistoryEntry(
    move,
    position,
    turn,
    halfMoves,
    moveNumber,
    redCommander,
    blueCommander
  );

  // Execute the move
  // 1. Check if destination is occupied (capture)
  const captured = position.isOccupied(move.to) ? position.removePiece(move.to) : null;

  // 2. Remove piece from source square
  const movedPiece = position.removePiece(move.from);

  // 3. Place piece at destination
  if (movedPiece) {
    position.placePiece(movedPiece, move.to);
  }

  // 4. Update air defense zones if the piece provides air defense
  const pieceType = move.piece.type;
  if (pieceType === 'g' || pieceType === 's' || pieceType === 'n') {
    position.updateAirDefenseZone(
      move.from,
      move.to,
      pieceType,
      move.piece.heroic || false,
      move.piece.color
    );
  }

  // 5. If captured piece had air defense, remove its zone
  if (captured && (captured.type === 'g' || captured.type === 's' || captured.type === 'n')) {
    position.removeAirDefenseZone(move.to, captured.color);
  }

  // 6. Handle deploy session if active
  if (position.hasActiveDeploySession()) {
    const session = position.getDeploySession();
    if (session) {
      // Deploy moves are handled through the deploy session manager
      // The position methods already update the session state
    }
  }

  // Add to history
  history.push(historyEntry);

  return historyEntry;
}

/**
 * Undoes the last move using full history.
 *
 * This is Level 2 undo - restores complete state from history.
 * Used by the public API for user undo operations.
 *
 * @param position - The position to restore
 * @param history - History array to pop from
 * @returns The restored history entry, or undefined if no history
 */
export function undoMovePermanent(
  position: any,
  history: HistoryEntry[]
): { entry: HistoryEntry; gameState: GameStateSnapshot } | undefined {
  // Pop the last history entry
  const entry = history.pop();
  if (!entry) {
    return undefined;
  }

  // Restore complete state
  restoreBitboardSnapshot(position, entry.bitboards);
  restoreStackSnapshot(position, entry.stacks);

  // Restore deploy session if it existed
  if (entry.deploySession) {
    // Clear current session
    position.deploySessionManager.clear();

    // Recreate the session
    position.deploySessionManager.initiateSession(
      entry.deploySession.stackSquare,
      entry.deploySession.originalStack,
      entry.deploySession.turn
    );

    // Replay deployed moves
    for (const deployMove of entry.deploySession.deployedMoves) {
      position.deploySessionManager.deployPiece(
        deployMove.piece,
        deployMove.to,
        deployMove.captured
      );
    }
  } else {
    // Clear any active session
    position.deploySessionManager.clear();
  }

  // Recalculate air defense zones from restored state
  position.recalculateAirDefenseZones();

  return {
    entry,
    gameState: entry.gameState
  };
}
