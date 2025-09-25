/**
 * Move Execution Module - Handles move execution, undo operations, and history management
 * This module coordinates move execution using the command pattern and manages game history
 */

import type { Color, InternalMove } from '../type.js'
import { BITS, BLUE, swapColor } from '../type.js'
import { InternalDeployMove, isInternalDeployMove } from '../deploy-move.js'
import type {
  IGameState,
  IBoardOperations,
  IMoveExecutor,
  IMoveValidator,
  History,
  GameStateSnapshot,
} from './interfaces.js'
import {
  createMoveCommand,
  DeployMoveCommand,
  CTLMoveCommandInteface,
} from '../move-apply.js'

export class MoveExecutor implements IMoveExecutor {
  private _history: History[] = []

  constructor(
    private gameState: IGameState,
    private boardOperations: IBoardOperations,
    private moveValidator: IMoveValidator,
  ) {}

  // Move execution
  executeMove(move: InternalMove | InternalDeployMove): void {
    const us = this.gameState.getTurn()
    const them = swapColor(us)

    // 1. Create the command object for this move
    let moveCommand: CTLMoveCommandInteface
    if (isInternalDeployMove(move)) {
      moveCommand = new DeployMoveCommand(this.createGameInterface(), move)
    } else {
      moveCommand = createMoveCommand(this.createGameInterface(), move)
    }

    // Store pre-move state
    const preCommanderState = this.gameState.getCommanderPositions()
    const preTurn = us
    const preHalfMoves = this.gameState.getHalfMoves()
    const preMoveNumber = this.gameState.getMoveNumber()
    const preDeployState = this.gameState.getDeployState()

    // 2. Execute the command
    try {
      moveCommand.execute()
    } catch (error) {
      throw error
    }

    // 3. Store post-execution command and pre-move state in history
    const historyEntry: History = {
      move: moveCommand,
      commanders: preCommanderState,
      turn: preTurn,
      halfMoves: preHalfMoves,
      moveNumber: preMoveNumber,
      deployState: preDeployState,
    }
    this._history.push(historyEntry)

    // 4. Update General Game State AFTER command execution
    this.updateGameStateAfterMove(move, us, moveCommand)

    // Update position count for threefold repetition
    this.updatePositionCounts()
  }

  undoLastMove(): InternalMove | InternalDeployMove | null {
    const old = this._history.pop()
    if (!old) return null

    const command = old.move

    // Restore general game state BEFORE the command modified the board
    for (const color of ['r', 'b'] as Color[]) {
      this.gameState.setCommanderPosition(color, old.commanders[color])
    }
    this.gameState.setTurn(old.turn)
    this.gameState.setHalfMoves(old.halfMoves)
    this.gameState.setMoveNumber(old.moveNumber)
    this.gameState.setDeployState(old.deployState)

    // Ask the command to revert its specific board changes
    command.undo()

    return command.move
  }

  // History management
  getHistory(): History[] {
    return [...this._history] // Return copy to prevent external mutation
  }

  clearHistory(): void {
    this._history = []
  }

  getHistoryLength(): number {
    return this._history.length
  }

  // State management
  saveGameState(): GameStateSnapshot {
    return this.gameState.createSnapshot()
  }

  restoreGameState(snapshot: GameStateSnapshot): void {
    this.gameState.restoreSnapshot(snapshot)
  }

  // Private helper methods
  private updateGameStateAfterMove(
    move: InternalMove | InternalDeployMove,
    us: Color,
    moveCommand: CTLMoveCommandInteface,
  ): void {
    // Reset half moves counter if capture occurred
    if (this.wasCaptureMove(moveCommand)) {
      this.gameState.setHalfMoves(0)
    } else {
      this.gameState.setHalfMoves(this.gameState.getHalfMoves() + 1)
    }

    // Increment move number if Blue moved (and it's not a deploy move)
    if (
      !isInternalDeployMove(move) &&
      us === BLUE &&
      !(move.flags & BITS.DEPLOY)
    ) {
      this.gameState.setMoveNumber(this.gameState.getMoveNumber() + 1)
    }

    // Switch turn (or maintain for deploy moves)
    if (!isInternalDeployMove(move) && !(move.flags & BITS.DEPLOY)) {
      this.gameState.setTurn(swapColor(us))
    }
    // If it was a deploy move, turn remains the same
  }

  private wasCaptureMove(moveCommand: CTLMoveCommandInteface): boolean {
    const captured = moveCommand.move.captured
    return (
      (Array.isArray(captured) && captured.length > 0) ||
      (captured !== undefined && captured !== null)
    )
  }

