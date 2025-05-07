import {
  Piece,
  PieceSymbol,
  Color,
  InternalMove,
  RED,
  Square,
  COMMANDER,
  BLUE,
  INFANTRY,
} from '../src/type'
import { CoTuLenh, Move } from '../src/cotulenh'

/**
 * Create a Piece object for testing
 */
export function makePiece(
  type: PieceSymbol,
  color: Color = RED,
  heroic: boolean = false,
  carrying: Piece[] = [],
): Piece {
  return {
    type,
    color,
    heroic,
    ...(carrying.length > 0 ? { carrying } : {}),
  }
}

/**
 * Create an InternalMove object for testing
 * Requires at least a piece. Other fields can be overridden.
 */
export function makeMove(
  params: Partial<InternalMove> & { piece: Piece },
): InternalMove {
  return {
    color: params.color ?? 'r',
    from: params.from ?? 0,
    to: params.to ?? 1,
    piece: params.piece,
    flags: params.flags ?? 1,
    otherPiece: params.otherPiece,
  }
}

/**
 * Create a CoTuLenh game instance for testing
 */
export function setupGame(fen: string): CoTuLenh {
  return new CoTuLenh(fen)
}

export function setupGameBasic(): CoTuLenh {
  const game = new CoTuLenh()
  game.clear()
  game.put({ type: COMMANDER, color: RED }, 'f1')
  game.put({ type: COMMANDER, color: BLUE }, 'g12')
  game.put({ type: INFANTRY, color: RED }, 'k1')
  game.put({ type: INFANTRY, color: BLUE }, 'k12')
  return game
}

// Simplified helper to check if a move exists in the verbose list
// (We don't need all options of findVerboseMove for these basic tests)
export const findMove = (
  moves: Move[],
  from: Square,
  to: Square,
): Move | undefined => {
  return moves.find((m) => m.from === from && m.to === to)
}

// Helper to extract just the 'to' squares for simple comparison
export const getDestinationSquares = (moves: Move[]): Square[] => {
  return moves.map((m) => m.to).sort()
}
