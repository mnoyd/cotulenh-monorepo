/**
 * Infantry move generator
 *
 * Infantry moves one square orthogonally (N, S, E, W).
 * Simple piece with no special restrictions beyond terrain.
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

    // Infantry moves one square orthogonally
    return this.generateSteps(square, piece, ORTHOGONAL, context)
  }
}
