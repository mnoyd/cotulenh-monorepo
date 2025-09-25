/**
 * CoTuLenh Facade - Maintains backward compatibility while using modular architecture
 * This facade provides the same API as the original monolithic CoTuLenh class
 * but delegates to specialized modules internally
 */

import QuickLRU from 'quick-lru'
import type {
  Color,
  Piece,
  PieceSymbol,
  Square,
  InternalMove,
  BITS,
} from '../type.js'
import {
  DEFAULT_POSITION,
  RED,
  BLUE,
  SQUARE_MAP,
  isSquareOnBoard,
  file,
  algebraic,
  isDigit,
} from '../type.js'
import { makeSanPiece } from '../utils.js'
import type { DeployMoveRequest } from '../deploy-move.js'

// Import the modular components
import { GameState } from './game-state.js'
import { BoardOperations } from './board-operations.js'
import { MoveExecutor } from './move-executor.js'
import { MoveValidator } from './move-validator.js'
import { MoveInterface } from './move-interface.js'
import type {
  IGameState,
  IBoardOperations,
  IMoveExecutor,
  IMoveValidator,
  IMoveInterface,
  IGameAnalysis,
  ISerialization,
  MoveOptions,
  MovesOptions,
  LoadOptions,
  HistoryOptions,
  MoveObject,
} from './interfaces.js'

/**
 * Facade implementation of CoTuLenh that maintains the original API
 * while using the new modular architecture internally
 */
export class CoTuLenhFacade {
  // Module instances
  private gameState: IGameState
  private boardOperations: IBoardOperations
  private moveExecutor: IMoveExecutor
  private moveValidator: IMoveValidator
  private moveInterface: IMoveInterface
  private gameAnalysis?: IGameAnalysis
  private serialization?: ISerialization

  // Cache for move generation (maintained for performance)
  private _movesCache = new QuickLRU<string, any[]>({ maxSize: 1000 })

  constructor(fen: string = DEFAULT_POSITION) {
    // Initialize modules
    this.gameState = new GameState()
    this.boardOperations = new BoardOperations(this.gameState)
    this.moveValidator = new MoveValidator(this.gameState, this.boardOperations)
    this.moveExecutor = new MoveExecutor(
      this.gameState,
      this.boardOperations,
      this.moveValidator,
    )
    this.moveInterface = new MoveInterface(
      this.gameState,
      this.boardOperations,
      this.moveValidator,
      this.moveExecutor,
    )

    // TODO: Initialize remaining modules when implemented
    // this.gameAnalysis = new GameAnalysis(this.gameState, this.boardOperations, this.moveValidator)
    // this.serialization = new Serialization(this.gameState, this.boardOperations)

    // Load initial position
    this.load(fen)
  }

  // === Board State Methods ===

  /**
   * Clears the board and resets game state
   */
  clear({ preserveHeaders = false } = {}) {
    this._movesCache.clear()
    this.gameState.clear({ preserveHeaders })
    this.moveExecutor.clearHistory()
  }

  /**
   * Loads position from FEN string
   */
  load(fen: string, options: LoadOptions = {}): void {
    this._movesCache.clear()

    // Parse FEN string into tokens
    const tokens = fen.split(/\s+/)
    const position = tokens[0]

    this.gameState.clear(options)

    // Parse board position
    const ranks = position.split('/')
    if (ranks.length !== 12) {
      throw new Error(`Invalid FEN: expected 12 ranks, got ${ranks.length}`)
    }

    let parsingStack = false
    let nextHeroic = false
    for (let r = 0; r < 12; r++) {
      let col = 0
      for (let i = 0; i < ranks[r].length; i++) {
        const char = ranks[r].charAt(i)
        if (isDigit(char)) {
          col += parseInt(char)
          if (col > 11) {
            throw new Error(
              `Invalid FEN: rank ${12 - r} has too many squares (${ranks[r]})`,
            )
          }
        } else if (char === '+') {
          nextHeroic = true
        } else if (char === '(') {
          parsingStack = true
        } else if (char === ')') {
          if (parsingStack === false) {
            throw new Error(
              `Invalid FEN: ) without matching ( in rank ${12 - r}`,
            )
          }
          parsingStack = false
          col++
        } else {
          const color = char < 'a' ? RED : BLUE
          const piece = {
            type: char.toLowerCase() as PieceSymbol,
            color,
            heroic: nextHeroic,
          } as Piece
          this.put(piece, algebraic(r * 16 + col), true)
          if (!parsingStack) {
            col++
          }
          nextHeroic = false
        }
      }
      if (parsingStack) {
        throw new Error(`Invalid FEN: ) without matching ( in rank ${12 - r}`)
      }
      if (nextHeroic) {
        throw new Error(`Invalid FEN: + without matching ( in rank ${12 - r}`)
      }
    }

    // Parse game state
    this.gameState.setTurn((tokens[1] as Color) || RED)
    this.gameState.setHalfMoves(parseInt(tokens[4], 10) || 0)
    this.gameState.setMoveNumber(parseInt(tokens[5], 10) || 1)

    // Update setup flags
    this.gameState.setHeader('SetUp', '1')
    this.gameState.setHeader('FEN', fen)
  }

