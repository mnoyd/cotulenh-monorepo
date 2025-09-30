/**
 * Move Validation Module - Handles move legality, check detection, and game analysis
 * This module validates moves and analyzes game positions for legal play
 */

import type { Color, PieceSymbol, InternalMove } from '../type.js'
import { AIR_FORCE, NAVY, RED, BLUE, BITS, swapColor } from '../type.js'
import type { InternalDeployMove } from '../deploy-move.js'
import type {
  IGameState,
  IBoardOperations,
  IMoveValidator,
  IMoveExecutor,
} from './interfaces.js'
import { flattenPiece } from '../utils.js'
import {
  getPieceMovementConfig,
  getOppositeOffset,
  ORTHOGONAL_OFFSETS,
  ALL_OFFSETS,
} from '../move-generation.js'
import { getCheckAirDefenseZone } from '../air-defense.js'

export class MoveValidator implements IMoveValidator {
  constructor(
    private gameState: IGameState,
    private boardOperations: IBoardOperations,
    private moveExecutor?: IMoveExecutor, // Optional to avoid circular dependency
  ) {}

  // Method to set the move executor after construction to resolve circular dependency
  setMoveExecutor(moveExecutor: IMoveExecutor): void {
    this.moveExecutor = moveExecutor
  }

  // Legal move validation
  filterLegalMoves(
    moves: (InternalMove | InternalDeployMove)[],
    color: Color,
  ): (InternalMove | InternalDeployMove)[] {
    const legalMoves: (InternalMove | InternalDeployMove)[] = []

    for (const move of moves) {
      if (this.isMoveLegalInternal(move, color)) {
        legalMoves.push(move)
      }
    }

    return legalMoves
  }

  isMoveLegal(move: InternalMove): boolean {
    return this.isMoveLegalInternal(move, move.color)
  }

  private isMoveLegalInternal(
    move: InternalMove | InternalDeployMove,
    color: Color,
  ): boolean {
    if (!this.moveExecutor) {
      throw new Error(
        'MoveValidator requires MoveExecutor for accurate move validation',
      )
    }

    // Execute the full move using the command pattern (like original _makeMove)
    this.moveExecutor.executeMove(move)

    // A move is legal if it doesn't leave the commander attacked AND doesn't expose the commander
    const isLegal =
      !this.isCommanderAttacked(color) && !this.isCommanderExposed(color)

    // Undo the move (like original _undoMove)
    this.moveExecutor.undoLastMove()

    return isLegal
  }

  // Check detection
  isCommanderAttacked(color: Color): boolean {
    const commanderSq = this.gameState.getCommanderPosition(color)
    if (commanderSq === -1) return true // Commander captured = loss = considered 'attacked'

    // Use getAttackers to check if any opponent pieces can attack the commander
    const opponent = swapColor(color)
    const attackers = this.getAttackers(commanderSq, opponent)

    return attackers.length > 0
  }

  isCommanderExposed(color: Color): boolean {
    const usCommanderSq = this.gameState.getCommanderPosition(color)
    const them = swapColor(color)
    const themCommanderSq = this.gameState.getCommanderPosition(them)

    // If either commander is off board, they can't be exposed
    if (usCommanderSq === -1 || themCommanderSq === -1) {
      return false
    }

    // Check only orthogonal directions for commander exposure
    for (const offset of ORTHOGONAL_OFFSETS) {
      let sq = usCommanderSq + offset
      while (this.gameState.isSquareOnBoard(sq)) {
        const piece = this.boardOperations.getPiece(sq)
        if (piece) {
          // If the first piece encountered is the enemy commander, we are exposed
          if (sq === themCommanderSq) {
            return true
          }
          // If it's any other piece, the line of sight is blocked in this direction
          break
        }
        sq += offset
      }
    }

    return false
  }

