/**
 * Missile move generator
 *
 * Missile moves in L-shaped pattern (like chess knight).
 * 2 squares in one direction, then 1 square perpendicular.
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator } from '../BasePieceGenerator'
import { MISSILE } from '../../types/Constants'
import { moveFactory } from '../../core/Move'
import { getFile, getRank } from '../../utils/square'
import { canPlaceOnSquare } from '../../utils/terrain'

// Knight-like L-shaped moves: [rankDelta, fileDelta]
const KNIGHT_MOVES = [
  [-2, -1],
  [-2, 1], // 2 up, 1 left/right
  [2, -1],
  [2, 1], // 2 down, 1 left/right
  [-1, -2],
  [-1, 2], // 1 up, 2 left/right
  [1, -2],
  [1, 2], // 1 down, 2 left/right
] as const

export class MissileGenerator extends BasePieceGenerator {
  protected pieceType = MISSILE

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== MISSILE) {
      return []
    }

    const moves: Move[] = []
    const { board, color } = context

    for (const [rankDelta, fileDelta] of KNIGHT_MOVES) {
      const targetSquare = square + rankDelta * 16 + fileDelta

      if (!board.isValid(targetSquare)) continue

      // Check if move wraps around board
      const fromFile = getFile(square)
      const toFile = getFile(targetSquare)
      const fromRank = getRank(square)
      const toRank = getRank(targetSquare)

      if (Math.abs(toFile - fromFile) > 2 || Math.abs(toRank - fromRank) > 2) {
        continue
      }

      if (!canPlaceOnSquare(piece.type, targetSquare)) {
        continue
      }

      const targetPiece = board.get(targetSquare)

      if (targetPiece === null) {
        moves.push(
          moveFactory.createNormalMove(square, targetSquare, piece, color),
        )
      } else if (targetPiece.color !== color) {
        moves.push(
          moveFactory.createCaptureMove(
            square,
            targetSquare,
            piece,
            targetPiece,
            color,
          ),
        )
      }
    }

    return moves
  }
}
