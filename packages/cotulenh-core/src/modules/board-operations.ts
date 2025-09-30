/**
 * Board Operations Module - Handles piece placement, removal, and board validation
 * This module manages all direct board manipulations and piece operations
 */

import type { Piece, PieceSymbol, Color, Square } from '../type.js'
import { SQUARE_MAP, NAVY_MASK, LAND_MASK, NAVY } from '../type.js'
import type { IGameState, IBoardOperations, BoardSquare } from './interfaces.js'
import {
  algebraic,
  haveCommander,
  flattenPiece,
  createCombineStackFromPieces,
} from '../utils.js'
import {
  BASE_AIRDEFENSE_CONFIG,
  updateAirDefensePiecesPosition,
} from '../air-defense.js'

export class BoardOperations implements IBoardOperations {
  constructor(private gameState: IGameState) {}

  // Piece operations
  getPiece(
    square: Square | number,
    pieceType?: PieceSymbol,
  ): Piece | undefined {
    const sq = typeof square === 'number' ? square : SQUARE_MAP[square]
    if (sq === undefined) return undefined

    const board = this.gameState.getBoardReference()
    const pieceAtSquare = board[sq]
    if (!pieceAtSquare) return undefined

    // If no specific piece type requested or the piece matches the requested type, return it
    if (!pieceType || pieceAtSquare.type === pieceType) {
      return pieceAtSquare
    }

    // Check if the requested piece is being carried in a stack
    if (pieceAtSquare.carrying && pieceAtSquare.carrying.length > 0) {
      return pieceAtSquare.carrying.find((p) => p.type === pieceType)
    }

    return undefined
  }

  putPiece(
    piece: Piece,
    square: Square,
    allowCombine: boolean = false,
  ): boolean {
    if (!(square in SQUARE_MAP)) return false
    const sq = SQUARE_MAP[square]

    let newPiece: Piece = {
      ...piece,
      heroic: piece.heroic ?? false,
      // Ensure carried pieces also have default heroic status
      carrying: piece.carrying?.map((p) => ({
        ...p,
        heroic: p.heroic ?? false,
      })),
    }

    // Handle piece combination if allowed
    if (allowCombine) {
      const existingPiece = this.getPiece(sq)
      if (existingPiece) {
        const allPieces = [
          ...flattenPiece(existingPiece),
          ...flattenPiece(newPiece),
        ]
        const { combined: combinedPiece, uncombined } =
          createCombineStackFromPieces(allPieces)
        if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
          throw new Error(`Failed to combine pieces at ${algebraic(sq)}`)
        }
        newPiece = combinedPiece
      }
    }

    // Validate piece placement
    if (!this.validatePiecePlacement(newPiece, sq)) {
      return false
    }

    // Handle commander limit - only one commander per color allowed
    if (
      haveCommander(newPiece) &&
      this.gameState.getCommanderPosition(newPiece.color) !== -1 &&
      this.gameState.getCommanderPosition(newPiece.color) !== sq
    ) {
      return false
    }

    // Handle commander capture
    const currentPiece = this.getPiece(sq)
    if (
      currentPiece &&
      haveCommander(currentPiece) &&
      currentPiece.color !== newPiece.color &&
      this.gameState.getCommanderPosition(currentPiece.color) === sq
    ) {
      this.gameState.setCommanderPosition(currentPiece.color, -1)
    }

    // Place the piece
    const board = this.gameState.getBoardReference()
    board[sq] = newPiece

    // Update commander position if placing a commander
    if (haveCommander(newPiece)) {
      this.gameState.setCommanderPosition(newPiece.color, sq)
    }

    // Update air defense if placing an air defense piece
    if (BASE_AIRDEFENSE_CONFIG[newPiece.type]) {
      const updatedAirDefense = updateAirDefensePiecesPosition({
        get: (square: Square | number) => this.getPiece(square),
      })
      this.gameState.setAirDefense(updatedAirDefense)
    }

