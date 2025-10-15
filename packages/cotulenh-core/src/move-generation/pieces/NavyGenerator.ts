/**
 * Navy move generator
 *
 * Navy moves one square orthogonally on water/mixed terrain.
 * Can perform "stay-capture" - attack adjacent square without moving.
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator, ORTHOGONAL } from '../BasePieceGenerator'
import { NAVY } from '../../types/Constants'
import { moveFactory } from '../../core/Move'

export class NavyGenerator extends BasePieceGenerator {
  protected pieceType = NAVY

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== NAVY) {
      return []
    }

    const moves: Move[] = []
    const { board, color } = context

    // Normal movement (terrain-restricted via BasePieceGenerator)
    moves.push(...this.generateSteps(square, piece, ORTHOGONAL, context))

    // Stay-capture: attack adjacent enemies without moving
    for (const [rankDelta, fileDelta] of ORTHOGONAL) {
      const targetSquare = square + rankDelta * 16 + fileDelta

      if (!board.isValid(targetSquare)) continue

      const targetPiece = board.get(targetSquare)
      if (targetPiece && targetPiece.color !== color) {
        // Stay-capture move
        moves.push(
          moveFactory.createStayCaptureMove(
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
