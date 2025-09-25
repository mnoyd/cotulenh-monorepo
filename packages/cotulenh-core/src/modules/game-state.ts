/**
 * GameState Module - Centralized state management for CoTuLenh
 *
 * This module manages the core game state including:
 * - Board representation and piece positions
 * - Turn management and move counters
 * - Commander positions tracking
 * - Deploy state and air defense
 * - Position history for repetition detection
 * - Game metadata and comments
 */

import type { IGameState, GameStateSnapshot } from './interfaces.js'
import {
  RED,
  BLUE,
  isSquareOnBoard,
  type Piece,
  type Color,
  type DeployState,
  type AirDefense,
} from '../type.js'

// Load options type
type LoadOptions = {
  preserveHeaders?: boolean
}

export class GameState implements IGameState {
  // Core board state (0x88 representation)
  private _board: (Piece | undefined)[] = new Array(256).fill(undefined)

  // Commander positions (-1 if not on board)
  private _commanders: Record<Color, number> = { r: -1, b: -1 }

  // Turn and move management
  private _turn: Color = RED
  private _moveNumber: number = 1
  private _halfMoves: number = 0

  // Deploy state for incremental deploy system
  private _deployState: DeployState | null = null

  // Air defense state
  private _airDefense: AirDefense = {
    r: new Map(),
    b: new Map(),
  }

  // Position tracking for repetition detection
  private _positionCount: Record<string, number> = {}

  // Game metadata and comments
  private _headers: Record<string, string> = {}
  private _comments: Record<string, string> = {}

  constructor() {
    // Initialize with default state
    this.clear()
  }

  // === Core State Access ===

  getBoardReference(): (Piece | undefined)[] {
    return this._board
  }

  getBoard(): (Piece | undefined)[] {
    // Return a copy to prevent external mutation
    return [...this._board]
  }

  setBoard(board: (Piece | undefined)[]): void {
    this._board = [...board]
  }

  getTurn(): Color {
    return this._turn
  }

  setTurn(color: Color): void {
    this._turn = color
  }

  getMoveNumber(): number {
    return this._moveNumber
  }

  setMoveNumber(moveNumber: number): void {
    this._moveNumber = moveNumber
  }

  getHalfMoves(): number {
    return this._halfMoves
  }

  setHalfMoves(halfMoves: number): void {
    this._halfMoves = halfMoves
  }

  // === Commander Position Management ===

  getCommanderPosition(color: Color): number {
    return this._commanders[color]
  }

  setCommanderPosition(color: Color, square: number): void {
    this._commanders[color] = square
  }

  getCommanderPositions(): Record<Color, number> {
    return { ...this._commanders }
  }

  // === Deploy State Management ===

  getDeployState(): DeployState | null {
    return this._deployState ? { ...this._deployState } : null
  }

  setDeployState(deployState: DeployState | null): void {
    this._deployState = deployState ? { ...deployState } : null
  }

  // === Air Defense Management ===

  getAirDefense(): AirDefense {
    return {
      r: new Map(this._airDefense.r),
      b: new Map(this._airDefense.b),
    }
  }

  setAirDefense(defense: AirDefense): void {
    this._airDefense = {
      r: new Map(defense.r),
      b: new Map(defense.b),
    }
  }

  // === Position History Management ===

  getPositionCount(): Record<string, number> {
    return { ...this._positionCount }
  }

  updatePositionCount(fen: string): void {
    this._positionCount[fen] = (this._positionCount[fen] || 0) + 1
  }

  getPositionCountForFen(fen: string): number {
    return this._positionCount[fen] || 0
  }

  // === Game Metadata ===

  getHeader(): Record<string, string> {
    return { ...this._headers }
  }

  setHeader(key: string, value: string): void {
    this._headers[key] = value
  }

  removeHeader(key: string): void {
    delete this._headers[key]
  }

  // === Comments Management ===

  getCommentForPosition(fen: string): string | undefined {
    return this._comments[fen]
  }

  setCommentForPosition(fen: string, comment: string): void {
    this._comments[fen] = comment
  }

  removeCommentForPosition(fen: string): string | undefined {
    const comment = this._comments[fen]
    delete this._comments[fen]
    return comment
  }

  // === Board Utilities ===

  isSquareOnBoard(square: number): boolean {
    return isSquareOnBoard(square)
  }

  isValidSquare(square: number): boolean {
    return this.isSquareOnBoard(square)
  }

  // === State Management ===

  clear(options: LoadOptions = {}): void {
    // Clear board
    this._board.fill(undefined)

    // Reset commander positions
    this._commanders = { r: -1, b: -1 }

    // Reset turn and counters
    this._turn = RED
    this._moveNumber = 1
    this._halfMoves = 0

    // Clear deploy state
    this._deployState = null

    // Reset air defense
    this._airDefense = {
      r: new Map(),
      b: new Map(),
    }

    // Clear position history unless preserving
    if (!options.preserveHeaders) {
      this._positionCount = {}
      this._headers = {}
      this._comments = {}
    }
  }

  // === State Validation ===

  validateState(): string[] {
    const errors: string[] = []

    // Validate turn
    if (this._turn !== RED && this._turn !== BLUE) {
      errors.push(`Invalid turn: ${this._turn}`)
    }

    // Validate move counters
    if (this._moveNumber < 1) {
      errors.push(`Move number must be positive: ${this._moveNumber}`)
    }

    if (this._halfMoves < 0) {
      errors.push(`Half moves must be non-negative: ${this._halfMoves}`)
    }

    // Validate commander positions (only if board is not empty)
    const boardIsNotEmpty = this._board.some((p) => p !== undefined)
    if (boardIsNotEmpty) {
      for (const color of ['r', 'b'] as Color[]) {
        const pos = this._commanders[color]
        if (pos === -1) {
          errors.push(`Missing commander for ${color}`)
        } else if (!this.isSquareOnBoard(pos)) {
          errors.push(`Invalid commander position for ${color}: ${pos}`)
        }
      }
    }

    return errors
  }

  // State snapshots for undo/redo functionality
  createSnapshot(): GameStateSnapshot {
    return {
      board: JSON.parse(JSON.stringify(this._board)),
      commanders: { ...this._commanders },
      turn: this._turn,
      halfMoves: this._halfMoves,
      moveNumber: this._moveNumber,
      deployState: this._deployState ? { ...this._deployState } : null,
      airDefense: {
        r: new Map(this._airDefense.r),
        b: new Map(this._airDefense.b),
      },
      positionCount: { ...this._positionCount },
    }
  }

  restoreSnapshot(snapshot: GameStateSnapshot): void {
    this._board = JSON.parse(JSON.stringify(snapshot.board))
    this._commanders = { ...snapshot.commanders }
    this._turn = snapshot.turn
    this._halfMoves = snapshot.halfMoves
    this._moveNumber = snapshot.moveNumber
    this._deployState = snapshot.deployState
      ? { ...snapshot.deployState }
      : null
    this._airDefense = {
      r: new Map(snapshot.airDefense.r),
      b: new Map(snapshot.airDefense.b),
    }
    this._positionCount = { ...snapshot.positionCount }
  }

  // Debug helpers
  toString(): string {
    return JSON.stringify(
      {
        turn: this._turn,
        moveNumber: this._moveNumber,
        halfMoves: this._halfMoves,
        commanders: this._commanders,
        deployState: this._deployState,
        boardPieces: this._board.filter((p) => p !== undefined).length,
      },
      null,
      2,
    )
  }
}
