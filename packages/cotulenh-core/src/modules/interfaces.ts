/**
 * Module interfaces for the refactored CoTuLenh architecture
 * These interfaces define the contracts between different modules
 */

import type {
  Color,
  Piece,
  PieceSymbol,
  Square,
  DeployState,
  AirDefense,
  InternalMove,
} from '../type.js'
import type { InternalDeployMove, DeployMoveRequest } from '../deploy-move.js'

// Common types used across modules
export interface GameStateSnapshot {
  board: (Piece | undefined)[]
  commanders: Record<Color, number>
  turn: Color
  halfMoves: number
  moveNumber: number
  deployState: DeployState | null
  airDefense: AirDefense
  positionCount: Record<string, number>
}

export interface History {
  move: any // CTLMoveCommandInterface
  commanders: Record<Color, number>
  turn: Color
  halfMoves: number
  moveNumber: number
  deployState: DeployState | null
}

export interface MoveOptions {
  strict?: boolean
}

export interface MovesOptions {
  verbose?: boolean
  square?: Square
  pieceType?: PieceSymbol
}

export interface MoveGenerationOptions {
  legal?: boolean
  pieceType?: PieceSymbol
  square?: Square
  deploy?: boolean
}

export interface MoveCacheArgs {
  legal?: boolean
  pieceType?: PieceSymbol
  square?: Square
  deploy?: boolean
}

export interface LoadOptions {
  skipValidation?: boolean
  preserveHeaders?: boolean
}

export interface HistoryOptions {
  verbose?: boolean
}

export interface BoardSquare {
  square: Square
  type: PieceSymbol
  color: Color
  heroic: boolean
}

export interface MoveObject {
  from: string
  to: string
  piece?: PieceSymbol
  stay?: boolean
  deploy?: boolean
}

export interface PositionEvaluation {
  score: number
  phase: GamePhase
  threats: number
}

export enum GamePhase {
  Opening = 'opening',
  Middlegame = 'middlegame',
  Endgame = 'endgame',
}

// Core Game State Module Interface
export interface IGameState {
  // Board state
  getBoard(): (Piece | undefined)[]
  setBoard(board: (Piece | undefined)[]): void

  // Direct board access (internal use only; returns mutable reference)
  getBoardReference(): (Piece | undefined)[]

  // Turn management
  getTurn(): Color
  setTurn(color: Color): void

  // Move counters
  getMoveNumber(): number
  setMoveNumber(num: number): void
  getHalfMoves(): number
  setHalfMoves(num: number): void

  // Commander positions
  getCommanderPosition(color: Color): number
  setCommanderPosition(color: Color, position: number): void
  getCommanderPositions(): Record<Color, number>

  // Deploy state
  getDeployState(): DeployState | null
  setDeployState(state: DeployState | null): void

  // Air defense
  getAirDefense(): AirDefense
  setAirDefense(defense: AirDefense): void

  // Position tracking
  getPositionCount(): Record<string, number>
  updatePositionCount(fen: string): void

  // State snapshots
  createSnapshot(): GameStateSnapshot
  restoreSnapshot(snapshot: GameStateSnapshot): void

  // Validation helpers
  isValidSquare(square: number): boolean
  isSquareOnBoard(square: number): boolean
  validateState(): string[]

  // Comments per-position (FEN keyed)
  getCommentForPosition(fen: string): string | undefined
  setCommentForPosition(fen: string, comment: string): void
  removeCommentForPosition(fen: string): string | undefined

  // Header management
  getHeader(): Record<string, string>
  setHeader(key: string, value: string): void
  removeHeader(key: string): void

  // Clear state
  clear(options?: { preserveHeaders?: boolean }): void
}

// Board Operations Module Interface
export interface IBoardOperations {
  // Piece operations
  getPiece(square: Square | number, pieceType?: PieceSymbol): Piece | undefined
  putPiece(piece: Piece, square: Square, allowCombine?: boolean): boolean
  removePiece(square: Square): Piece | undefined

  // Heroic status
  getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean
  setHeroicStatus(
    square: Square | number,
    pieceType: PieceSymbol | undefined,
    heroic: boolean,
  ): boolean

  // Board validation
  validatePiecePlacement(piece: Piece, square: number): boolean
  isSquareOccupied(square: number): boolean

  // Commander tracking
  updateCommanderPosition(square: number, color: Color): void

  // Board representation
  getBoardArray(): (BoardSquare | null)[][]

  // Board state validation
  validateBoardState(): string[]

  // Debug helpers
  printBoard(): void
}

// Move Execution Module Interface
export interface IMoveExecutor {
  // Move execution
  executeMove(move: InternalMove | InternalDeployMove): void
  undoLastMove(): InternalMove | InternalDeployMove | null

  // History management
  getHistory(): History[]
  clearHistory(): void
  getHistoryLength(): number

  // State management
  saveGameState(): GameStateSnapshot
  restoreGameState(snapshot: GameStateSnapshot): void
}

// Move Validation Module Interface
export interface IMoveValidator {
  // Legal move validation
  filterLegalMoves(
    moves: (InternalMove | InternalDeployMove)[],
    color: Color,
  ): (InternalMove | InternalDeployMove)[]
  isMoveLegal(move: InternalMove): boolean

  // Check detection
  isCommanderAttacked(color: Color): boolean
  isCommanderExposed(color: Color): boolean

  // Attack calculation
  getAttackers(
    square: number,
    attackerColor: Color,
  ): { square: number; type: PieceSymbol }[]

  // Game state analysis
  isCheck(): boolean
  isCheckmate(): boolean
  isDraw(): boolean
  isGameOver(): boolean
}

// Move Interface Module Interface
export interface IMoveInterface {
  // Public move API
  move(move: string | MoveObject, options?: MoveOptions): any // Move | null
  deployMove(deployMove: DeployMoveRequest): any // DeployMove
  moves(options?: MovesOptions): string[] | any[] // Move[]

  // Move generation
  generateMoves(options: MoveGenerationOptions): InternalMove[]

  // SAN/LAN operations
  moveFromSan(san: string, strict?: boolean): InternalMove | null
  moveToSanLan(move: InternalMove, allMoves: InternalMove[]): [string, string]

  // Caching
  clearMoveCache(): void
  getMovesCacheKey(args: MoveCacheArgs): string
}

// Game Analysis Module Interface
export interface IGameAnalysis {
  // Game state queries
  isCheck(): boolean
  isCheckmate(): boolean
  isDraw(): boolean
  isGameOver(): boolean

  // Draw conditions
  isDrawByFiftyMoves(): boolean
  isThreefoldRepetition(): boolean
  isInsufficientMaterial(): boolean

  // Position analysis
  evaluatePosition(): PositionEvaluation
  getGamePhase(): GamePhase
}

// Serialization Module Interface
export interface ISerialization {
  // FEN operations
  generateFen(): string
  loadFromFen(fen: string, options?: LoadOptions): void
  validateFen(fen: string): boolean

  // History serialization
  getHistory(options?: HistoryOptions): string[] | any[] // (Move | DeployMove)[]

  // Board representation
  getBoardArray(): (BoardSquare | null)[][]

  // Comments
  getComment(): string | undefined
  setComment(comment: string): void
  removeComment(): string | undefined
}

// Module Dependencies Interface
export interface IModuleDependencies {
  gameState: IGameState
  boardOperations: IBoardOperations
  moveExecutor: IMoveExecutor
  moveValidator: IMoveValidator
  moveInterface: IMoveInterface
  gameAnalysis: IGameAnalysis
  serialization: ISerialization
}
