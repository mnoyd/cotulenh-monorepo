/**
 * Move generation type definitions
 */

import type { Move } from '../types/Move'
import type { IBoard } from '../types/Board'
import type { IGameState } from '../types/GameState'
import type { Color, PieceSymbol } from '../types/Constants'

/**
 * Options for move generation
 */
export interface MoveGenerationOptions {
  /** Generate only moves from this square */
  square?: number

  /** Include only legal moves (filter out moves that leave commander in check) */
  legalOnly?: boolean

  /** Include verbose move information */
  verbose?: boolean
}

/**
 * Context passed to piece generators
 */
export interface GeneratorContext {
  /** Current board state */
  board: IBoard

  /** Current game state */
  gameState: IGameState

  /** Color whose moves to generate */
  color: Color

  /** Square to generate moves from (if filtering by square) */
  fromSquare?: number
}

/**
 * Interface for piece-specific move generators
 */
export interface IPieceGenerator {
  /**
   * Generate pseudo-legal moves for this piece type
   * @param square - Square containing the piece
   * @param context - Generation context
   * @returns Array of pseudo-legal moves
   */
  generateMoves(square: number, context: GeneratorContext): Move[]

  /**
   * Get the piece type this generator handles
   */
  getPieceType(): PieceSymbol
}

/**
 * Main move generator interface
 */
export interface IMoveGenerator {
  /**
   * Generate all pseudo-legal moves for the current position
   * @param gameState - Current game state
   * @param options - Generation options
   * @returns Array of pseudo-legal moves
   */
  generateMoves(gameState: IGameState, options?: MoveGenerationOptions): Move[]

  /**
   * Register a piece-specific generator
   * @param generator - Piece generator to register
   */
  registerGenerator(generator: IPieceGenerator): void
}
