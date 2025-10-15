/**
 * SAN (Standard Algebraic Notation) parser for CoTuLenh
 *
 * Examples:
 * - "e4" - Move to e4
 * - "Nf3" - Knight to f3
 * - "Txe5" - Tank captures on e5
 * - "Tde5" - Tank from d-file to e5 (disambiguation)
 * - "N<" - Navy stay-capture
 */

import type { Move } from '../types/Move.js'
import type { IGameState, IDeploySession } from '../types/GameState.js'
import type { PieceSymbol } from '../types/Constants.js'
import type { Piece } from '../types/Piece.js'
import { algebraicToSquare, squareToAlgebraic } from '../utils/square.js'
import { filterLegalMoves } from '../move-validation/index.js'
import { createMoveGenerator } from '../move-generation/index.js'

/**
 * Encode deploy session for SAN notation
 * Format: originalSquare:movedPieces,remainingPieces
 * Example: d5:N@e8,TI (stack from d5, Navy moved to e8, Tank+Infantry remaining)
 */
function encodeDeploySession(deploySession: IDeploySession): string {
  const originalSquare = squareToAlgebraic(deploySession.originalSquare)

  // Get moved pieces with their destinations
  const movedParts: string[] = []
  for (const [square, piece] of deploySession.getVirtualChanges().entries()) {
    if (piece !== null) {
      const pieceStr = pieceToSAN(piece)
      const squareStr = squareToAlgebraic(square)
      movedParts.push(`${pieceStr}@${squareStr}`)
    }
  }

  // Get remaining pieces that still need to be deployed
  const remainingPieces = deploySession.getRemainingPieces()
  const remainingStr = remainingPieces.map((p) => pieceToSAN(p)).join('')

  // Format: originalSquare:moved,remaining
  const movedStr = movedParts.join('')
  return `${originalSquare}:${movedStr},${remainingStr}`
}

/**
 * Convert piece to SAN character
 */
function pieceToSAN(piece: Piece): string {
  let char =
    Object.entries(PIECE_LETTERS).find(([_, v]) => v === piece.type)?.[0] ||
    piece.type.toUpperCase()

  // Add * for heroic
  if (piece.heroic) {
    char += '*'
  }

  return char
}

/**
 * Parse deploy session from SAN notation
 * Format: originalSquare:movedPieces,remainingPieces
 * Example: d5:N@e8,TI
 */
function parseDeploySession(deployStr: string): {
  originalSquare: number
  movedPieces: Array<{ piece: string; destination: string }>
  remainingPieces: string[]
} {
  const [originalPart, movesPart] = deployStr.split(':')
  if (!movesPart) {
    throw new Error('Invalid deploy session format')
  }

  const [movedPart, remainingPart] = movesPart.split(',')

  return {
    originalSquare: algebraicToSquare(originalPart),
    movedPieces: parseMovedPieces(movedPart || ''),
    remainingPieces: parseRemainingPieces(remainingPart || ''),
  }
}

/**
 * Parse moved pieces from SAN (e.g., "N@e8T@d5")
 */
function parseMovedPieces(
  movedStr: string,
): Array<{ piece: string; destination: string }> {
  const moves: Array<{ piece: string; destination: string }> = []
  let i = 0

  while (i < movedStr.length) {
    // Parse piece (with optional heroic marker)
    let piece = movedStr[i]
    i++

    if (i < movedStr.length && movedStr[i] === '*') {
      piece += '*'
      i++
    }

    // Expect @
    if (i >= movedStr.length || movedStr[i] !== '@') {
      throw new Error('Invalid moved piece format')
    }
    i++

    // Parse destination square (2 characters)
    if (i + 1 >= movedStr.length) {
      throw new Error('Invalid destination square')
    }

    const square = movedStr.substring(i, i + 2)
    i += 2

    moves.push({
      piece,
      destination: square,
    })
  }

  return moves
}

/**
 * Parse remaining pieces from SAN (e.g., "TI")
 */
function parseRemainingPieces(remainingStr: string): string[] {
  const pieces: string[] = []
  let i = 0

  while (i < remainingStr.length) {
    let piece = remainingStr[i]
    i++

    if (i < remainingStr.length && remainingStr[i] === '*') {
      piece += '*'
      i++
    }

    pieces.push(piece)
  }

  return pieces
}

/**
 * Piece letter mapping for SAN
 */
const PIECE_LETTERS: Record<string, PieceSymbol> = {
  C: 'c', // Commander
  I: 'i', // Infantry
  E: 'e', // Engineer
  T: 't', // Tank
  M: 'm', // Militia
  A: 'a', // Artillery
  S: 's', // Missile
  G: 'g', // Anti-Air
  N: 'n', // Navy
  F: 'f', // Air Force
  H: 'h', // Headquarter
}

/**
 * Parse SAN notation to find matching move
 */
