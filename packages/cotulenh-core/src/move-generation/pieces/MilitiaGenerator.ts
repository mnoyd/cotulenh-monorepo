/**
 * Militia move generator
 *
 * Militia moves one square in any of 8 directions (orthogonal + diagonal).
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator, ALL_DIRECTIONS } from '../BasePieceGenerator'
import { MILITIA } from '../../types/Constants'

export class MilitiaGenerator extends BasePieceGenerator {
  protected pieceType = MILITIA

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== MILITIA) {
      return []
    }

    // Militia moves one square in all 8 directions
    return this.generateSteps(square, piece, ALL_DIRECTIONS, context)
  }
}
