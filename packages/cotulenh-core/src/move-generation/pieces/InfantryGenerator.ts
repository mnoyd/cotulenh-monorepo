/**
 * Infantry move generator
 *
 * Infantry moves one square orthogonally (N, S, E, W).
 * When heroic, gains +1 range (2 squares).
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator, ORTHOGONAL } from '../BasePieceGenerator'
import { INFANTRY } from '../../types/Constants'

export class InfantryGenerator extends BasePieceGenerator {
  protected pieceType = INFANTRY

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== INFANTRY) {
      return []
    }

    // Infantry moves 1 square orthogonally, +1 when heroic
    const maxDistance = piece.heroic ? 2 : 1
    return this.generateSlides(square, piece, ORTHOGONAL, maxDistance, context)
  }
}
