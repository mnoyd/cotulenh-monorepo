/**
 * Base class for piece-specific move generators
 *
 * Provides common functionality for generating moves, including:
 * - Direction-based movement
 * - Capture detection
 * - Terrain validation
 */

import type { Move } from '../types/Move'
import type { Piece } from '../types/Piece'
import { moveFactory } from '../core/Move'
import { getFile, getRank } from '../utils/square'
import { canPlaceOnSquare } from '../utils/terrain'
import type { GeneratorContext, IPieceGenerator } from './types'
import type { PieceSymbol } from '../types/Constants'

/**
 * Direction offsets for 16x16 mailbox
 * [rankDelta, fileDelta] where positive rank is down, positive file is right
 */
export const DIRECTIONS = {
  N: [-1, 0], // North (up)
  S: [1, 0], // South (down)
  E: [0, 1], // East (right)
  W: [0, -1], // West (left)
  NE: [-1, 1], // Northeast
  NW: [-1, -1], // Northwest
  SE: [1, 1], // Southeast
  SW: [1, -1], // Southwest
} as const

export const ORTHOGONAL = [
  DIRECTIONS.N,
  DIRECTIONS.S,
  DIRECTIONS.E,
  DIRECTIONS.W,
]
export const DIAGONAL = [
  DIRECTIONS.NE,
  DIRECTIONS.NW,
  DIRECTIONS.SE,
  DIRECTIONS.SW,
]
export const ALL_DIRECTIONS = [...ORTHOGONAL, ...DIAGONAL]

/**
 * Base class for piece generators
 */
export abstract class BasePieceGenerator implements IPieceGenerator {
  protected abstract pieceType: PieceSymbol

  abstract generateMoves(square: number, context: GeneratorContext): Move[]

  getPieceType(): PieceSymbol {
    return this.pieceType
  }

  /**
   * Generate slides in given directions up to maxDistance
   */
  protected generateSlides(
    fromSquare: number,
    piece: Piece,
    directions: readonly (readonly [number, number])[],
    maxDistance: number,
    context: GeneratorContext,
  ): Move[] {
    const moves: Move[] = []
    const { board, color } = context

    for (const [rankDelta, fileDelta] of directions) {
      let distance = 0
      let currentSquare = fromSquare

      while (distance < maxDistance) {
        // Calculate next square
        const nextSquare = currentSquare + rankDelta * 16 + fileDelta

        // Check if still on board
        if (!board.isValid(nextSquare)) break

        // Check file/rank wrapping
        const fromFile = getFile(currentSquare)
        const toFile = getFile(nextSquare)
        const fromRank = getRank(currentSquare)
        const toRank = getRank(nextSquare)

        // Detect wrapping (moving from file 10 to file 0, etc.)
        if (
          Math.abs(toFile - fromFile) > 1 ||
          Math.abs(toRank - fromRank) > 1
        ) {
          break
        }

        // Check terrain restrictions
        if (!canPlaceOnSquare(piece.type, nextSquare)) {
          break
        }

        const targetPiece = board.get(nextSquare)

        if (targetPiece === null) {
          // Empty square - can move here
          moves.push(
            moveFactory.createNormalMove(fromSquare, nextSquare, piece, color),
          )
        } else if (targetPiece.color !== color) {
          // Enemy piece - can capture
          moves.push(
            moveFactory.createCaptureMove(
              fromSquare,
              nextSquare,
              piece,
              targetPiece,
              color,
            ),
          )
          break // Can't move past captured piece
        } else {
          // Friendly piece - can't move here or past
          break
        }

        currentSquare = nextSquare
        distance++
      }
    }

    return moves
  }

  /**
   * Generate single-step moves in given directions
   */
  protected generateSteps(
    fromSquare: number,
    piece: Piece,
    directions: readonly (readonly [number, number])[],
    context: GeneratorContext,
  ): Move[] {
    return this.generateSlides(fromSquare, piece, directions, 1, context)
  }
}
