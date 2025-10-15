/**
 * Move validation - filters pseudo-legal moves to legal moves
 *
 * A move is legal if after making it:
 * 1. Own commander is not under attack
 * 2. Commanders are not facing each other (Flying General)
 */

import type { Move } from '../types/Move'
import type { IGameState } from '../types/GameState'
import type { Color } from '../types/Constants'
import { isCommanderAttacked, isCommanderExposed } from './CommanderChecker'
import { applyMoveToState } from './MoveApplicator'

/**
 * Filter pseudo-legal moves to legal moves
 */
export function filterLegalMoves(moves: Move[], gameState: IGameState): Move[] {
  const legalMoves: Move[] = []
  const color = gameState.turn

  for (const move of moves) {
    if (isMoveLegal(move, gameState, color)) {
      legalMoves.push(move)
    }
  }

  return legalMoves
}

/**
 * Check if a single move is legal
 */
export function isMoveLegal(
  move: Move,
  gameState: IGameState,
  color: Color,
): boolean {
  // Apply move to get new state
  const newState = applyMoveToState(move, gameState)

  // Get commander positions in new state
  const redCommander = newState.getCommander('r')
  const blueCommander = newState.getCommander('b')

  // Check if own commander is under attack
  const ownCommanderSquare = color === 'r' ? redCommander : blueCommander
  if (isCommanderAttacked(newState.board, ownCommanderSquare, color)) {
    return false
  }

  // Check if commanders are exposed (Flying General)
  if (isCommanderExposed(newState.board, redCommander, blueCommander)) {
    return false
  }

  return true
}