  // Attack calculation
  getAttackers(
    square: number,
    attackerColor: Color,
  ): { square: number; type: PieceSymbol }[] {
    const attackers: { square: number; type: PieceSymbol }[] = []
    const targetPiece = this.boardOperations.getPiece(square)
    const isLandPiece = targetPiece?.type !== NAVY

    // Check in all directions from the target square
    for (const offset of ALL_OFFSETS) {
      let currentSquare = square
      let pieceBlocking = false
      let distance = 0

      // Check up to 5 squares in each direction (maximum range of heroic air_force)
      while (distance < 5) {
        currentSquare += offset
        distance++

        // Stop if we're off the board
        if (!this.gameState.isSquareOnBoard(currentSquare)) break

        const piece = this.boardOperations.getPiece(currentSquare)

        // If no piece at this square, continue to next square in this direction
        if (!piece) continue

        // Check if any piece in the stack can attack the target
        if (piece.color === attackerColor) {
          // Use flattenPiece to process both the main piece and carried pieces
          const allPieces = flattenPiece(piece)

          for (const singlePiece of allPieces) {
            if (singlePiece.color === attackerColor) {
              // Get movement configuration for this piece
              const config = getPieceMovementConfig(
                singlePiece.type,
                singlePiece.heroic ?? false,
              )

              let captureRange = config.captureRange
              if (isLandPiece && config.specialRules?.navyAttackMechanisms) {
                captureRange--
              }

              let airForceCanCapture = true
              if (singlePiece.type === AIR_FORCE) {
                const checkAirDefenseZone = getCheckAirDefenseZone(
                  this.createGameInterface(),
                  currentSquare,
                  swapColor(attackerColor),
                  getOppositeOffset(offset)!,
                )
                let res = -1
                let i = 0
                while (res < 2 && i < distance) {
                  res = checkAirDefenseZone()
                  i++
                }
                airForceCanCapture = res < 2
              }

              // Check if the piece's range allows it to reach the target
              if (distance <= captureRange) {
                // Check if the piece can attack through blocking pieces
                if (
                  (!pieceBlocking || config.captureIgnoresPieceBlocking) &&
                  (singlePiece.type === AIR_FORCE ? airForceCanCapture : true)
                ) {
                  attackers.push({
                    square: currentSquare,
                    type: singlePiece.type,
                  })
                }
              }
            }
          }
        }

        // Mark that we've encountered a piece in this direction
        pieceBlocking = true
      }
    }

    return attackers
  }

  // Game state analysis
  isCheck(): boolean {
    const turn = this.gameState.getTurn()
    const commanderSq = this.gameState.getCommanderPosition(turn)
    if (commanderSq === -1) {
      return true // If commander is not on board, it's a check/invalid state
    }
    return this.isCommanderAttacked(turn)
  }

  isCheckmate(): boolean {
    // Checkmate = Commander is attacked AND no legal moves exist
    // This would need access to move generation, which should be in move interface
    // For now, we'll implement a basic version
    if (!this.isCheck()) return false

    // TODO: This needs integration with move generation
    // const legalMoves = this.moveInterface.generateMoves({ legal: true })
    // return legalMoves.length === 0

    return false // Placeholder - needs move generation integration
  }

  isDraw(): boolean {
    return this.isDrawByFiftyMoves() || this.isThreefoldRepetition()
  }

  isGameOver(): boolean {
    // Game over if checkmate, draw, or a commander is captured
    const redCommanderOffBoard = this.gameState.getCommanderPosition(RED) === -1
    const blueCommanderOffBoard =
      this.gameState.getCommanderPosition(BLUE) === -1

    // If the game starts with no commanders, it's not technically a checkmate until a move is attempted,
    // but for validation purposes, it's an end state.
    const boardIsEmpty = this.gameState.getBoard().every((p) => p === undefined)
    if (boardIsEmpty && redCommanderOffBoard && blueCommanderOffBoard) {
      return true
    }

    return (
      this.isCheckmate() ||
      this.isDraw() ||
      redCommanderOffBoard ||
      blueCommanderOffBoard
    )
  }

  isDrawByFiftyMoves(): boolean {
    return this.gameState.getHalfMoves() >= 100 // 50 moves per side
  }

  isThreefoldRepetition(): boolean {
    // TODO: This needs integration with FEN generation from serialization module
    // const fen = this.serialization.generateFen()
    // return this.gameState.getPositionCountForFen(fen) >= 3

    return false // Placeholder - needs serialization integration
  }

