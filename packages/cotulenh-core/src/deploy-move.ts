import type { CoTuLenh } from './cotulenh.js'
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
  createAllPieceSplits,
  combinePieces,
  flattenPiece,
  getStepsBetweenSquares,
  makeSanPiece,
} from './utils.js'

/**
 * Represents a complete deployment sequence for a stack
 */
export interface DeploySequence {
  from: number
  moves: InternalMove[]
  stay?: Piece
}
import { DeployMove } from './move-session.js'

/**
 * Generates all possible deploy moves for each piece in all possible stack splits.
 * For a stack like (F|TI), it calculates all ways to split the stack and
 * determines valid moves for each piece in each split, including options for pieces to stay.
 *
 * @param gameInstance - The current game instance
 * @param stackSquare - The square where the stack is located (in internal 0xf0 format)
 * @returns Array of DeploySequence objects representing all possible deployment combinations
 */
export function generateStackSplitMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
): DeploySequence[] {
  const pieceAtSquare = gameInstance.get(stackSquare)
  if (!pieceAtSquare) {
    return []
  }
  const splittedPieces = createAllPieceSplits(pieceAtSquare)
  const moveCandidates = generateMoveCandidateForSinglePieceInStack(
    gameInstance,
    stackSquare,
  )
  const allInternalStackMoves: DeploySequence[] = []
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
      move.moves.reduce(
        (acc: number, m: InternalMove) => acc + flattenPiece(m.piece).length,
        0,
      ) + (move.stay ? flattenPiece(move.stay).length : 0)
    const deployCountedForAllPiece = totalPiece === totalStackPiece
    return haveMove && deployCountedForAllPiece
  })
  return cleanedInternalStackMoves
}

const makeStackMoveFromCombination = (
  fromSquare: number,
  stackMoves: DeploySequence[],
  remaining: Piece[],
  moveCandidates: Map<PieceSymbol, InternalMove[]>,
): DeploySequence[] => {
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
  const newStackMoves: DeploySequence[] = []
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
        const newSquares = stackMove.moves.map((m: InternalMove) => m.to)
        if (newSquares.includes(move.to)) continue
        // Clone DeploySequence manually
        const newStackMove: DeploySequence = {
          from: stackMove.from,
          moves: [...stackMove.moves],
          stay: stackMove.stay,
        }
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
        // Clone DeploySequence manually
        const newStackMove: DeploySequence = {
          from: stackMove.from,
          moves: [...stackMove.moves],
          stay: currentStackPiece,
        }
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
