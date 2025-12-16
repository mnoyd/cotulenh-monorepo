import type { CoTuLenh, MoveResult } from '@repo/cotulenh-core';
import type { OrigMove, DestMove } from '@repo/cotulenh-board';
import { roleToType } from './mappers';

// ============================================================================
// MOVE EXECUTION
// ============================================================================

/**
 * Execute a move on the game instance
 * Handles piece selection from stacks and deploy session detection
 */
export function makeMove(game: CoTuLenh, orig: OrigMove, dest: DestMove): MoveResult | null {
  try {
    const pieceAtSquare = game.get(orig.square);
    if (!pieceAtSquare) {
      throw new Error(`No piece at ${orig.square}`);
    }

    // Determine which piece is moving (important for stacks)
    const pieceToMove = selectPieceFromStack(pieceAtSquare, orig.type);

    // Check if this is a deploy move
    const isDeploy = !!game.getSession() || !!orig.stackMove;

    return game.move({
      from: orig.square,
      to: dest.square,
      piece: pieceToMove.type,
      ...(dest.stay !== undefined && { stay: dest.stay }),
      deploy: isDeploy
    });
  } catch (error) {
    console.error('Error making move:', error);
    throw error;
  }
}

/**
 * Helper to select the correct piece from a stack
 */
function selectPieceFromStack(pieceAtSquare: any, selectedRole?: any) {
  // If no specific type selected, use the carrier piece
  if (!selectedRole || roleToType(selectedRole) === pieceAtSquare.type) {
    return pieceAtSquare;
  }

  // Find the selected piece in the carrying array
  const carriedPiece = pieceAtSquare.carrying?.find(
    (p: any) => p.type === roleToType(selectedRole)
  );

  if (carriedPiece) {
    return {
      type: carriedPiece.type,
      color: carriedPiece.color,
      heroic: carriedPiece.heroic
    };
  }

  return pieceAtSquare;
}

// ============================================================================
// DEPLOY SESSION MANAGEMENT
// ============================================================================

export interface CommitResult {
  success: boolean;
  san?: string;
  reason?: string;
}

/**
 * Commit the active deploy session
 * Returns the SAN notation of the completed deploy move
 */
export function commitDeploySession(game: CoTuLenh): CommitResult {
  const session = game.getSession();
  if (!session || !session.isDeploy) {
    return { success: false, reason: 'No deploy session active' };
  }

  const result = game.commitSession();

  if (!result.success) {
    return { success: false, reason: result.reason };
  }

  // Get the SAN from the last history entry
  const history = game.history();
  const san = history[history.length - 1] || 'Deploy';

  return { success: true, san };
}

/**
 * Cancel the active deploy session
 * Restores the game to pre-deploy state
 */
export function cancelDeploySession(game: CoTuLenh): void {
  game.cancelSession();
}
