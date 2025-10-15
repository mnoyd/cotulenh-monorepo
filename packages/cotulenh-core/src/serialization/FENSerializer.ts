/**
 * FEN (Forsyth-Edwards Notation) serialization for CoTuLenh
 *
 * Format: position turn commanders moveNumber halfMoves
 * Example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r e1,e12 1 0"
 */

import type { IGameState, IDeploySession } from '../types/GameState.js'
import type { Piece } from '../types/Piece.js'
import type { Color, PieceSymbol } from '../types/Constants.js'
import { GameState } from '../core/GameState.js'
import { Board } from '../core/Board.js'
import { pieceUtils } from '../core/Piece.js'
import {
  algebraicToSquare,
  squareToAlgebraic,
  getFile,
  getRank,
} from '../utils/square.js'
import { deploySessionToSAN } from './SANParser.js'

/**
 * Piece symbol mapping for FEN
 */
const PIECE_SYMBOLS: Record<PieceSymbol, string> = {
  c: 'C', // Commander
  i: 'I', // Infantry
  e: 'E', // Engineer
  t: 'T', // Tank
  m: 'M', // Militia
  a: 'A', // Artillery
  s: 'S', // Missile
  g: 'G', // Anti-Air
  n: 'N', // Navy
  f: 'F', // Air Force
  h: 'H', // Headquarter
}

/**
 * Reverse mapping for parsing
 */
const SYMBOL_TO_PIECE: Record<string, PieceSymbol> = Object.entries(
  PIECE_SYMBOLS,
).reduce(
  (acc, [key, val]) => {
    acc[val.toLowerCase()] = key as PieceSymbol
    return acc
  },
  {} as Record<string, PieceSymbol>,
)

/**
 * Convert piece to FEN character
 */
function pieceToFEN(piece: Piece): string {
  let char = PIECE_SYMBOLS[piece.type]

  // Lowercase for blue, uppercase for red
  if (piece.color === 'b') {
    char = char.toLowerCase()
  }

  // Add * for heroic
  if (piece.heroic) {
    char += '*'
  }

  // Add stack notation if carrying pieces
  if (piece.carrying && piece.carrying.length > 0) {
    const carriedStr = piece.carrying.map((p) => pieceToFEN(p)).join('')
    char = `(${char}${carriedStr})`
  }

  return char
}

/**
 * Generate FEN from game state
 */
export function generateFEN(gameState: IGameState): string {
  const parts: string[] = []

  // 1. Board position (rank by rank, from rank 0 to 11)
  const rows: string[] = []
  for (let rank = 0; rank < 12; rank++) {
    let row = ''
    let emptyCount = 0

    for (let file = 0; file < 11; file++) {
      const square = rank * 16 + file

      // Use effective piece (considers deploy session virtual state)
      const piece = gameState.deploySession
        ? gameState.deploySession.getEffectivePiece(gameState.board, square)
        : gameState.board.get(square)

      if (piece === null) {
        emptyCount++
      } else {
        if (emptyCount > 0) {
          row += emptyCount.toString()
          emptyCount = 0
        }
        row += pieceToFEN(piece)
      }
    }

    if (emptyCount > 0) {
      row += emptyCount.toString()
    }

    rows.push(row)
  }
  parts.push(rows.join('/'))

  // 2. Active color
  parts.push(gameState.turn)

  // 3. Commander positions
  const redCommander = squareToAlgebraic(gameState.commanders[0])
  const blueCommander = squareToAlgebraic(gameState.commanders[1])
  parts.push(`${redCommander},${blueCommander}`)

  // 4. Move number
  parts.push(gameState.moveNumber.toString())

  // 5. Half-move clock
  parts.push(gameState.halfMoves.toString())

  // 6. Deploy session (if active)
  const deployInfo = deploySessionToSAN(gameState.deploySession)
  parts.push(deployInfo)

  return parts.join(' ')
}

/**
 * Parse FEN character to piece
 */
function parseFENPiece(fenChar: string, color: Color): Piece {
  let isHeroic = false
  let char = fenChar

  // Check for heroic marker
  if (char.endsWith('*')) {
    isHeroic = true
    char = char.slice(0, -1)
  }

  const pieceType = SYMBOL_TO_PIECE[char.toLowerCase()]
  if (!pieceType) {
    throw new Error(`Invalid piece symbol: ${char}`)
  }

  return pieceUtils.createPiece(color, pieceType, isHeroic)
}

/**
 * Parse FEN stack notation (recursive)
 */
function parseFENStack(fenStr: string): { piece: Piece; consumed: number } {
  if (!fenStr.startsWith('(')) {
    throw new Error('Invalid stack notation')
  }

  let i = 1 // Skip opening (
  let depth = 1
  const chars: string[] = []

  // Find matching closing )
  while (i < fenStr.length && depth > 0) {
    if (fenStr[i] === '(') depth++
    if (fenStr[i] === ')') depth--
    if (depth > 0) chars.push(fenStr[i])
    i++
  }

  const content = chars.join('')

  // First character(s) is carrier
  // Rest are carried pieces
  // This is simplified - real implementation would need proper parsing

  throw new Error('Stack parsing not fully implemented yet')
}

/**
 * Parse FEN to game state
 */
export function parseFEN(fen: string): IGameState {
  const parts = fen.split(' ')

  if (parts.length < 5) {
    throw new Error('Invalid FEN: not enough parts')
  }

  const [positionStr, turnStr, commandersStr, moveNumberStr, halfMovesStr] =
    parts

  // Parse board position
  const board = Board.createEmpty()
  const rows = positionStr.split('/')

  if (rows.length !== 12) {
    throw new Error('Invalid FEN: must have 12 ranks')
  }

  for (let rank = 0; rank < 12; rank++) {
    let file = 0
    const row = rows[rank]
    let i = 0

    while (i < row.length && file < 11) {
      const char = row[i]

      // Check for stack notation
      if (char === '(') {
        // Stack parsing - simplified for now
        throw new Error('Stack notation not fully implemented')
      }

      // Check for empty squares
      if (char >= '0' && char <= '9') {
        file += parseInt(char, 10)
        i++
        continue
      }

      // Parse piece
      const isRed = char === char.toUpperCase()
      const color: Color = isRed ? 'r' : 'b'

      // Check for heroic marker
      let pieceStr = char
      if (i + 1 < row.length && row[i + 1] === '*') {
        pieceStr += '*'
        i++
      }

      const piece = parseFENPiece(pieceStr, color)
      const square = rank * 16 + file
      board.set(square, piece)

      file++
      i++
    }
  }

  // Parse turn
  const turn: Color = turnStr === 'r' ? 'r' : 'b'

  // Parse commander positions
  const [redPos, bluePos] = commandersStr.split(',')
  const redCommander = algebraicToSquare(redPos)
  const blueCommander = algebraicToSquare(bluePos)

  // Parse numbers
  const moveNumber = parseInt(moveNumberStr, 10)
  const halfMoves = parseInt(halfMovesStr, 10)

  return new GameState({
    board,
    turn,
    commanders: [redCommander, blueCommander],
    moveNumber,
    halfMoves,
  })
}