  isInsufficientMaterial(): boolean {
    // TODO: Implement insufficient material detection for CoTuLenh variant
    // This would check if there are enough pieces to deliver checkmate

    return false // Placeholder - needs variant-specific rules
  }

  // Private helper methods

  // Create game interface for compatibility with existing systems
  private createGameInterface(): any {
    return {
      getBoardReference: () => this.gameState.getBoardReference(),
      getCommanderSquare: (color: Color) =>
        this.gameState.getCommanderPosition(color),
      get: (square: any, pieceType?: any) =>
        this.boardOperations.getPiece(square, pieceType),
      turn: () => this.gameState.getTurn(),
      getAirDefense: () => this.gameState.getAirDefense(),
      isSquareOnBoard: (square: number) =>
        this.gameState.isSquareOnBoard(square),
    }
  }

  // Advanced validation methods
  validateMoveConstraints(move: InternalMove): string[] {
    const errors: string[] = []

    // Validate basic move structure
    if (!move.from || !move.to || !move.piece || !move.color) {
      errors.push('Move missing required fields')
      return errors
    }

    // Validate squares are on board
    if (!this.gameState.isSquareOnBoard(move.from)) {
      errors.push(`Invalid from square: ${move.from}`)
    }

    if (!this.gameState.isSquareOnBoard(move.to)) {
      errors.push(`Invalid to square: ${move.to}`)
    }

    // Validate piece exists at source
    const sourcePiece = this.boardOperations.getPiece(move.from)
    if (!sourcePiece) {
      errors.push(`No piece at source square: ${move.from}`)
    } else if (sourcePiece.color !== move.color) {
      errors.push(
        `Wrong piece color at source: expected ${move.color}, got ${sourcePiece.color}`,
      )
    }

    // Validate turn
    if (move.color !== this.gameState.getTurn()) {
      errors.push(
        `Wrong turn: expected ${this.gameState.getTurn()}, got ${move.color}`,
      )
    }

    return errors
  }

  // Threat analysis
  getThreatenedSquares(color: Color): number[] {
    const threatenedSquares: number[] = []

    for (let sq = 0; sq < 256; sq++) {
      if (this.gameState.isSquareOnBoard(sq)) {
        const attackers = this.getAttackers(sq, color)
        if (attackers.length > 0) {
          threatenedSquares.push(sq)
        }
      }
    }

    return threatenedSquares
  }

  // Check if a square is safe for a piece of given color
  isSquareSafe(square: number, color: Color): boolean {
    const opponent = swapColor(color)
    const attackers = this.getAttackers(square, opponent)
    return attackers.length === 0
  }

  // Get all pieces that are currently under attack
  getAttackedPieces(color: Color): Array<{
    square: number
    piece: any
    attackers: { square: number; type: PieceSymbol }[]
  }> {
    const attackedPieces: Array<{
      square: number
      piece: any
      attackers: { square: number; type: PieceSymbol }[]
    }> = []
    const opponent = swapColor(color)

    for (let sq = 0; sq < 256; sq++) {
      if (this.gameState.isSquareOnBoard(sq)) {
        const piece = this.boardOperations.getPiece(sq)
        if (piece && piece.color === color) {
          const attackers = this.getAttackers(sq, opponent)
          if (attackers.length > 0) {
            attackedPieces.push({ square: sq, piece, attackers })
          }
        }
      }
    }

    return attackedPieces
  }

  // Debug helpers
  analyzePosition(): {
    check: { red: boolean; blue: boolean }
    exposed: { red: boolean; blue: boolean }
    threatenedSquares: { red: number[]; blue: number[] }
    attackedPieces: { red: any[]; blue: any[] }
  } {
    return {
      check: {
        red: this.isCommanderAttacked(RED),
        blue: this.isCommanderAttacked(BLUE),
      },
      exposed: {
        red: this.isCommanderExposed(RED),
        blue: this.isCommanderExposed(BLUE),
      },
      threatenedSquares: {
        red: this.getThreatenedSquares(RED),
        blue: this.getThreatenedSquares(BLUE),
      },
      attackedPieces: {
        red: this.getAttackedPieces(RED),
        blue: this.getAttackedPieces(BLUE),
      },
    }
  }
}