  /**
   * Generates FEN string for current position
   */
  fen(): string {
    const board = this.gameState.getBoardReference()
    let empty = 0
    let fen = ''

    for (let i = SQUARE_MAP.a12; i <= SQUARE_MAP.k1 + 1; i++) {
      if (isSquareOnBoard(i)) {
        if (board[i]) {
          if (empty > 0) {
            fen += empty
            empty = 0
          }
          const piece = board[i]!
          const san = makeSanPiece(piece, false)
          const toCorrectCase = piece.color === RED ? san : san.toLowerCase()
          fen += toCorrectCase
        } else {
          empty++
        }
      } else {
        if (file(i) === 11) {
          if (empty > 0) {
            fen += empty
          }
          empty = 0
          if (i !== SQUARE_MAP.k1 + 1) {
            fen += '/'
          }
        } else {
          continue
        }
      }
    }

    const castling = '-' // No castling
    const epSquare = '-' // No en passant

    return [
      fen,
      this.gameState.getTurn(),
      castling,
      epSquare,
      this.gameState.getHalfMoves(),
      this.gameState.getMoveNumber(),
    ].join(' ')
  }

  // === Piece Operations ===

  /**
   * Gets a piece from the specified square
   */
  get(square: Square | number, pieceType?: PieceSymbol): Piece | undefined {
    return this.boardOperations.getPiece(square, pieceType)
  }

  /**
   * Places a piece on the specified square
   */
  put(
    piece: {
      type: PieceSymbol
      color: Color
      heroic?: boolean
      carrying?: Piece[]
    },
    square: Square,
    allowCombine = false,
  ): boolean {
    this._movesCache.clear()
    return this.boardOperations.putPiece(piece as Piece, square, allowCombine)
  }

  /**
   * Removes a piece from the specified square
   */
  remove(square: Square): Piece | undefined {
    this._movesCache.clear()
    return this.boardOperations.removePiece(square)
  }

  // === Move Operations ===

  /**
   * Executes a move
   */
  move(move: string | MoveObject, options: MoveOptions = {}): any {
    // Would return Move | null
    this._movesCache.clear()
    return this.moveInterface.move(move, options)
  }

  /**
   * Executes a deploy move
   */
  deployMove(deployMove: DeployMoveRequest): any {
    // Would return DeployMove
    this._movesCache.clear()
    return this.moveInterface.deployMove(deployMove)
  }

  /**
   * Generates legal moves
   */
  moves(options: MovesOptions = {}): string[] | any[] {
    return this.moveInterface.moves(options)
  }

  /**
   * Undoes the last move
   */
  undo(): void {
    this._movesCache.clear()
    this.moveExecutor.undoLastMove()
  }

  // === Game State Queries ===

  /**
   * Gets the current turn
   */
  turn(): Color {
    return this.gameState.getTurn()
  }

  /**
   * Checks if current player is in check
   */
  isCheck(): boolean {
    return this.moveValidator.isCheck()
  }

  /**
   * Checks if current player is in checkmate
   */
  isCheckmate(): boolean {
    return this.moveValidator.isCheckmate()
  }

  /**
   * Checks if the game is a draw
   */
  isDraw(): boolean {
    return this.moveValidator.isDraw()
  }

  /**
   * Checks if the game is over
   */
  isGameOver(): boolean {
    return this.moveValidator.isGameOver()
  }

  /**
   * Checks for draw by fifty-move rule
   */
  isDrawByFiftyMoves(): boolean {
    return this.gameState.getHalfMoves() >= 100
  }

  /**
   * Checks for draw by threefold repetition
   */
  isThreefoldRepetition(): boolean {
    // TODO: Implement with serialization module
    // const fen = this.serialization.generateFen()
    // return this.gameState.getPositionCountForFen(fen) >= 3

    // Temporary implementation
    return false
  }

  // === Board Representation ===

  /**
   * Gets 2D array representation of the board
   */
  board(): any[][] {
    return this.boardOperations.getBoardArray()
  }

  /**
   * Prints the board to console
   */
  printBoard(): void {
    this.boardOperations.printBoard()
  }

  // === History Management ===

