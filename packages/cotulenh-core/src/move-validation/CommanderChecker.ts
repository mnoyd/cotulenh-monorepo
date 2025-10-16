/**
 * Commander checking logic
 *
 * Determines if a commander is under attack or exposed (facing enemy commander).
 */

import type { IBoard } from '../types/Board'
import type { IGameState } from '../types/GameState'
import type { Color } from '../types/Constants'
import { COMMANDER } from '../types/Constants'
import { getFile, getRank } from '../utils/square'
import { createMoveGenerator } from '../move-generation'

/**
 * Check if a commander is under attack
 */
export function isCommanderAttacked(
  board: IBoard,
  commanderSquare: number,
  commanderColor: Color,
): boolean {
  const enemyColor: Color = commanderColor === 'r' ? 'b' : 'r'

  // Check if any enemy piece can attack this square
  // We need to generate all enemy moves and see if any target the commander square
  for (const [square, piece] of board.pieces(enemyColor)) {
    if (canPieceAttackSquare(board, square, commanderSquare, enemyColor)) {
      return true
    }
  }

  return false
}

/**
 * Check if commanders are facing each other (Flying General violation)
 */
export function isCommanderExposed(
  board: IBoard,
  redCommanderSquare: number,
  blueCommanderSquare: number,
): boolean {
  // Check if on same file
  const redFile = getFile(redCommanderSquare)
  const blueFile = getFile(blueCommanderSquare)

  if (redFile !== blueFile) {
    return false // Different files, not exposed
  }

  // Same file - check if any pieces between them
  const minSquare = Math.min(redCommanderSquare, blueCommanderSquare)
  const maxSquare = Math.max(redCommanderSquare, blueCommanderSquare)

  // Check all squares between commanders
  for (let sq = minSquare + 16; sq < maxSquare; sq += 16) {
    if (getFile(sq) === redFile && board.get(sq) !== null) {
      return false // Piece blocking, not exposed
    }
  }

  return true // No blocking pieces, commanders face each other
}

/**
 * Check if a piece at fromSquare can attack toSquare
 */
function canPieceAttackSquare(
  board: IBoard,
  fromSquare: number,
  toSquare: number,
  color: Color,
): boolean {
  const piece = board.get(fromSquare)
  if (!piece || piece.color !== color) {
    return false
  }

  // Check if the piece can potentially attack the target square
  // This is a more accurate check that considers blocking and terrain
  const file1 = getFile(fromSquare)
  const rank1 = getRank(fromSquare)
  const file2 = getFile(toSquare)
  const rank2 = getRank(toSquare)

  const fileDelta = Math.abs(file2 - file1)
  const rankDelta = Math.abs(rank2 - rank1)

  switch (piece.type) {
    case 'c': // Commander
      if (piece.heroic) {
        // Heroic commander can move diagonally too
        return (
          (fileDelta <= 1 && rankDelta <= 1 && fileDelta + rankDelta > 0) ||
          canMoveOrthogonally(board, fromSquare, toSquare, Infinity)
        )
      } else {
        // Normal commander moves infinite orthogonal
        return canMoveOrthogonally(board, fromSquare, toSquare, Infinity)
      }

    case 'i': // Infantry
      if (piece.heroic) {
        // Heroic infantry has +1 range
        return canMoveOrthogonally(board, fromSquare, toSquare, 2)
      } else {
        // Normal infantry moves 1 square orthogonal
        return canMoveOrthogonally(board, fromSquare, toSquare, 1)
      }

    case 't': // Tank
      // Tank moves 2 squares orthogonal with shoot-over
      return canMoveOrthogonally(board, fromSquare, toSquare, 2, true)

    case 'a': // Artillery
      // Artillery moves 3 squares with ignore-blocking
      return canMoveOrthogonally(board, fromSquare, toSquare, 3, true)

    case 's': // Missile
      // L-shaped movement
      return (
        (fileDelta === 2 && rankDelta === 1) ||
        (fileDelta === 1 && rankDelta === 2)
      )

    case 'f': // Air Force
      // 4 squares in all directions
      return (
        canMoveOrthogonally(board, fromSquare, toSquare, 4) ||
        canMoveDiagonally(board, fromSquare, toSquare, 4)
      )

    case 'n': // Navy
      // 1 square orthogonal on water/mixed terrain, or stay-capture
      return (
        canMoveOrthogonally(board, fromSquare, toSquare, 1) ||
        (fileDelta <= 1 && rankDelta <= 1 && fileDelta + rankDelta > 0)
      )

    case 'h': // Headquarter
      // Immobile unless heroic
      if (piece.heroic) {
        return (
          (fileDelta === 1 && rankDelta === 0) ||
          (fileDelta === 0 && rankDelta === 1)
        )
      }
      return false

    case 'g': // Anti-Air
    case 'm': // Militia
    case 'e': // Engineer
      // 1 square orthogonal
      return canMoveOrthogonally(board, fromSquare, toSquare, 1)

    default:
      return false
  }
}

