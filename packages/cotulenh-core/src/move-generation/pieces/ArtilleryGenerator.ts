/**
 * Artillery move generator
 *
 * Artillery moves up to 3 squares orthogonally.
 * Ignores blocking pieces - can move/capture through them.
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator, ORTHOGONAL } from '../BasePieceGenerator'
import { ARTILLERY } from '../../types/Constants'
import { moveFactory } from '../../core/Move'
import { getFile, getRank } from '../../utils/square'
import { canPlaceOnSquare } from '../../utils/terrain'

export class ArtilleryGenerator extends BasePieceGenerator {
  protected pieceType = ARTILLERY

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== ARTILLERY) {
      return []
    }

    const moves: Move[] = []
    const { board, color } = context

    for (const [rankDelta, fileDelta] of ORTHOGONAL) {
      // Artillery can move/capture up to 3 squares, ignoring blocking
      for (let distance = 1; distance <= 3; distance++) {
        const targetSquare = square + distance * (rankDelta * 16 + fileDelta)

        if (!board.isValid(targetSquare)) break

        // Check wrapping
        const fromFile = getFile(square)
        const toFile = getFile(targetSquare)
        const fromRank = getRank(square)
        const toRank = getRank(targetSquare)

        if (
          Math.abs(toFile - fromFile) > 3 ||
          Math.abs(toRank - fromRank) > 3
        ) {
          break
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
        // Friendly pieces don't block, but can't capture/move onto them
      }
    }

    return moves
  }
}