  /**
   * Gets move history
   */
  history(): string[]
  history(options: { verbose: true }): any[]
  history(options: { verbose: false }): string[]
  history(options: { verbose: boolean }): string[] | any[]
  history(options: HistoryOptions = {}): string[] | any[] {
    // TODO: Delegate to serialization module when implemented
    // return this.serialization.getHistory(options)

    // Temporary implementation
    return []
  }

  // === Heroic Status ===

  /**
   * Gets heroic status of a piece
   */
  getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean {
    return this.boardOperations.getHeroicStatus(square, pieceType)
  }

  /**
   * Sets heroic status of a piece
   */
  setHeroicStatus(
    square: Square | number,
    pieceType: PieceSymbol | undefined,
    heroic: boolean,
  ): boolean {
    return this.boardOperations.setHeroicStatus(square, pieceType, heroic)
  }

  // === Game State Access ===

  /**
   * Gets current move number
   */
  moveNumber(): number {
    return this.gameState.getMoveNumber()
  }

  /**
   * Gets current half moves count
   */
  halfMoves(): number {
    return this.gameState.getHalfMoves()
  }

  /**
   * Gets header information
   */
  getHeader(): Record<string, string> {
    return this.gameState.getHeader()
  }

  /**
   * Sets header information
   */
  setHeader(key: string, value: string): void {
    this.gameState.setHeader(key, value)
  }

  /**
   * Gets deploy state
   */
  getDeployState(): any {
    return this.gameState.getDeployState()
  }

  /**
   * Sets deploy state
   */
  setDeployState(deployState: any): void {
    this.gameState.setDeployState(deployState)
  }

  /**
   * Gets commander position
   */
  getCommanderSquare(color: Color): number {
    return this.gameState.getCommanderPosition(color)
  }

  /**
   * Updates commander position
   */
  updateCommandersPosition(sq: number, color: Color): void {
    this.boardOperations.updateCommanderPosition(sq, color)
  }

  /**
   * Gets air defense state
   */
  getAirDefense(): any {
    return this.gameState.getAirDefense()
  }

  /**
   * Gets air defense influence
   */
  getAirDefenseInfluence(): any {
    // TODO: Delegate to appropriate module when implemented
    throw new Error('Air defense influence not yet implemented in facade')
  }

  // === Comments ===

  /**
   * Gets comment for current position
   */
  getComment(): string | undefined {
    // TODO: Delegate to serialization module when implemented
    // return this.serialization.getComment()

    // Temporary implementation using game state
    const fen = this.fen()
    return this.gameState.getCommentForPosition(fen)
  }

  /**
   * Sets comment for current position
   */
  setComment(comment: string): void {
    // TODO: Delegate to serialization module when implemented
    // this.serialization.setComment(comment)

    // Temporary implementation using game state
    const fen = this.fen()
    this.gameState.setCommentForPosition(fen, comment)
  }

  /**
   * Removes comment for current position
   */
  removeComment(): string | undefined {
    // TODO: Delegate to serialization module when implemented
    // return this.serialization.removeComment()

    // Temporary implementation using game state
    const fen = this.fen()
    return this.gameState.removeCommentForPosition(fen)
  }

  // === Attack Calculation ===

  /**
   * Gets pieces that can attack a square
   */
  getAttackers(
    square: number,
    attackerColor: Color,
  ): { square: number; type: PieceSymbol }[] {
    // TODO: Delegate to move validator module when implemented
    // return this.moveValidator.getAttackers(square, attackerColor)

    // Temporary implementation
    return []
  }

  // === Module Access (for advanced usage) ===

  /**
   * Gets the game state module (for advanced usage)
   */
  getGameStateModule(): IGameState {
    return this.gameState
  }

  /**
   * Gets the board operations module (for advanced usage)
   */
  getBoardOperationsModule(): IBoardOperations {
    return this.boardOperations
  }

  /**
   * Gets the move executor module (for advanced usage)
   */
  getMoveExecutorModule(): IMoveExecutor {
    return this.moveExecutor
  }

  // === Validation and Debug ===

  /**
   * Validates current game state
   */
  validateState(): string[] {
    const errors: string[] = []

    errors.push(...this.gameState.validateState())
    errors.push(...this.boardOperations.validateBoardState())

    return errors
  }

  /**
   * Gets debug information about the current state
   */
  getDebugInfo(): any {
    return {
      gameState: this.gameState.toString(),
      historyLength: this.moveExecutor.getHistoryLength(),
      cacheSize: this._movesCache.size,
      validation: this.validateState(),
    }
  }
}

// Export the facade as the main CoTuLenh class for backward compatibility
export { CoTuLenhFacade as CoTuLenh }
export { Move, DeployMove } from './move-interface.js'