  private updatePositionCounts(): void {
    // This would need access to FEN generation, which should be in serialization module
    // For now, we'll create a placeholder that can be implemented when serialization is available
    // const fen = this.serializationModule.generateFen()
    // this.gameState.updatePositionCount(fen)
  }

  // Create a game interface for command execution
  // This is a compatibility layer for the existing command system
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
      updateCommandersPosition: (sq: number, color: Color) =>
        this.boardOperations.updateCommanderPosition(sq, color),
      getCommanderSquare: (color: Color) =>
        this.gameState.getCommanderPosition(color),
      getAttackers: (square: number, attackerColor: Color) =>
        this.moveValidator.getAttackers(square, attackerColor),
      getHeroicStatus: (square: any, pieceType?: any) =>
        this.boardOperations.getHeroicStatus(square, pieceType),
      setHeroicStatus: (square: any, pieceType: any, heroic: boolean) =>
        this.boardOperations.setHeroicStatus(square, pieceType, heroic),

      // For compatibility with existing command system
      _board: this.gameState.getBoardReference(),
      _commanders: this.gameState.getCommanderPositions(),
      _deployState: this.gameState.getDeployState(),
      _airDefense: this.gameState.getAirDefense(),
    }
  }

  // Replay functionality for history reconstruction
  replayHistory(moves: (InternalMove | InternalDeployMove)[]): void {
    this.clearHistory()

    for (const move of moves) {
      this.executeMove(move)
    }
  }

  // Get move at specific history index
  getMoveAtIndex(index: number): History | null {
    if (index < 0 || index >= this._history.length) {
      return null
    }
    return { ...this._history[index] }
  }

  // Undo multiple moves
  undoMoves(count: number): (InternalMove | InternalDeployMove)[] {
    const undoneMove: (InternalMove | InternalDeployMove)[] = []

    for (let i = 0; i < count && this._history.length > 0; i++) {
      const move = this.undoLastMove()
      if (move) {
        undoneMove.unshift(move) // Add to beginning to maintain order
      }
    }

    return undoneMove
  }

  // Check if we can undo
  canUndo(): boolean {
    return this._history.length > 0
  }

  // Get the last move without undoing it
  getLastMove(): History | null {
    if (this._history.length === 0) return null
    return { ...this._history[this._history.length - 1] }
  }

  // Validation helpers
  validateMoveExecution(move: InternalMove | InternalDeployMove): string[] {
    const errors: string[] = []

    // Basic move validation
    if (!move) {
      errors.push('Move is null or undefined')
      return errors
    }

    // For deploy moves, skip normal move field validations (handled by deploy system)
    if (isInternalDeployMove(move)) {
      return errors
    }

    const m = move as InternalMove

    // Validate turn
    if (m.color !== this.gameState.getTurn()) {
      errors.push(
        `Wrong turn: expected ${this.gameState.getTurn()}, got ${m.color}`,
      )
    }

    // Validate squares are on board
    if (!this.gameState.isSquareOnBoard(m.from)) {
      errors.push(`Invalid from square: ${m.from}`)
    }

    if (!this.gameState.isSquareOnBoard(m.to)) {
      errors.push(`Invalid to square: ${m.to}`)
    }

    // Validate piece exists at from square
    const piece = this.boardOperations.getPiece(m.from)
    if (!piece) {
      errors.push(`No piece at from square: ${m.from}`)
    } else if (piece.color !== m.color) {
      errors.push(
        `Piece color mismatch at ${m.from}: expected ${m.color}, got ${piece.color}`,
      )
    }

    return errors
  }

  // Debug helpers
  printHistory(): void {
    console.log('Move History:')
    this._history.forEach((entry, index) => {
      console.log(
        `${index + 1}. ${entry.turn} move - Half moves: ${entry.halfMoves}, Move: ${entry.moveNumber}`,
      )
    })
  }

  getHistoryStats(): {
    totalMoves: number
    redMoves: number
    blueMoves: number
    captures: number
    deployMoves: number
  } {
    const stats = {
      totalMoves: this._history.length,
      redMoves: 0,
      blueMoves: 0,
      captures: 0,
      deployMoves: 0,
    }

    for (const entry of this._history) {
      if (entry.turn === 'r') {
        stats.redMoves++
      } else {
        stats.blueMoves++
      }

      if (this.wasCaptureMove(entry.move)) {
        stats.captures++
      }

      if (isInternalDeployMove(entry.move.move)) {
        stats.deployMoves++
      }
    }

    return stats
  }
}
