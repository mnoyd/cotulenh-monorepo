/**
 * Deploy Session Manager for handling multi-step deploy move sequences in CoTuLenh.
 *
 * Deploy moves allow players to deploy pieces from a stack to multiple destinations
 * in a single turn. This module tracks the deploy session state and validates
 * deploy operations.
 */

import type { Piece, Color } from './types';
import type { StackData } from './stack-manager';

/**
 * Represents a single deploy move within a deploy session.
 *
 * Each deploy move records:
 * - piece: The piece that was deployed
 * - from: The origin square (stack location)
 * - to: The destination square
 * - captured: Any piece that was captured at the destination (optional)
 */
export interface DeployMove {
  piece: Piece;
  from: number;
  to: number;
  captured?: Piece;
}

/**
 * Represents an active deploy session.
 *
 * A deploy session tracks the state of a multi-step deploy operation:
 * - stackSquare: The origin square where the stack is located
 * - originalStack: The complete stack before any deploys (for cancel/undo)
 * - deployedMoves: Array of deploy moves made so far
 * - remainingPieces: Pieces that still need to be deployed
 * - turn: The color of the player making the deploy
 */
export interface DeploySession {
  stackSquare: number;
  originalStack: StackData;
  deployedMoves: DeployMove[];
  remainingPieces: Piece[];
  turn: Color;
}

/**
 * Creates a new deploy session from a stack.
 *
 * @param stackSquare - The square where the stack is located
 * @param stack - The stack data (carrier + carried pieces)
 * @param turn - The color of the player making the deploy
 * @returns A new DeploySession initialized with the stack data
 */
export function createDeploySession(
  stackSquare: number,
  stack: StackData,
  turn: Color
): DeploySession {
  // All pieces in the stack need to be deployed (carrier + carried)
  const allPieces = [stack.carrier, ...stack.carried];

  // Create a deep copy of the original stack for potential cancel/undo
  const originalStack: StackData = {
    square: stack.square,
    carrier: { ...stack.carrier },
    carried: stack.carried.map((p) => ({ ...p }))
  };

  return {
    stackSquare,
    originalStack,
    deployedMoves: [],
    remainingPieces: allPieces.map((p) => ({ ...p })), // Copy pieces
    turn
  };
}

/**
 * Checks if a deploy session is complete (all pieces deployed).
 *
 * @param session - The deploy session to check
 * @returns True if all pieces have been deployed, false otherwise
 */
export function isDeploySessionComplete(session: DeploySession): boolean {
  return session.remainingPieces.length === 0;
}

/**
 * Gets the number of pieces remaining to be deployed.
 *
 * @param session - The deploy session to check
 * @returns Number of pieces still to be deployed
 */
export function getRemainingPieceCount(session: DeploySession): number {
  return session.remainingPieces.length;
}

/**
 * Checks if a specific piece is available to deploy in the session.
 *
 * @param session - The deploy session
 * @param piece - The piece to check
 * @returns True if the piece is in the remaining pieces list
 */
export function isPieceAvailableToDeploy(session: DeploySession, piece: Piece): boolean {
  return session.remainingPieces.some(
    (p) => p.type === piece.type && p.color === piece.color && p.heroic === piece.heroic
  );
}

/**
 * DeploySessionManager handles the lifecycle of deploy sessions.
 *
 * Provides methods to:
 * - Initiate a deploy session from a stack
 * - Deploy individual pieces
 * - Undo deploy steps
 * - Validate and commit the session
 * - Cancel and restore original state
 */
export class DeploySessionManager {
  /**
   * The currently active deploy session, or null if no session is active.
   */
  private activeSession: DeploySession | null = null;

  /**
   * Gets the currently active deploy session.
   *
   * @returns The active session, or null if no session is active
   */
  getActiveSession(): DeploySession | null {
    return this.activeSession;
  }

