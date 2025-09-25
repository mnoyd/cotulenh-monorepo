/**
 * Move Interface Module - Handles public move API, SAN parsing, and move generation
 * This module provides the main interface for move operations and caching
 */

import QuickLRU from 'quick-lru'
import type {
  Color,
  Square,
  Piece,
  PieceSymbol,
  InternalMove,
} from '../type.js'
import { algebraic, SQUARE_MAP, BITS } from '../type.js'
import type {
  InternalDeployMove,
  DeployMoveRequest,
  createInternalDeployMove,
  isInternalDeployMove,
} from '../deploy-move.js'
import type {
  IGameState,
  IBoardOperations,
  IMoveValidator,
  IMoveExecutor,
  IMoveInterface,
  MoveOptions,
  MovesOptions,
  MoveGenerationOptions,
  MoveCacheArgs,
  MoveObject,
} from './interfaces.js'
import { generateDeployMoves, generateNormalMoves } from '../move-generation.js'
import {
  getDisambiguator,
  strippedSan,
  inferPieceType,
  makeSanPiece,
  createCombinedPiece,
} from '../utils.js'

// Import the Move and DeployMove classes (these would need to be updated for modular architecture)
// For now, we'll create simplified versions
export class Move {
  public color: Color
  public from: string
  public to: string
  public piece: Piece
  public captured?: Piece
  public san: string
  public lan: string
  public flags: string
  public before: string
  public after: string

  constructor(
    public gameInterface: any,
    public internalMove: InternalMove,
  ) {
    this.color = internalMove.color
    this.from = this.gameInterface.algebraic(internalMove.from)
    this.to = this.gameInterface.algebraic(internalMove.to)
    this.piece = internalMove.piece
    this.captured = Array.isArray(internalMove.captured)
      ? internalMove.captured[0]
      : internalMove.captured
    this.flags = internalMove.flags.toString()

    // Store FEN before and after the move for debugging
    this.before = this.gameInterface.fen()

    const [san, lan] = this.gameInterface._moveToSanLan(
      this.internalMove,
      this.gameInterface._moves({ legal: true }),
    )
    this.san = san
    this.lan = lan

    // For after FEN, we'd need to simulate the move, but for now use current state
    this.after = this.gameInterface.fen()
  }

  isCapture(): boolean {
    return (this.internalMove.flags & BITS.CAPTURE) !== 0
  }

  isDeploy(): boolean {
    return (this.internalMove.flags & BITS.DEPLOY) !== 0
  }

  isStayCapture(): boolean {
    return (this.internalMove.flags & BITS.STAY_CAPTURE) !== 0
  }

  isSuicideCapture(): boolean {
    return (this.internalMove.flags & BITS.SUICIDE_CAPTURE) !== 0
  }

  isCombination(): boolean {
    return (this.internalMove.flags & BITS.COMBINATION) !== 0
  }
}

export class DeployMove {
  constructor(
    public gameInterface: any,
    public internalDeployMove: InternalDeployMove,
  ) {}
}

export class MoveInterface implements IMoveInterface {
  private _movesCache = new QuickLRU<string, InternalMove[]>({ maxSize: 1000 })

  constructor(
    private gameState: IGameState,
    private boardOperations: IBoardOperations,
    private moveValidator: IMoveValidator,
    private moveExecutor: IMoveExecutor,
  ) {}

  // Public move API
  move(move: string | MoveObject, options: MoveOptions = {}): Move | null {
    let internalMove: InternalMove | null = null

    // 1. Parse move
    if (typeof move === 'string') {
      internalMove = this.moveFromSan(move, options.strict)
    } else if (typeof move === 'object') {
      internalMove = this.parseObjectMove(move)
    }

    // 2. Validate move
    if (!internalMove) {
      throw new Error(`Invalid or illegal move: ${JSON.stringify(move)}`)
    }

    const prettyMove = new Move(this.createGameInterface(), internalMove)

    // 3. Execute the move
    this.moveExecutor.executeMove(internalMove)

    return prettyMove
  }