    return true
  }

  removePiece(square: Square): Piece | undefined {
    if (!(square in SQUARE_MAP)) return undefined
    const sq = SQUARE_MAP[square]

    const board = this.gameState.getBoardReference()
    const piece = board[sq]
    if (!piece) return undefined

    const wasHeroic = piece.heroic

    // Remove the piece
    delete board[sq]

    // Update commander position if removing a commander
    if (
      haveCommander(piece) &&
      this.gameState.getCommanderPosition(piece.color) === sq
    ) {
      this.gameState.setCommanderPosition(piece.color, -1)
    }

    // Update air defense if removing an air defense piece
    if (BASE_AIRDEFENSE_CONFIG[piece.type]) {
      const updatedAirDefense = updateAirDefensePiecesPosition({
        get: (square: Square | number) => this.getPiece(square),
      })
      this.gameState.setAirDefense(updatedAirDefense)
    }

    return { ...piece, heroic: wasHeroic ?? false }
  }

  // Heroic status management
  getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean {
    const piece = this.getPiece(square, pieceType)
    return piece?.heroic ?? false
  }

  setHeroicStatus(
    square: Square | number,
    pieceType: PieceSymbol | undefined,
    heroic: boolean,
  ): boolean {
    const sq = typeof square === 'number' ? square : SQUARE_MAP[square]
    if (sq === undefined) return false

    const board = this.gameState.getBoardReference()
    const pieceAtSquare = board[sq]
    if (!pieceAtSquare) return false

    // Case 1: No specific piece type requested or the piece matches the requested type
    if (!pieceType || pieceAtSquare.type === pieceType) {
      pieceAtSquare.heroic = heroic
      return true
    }

    // Case 2: Check if the requested piece is being carried in a stack
    if (pieceAtSquare.carrying && pieceAtSquare.carrying.length > 0) {
      const carriedPieceIndex = pieceAtSquare.carrying.findIndex(
        (p) => p.type === pieceType,
      )

      if (carriedPieceIndex !== -1) {
        // Create a new array to avoid mutation issues
        const updatedCarrying = [...pieceAtSquare.carrying]
        updatedCarrying[carriedPieceIndex] = {
          ...updatedCarrying[carriedPieceIndex],
          heroic: heroic,
        }

        // Update the carrier with the modified carrying array
        board[sq] = {
          ...pieceAtSquare,
          carrying: updatedCarrying,
        }

        return true
      }
    }

    return false
  }

  // Board validation
  validatePiecePlacement(piece: Piece, square: number): boolean {
    // Check if square is on the board
    if (!this.gameState.isSquareOnBoard(square)) {
      return false
    }

    // Piece should be put on correct relative terrain
    if (piece.type === NAVY) {
      if (!NAVY_MASK[square]) return false
    } else if (!LAND_MASK[square]) return false

    return true
  }

  isSquareOccupied(square: number): boolean {
    if (!this.gameState.isSquareOnBoard(square)) {
      return false
    }

    const board = this.gameState.getBoardReference()
    return board[square] !== undefined
  }

  // Commander tracking
  updateCommanderPosition(square: number, color: Color): void {
    if (this.gameState.getCommanderPosition(color) === -1) return // Commander captured = loss = no need to update
    this.gameState.setCommanderPosition(color, square)
  }

  // Board representation
  getBoardArray(): (BoardSquare | null)[][] {
    const output: (BoardSquare | null)[][] = []
    const board = this.gameState.getBoardReference()

    for (let r = 0; r < 12; r++) {
      // Iterate ranks 0-11
      const row: (BoardSquare | null)[] = []
      for (let f = 0; f < 11; f++) {
        // Iterate files 0-10
        const sq = r * 16 + f
        const piece = board[sq]
        if (piece) {
          row.push({
            square: algebraic(sq),
            type: piece.type,
            color: piece.color,
            heroic: piece.heroic ?? false,
          })
        } else {
          row.push(null)
        }
      }
      output.push(row)
    }
    return output
  }

  // Utility methods
  getSquareFromAlgebraic(square: Square): number | undefined {
    return SQUARE_MAP[square]
  }

  getAlgebraicFromSquare(square: number): Square {
    return algebraic(square)
  }

  // Board analysis helpers
  getPiecesOfColor(color: Color): Array<{ piece: Piece; square: number }> {
    const pieces: Array<{ piece: Piece; square: number }> = []
    const board = this.gameState.getBoardReference()

    for (let sq = 0; sq < 256; sq++) {
      if (this.gameState.isSquareOnBoard(sq)) {
        const piece = board[sq]
        if (piece && piece.color === color) {
          pieces.push({ piece, square: sq })
        }
      }
    }

    return pieces
  }

  getPiecesOfType(
    type: PieceSymbol,
    color?: Color,
  ): Array<{ piece: Piece; square: number }> {
    const pieces: Array<{ piece: Piece; square: number }> = []
    const board = this.gameState.getBoardReference()

    for (let sq = 0; sq < 256; sq++) {
      if (this.gameState.isSquareOnBoard(sq)) {
        const piece = board[sq]
        if (piece && piece.type === type && (!color || piece.color === color)) {
          pieces.push({ piece, square: sq })
        }
      }
    }

    return pieces
  }

  // Stack operations for pieces with carrying arrays
  getStackSize(square: Square | number): number {
    const piece = this.getPiece(square)
    if (!piece) return 0

    return 1 + (piece.carrying?.length ?? 0)
  }

  getStackPieces(square: Square | number): Piece[] {
    const piece = this.getPiece(square)
    if (!piece) return []

    return flattenPiece(piece)
  }

  // Board state validation
  validateBoardState(): string[] {
    const errors: string[] = []
    const board = this.gameState.getBoardReference()

    // Check for multiple commanders of same color
    const commanderCounts = { r: 0, b: 0 }

    for (let sq = 0; sq < 256; sq++) {
      if (this.gameState.isSquareOnBoard(sq)) {
        const piece = board[sq]
        if (piece && haveCommander(piece)) {
          commanderCounts[piece.color]++
        }
      }
    }

    if (commanderCounts.r > 1) {
      errors.push('Multiple red commanders found')
    }
    if (commanderCounts.b > 1) {
      errors.push('Multiple blue commanders found')
    }

    // Validate terrain constraints
    for (let sq = 0; sq < 256; sq++) {
      if (this.gameState.isSquareOnBoard(sq)) {
        const piece = board[sq]
        if (piece && !this.validatePiecePlacement(piece, sq)) {
          errors.push(
            `Invalid piece placement at ${algebraic(sq)}: ${piece.type}`,
          )
        }
      }
    }

    return errors
  }

  // Debug helpers
  printBoard(): void {
    const board = this.gameState.getBoardReference()
    console.log('Board state:')
    for (let r = 0; r < 12; r++) {
      let row = ''
      for (let f = 0; f < 11; f++) {
        const sq = r * 16 + f
        const piece = board[sq]
        if (piece) {
          row +=
            piece.color === 'r'
              ? piece.type.toUpperCase()
              : piece.type.toLowerCase()
        } else {
          row += '.'
        }
        row += ' '
      }
      console.log(`${12 - r}: ${row}`)
    }
    console.log('   a b c d e f g h i j k')
  }
}
