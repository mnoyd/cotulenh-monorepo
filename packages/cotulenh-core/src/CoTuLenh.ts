/**
 * CoTuLenh - Main public API
 *
 * Facade pattern providing a simple, clean interface to the CoTuLenh chess engine.
 * Maintains backward compatibility with legacy API while using new modular architecture.
 */

import type { IGameState } from './types/GameState'
import type { Move } from './types/Move'
import type { Color } from './types/Constants'
import { GameController } from './game/GameController.js'
import { generateFEN, parseFEN } from './serialization/FENSerializer.js'
import { parseSAN, moveToSAN } from './serialization/SANParser.js'
import { DEFAULT_POSITION } from './utils/constants.js'

/**
 * Main CoTuLenh game class
 */
export class CoTuLenh {
  private controller: GameController

  constructor() {
    this.controller = new GameController()
  }

  /**
   * Get all legal moves for the current position
   */
  moves(): Move[] {
    return this.controller.getMoves()
  }

  /**
   * Make a move (accepts SAN string or Move object)
   * @param move - SAN string (e.g., "e4", "Nf3") or Move object
   * @returns The move that was made, or null if illegal
   */
  move(move: string | Move): Move | null {
    try {
      let moveObj: Move | null

      if (typeof move === 'string') {
        // Parse SAN
        moveObj = parseSAN(move, this.controller.getState())
        if (!moveObj) {
          return null // Invalid SAN
        }
      } else {
        moveObj = move
      }

      // Make the move
      this.controller.makeMove(moveObj)
      return moveObj
    } catch (error) {
      return null // Illegal move
    }
  }

  /**
   * Undo the last move
   * @returns true if undo successful, false if no history
   */
  undo(): boolean {
    return this.controller.undo() !== null
  }

  /**
   * Redo the next move
   * @returns true if redo successful, false if no future history
   */
  redo(): boolean {
    return this.controller.redo() !== null
  }

  /**
   * Check if current player is in check
   */
  inCheck(): boolean {
    return this.controller.isCheck()
  }

  /**
   * Check if current player is checkmated
   */
  isCheckmate(): boolean {
    return this.controller.isCheckmate()
  }

  /**
   * Check if current player is stalemated
   */
  isStalemate(): boolean {
    return this.controller.isStalemate()
  }

  /**
   * Check if game is over
   */
  gameOver(): boolean {
    return this.controller.isGameOver()
  }

  /**
   * Get current FEN string
   */
  fen(): string {
    return generateFEN(this.controller.getState())
  }

  /**
   * Load position from FEN
   */
  load(fen: string): boolean {
    try {
      const gameState = parseFEN(fen)
      this.controller.reset(gameState)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Reset to initial starting position
   */
  reset(): void {
    this.controller.reset()
  }

  /**
   * Get current turn
   */
  turn(): Color {
    return this.controller.getState().turn
  }

  /**
   * Get move history as SAN strings
   */
  history(): string[] {
    const moves = this.controller.getHistory()
    const state = this.controller.getState()
    return moves.map((move) => moveToSAN(move, state))
  }

  /**
   * Get current game state
   */
  getState(): IGameState {
    return this.controller.getState()
  }

  /**
   * Get game result
   */
  getResult(): 'red-wins' | 'blue-wins' | 'draw' | 'ongoing' {
    return this.controller.getResult()
  }

  /**
   * Get the default starting position FEN
   */
  static getDefaultPosition(): string {
    return DEFAULT_POSITION
  }
}

/**
 * Create a new CoTuLenh game instance
 */
export function createGame(): CoTuLenh {
  return new CoTuLenh()
}
