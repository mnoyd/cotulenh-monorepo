/**
 * Game controller - orchestrates move generation, validation, and application
 *
 * Main API for playing a game:
 * - Generate legal moves
 * - Make moves
 * - Undo/redo
 * - Check game state (check, checkmate, etc.)
 */

import type { IGameState } from '../types/GameState'
import type { Move } from '../types/Move'
import type { Color } from '../types/Constants'
import { GameState } from '../core/GameState'
import { Board } from '../core/Board'
import { createMoveGenerator } from '../move-generation'
import type { MoveGenerationOptions } from '../move-generation/types'
import {
  filterLegalMoves,
  isCommanderAttacked,
  isCommanderExposed,
  applyMoveToState,
} from '../move-validation'
import { HistoryManager } from '../history'

/**
 * Game controller options
 */
export interface GameControllerOptions {
  /** Initial game state (optional, creates empty state if not provided) */
  initialState?: IGameState
}

/**
 * Main game controller
 */
export class GameController {
  private gameState: IGameState
  private moveGenerator: ReturnType<typeof createMoveGenerator>
  private history: HistoryManager

  constructor(options: GameControllerOptions = {}) {
    this.gameState = options.initialState || GameState.createInitial()
    this.moveGenerator = createMoveGenerator()
    this.history = new HistoryManager()
  }

  /**
   * Get current game state
   */
  getState(): IGameState {
    return this.gameState
  }

  /**
   * Generate all legal moves for the current position
   */
  getMoves(options: MoveGenerationOptions = {}): Move[] {
    // Generate pseudo-legal moves
    const pseudoLegalMoves = this.moveGenerator.generateMoves(
      this.gameState,
      options,
    )

    // Filter to legal moves (unless explicitly requesting pseudo-legal only)
    if (options.legalOnly === false) {
      return pseudoLegalMoves
    }

    return filterLegalMoves(pseudoLegalMoves, this.gameState)
  }

  /**
   * Make a move
   * @param move - The move to make
   * @returns New game state after the move
   * @throws Error if move is illegal
   */
  makeMove(move: Move): IGameState {
    // Validate move is legal
    const legalMoves = this.getMoves()
    const isLegal = legalMoves.some((m) => this.movesEqual(m, move))

    if (!isLegal) {
      throw new Error('Illegal move')
    }

    // Apply move
    const stateBefore = this.gameState
    const stateAfter = applyMoveToState(move, this.gameState)

    // Switch turn
    const newState = stateAfter.withSwitchedTurn()

    // Update game state
    this.gameState = newState

    // Record in history
    this.history.push(stateBefore, move, newState)

    return newState
  }

  /**
   * Undo the last move
   * @returns Previous game state, or null if no history
   */
  undo(): IGameState | null {
    const previousState = this.history.undo()

    if (previousState) {
      this.gameState = previousState
    }

    return previousState
  }

  /**
   * Redo the next move
   * @returns Next game state, or null if no future history
   */
  redo(): IGameState | null {
    const nextState = this.history.redo()

    if (nextState) {
      this.gameState = nextState
    }

    return nextState
  }

  /**
   * Check if current player is in check
   */
  isCheck(): boolean {
    const color = this.gameState.turn
    const commanderSquare = this.gameState.getCommander(color)

    return isCommanderAttacked(this.gameState.board, commanderSquare, color)
  }

  /**
   * Check if current player is checkmated
   */
  isCheckmate(): boolean {
    return this.isCheck() && this.getMoves().length === 0
  }

  /**
   * Check if current player is stalemated
   */
  isStalemate(): boolean {
    return !this.isCheck() && this.getMoves().length === 0
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.isCheckmate() || this.isStalemate()
  }

  /**
   * Get game result
   */
  getResult(): 'red-wins' | 'blue-wins' | 'draw' | 'ongoing' {
    if (this.isCheckmate()) {
      return this.gameState.turn === 'r' ? 'blue-wins' : 'red-wins'
    }

    if (this.isStalemate()) {
      return 'draw'
    }

    return 'ongoing'
  }

  /**
   * Reset game to initial state
   */
  reset(initialState?: IGameState): void {
    this.gameState = initialState || GameState.createInitial()
    this.history.clear()
  }

  /**
   * Get move history
   */
  getHistory(): Move[] {
    return this.history.getMoves()
  }

  /**
   * Check if two moves are equal (for validation)
   */
  private movesEqual(m1: Move, m2: Move): boolean {
    // Simple type check
    if (m1.type !== m2.type) return false

    // Check key properties based on type
    if ('from' in m1 && 'from' in m2 && 'to' in m1 && 'to' in m2) {
      return m1.from === m2.from && m1.to === m2.to
    }

    if ('attacker' in m1 && 'attacker' in m2) {
      return m1.attacker === m2.attacker && m1.target === (m2 as any).target
    }

    return false
  }
}
