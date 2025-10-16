/**
 * Move application - applies moves to game state
 *
 * Creates new game state after applying a move.
 * Handles all move types: normal, capture, stay-capture, suicide-capture, combine, deploy.
 */

import type { Move } from '../types/Move'
import type { IGameState } from '../types/GameState'
import type { Piece } from '../types/Piece'
import { GameState } from '../core/GameState'
import { Board } from '../core/Board'
import { pieceUtils } from '../core/Piece'
import {
  isNormalMove,
  isCaptureMove,
  isStayCaptureMove,
  isSuicideCaptureMove,
  isCombineMove,
  isDeployStepMove,
  isDeployCompleteMove,
} from '../types/Move'
import { COMMANDER } from '../types/Constants'
import { findCommanderSquare } from './CommanderChecker'

/**
 * Apply a move to create a new game state
 */
export function applyMoveToState(
  move: Move,
  gameState: IGameState,
): IGameState {
  // Clone the board
  const newBoard = gameState.board.clone()
  let newCommanders = [...gameState.commanders] as [number, number]

  if (isNormalMove(move)) {
    // Move piece from -> to
    const piece = newBoard.get(move.from)
    if (piece) {
      newBoard.set(move.from, null)
      newBoard.set(move.to, piece)

      // Update commander position if moved
      if (piece.type === COMMANDER) {
        if (piece.color === 'r') {
          newCommanders[0] = move.to
        } else {
          newCommanders[1] = move.to
        }
      }
    }
  } else if (isCaptureMove(move)) {
    // Move piece and capture
    const piece = newBoard.get(move.from)
    if (piece) {
      newBoard.set(move.from, null)
      newBoard.set(move.to, piece)

      // Check if piece should become heroic after capture
      const newPiece = maybePromoteToHeroic(piece, move.captured)
      newBoard.set(move.to, newPiece)

      // Update commander position if moved
      if (piece.type === COMMANDER) {
        if (piece.color === 'r') {
          newCommanders[0] = move.to
        } else {
          newCommanders[1] = move.to
        }
      }
    }
  } else if (isStayCaptureMove(move)) {
    // Remove captured piece, attacker stays
    newBoard.set(move.target, null)

    // Check if attacker becomes heroic
    const attacker = newBoard.get(move.attacker)
    if (attacker) {
      const newPiece = maybePromoteToHeroic(attacker, move.captured)
      newBoard.set(move.attacker, newPiece)
    }
  } else if (isSuicideCaptureMove(move)) {
    // Both pieces destroyed
    newBoard.set(move.from, null)
    newBoard.set(move.to, null)
  } else if (isCombineMove(move)) {
    // Remove all source pieces, place combined at destination
    for (const { from } of move.pieces) {
      newBoard.set(from, null)
    }
    newBoard.set(move.to, move.combined)

    // Update commander if part of combine (rare but possible)
    const commanderInStack = move.pieces.find((p) => p.piece.type === COMMANDER)
    if (commanderInStack) {
      if (commanderInStack.piece.color === 'r') {
        newCommanders[0] = move.to
      } else {
        newCommanders[1] = move.to
      }
    }
  } else if (isDeployStepMove(move)) {
    // Deploy move - place piece at destination
    // Original stack is handled by DeploySession
    newBoard.set(move.to, move.piece)

    // Update commander if deploying commander (shouldn't happen normally)
    if (move.piece.type === COMMANDER) {
      if (move.piece.color === 'r') {
        newCommanders[0] = move.to
      } else {
        newCommanders[1] = move.to
      }
    }
  } else if (isDeployCompleteMove(move)) {
    // Deploy complete - no board changes, just marks session complete
    // Actual board changes happen during deploy steps
  }

  // Create new game state
  return new GameState({
    board: newBoard,
    turn: gameState.turn,
    commanders: newCommanders,
    moveNumber: gameState.moveNumber,
    halfMoves: gameState.halfMoves,
    deploySession: gameState.deploySession,
  })
}

/**
 * Check if a piece should become heroic after a capture
 *
 * Rules:
 * - Capturing a commander makes the piece heroic
 * - Capturing a heroic piece makes the piece heroic
 */
function maybePromoteToHeroic(attacker: Piece, captured: Piece): Piece {
  // Already heroic
  if (attacker.heroic) {
    return attacker
  }

  // Captured a commander or heroic piece
  if (captured.type === COMMANDER || captured.heroic) {
    return {
      ...pieceUtils.clonePiece(attacker),
      heroic: true,
    }
  }

  return attacker
}
