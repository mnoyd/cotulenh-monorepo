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
import { CoTuLenh, MoveResult } from '../src/cotulenh'

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
    captured: params.captured,
    combined: params.combined,
  }
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
  moves: MoveResult[],
  from: Square,
  to: Square,
): MoveResult | undefined => {
  return moves.find((m) => {
    let mTo: Square | undefined
    if (m.isDeploy) {
      const toValue = m.to
      if (typeof toValue === 'string') {
        // Single deploy move
        mTo = toValue === to ? to : undefined
      } else {
        // Deploy sequence with Map
        const toMap = toValue as Map<Square, Piece>
        if (toMap.has(to)) {
          mTo = to
        }
      }
    } else {
      mTo = m.to as Square
    }
    return m.from === from && mTo === to
  })
}

// Helper to extract just the 'to' squares for simple comparison
export const getDestinationSquares = (moves: MoveResult[]): Square[] => {
  return moves
    .flatMap((m) => {
      if (m.isDeploy) {
        const toValue = m.to
        if (typeof toValue === 'string') {
          return [toValue as Square]
        }
        return Array.from((toValue as Map<Square, Piece>).keys()) as Square[]
      }
      return [m.to as Square]
    })
    .sort()
}

// Helper to find a specific move in the verbose move list
export const findVerboseMove = (
  moves: MoveResult[],
  from: Square,
  to: Square, // Destination or Target
  options: {
    piece?: PieceSymbol
    isDeploy?: boolean
    isStayCapture?: boolean // Option parameter
  } = {},
): MoveResult | undefined => {
  return moves.find((m) => {
    const matchFrom = m.from === from

    let matchTo = false
    // For deploy moves, 'to' can be either a Map (for completed sequences) or Square (for individual moves)
    if (m.isDeploy) {
      const toValue = m.to
      if (typeof toValue === 'string') {
        // Single deploy move
        matchTo = toValue === to
      } else {
        // Deploy sequence with Map
        matchTo = (toValue as Map<Square, Piece>).has(to)
      }
    } else {
      matchTo = (m.to as Square) === to
    }

    const matchPieceType =
      options.piece === undefined || m.piece.type === options.piece
    const matchDeploy =
      options.isDeploy === undefined || m.isDeploy === options.isDeploy
    const matchStayCapture =
      options.isStayCapture === undefined ||
      (m.captured !== undefined && m.isStayCapture === options.isStayCapture)

    return (
      matchFrom && matchPieceType && matchDeploy && matchStayCapture && matchTo
    )
  })
}