/**
 * Check if a piece can move orthogonally from one square to another
 */
function canMoveOrthogonally(
  board: IBoard,
  from: number,
  to: number,
  maxDistance: number,
  ignoreBlocking = false,
): boolean {
  const file1 = getFile(from)
  const rank1 = getRank(from)
  const file2 = getFile(to)
  const rank2 = getRank(to)

  const fileDelta = Math.abs(file2 - file1)
  const rankDelta = Math.abs(rank2 - rank1)

  // Must be orthogonal
  if (
    !(fileDelta === 0 || rankDelta === 0) ||
    (fileDelta === 0 && rankDelta === 0)
  ) {
    return false
  }

  const distance = Math.max(fileDelta, rankDelta)
  if (distance > maxDistance) {
    return false
  }

  // If ignoring blocking, we're done
  if (ignoreBlocking) {
    return true
  }

  // Check for blocking pieces
  const fileStep = file2 > file1 ? 1 : file2 < file1 ? -1 : 0
  const rankStep = rank2 > rank1 ? 1 : rank2 < rank1 ? -1 : 0

  let currentFile = file1 + fileStep
  let currentRank = rank1 + rankStep

  while (currentFile !== file2 || currentRank !== rank2) {
    const currentSquare = currentRank * 16 + currentFile
    if (board.get(currentSquare) !== null) {
      return false // Blocked
    }
    currentFile += fileStep
    currentRank += rankStep
  }

  return true
}

/**
 * Check if a piece can move diagonally from one square to another
 */
function canMoveDiagonally(
  board: IBoard,
  from: number,
  to: number,
  maxDistance: number,
): boolean {
  const file1 = getFile(from)
  const rank1 = getRank(from)
  const file2 = getFile(to)
  const rank2 = getRank(to)

  const fileDelta = Math.abs(file2 - file1)
  const rankDelta = Math.abs(rank2 - rank1)

  // Must be diagonal
  if (fileDelta !== rankDelta || fileDelta === 0) {
    return false
  }

  if (fileDelta > maxDistance) {
    return false
  }

  // Check for blocking pieces
  const fileStep = file2 > file1 ? 1 : -1
  const rankStep = rank2 > rank1 ? 1 : -1

  let currentFile = file1 + fileStep
  let currentRank = rank1 + rankStep

  while (currentFile !== file2 || currentRank !== rank2) {
    const currentSquare = currentRank * 16 + currentFile
    if (board.get(currentSquare) !== null) {
      return false // Blocked
    }
    currentFile += fileStep
    currentRank += rankStep
  }

  return true
}

/**
 * Find the commander square for a given color
 */
export function findCommanderSquare(
  board: IBoard,
  color: Color,
): number | null {
  for (const [square, piece] of board.pieces(color)) {
    if (piece.type === COMMANDER) {
      return square
    }
  }
  return null
}
