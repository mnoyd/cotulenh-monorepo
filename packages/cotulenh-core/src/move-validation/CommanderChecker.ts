/**
 * Commander checking logic
 *
 * Determines if a commander is under attack or exposed (facing enemy commander).
 */

import type { IBoard } from '../types/Board'
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

  // For simplicity, check if the piece type can reach that square
  // This is a simplified check - in a full implementation, we'd generate
  // all moves for this piece and see if any target toSquare

  const file1 = getFile(fromSquare)
  const rank1 = getRank(fromSquare)
  const file2 = getFile(toSquare)
  const rank2 = getRank(toSquare)

  const fileDelta = Math.abs(file2 - file1)
  const rankDelta = Math.abs(rank2 - rank1)

  switch (piece.type) {
    case 'c': // Commander
    case 'i': // Infantry
    case 'g': // Anti-Air
      // One square orthogonal
      return (
        (fileDelta === 1 && rankDelta === 0) ||
        (fileDelta === 0 && rankDelta === 1)
      )

    case 'm': // Militia
      // One square in any direction
      return fileDelta <= 1 && rankDelta <= 1 && fileDelta + rankDelta > 0

    case 't': // Tank
      // Up to 2 squares orthogonal (simplified - doesn't check blocking)
      return (
        (fileDelta <= 2 && rankDelta === 0) ||
        (fileDelta === 0 && rankDelta <= 2)
      )

    case 'a': // Artillery
      // Up to 3 squares orthogonal
      return (
        (fileDelta <= 3 && rankDelta === 0) ||
        (fileDelta === 0 && rankDelta <= 3)
      )

    case 's': // Missile
      // L-shaped
      return (
        (fileDelta === 2 && rankDelta === 1) ||
        (fileDelta === 1 && rankDelta === 2)
      )

    case 'f': // Air Force
      // Up to 4 squares orthogonal (simplified)
      return (
        (fileDelta <= 4 && rankDelta === 0) ||
        (fileDelta === 0 && rankDelta <= 4)
      )

    case 'n': // Navy
      // One square orthogonal OR stay-capture (adjacent)
      return (
        (fileDelta === 1 && rankDelta === 0) ||
        (fileDelta === 0 && rankDelta === 1)
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

    default:
      return false
  }
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