  deployMove(deployMove: DeployMoveRequest): DeployMove {
    const sqFrom = SQUARE_MAP[deployMove.from]
    const deployMoves = this.generateMoves({
      square: deployMove.from,
      deploy: true,
    })
    const originalPiece = this.boardOperations.getPiece(sqFrom)

    if (!originalPiece) {
      throw new Error('Deploy move error: original piece not found')
    }

    // TODO: This needs the actual createInternalDeployMove function
    // const internalDeployMove = createInternalDeployMove(originalPiece, deployMove, deployMoves)
    // For now, create a placeholder
    const internalDeployMove = this.createPlaceholderDeployMove(deployMove)

    const prettyMove = new DeployMove(
      this.createGameInterface(),
      internalDeployMove,
    )
    this.moveExecutor.executeMove(internalDeployMove)

    return prettyMove
  }

  moves(options: MovesOptions = {}): string[] | Move[] {
    const internalMoves = this.generateMoves({
      square: options.square,
      pieceType: options.pieceType,
      legal: true,
    })

    if (options.verbose) {
      // Map to Move objects
      return internalMoves.map(
        (move) => new Move(this.createGameInterface(), move),
      )
    } else {
      // Generate SAN strings
      const allLegalMoves = this.generateMoves({ legal: true })
      return internalMoves.map(
        (move) => this.moveToSanLan(move, allLegalMoves)[0],
      )
    }
  }

  // Move generation
  generateMoves(options: MoveGenerationOptions): InternalMove[] {
    const {
      legal = true,
      pieceType: filterPiece = undefined,
      square: filterSquare = undefined,
      deploy = false,
    } = options

    if (deploy && !filterSquare) {
      throw new Error('Deploy move error: square is required')
    }

    const cacheKey = this.getMovesCacheKey({
      legal,
      pieceType: filterPiece,
      square: filterSquare,
      deploy,
    })

    if (this._movesCache.has(cacheKey)) {
      return this._movesCache.get(cacheKey)!
    }

    const us = this.gameState.getTurn()
    let allMoves: InternalMove[] = []

    // Generate moves based on game state
    if (this.gameState.getDeployState()?.turn === us || deploy) {
      let deployFilterSquare: number
      if (deploy) {
        deployFilterSquare = SQUARE_MAP[filterSquare!]
      } else {
        deployFilterSquare = this.gameState.getDeployState()!.stackSquare
      }
      allMoves = generateDeployMoves(
        this.createGameInterface(),
        deployFilterSquare,
        filterPiece,
      )
    } else {
      allMoves = generateNormalMoves(
        this.createGameInterface(),
        us,
        filterPiece,
        filterSquare,
      )
    }

    // Filter illegal moves if requested
    let result: InternalMove[]
    if (legal) {
      result = this.moveValidator.filterLegalMoves(
        allMoves,
        us,
      ) as InternalMove[]
    } else {
      result = allMoves
    }

    this._movesCache.set(cacheKey, result)
    return result
  }

  // SAN/LAN operations
  moveFromSan(san: string, strict: boolean = false): InternalMove | null {
    const cleanMove = strippedSan(san)
    let pieceType = inferPieceType(cleanMove)
    let moves = this.generateMoves({ legal: true, pieceType: pieceType })

    // Strict parser - exact match
    for (let i = 0, len = moves.length; i < len; i++) {
      const [sanStr, lanStr] = this.moveToSanLan(moves[i], moves)
      if (
        cleanMove === strippedSan(sanStr) ||
        cleanMove === strippedSan(lanStr)
      ) {
        return moves[i]
      }
    }

    // If strict parser failed and we're in strict mode, return null
    if (strict) {
      return null
    }

    // Permissive parser with regex
    return this.parseMoveSanWithRegex(cleanMove, moves)
  }

  moveToSanLan(move: InternalMove, allMoves: InternalMove[]): [string, string] {
    const pieceEncoded = makeSanPiece(move.piece)
    const disambiguator = getDisambiguator(move, allMoves)
    const toAlg = this.algebraic(move.to)
    const fromAlg = this.algebraic(move.from)
    let combinationSuffix = ''
    let separator = ''

    // Build separator based on move flags
    if (move.flags & BITS.DEPLOY) {
      separator += '>'
    }
    if (move.flags & BITS.STAY_CAPTURE) {
      separator += '_'
    }
    if (move.flags & BITS.CAPTURE) {
      separator += 'x'
    }
    if (move.flags & BITS.SUICIDE_CAPTURE) {
      separator += '@'
    }
    if (move.flags & BITS.COMBINATION) {
      separator += '&'
      if (!move.combined) {
        throw new Error('Move must have combined for combination')
      }
      const combined = createCombinedPiece(move.piece, move.combined)
      if (!combined) {
        throw new Error(
          'Should have successfully combined pieces in combine move',
        )
      }
      combinationSuffix = makeSanPiece(combined, true)
    }

    // Check for check/checkmate
    let checkingSuffix = ''
    const snapshot = this.gameState.createSnapshot()
    try {
      this.moveExecutor.executeMove(move)
      if (this.moveValidator.isCheck()) {
        if (this.moveValidator.isCheckmate()) {
          checkingSuffix = '#'
        } else {
          checkingSuffix = '^'
        }
      }
    } finally {
      this.gameState.restoreSnapshot(snapshot)
    }

    const san = `${pieceEncoded}${disambiguator}${separator}${toAlg}${combinationSuffix}${checkingSuffix}`
    const lan = `${pieceEncoded}${fromAlg}${separator}${toAlg}${combinationSuffix}${checkingSuffix}`

    return [san, lan]
  }

