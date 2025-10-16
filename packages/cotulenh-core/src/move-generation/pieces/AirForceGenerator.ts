/**
 * Air Force move generator
 *
 * Air Force moves up to 4 squares in all directions (orthogonal and diagonal).
 * Movement restricted by enemy air defense zones.
 * Can perform suicide attacks (piece destroys itself along with target).
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import {
  BasePieceGenerator,
  ORTHOGONAL,
  DIAGONAL,
  ALL_DIRECTIONS,
} from '../BasePieceGenerator'
import { AIR_FORCE, COMMANDER } from '../../types/Constants'
import { moveFactory } from '../../core/Move'
import { getFile, getRank } from '../../utils/square'
import { canPlaceOnSquare } from '../../utils/terrain'
import { AirDefenseBitboard } from '../../bitboard/air-defense-bitboard'

export class AirForceGenerator extends BasePieceGenerator {
  protected pieceType = AIR_FORCE

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== AIR_FORCE) {
      return []
    }

    const moves: Move[] = []
    const { board, color, gameState } = context

    // Calculate enemy air defense zones
    const enemyColor = color === 'r' ? 'b' : 'r'
    const boardArray = new Array(256).fill(null)
    for (const [sq, piece] of board.pieces()) {
      boardArray[sq] = piece
    }
    const airDefenseResult = AirDefenseBitboard.calculateAirDefense(boardArray)
    const airDefenseZones =
      enemyColor === 'r' ? airDefenseResult.redZone : airDefenseResult.blackZone

    for (const [rankDelta, fileDelta] of ALL_DIRECTIONS) {
      for (let distance = 1; distance <= 4; distance++) {
        const targetSquare = square + distance * (rankDelta * 16 + fileDelta)

        if (!board.isValid(targetSquare)) break

        // Check wrapping
        const fromFile = getFile(square)
        const toFile = getFile(targetSquare)
        const fromRank = getRank(square)
        const toRank = getRank(targetSquare)

        if (
          Math.abs(toFile - fromFile) > 4 ||
          Math.abs(toRank - fromRank) > 4
        ) {
          break
        }

        if (!canPlaceOnSquare(piece.type, targetSquare)) {
          continue
        }

        // Check if square is in enemy air defense zone
        const file = getFile(targetSquare)
        const rank = getRank(targetSquare)
        const inDefenseZone = AirDefenseBitboard.isSquareDefended(
          airDefenseZones,
          file,
          rank,
        )

        const targetPiece = board.get(targetSquare)

        if (targetPiece === null) {
          // Can only move to squares not in air defense zone
          if (!inDefenseZone) {
            moves.push(
              moveFactory.createNormalMove(square, targetSquare, piece, color),
            )
          }
        } else if (targetPiece.color !== color) {
          if (inDefenseZone || targetPiece.type === COMMANDER) {
            // Suicide attack in defended zone or against commander
            moves.push(
              moveFactory.createSuicideCaptureMove(
                square,
                targetSquare,
                piece,
                targetPiece,
                color,
              ),
            )
          } else {
            // Normal capture
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
          break // Can't move past captured piece
        } else {
          break // Can't move past friendly piece
        }
      }
    }

    return moves
  }
}