export function parseSAN(san: string, gameState: IGameState): Move | null {
  // Generate all legal moves
  const generator = createMoveGenerator()
  const pseudoLegal = generator.generateMoves(gameState)
  const legalMoves = filterLegalMoves(pseudoLegal, gameState)

  // Clean up SAN (remove check/mate indicators)
  let cleanSAN = san.replace(/[+#!?]/g, '').trim()

  // Check for stay-capture (Navy special)
  if (cleanSAN.endsWith('<')) {
    // Find stay-capture moves
    const stayCaptureMove = legalMoves.find((m) => m.type === 'stay-capture')
    return stayCaptureMove || null
  }

  // Check for castling or special notation
  // (CoTuLenh doesn't have castling, but could have special moves)

  // Parse piece type (if specified)
  let pieceType: PieceSymbol | null = null
  let fromHint: string | null = null
  let isCapture = false
  let toSquare: string

  let idx = 0

  // Check for piece letter
  if (cleanSAN[0] >= 'A' && cleanSAN[0] <= 'Z') {
    pieceType = PIECE_LETTERS[cleanSAN[0]]
    idx++
  }

  // Check for disambiguation (file or rank)
  if (idx < cleanSAN.length && cleanSAN[idx] >= 'a' && cleanSAN[idx] <= 'k') {
    // Could be from-file disambiguation or the destination
    if (
      idx + 1 < cleanSAN.length &&
      (cleanSAN[idx + 1] === 'x' ||
        (cleanSAN[idx + 1] >= '1' && cleanSAN[idx + 1] <= '9'))
    ) {
      // It's destination or capture marker
      if (cleanSAN[idx + 1] === 'x') {
        fromHint = cleanSAN[idx]
        isCapture = true
        idx += 2
      }
    } else {
      // Check if it's a complete square or just file
      if (
        idx + 1 < cleanSAN.length &&
        cleanSAN[idx + 1] >= '1' &&
        cleanSAN[idx + 1] <= '9'
      ) {
        // It's the destination
      } else if (idx + 1 < cleanSAN.length && cleanSAN[idx + 1] === 'x') {
        fromHint = cleanSAN[idx]
        isCapture = true
        idx += 2
      } else {
        fromHint = cleanSAN[idx]
        idx++
      }
    }
  }

  // Check for capture marker
  if (idx < cleanSAN.length && cleanSAN[idx] === 'x') {
    isCapture = true
    idx++
  }

  // Get destination square
  toSquare = cleanSAN.substring(idx)

  if (!toSquare || toSquare.length < 2) {
    return null
  }

  const toSquareNum = algebraicToSquare(toSquare)

  // Filter moves that match
  const matchingMoves = legalMoves.filter((move) => {
    // Check if move targets this square
    const moveTo = 'to' in move ? move.to : null
    if (moveTo !== toSquareNum) return false

    // Check piece type if specified
    if (pieceType && 'piece' in move && move.piece.type !== pieceType)
      return false

    // Check if it's a capture
    if (isCapture && move.type !== 'capture' && move.type !== 'suicide-capture')
      return false

    // Check from-hint disambiguation
    if (fromHint && 'from' in move) {
      const fromSquareStr = squareToAlgebraic(move.from)
      if (!fromSquareStr.startsWith(fromHint)) return false
    }

    return true
  })

  // Return the only matching move, or null if ambiguous/none
  return matchingMoves.length === 1 ? matchingMoves[0] : null
}

/**
 * Convert move to SAN notation
 */
export function moveToSAN(move: Move, gameState: IGameState): string {
  let san = ''

  // Get piece symbol (uppercase)
  const pieceType = 'piece' in move ? move.piece.type : null
  const pieceSymbol = pieceType
    ? Object.entries(PIECE_LETTERS).find(([_, v]) => v === pieceType)?.[0] || ''
    : ''

  // Infantry moves don't need piece letter unless capturing
  const needsPieceLetter = pieceType !== 'i' || move.type === 'capture'

  if (needsPieceLetter && pieceSymbol) {
    san += pieceSymbol
  }

  // Add from square if needed for disambiguation
  // (Would need to check if multiple pieces of same type can move to same square)

  // Add capture marker
  if (move.type === 'capture' || move.type === 'suicide-capture') {
    san += 'x'
  }

  // Add destination square
  if ('to' in move) {
    san += squareToAlgebraic(move.to)
  }

  // Add stay-capture marker
  if (move.type === 'stay-capture') {
    san += '<'
  }

  // Add check/checkmate indicator (would need to analyze resulting position)

  return san
}

/**
 * Parse deploy move from SAN notation
 * Can handle both complete and incomplete deploy sessions
 *
 * Examples:
 * - "d5:N@e8,TI" - Navy moved to e8, Tank+Infantry remaining
 * - "f6:A@f8T@e6,IM" - Artillery to f8, Tank to e6, Infantry+Militia remaining
 * - "c4:N*@b4T*@d5" - Complete deploy (no remaining pieces)
 */
export function parseDeployMove(
  deployStr: string,
  gameState: IGameState,
): {
  type: 'deploy-move'
  originalSquare: number
  movedPieces: Array<{ piece: string; destination: string }>
  remainingPieces: string[]
  isComplete: boolean
} | null {
  try {
    const deployInfo = parseDeploySession(deployStr)

    return {
      type: 'deploy-move',
      originalSquare: deployInfo.originalSquare,
      movedPieces: deployInfo.movedPieces,
      remainingPieces: deployInfo.remainingPieces,
      isComplete: deployInfo.remainingPieces.length === 0,
    }
  } catch (error) {
    return null
  }
}

/**
 * Convert deploy session to SAN notation
 * Works with both complete and incomplete deploy sessions
 */
export function deploySessionToSAN(
  deploySession: IDeploySession | null | undefined,
): string {
  if (!deploySession) {
    return '-'
  }

  return encodeDeploySession(deploySession)
}