  // Caching
  clearMoveCache(): void {
    this._movesCache.clear()
  }

  getMovesCacheKey(args: MoveCacheArgs): string {
    // Key based on FEN, deploy state, and arguments
    const fen = this.generateFenForCache() // Simplified FEN for caching

    let deployState = 'none'
    if (args.deploy) {
      deployState = `${args.square}:${this.gameState.getTurn()}`
    } else if (this.gameState.getDeployState()) {
      const ds = this.gameState.getDeployState()!
      deployState = `${ds.stackSquare}:${ds.turn}`
    }

    const { legal = true, pieceType, square } = args
    return `${fen}|deploy:${deployState}|legal:${legal}|pieceType:${pieceType ?? ''}|square:${square ?? ''}`
  }

  // Private helper methods
  private parseObjectMove(move: MoveObject): InternalMove | null {
    const fromSq = SQUARE_MAP[move.from as Square]
    const toSq = SQUARE_MAP[move.to as Square]

    if (fromSq === undefined || toSq === undefined) {
      throw new Error(`Invalid square in move object: ${JSON.stringify(move)}`)
    }

    // Find matching move in legal moves
    const legalMoves = this.generateMoves({
      legal: true,
      square: move.from as Square,
      ...(move.piece && { pieceType: move.piece }),
    })

    const foundMoves: InternalMove[] = []
    for (const m of legalMoves) {
      const isStayMove = (m.flags & BITS.STAY_CAPTURE) !== 0
      const isDeployMove = (m.flags & BITS.DEPLOY) !== 0

      if (
        m.from === fromSq &&
        m.to === toSq &&
        (move.piece === undefined || m.piece.type === move.piece) &&
        (move.stay !== undefined ? move.stay === isStayMove : true) &&
        (move.deploy !== undefined ? move.deploy === isDeployMove : true)
      ) {
        foundMoves.push(m)
      }
    }

    if (foundMoves.length === 0) {
      throw new Error(`No matching legal move found: ${JSON.stringify(move)}`)
    }
    if (foundMoves.length > 1) {
      throw new Error(
        `Multiple matching legal moves found: ${JSON.stringify(move)}`,
      )
    }

    return foundMoves[0]
  }

