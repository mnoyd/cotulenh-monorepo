/**
 * Tank move generator
 *
 * Tank moves up to 2 squares orthogonally.
 * Can "shoot over" one piece (friend or foe) to capture beyond.
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator, ORTHOGONAL } from '../BasePieceGenerator'
import { TANK } from '../../types/Constants'
import { moveFactory } from '../../core/Move'
import { getFile, getRank } from '../../utils/square'
import { canPlaceOnSquare } from '../../utils/terrain'

export class TankGenerator extends BasePieceGenerator {
  protected pieceType = TANK

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== TANK) {
      return []
    }

    const moves: Move[] = []
    const { board, color } = context

    for (const [rankDelta, fileDelta] of ORTHOGONAL) {
      // First square
      const square1 = square + rankDelta * 16 + fileDelta
      if (!this.isValidMove(square, square1, board)) continue

      const piece1 = board.get(square1)

      if (piece1 === null) {
        // Empty - can move here
        if (canPlaceOnSquare(piece.type, square1)) {
          moves.push(
            moveFactory.createNormalMove(square, square1, piece, color),
          )
        }

        // Second square (no shoot-over, just sliding)
        const square2 = square1 + rankDelta * 16 + fileDelta
        if (!this.isValidMove(square1, square2, board)) continue

        const piece2 = board.get(square2)
        if (piece2 === null) {
          if (canPlaceOnSquare(piece.type, square2)) {
            moves.push(
              moveFactory.createNormalMove(square, square2, piece, color),
            )
          }
        } else if (piece2.color !== color) {
          // Capture at 2 squares
          moves.push(
            moveFactory.createCaptureMove(
              square,
              square2,
              piece,
              piece2,
              color,
            ),
          )
        }
      } else if (piece1.color !== color) {
        // Capture at 1 square
        moves.push(
          moveFactory.createCaptureMove(square, square1, piece, piece1, color),
        )

        // Shoot-over: try to capture at 2 squares (skip over enemy)
        const square2 = square1 + rankDelta * 16 + fileDelta
        if (!this.isValidMove(square1, square2, board)) continue

        const piece2 = board.get(square2)
        if (piece2 && piece2.color !== color) {
          moves.push(
            moveFactory.createCaptureMove(
              square,
              square2,
              piece,
              piece2,
              color,
            ),
          )
        }
      } else {
        // Friendly piece at square 1 - shoot over
        const square2 = square1 + rankDelta * 16 + fileDelta
        if (!this.isValidMove(square1, square2, board)) continue

        const piece2 = board.get(square2)
        if (piece2 && piece2.color !== color) {
          moves.push(
            moveFactory.createCaptureMove(
              square,
              square2,
              piece,
              piece2,
              color,
            ),
          )
        }
      }
    }

    return moves
  }

  private isValidMove(from: number, to: number, board: any): boolean {
    if (!board.isValid(to)) return false

    const fromFile = getFile(from)
    const toFile = getFile(to)
    const fromRank = getRank(from)
    const toRank = getRank(to)

    // Detect wrapping
    if (Math.abs(toFile - fromFile) > 2 || Math.abs(toRank - fromRank) > 2) {
      return false
    }

    return true
  }
}
