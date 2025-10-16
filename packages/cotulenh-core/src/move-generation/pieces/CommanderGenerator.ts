/**
 * Commander move generator
 *
 * Commander moves infinite distance orthogonally.
 * When heroic, also gains diagonal movement.
 * Special rule: "Flying General" - cannot face enemy commander on same file.
 */

import type { Move } from '../../types/Move'
import type { GeneratorContext } from '../types'
import { BasePieceGenerator, ORTHOGONAL, DIAGONAL } from '../BasePieceGenerator'
import { COMMANDER } from '../../types/Constants'
import { getFile } from '../../utils/square'

export class CommanderGenerator extends BasePieceGenerator {
  protected pieceType = COMMANDER

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const piece = context.board.get(square)
    if (!piece || piece.type !== COMMANDER) {
      return []
    }

    // Generate infinite orthogonal moves
    let moves = this.generateSlides(
      square,
      piece,
      ORTHOGONAL,
      Infinity,
      context,
    )

    // If heroic, also add diagonal moves
    if (piece.heroic) {
      const diagonalMoves = this.generateSlides(
        square,
        piece,
        DIAGONAL,
        Infinity,
        context,
      )
      moves = moves.concat(diagonalMoves)
    }

    // Filter out moves that violate "Flying General" rule
    const { gameState, color } = context
    const enemyCommanderSquare =
      color === 'r' ? gameState.getCommander('b') : gameState.getCommander('r')

    const enemyCommanderFile = getFile(enemyCommanderSquare)

    return moves.filter((move) => {
      // Check if move would place commanders on same file
      // Commander only generates normal/capture moves, all have 'to' property
      if (!('to' in move)) return true
      const toSquare = move.to
      const toFile = getFile(toSquare)

      if (toFile !== enemyCommanderFile) {
        return true // Different files, OK
      }

      // Same file - check if there are pieces between
      return this.hasPiecesBetween(toSquare, enemyCommanderSquare, context)
    })
  }

  /**
   * Check if there are any pieces between two squares on the same file
   */
  private hasPiecesBetween(
    square1: number,
    square2: number,
    context: GeneratorContext,
  ): boolean {
    const { board } = context
    const file = getFile(square1)

    const minSquare = Math.min(square1, square2)
    const maxSquare = Math.max(square1, square2)

    // Check all squares between
    for (let sq = minSquare + 16; sq < maxSquare; sq += 16) {
      if (getFile(sq) === file && board.get(sq) !== null) {
        return true // Found blocking piece
      }
    }

    return false // No pieces between
  }
}