  private parseMoveSanWithRegex(
    cleanMove: string,
    moves: InternalMove[],
  ): InternalMove | null {
    let heroic = undefined
    let matches = undefined
    let from = undefined
    let to = undefined
    let flag = undefined
    let check = undefined
    let overlyDisambiguated = false

    const regex =
      /^(\(.*\))?(\+)?([CITMEAGSFNH])?([a-k]?(?:1[0-2]|[1-9])?)([x<>\+&-]|>x)?([a-k](?:1[0-2]|[1-9]))([#\^]?)?$/
    matches = cleanMove.match(regex)

    if (matches) {
      heroic = matches[2]
      const pieceType = matches[3] as PieceSymbol
      from = matches[4] as Square
      flag = matches[5]
      to = matches[6] as Square
      check = matches[7]

      if (from && from.length == 1) {
        overlyDisambiguated = true
      }

      // Filter moves by piece type if specified
      const filteredMoves = pieceType
        ? moves.filter((m) => m.piece.type === pieceType.toLowerCase())
        : moves

      if (!to) {
        return null
      }

      for (const move of filteredMoves) {
        const [curSan, curLan] = this.moveToSanLan(move, moves)

        if (!from) {
          // If there is no from square, it could be just 'x' missing from a capture
          if (
            cleanMove === strippedSan(curSan).replace(/[x<>+&-]|>x/g, '') ||
            cleanMove === strippedSan(curLan).replace(/[x<>+&-]|>x/g, '')
          ) {
            return move
          }
        } else if (SQUARE_MAP[from] == move.from && SQUARE_MAP[to] == move.to) {
          return move
        } else if (overlyDisambiguated) {
          // Handle overly disambiguated moves (e.g. Nge7)
          const square = this.algebraic(move.from)
          if (
            SQUARE_MAP[to] == move.to &&
            (from == square[0] || from == square[1])
          ) {
            return move
          }
        }
      }
    }

    return null
  }

  private createPlaceholderDeployMove(
    deployMove: DeployMoveRequest,
  ): InternalDeployMove {
    // This is a placeholder - the actual implementation would use createInternalDeployMove
    return {
      from: SQUARE_MAP[deployMove.from],
      to: -1, // Placeholder
      piece: this.boardOperations.getPiece(deployMove.from)!,
      color: this.gameState.getTurn(),
      flags: BITS.DEPLOY,
      moves: [], // Placeholder
    } as any
  }

  private createGameInterface(): any {
    return {
      // Board operations
      get: (square: any, pieceType?: any) =>
        this.boardOperations.getPiece(square, pieceType),
      put: (piece: any, square: any, allowCombine?: boolean) =>
        this.boardOperations.putPiece(piece, square, allowCombine),
      remove: (square: any) => this.boardOperations.removePiece(square),

      // Game state access
      turn: () => this.gameState.getTurn(),
      getDeployState: () => this.gameState.getDeployState(),
      setDeployState: (state: any) => this.gameState.setDeployState(state),
      getCommanderSquare: (color: Color) =>
        this.gameState.getCommanderPosition(color),
      getAirDefense: () => this.gameState.getAirDefense(),

      // Board access
      _board: this.gameState.getBoardReference(),
      _commanders: this.gameState.getCommanderPositions(),
      _deployState: this.gameState.getDeployState(),
      _airDefense: this.gameState.getAirDefense(),

      // Move operations
      _moves: (options: any) => this.generateMoves(options),
      _moveToSanLan: (move: InternalMove, allMoves: InternalMove[]) =>
        this.moveToSanLan(move, allMoves),
      _makeMove: (move: any) => this.moveExecutor.executeMove(move),
      _undoMove: () => this.moveExecutor.undoLastMove(),

      // Validation
      isCheck: () => this.moveValidator.isCheck(),
      isCheckmate: () => this.moveValidator.isCheckmate(),
      getAttackers: (square: number, attackerColor: Color) =>
        this.moveValidator.getAttackers(square, attackerColor),

      // Utility functions
      algebraic: (square: number) => algebraic(square),
      fen: () => this.generateFenForCache(),
    }
  }

  private generateFenForCache(): string {
    // Simplified FEN generation for caching purposes
    // In a full implementation, this would delegate to the serialization module
    return `${this.gameState.getTurn()}-${this.gameState.getMoveNumber()}-${this.gameState.getHalfMoves()}`
  }

  private algebraic(square: number): Square {
    // Convert internal square number to algebraic notation
    const file = square & 0x0f
    const rank = (square >> 4) + 1
    return `${'abcdefghijk'[file]}${rank}` as Square
  }

  // Cache statistics and management
  getCacheStats(): {
    size: number
    maxSize: number
    hitRate?: number
  } {
    return {
      size: this._movesCache.size,
      maxSize: this._movesCache.maxSize,
      // Hit rate would need to be tracked separately
    }
  }

  optimizeCache(): void {
    // Clear cache if it's getting too large or stale
    if (this._movesCache.size > this._movesCache.maxSize * 0.8) {
      this._movesCache.clear()
    }
  }

  // Debug helpers
  debugMove(move: string | MoveObject): {
    parsed: InternalMove | null
    legal: boolean
    san: string
    lan: string
    errors: string[]
  } {
    const errors: string[] = []
    let parsed: InternalMove | null = null
    let legal = false
    let san = ''
    let lan = ''

    try {
      if (typeof move === 'string') {
        parsed = this.moveFromSan(move)
      } else {
        parsed = this.parseObjectMove(move)
      }

      if (parsed) {
        legal = this.moveValidator.isMoveLegal(parsed)
        const allMoves = this.generateMoves({ legal: true })
        ;[san, lan] = this.moveToSanLan(parsed, allMoves)
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }

    return { parsed, legal, san, lan, errors }
  }
}
