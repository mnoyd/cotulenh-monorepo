import { InternalMove, Piece, Square, SQUARE_MAP } from './type'
import {
  createCombineStackFromPieces,
  flattenPiece,
  getStepsBetweenSquares,
} from './utils'

export interface DeployMove {
  from: Square
  moves: { piece: Piece; to: Square }[]
  stay?: Piece
}

export interface InternalDeployMove {
  from: number
  moves: InternalMove[]
  stay?: Piece
  captured?: Piece[]
}

export function createInternalDeployMove(
  originalPiece: Piece,
  deployMove: DeployMove,
  validMoves: InternalMove[],
): InternalDeployMove {
  if (deployMove.stay) {
    const { combined, uncombined } = createCombineStackFromPieces(
      flattenPiece(deployMove.stay),
    )
    if (!combined || (uncombined?.length ?? 0) > 0) {
      throw new Error('Deploy move error: stay piece not valid')
    }
  }
  const dests = new Map<Square, Piece[]>()
  for (const move of deployMove.moves) {
    if (dests.has(move.to)) {
      dests.get(move.to)?.push(move.piece)
    } else {
      dests.set(move.to, [move.piece])
    }
  }
  const cleanedDupDests: { from: Square; to: Square; pieces: Piece[] }[] =
    Array.from(dests, ([to, pieces]) => {
      return { from: deployMove.from, to, pieces }
    })

  const combinedDests: { from: Square; to: Square; piece: Piece }[] =
    cleanedDupDests
      .map((dest) => {
        const { combined, uncombined } = createCombineStackFromPieces(
          dest.pieces,
        )
        if (!combined || (uncombined?.length ?? 0) > 0) return null
        // Only include the properties required by the type
        return { from: dest.from, to: dest.to, piece: combined }
      })
      .filter(
        (dest): dest is { from: Square; to: Square; piece: Piece } =>
          dest !== null,
      )
  const cleanedAllMovingPiece = combinedDests.reduce<Piece[]>((acc, dest) => {
    acc.push(...flattenPiece(dest.piece))
    return acc
  }, [])
  const allPieces = [
    ...cleanedAllMovingPiece,
    ...(deployMove.stay ? flattenPiece(deployMove.stay) : []),
  ]
  if (allPieces.length !== flattenPiece(originalPiece).length) {
    throw new Error('Deploy move error: moving piece not found')
  }
  const toSquareNumDests = combinedDests.map((dest) => {
    return {
      from: SQUARE_MAP[dest.from],
      to: SQUARE_MAP[dest.to],
      piece: dest.piece,
    }
  })

  const foundMove: InternalMove[] = []
  for (const move of validMoves) {
    const destIndex = toSquareNumDests.findIndex(
      (dest) =>
        dest.from === move.from &&
        dest.to === move.to &&
        dest.piece.type === move.piece.type,
    )
    if (destIndex !== -1) {
      foundMove.push({ ...move, piece: toSquareNumDests[destIndex].piece })
    }
  }
  if (foundMove.length !== toSquareNumDests.length) {
    throw new Error('Deploy move error: move not found')
  }
  foundMove.sort((a, b) => {
    const aSteps = getStepsBetweenSquares(a.from, a.to)
    const bSteps = getStepsBetweenSquares(b.from, b.to)
    if (aSteps === -1 || bSteps === -1)
      throw new Error('Deploy move error: invalid move')
    return aSteps > bSteps ? -1 : 1
  })
  const captured: Piece[] = []
  foundMove.forEach((move) => {
    captured.push(move.piece)
  })
  return {
    from: SQUARE_MAP[deployMove.from],
    moves: foundMove,
    stay: deployMove.stay,
    captured,
  }
}
export function isInternalDeployMove(
  move: InternalMove | InternalDeployMove,
): move is InternalDeployMove {
  return (move as InternalDeployMove).moves !== undefined
}
