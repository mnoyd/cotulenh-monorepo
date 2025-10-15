/**
 * Game state type definitions
 */

import type { Color } from './Constants.js'
import type { IBoard } from './Board.js'
import type { Piece } from './Piece.js'

/**
 * Deploy session represents the virtual state during deploy phase
 */
export interface IDeploySession {
  readonly originalSquare: number
  readonly turn: Color
  readonly originalPiece: Piece
  readonly movedPieces: readonly Piece[]
  readonly stay?: readonly Piece[]

  /**
   * Get the effective piece at a square (considering virtual changes)
   */
  getEffectivePiece(board: IBoard, square: number): Piece | null

  /**
   * Get remaining pieces that still need to be deployed
   */
  getRemainingPieces(): readonly Piece[]

  /**
   * Get virtual changes (for FEN encoding)
   */
  getVirtualChanges(): ReadonlyMap<number, Piece | null>

  /**
   * Check if deploy session is complete
   */
  isComplete(): boolean

  /**
   * Clone deploy session
   */
  clone(): IDeploySession
}

/**
 * Game state interface (immutable)
 */
export interface IGameState {
  readonly board: IBoard
  readonly turn: Color
  readonly commanders: readonly [number, number] // [red commander, blue commander]
  readonly moveNumber: number
  readonly halfMoves: number // For 50-move rule
  readonly deploySession: IDeploySession | null

  /**
   * Get commander position for a color
   */
  getCommander(color: Color): number

  /**
   * Check if it's a specific color's turn
   */
  isTurn(color: Color): boolean

  /**
   * Create new state with switched turn
   */
  withSwitchedTurn(): IGameState

  /**
   * Create new state with updated board
   */
  withBoard(board: IBoard): IGameState

  /**
   * Clone this game state
   */
  clone(): IGameState
}

/**
 * Game state factory interface
 */
export interface IGameStateFactory {
  /**
   * Create initial game state
   */
  createInitial(): IGameState

  /**
   * Create game state from FEN
   */
  fromFEN(fen: string): IGameState

  /**
   * Create game state with specific values
   */
  create(config: GameStateConfig): IGameState
}

/**
 * Game state configuration
 */
export interface GameStateConfig {
  board: IBoard
  turn: Color
  commanders: readonly [number, number]
  moveNumber?: number
  halfMoves?: number
  deploySession?: IDeploySession | null
}
