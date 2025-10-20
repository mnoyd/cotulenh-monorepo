import { CoTuLenh, Move } from './cotulenh'
import {
  canStayOnSquare,
  generateMoveCandidateForSinglePieceInStack,
} from './move-generation.js'
import {
  algebraic,
  Color,
  InternalMove,
  Piece,
  PieceSymbol,
  Square,
  SQUARE_MAP,
} from './type.js'
import {
  cloneInternalDeployMove,
  createAllPieceSplits,
  createCombineStackFromPieces,
  flattenPiece,
  getStepsBetweenSquares,
  makeSanPiece,
} from './utils.js'

export interface DeployMoveRequest {
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
  deployMove: DeployMoveRequest,
  validMoves: InternalMove[],
): InternalDeployMove {
  if (!originalPiece) throw new Error('Original piece not found')
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
    throw new Error(
      'Deploy move error: ambiguous deploy move. some pieces are not clear whether moved or stay',
    )
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
    if (move.captured) {
      captured.push(move.captured)
    }
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
export class DeployMove {
  color: Color
  from: Square
  to: Map<Square, Piece> // Destination square (piece's final location)
  stay: Piece | undefined
  captured?: Piece[]
  san?: string // Standard Algebraic Notation (needs implementation)
  lan?: string // Long Algebraic Notation (needs implementation)
  before: string // FEN before move
  after: string // FEN after move
  constructor(game: CoTuLenh, internal: InternalDeployMove) {
    this.color = internal.moves[0].color
    this.from = algebraic(internal.from)
    this.to = internal.moves.reduce<Map<Square, Piece>>((acc, move) => {
      acc.set(algebraic(move.to), move.piece)
      return acc
    }, new Map())
    this.stay = internal.stay
    this.captured = internal.captured
    this.before = game.fen()

    // Generate SAN/LAN before making the move to avoid issues with moved pieces
    const [san, lan] = deployMoveToSanLan(game, internal)
    this.san = san
    this.lan = lan

    // Generate the FEN for the 'after' key
    game['_makeMove'](internal)
    this.after = game.fen()
    game['_undoMove']()
  }
}

export function deployMoveToSanLan(
  game: CoTuLenh,
  move: InternalDeployMove,
): [string, string] {
  const legalMoves = game['_moves']({ legal: true })
  const allMoveSan = move.moves.map((m: InternalMove) => {
    return game['_moveToSanLan'](m, legalMoves)[0]
  })
  const movesSan = allMoveSan.join(',')
  const stay = move.stay ? `${makeSanPiece(move.stay)}<` : ''
  const san = `${stay}${movesSan}`
  const lan = `${algebraic(move.from)}:${san}`
  return [san, lan]
}

/**
 * Generates all possible deploy moves for each piece in all possible stack splits.
 * For a stack like (F|TI), it calculates all ways to split the stack and
 * determines valid moves for each piece in each split, including options for pieces to stay.
 *
 * @param gameInstance - The current game instance
 * @param stackSquare - The square where the stack is located (in internal 0xf0 format)
 * @returns A map where keys are piece combinations and values are arrays of InternalDeployMove objects
 */
export function generateStackSplitMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
): InternalDeployMove[] {
  const pieceAtSquare = gameInstance.get(stackSquare)
  if (!pieceAtSquare) {
    return []
  }
  const splittedPieces = createAllPieceSplits(pieceAtSquare)
  const moveCandidates = generateMoveCandidateForSinglePieceInStack(
    gameInstance,
    stackSquare,
  )
  const allInternalStackMoves: InternalDeployMove[] = []
  for (const splittedPiece of splittedPieces) {
    const internalStackMove = makeStackMoveFromCombination(
      stackSquare,
      [],
      splittedPiece,
      moveCandidates,
    )
    allInternalStackMoves.push(...internalStackMove)
  }
  const totalStackPiece = flattenPiece(pieceAtSquare).length
  const cleanedInternalStackMoves = allInternalStackMoves.filter((move) => {
    const haveMove = move.moves.length > 0
    const totalPiece =
      move.moves.reduce((acc, m) => acc + flattenPiece(m.piece).length, 0) +
      (move.stay ? flattenPiece(move.stay).length : 0)
    const deployCountedForAllPiece = totalPiece === totalStackPiece
    return haveMove && deployCountedForAllPiece
  })
  return cleanedInternalStackMoves
}

const makeStackMoveFromCombination = (
  fromSquare: number,
  stackMoves: InternalDeployMove[],
  remaining: Piece[],
  moveCandidates: Map<PieceSymbol, InternalMove[]>,
): InternalDeployMove[] => {
  const currentStackPiece = remaining.pop()
  if (!currentStackPiece) return stackMoves
  const moveCandiateForCurrentPiece = moveCandidates.get(currentStackPiece.type)
  if (!moveCandiateForCurrentPiece || moveCandiateForCurrentPiece.length === 0)
    return makeStackMoveFromCombination(
      fromSquare,
      stackMoves,
      remaining,
      moveCandidates,
    )
  const newStackMoves: InternalDeployMove[] = []
  if (stackMoves.length === 0) {
    for (const move of moveCandiateForCurrentPiece) {
      newStackMoves.push({
        from: fromSquare,
        moves: [
          {
            from: fromSquare,
            to: move.to,
            piece: currentStackPiece,
            color: move.color,
            flags: move.flags,
          },
        ],
      })
    }
    if (canStayOnSquare(fromSquare, currentStackPiece.type)) {
      newStackMoves.push({
        from: fromSquare,
        moves: [],
        stay: currentStackPiece,
      })
    }
    stackMoves.push(...newStackMoves)
  } else {
    for (const stackMove of stackMoves) {
      for (const move of moveCandiateForCurrentPiece) {
        const newSquares = stackMove.moves.map((m) => m.to)
        if (newSquares.includes(move.to)) continue
        const newStackMove = cloneInternalDeployMove(stackMove)
        newStackMove.moves.push({
          from: fromSquare,
          to: move.to,
          piece: currentStackPiece,
          color: move.color,
          flags: move.flags,
        })
        newStackMoves.push(newStackMove)
      }
      if (
        !stackMove.stay &&
        canStayOnSquare(fromSquare, currentStackPiece.type)
      ) {
        const newStackMove = cloneInternalDeployMove(stackMove)
        newStackMove.stay = currentStackPiece
        newStackMoves.push(newStackMove)
      }
    }
    stackMoves.push(...newStackMoves)
  }

  return makeStackMoveFromCombination(
    fromSquare,
    stackMoves,
    remaining,
    moveCandidates,
  )
}
