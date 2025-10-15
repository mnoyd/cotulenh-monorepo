/**
 * Headquarter move generator
 *
 * Headquarter is immobile by default.
 * If heroic, can move one square orthogonally.
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator, ORTHOGONAL } from '../BasePieceGenerator'
import { HEADQUARTER } from '../../types/Constants'

export class HeadquarterGenerator extends BasePieceGenerator {
  protected pieceType = HEADQUARTER

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== HEADQUARTER) {
      return []
    }

    // Headquarter can only move if heroic
    if (!piece.heroic) {
      return []
    }

    // Heroic headquarter moves one square orthogonally
    return this.generateSteps(square, piece, ORTHOGONAL, context)
  }
}
