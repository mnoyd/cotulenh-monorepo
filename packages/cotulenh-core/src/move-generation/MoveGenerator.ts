/**
 * Main move generator orchestrator
 *
 * Coordinates piece-specific generators to produce all pseudo-legal moves
 * for a given position.
 */

import type { Move } from '../types/Move'
import type { IGameState } from '../types/GameState'
import type { PieceSymbol } from '../types/Constants'
import type {
  IMoveGenerator,
  IPieceGenerator,
  MoveGenerationOptions,
  GeneratorContext,
} from './types'

/**
 * Main move generation orchestrator
 */
export class MoveGenerator implements IMoveGenerator {
  private generators: Map<PieceSymbol, IPieceGenerator>

  constructor() {
    this.generators = new Map()
  }

  /**
   * Register a piece-specific generator
   */
  registerGenerator(generator: IPieceGenerator): void {
    this.generators.set(generator.getPieceType(), generator)
  }

  /**
   * Generate all pseudo-legal moves for the current position
   */
  generateMoves(
    gameState: IGameState,
    options: MoveGenerationOptions = {},
  ): Move[] {
    const moves: Move[] = []
    const color = gameState.turn
    const board = gameState.board

    // Create generation context
    const context: GeneratorContext = {
      board,
      gameState,
      color,
      fromSquare: options.square,
    }

    // If filtering by square, generate only from that square
    if (options.square !== undefined) {
      const piece = board.get(options.square)
      if (piece && piece.color === color) {
        const generator = this.generators.get(piece.type)
        if (generator) {
          const pieceMoves = generator.generateMoves(options.square, context)
          moves.push(...pieceMoves)
        }
      }
      return moves
    }

    // Generate moves for all pieces of the current color
    for (const [square, piece] of board.pieces(color)) {
      const generator = this.generators.get(piece.type)
      if (generator) {
        const pieceMoves = generator.generateMoves(square, context)
        moves.push(...pieceMoves)
      }
    }

    return moves
  }

  /**
   * Get a registered generator for a piece type
   */
  getGenerator(pieceType: PieceSymbol): IPieceGenerator | undefined {
    return this.generators.get(pieceType)
  }

  /**
   * Check if a generator is registered for a piece type
   */
  hasGenerator(pieceType: PieceSymbol): boolean {
    return this.generators.has(pieceType)
  }
}
