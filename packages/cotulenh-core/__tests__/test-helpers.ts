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
import { CoTuLenh, Move, DeploySequence } from '../src/cotulenh'

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
  moves: (Move | DeploySequence | any)[], // Use any or Import DeployMove to avoid circular deps if needed, casting for now
  from: Square,
  to: Square,
): Move | DeploySequence | undefined => {
  return moves.find((m) => {
    let mTo: Square | undefined
    if (m instanceof DeploySequence) {
      // For deploy sequence, we consider it a match if 'to' is one of the destinations
      if ((m as DeploySequence).to.has(to)) {
        mTo = to
      }
    } else {
      mTo = (m as Move).to
    }
    return m.from === from && mTo === to
  })
}

// Helper to extract just the 'to' squares for simple comparison
export const getDestinationSquares = (
  moves: (Move | DeploySequence | any)[],
): Square[] => {
  return moves
    .flatMap((m) => {
      if (m instanceof DeploySequence) {
        return Array.from((m as DeploySequence).to.keys()) as Square[]
      }
      return [(m as Move).to]
    })
    .sort()
}

// Helper to find a specific move in the verbose move list
export const findVerboseMove = (
  moves: (Move | DeploySequence)[],
  from: Square,
  to: Square, // Destination or Target
  options: {
    piece?: PieceSymbol
    isDeploy?: boolean
    isStayCapture?: boolean // Option parameter
  } = {},
): Move | DeploySequence | undefined => {
  return moves.find((m) => {
    const matchFrom = m.from === from

    let matchTo = false
    if (m instanceof DeploySequence) {
      matchTo = (m as DeploySequence).to.has(to)
    } else {
      matchTo = (m as Move).to === to
    }

    const matchPieceType =
      options.piece === undefined || m.piece.type === options.piece
    const matchDeploy =
      options.isDeploy === undefined || m.isDeploy === options.isDeploy
    const matchStayCapture =
      options.isStayCapture === undefined ||
      (m instanceof Move &&
        m.captured !== undefined &&
        m.isStayCapture() === options.isStayCapture)

    return (
      matchFrom && matchPieceType && matchDeploy && matchStayCapture && matchTo
    )
  })
}
