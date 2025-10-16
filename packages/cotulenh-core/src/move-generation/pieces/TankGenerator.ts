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

    // Tank must be on valid terrain to generate moves
    if (!canPlaceOnSquare(piece.type, square)) {
      return []
    }

    const moves: Move[] = []
    const { board, color } = context

    // Tank moves 2 squares, +1 when heroic (3 squares)
    const maxDistance = piece.heroic ? 3 : 2

    for (const [rankDelta, fileDelta] of ORTHOGONAL) {
      // Generate moves up to maxDistance
      for (let distance = 1; distance <= maxDistance; distance++) {
        const targetSquare = square + (rankDelta * 16 + fileDelta) * distance
        if (!this.isValidMove(square, targetSquare, board)) break

        const targetPiece = board.get(targetSquare)

        if (targetPiece === null) {
          // Empty square - can move here
          if (canPlaceOnSquare(piece.type, targetSquare)) {
            moves.push(
              moveFactory.createNormalMove(square, targetSquare, piece, color),
            )
          }
        } else if (targetPiece.color !== color) {
          // Enemy piece - can capture
          moves.push(
            moveFactory.createCaptureMove(
              square,
              targetSquare,
              piece,
              targetPiece,
              color,
            ),
          )

          // Can shoot over this enemy to next square if within range
          if (distance < maxDistance) {
            const shootOverSquare =
              square + (rankDelta * 16 + fileDelta) * (distance + 1)
            if (this.isValidMove(square, shootOverSquare, board)) {
              const shootOverPiece = board.get(shootOverSquare)
              if (shootOverPiece === null) {
                // Empty square - can move here (shoot over enemy)
                if (canPlaceOnSquare(piece.type, shootOverSquare)) {
                  moves.push(
                    moveFactory.createNormalMove(
                      square,
                      shootOverSquare,
                      piece,
                      color,
                    ),
                  )
                }
              } else if (shootOverPiece.color !== color) {
                // Enemy piece - can capture (shoot over enemy)
                moves.push(
                  moveFactory.createCaptureMove(
                    square,
                    shootOverSquare,
                    piece,
                    shootOverPiece,
                    color,
                  ),
                )
              }
            }
          }
          break // Can't continue past enemy piece
        } else {
          // Friendly piece - can shoot over to next square if within range
          if (distance < maxDistance) {
            const shootOverSquare =
              square + (rankDelta * 16 + fileDelta) * (distance + 1)
            if (this.isValidMove(square, shootOverSquare, board)) {
              const shootOverPiece = board.get(shootOverSquare)
              if (shootOverPiece === null) {
                // Empty square - can move here (shoot over friendly)
                if (canPlaceOnSquare(piece.type, shootOverSquare)) {
                  moves.push(
                    moveFactory.createNormalMove(
                      square,
                      shootOverSquare,
                      piece,
                      color,
                    ),
                  )
                }
              } else if (shootOverPiece.color !== color) {
                // Enemy piece - can capture (shoot over friendly)
                moves.push(
                  moveFactory.createCaptureMove(
                    square,
                    shootOverSquare,
                    piece,
                    shootOverPiece,
                    color,
                  ),
                )
              }
            }
          }
          break // Can't continue past friendly piece
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

    // Detect wrapping (allow up to 3 squares for heroic tanks)
    if (Math.abs(toFile - fromFile) > 3 || Math.abs(toRank - fromRank) > 3) {
      return false
    }

    return true
  }
}
