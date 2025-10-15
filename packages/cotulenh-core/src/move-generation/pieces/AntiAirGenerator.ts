/**
 * Anti-Air move generator
 *
 * Anti-Air moves one square orthogonally (same as Infantry).
 * Provides air defense zone but that's handled separately.
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator, ORTHOGONAL } from '../BasePieceGenerator'
import { ANTI_AIR } from '../../types/Constants'

export class AntiAirGenerator extends BasePieceGenerator {
  protected pieceType = ANTI_AIR

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== ANTI_AIR) {
      return []
    }

    // Anti-Air moves like Infantry: one square orthogonally
    return this.generateSteps(square, piece, ORTHOGONAL, context)
  }
}