  /**
   * Checks if there is an active deploy session.
   *
   * @returns True if a session is active, false otherwise
   */
  hasActiveSession(): boolean {
    return this.activeSession !== null;
  }

  /**
   * Initiates a new deploy session from a stack.
   *
   * @param stackSquare - The square where the stack is located
   * @param stack - The stack data (carrier + carried pieces)
   * @param turn - The color of the player making the deploy
   * @throws Error if a session is already active
   */
  initiateSession(stackSquare: number, stack: StackData, turn: Color): void {
    if (this.activeSession !== null) {
      throw new Error('Cannot initiate a new deploy session while one is already active');
    }

    this.activeSession = createDeploySession(stackSquare, stack, turn);
  }

  /**
   * Deploys a piece from the stack to a destination square.
   *
   * Records the deploy move and removes the piece from remaining pieces.
   *
   * @param piece - The piece to deploy
   * @param to - The destination square
   * @param captured - Optional piece that was captured at the destination
   * @throws Error if no session is active or piece is not available
   */
  deployPiece(piece: Piece, to: number, captured?: Piece): void {
    if (!this.activeSession) {
      throw new Error('No active deploy session');
    }

    // Check if the piece is available to deploy
    const pieceIndex = this.activeSession.remainingPieces.findIndex(
      (p) => p.type === piece.type && p.color === piece.color && p.heroic === piece.heroic
    );

    if (pieceIndex === -1) {
      throw new Error(`Piece ${piece.type} is not available to deploy`);
    }

    // Remove the piece from remaining pieces
    this.activeSession.remainingPieces.splice(pieceIndex, 1);

    // Record the deploy move
    const deployMove: DeployMove = {
      piece: { ...piece },
      from: this.activeSession.stackSquare,
      to,
      captured: captured ? { ...captured } : undefined
    };

    this.activeSession.deployedMoves.push(deployMove);
  }

  /**
   * Undoes the last deploy step in the session.
   *
   * Removes the last deploy move and returns the piece to remaining pieces.
   *
   * @returns The undone deploy move, or undefined if no moves to undo
   */
  undoLastDeploy(): DeployMove | undefined {
    if (!this.activeSession) {
      return undefined;
    }

    if (this.activeSession.deployedMoves.length === 0) {
      return undefined;
    }

    // Remove the last deploy move
    const lastMove = this.activeSession.deployedMoves.pop()!;

    // Return the piece to remaining pieces
    this.activeSession.remainingPieces.push({ ...lastMove.piece });

    return lastMove;
  }

  /**
   * Checks if the deploy session can be committed.
   *
   * A session can be committed when all pieces have been deployed.
   *
   * @returns True if the session can be committed, false otherwise
   */
  canCommit(): boolean {
    if (!this.activeSession) {
      return false;
    }

    return isDeploySessionComplete(this.activeSession);
  }

  /**
   * Commits the deploy session, finalizing all deploy moves.
   *
   * Clears the active session and returns the completed session data.
   *
   * @returns The completed deploy session
   * @throws Error if no session is active or session is not complete
   */
  commit(): DeploySession {
    if (!this.activeSession) {
      throw new Error('No active deploy session to commit');
    }

    if (!this.canCommit()) {
      throw new Error('Cannot commit deploy session: not all pieces have been deployed');
    }

    const completedSession = this.activeSession;
    this.activeSession = null;

    return completedSession;
  }

  /**
   * Cancels the active deploy session.
   *
   * Returns the original stack data for restoration.
   *
   * @returns The original stack data before the deploy session started
   * @throws Error if no session is active
   */
  cancel(): StackData {
    if (!this.activeSession) {
      throw new Error('No active deploy session to cancel');
    }

    const originalStack = this.activeSession.originalStack;
    this.activeSession = null;

    return originalStack;
  }

  /**
   * Clears any active session without validation.
   * Used for resetting state.
   */
  clear(): void {
    this.activeSession = null;
  }
}
