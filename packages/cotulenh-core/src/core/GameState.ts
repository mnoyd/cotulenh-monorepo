/**
 * Game state implementation
 *
 * Represents the complete state of a CoTuLenh game.
 * Designed to be immutable - all modifications create new instances.
 */

import type { Color } from '../types/Constants.js'
import { RED, BLUE } from '../types/Constants.js'
import type { IBoard } from '../types/Board.js'
import type {
  IGameState,
  IDeploySession,
  GameStateConfig,
} from '../types/GameState.js'

import { Board } from './Board.js'

export class GameState implements IGameState {
  readonly board: IBoard
  readonly turn: Color
  readonly commanders: readonly [number, number] // [red, blue]
  readonly moveNumber: number
  readonly halfMoves: number
  readonly deploySession: IDeploySession | null

  constructor(config: GameStateConfig) {
    this.board = config.board
    this.turn = config.turn
    this.commanders = [...config.commanders]
    this.moveNumber = config.moveNumber ?? 1
    this.halfMoves = config.halfMoves ?? 0
    this.deploySession = config.deploySession ?? null
  }

  /**
   * Get commander position for a color
   */
  getCommander(color: Color): number {
    return color === RED ? this.commanders[0] : this.commanders[1]
  }

  /**
   * Check if it's a specific color's turn
   */
  isTurn(color: Color): boolean {
    return this.turn === color
  }

  /**
   * Clone game state (deep copy)
   */
  clone(): GameState {
    return new GameState({
      board: this.board.clone(),
      turn: this.turn,
      commanders: [...this.commanders],
      moveNumber: this.moveNumber,
      halfMoves: this.halfMoves,
      deploySession: this.deploySession?.clone() ?? null,
    })
  }

  /**
   * Create new state with updated board
   */
  withBoard(board: IBoard): GameState {
    return new GameState({
      ...this,
      board,
    })
  }

  /**
   * Create new state with switched turn
   */
  withSwitchedTurn(): GameState {
    const newTurn = this.turn === RED ? BLUE : RED
    const newMoveNumber =
      newTurn === RED ? this.moveNumber + 1 : this.moveNumber

    return new GameState({
      ...this,
      turn: newTurn,
      moveNumber: newMoveNumber,
    })
  }

  /**
   * Create new state with updated commander positions
   */
  withCommanders(red: number, blue: number): GameState {
    return new GameState({
      ...this,
      commanders: [red, blue],
    })
  }

  /**
   * Create new state with updated half moves
   */
  withHalfMoves(halfMoves: number): GameState {
    return new GameState({
      ...this,
      halfMoves,
    })
  }

  /**
   * Create new state with deploy session
   */
  withDeploySession(session: IDeploySession | null): GameState {
    return new GameState({
      ...this,
      deploySession: session,
    })
  }

  /**
   * Create initial game state (empty board - will be populated by GameController)
   */
  static createInitial(): GameState {
    const board = Board.createEmpty()

    // Default commander positions (will be set by FEN parser)
    // For now, use placeholders
    const redCommander = 0x06 // f12 (placeholder)
    const blueCommander = 0xb6 // f1 (placeholder)

    return new GameState({
      board,
      turn: RED,
      commanders: [redCommander, blueCommander],
      moveNumber: 1,
      halfMoves: 0,
      deploySession: null,
    })
  }

  /**
   * Create empty game state (for testing)
   */
  static createEmpty(): GameState {
    const board = Board.createEmpty()

    return new GameState({
      board,
      turn: RED,
      commanders: [0, 0], // Will be set when commanders are placed
      moveNumber: 1,
      halfMoves: 0,
      deploySession: null,
    })
  }
}
