import { Piece, PieceSymbol, Color, InternalMove, RED } from '../src/type'
import { CoTuLenh } from '../src/cotulenh'

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
    becameHeroic: params.becameHeroic,
    otherPiece: params.otherPiece,
  }
}

/**
 * Create a CoTuLenh game instance for testing
 */
export function setupGame(fen: string): CoTuLenh {
  return new CoTuLenh(fen)
}
