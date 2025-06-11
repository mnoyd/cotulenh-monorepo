import {
  algebraic,
  file,
  LAND_MASK,
  NAVY_MASK,
  Piece,
  rank,
  RED,
  Square,
  SQUARE_MAP,
  InternalMove,
  Color,
  PieceSymbol,
  BITS,
  COMMANDER,
  INFANTRY,
  TANK,
  MILITIA,
  ENGINEER,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
  AIR_FORCE,
  NAVY,
  HEADQUARTER,
  VALID_PIECE_TYPES,
  isSquareOnBoard,
  CAPTURE_MASK,
} from './type.js'

import { CombinePieceFactory } from '@repo/cotulenh-combine-piece'

const symbolToRoleMap: Record<PieceSymbol, string> = {
  [COMMANDER]: 'commander',
  [INFANTRY]: 'infantry',
  [TANK]: 'tank',
  [MILITIA]: 'militia',
  [ENGINEER]: 'engineer',
  [ARTILLERY]: 'artillery',
  [ANTI_AIR]: 'anti_air',
  [MISSILE]: 'missile',
  [AIR_FORCE]: 'air_force',
  [NAVY]: 'navy',
  [HEADQUARTER]: 'headquarter',
}

// Reverse map: role string to core type (symbol)
const roleToSymbolMap: Record<string, PieceSymbol> = Object.entries(
  symbolToRoleMap,
).reduce(
  (acc, [symbol, role]) => {
    acc[role] = symbol as PieceSymbol
    return acc
  },
  {} as Record<string, PieceSymbol>,
)

/**
 * Converts a full string role (e.g., 'commander') to its core type (symbol, e.g., COMMANDER)
 * @param role - The role string
 * @returns The PieceSymbol or undefined if not found
 */
export function getCoreTypeFromRole(role: string): PieceSymbol | undefined {
  return roleToSymbolMap[role]
}

export const getRoleFromCoreType = (piece: Piece): string =>
  symbolToRoleMap[piece.type]

const combinePiece = new CombinePieceFactory(getRoleFromCoreType)

export function createCombinedPiece(
  pieceFrom: Piece,
  pieceTo: Piece,
): Piece | null {
  const combinedPiece = combinePiece.formStack(pieceFrom, pieceTo)
  return combinedPiece
}
export function createCombineStackFromPieces(pieces: Piece[]): {
  combined: Piece | undefined
  uncombined: Piece[] | undefined
} {
  return combinePiece.createCombineStackFromPieces(pieces)
}

export function getDisambiguator(
  move: InternalMove,
  moves: InternalMove[],
): string {
  const from = move.from
  const to = move.to
  const pieceType = move.piece.type

  let ambiguities = 0
  let sameRank = 0
  let sameFile = 0

  for (let i = 0, len = moves.length; i < len; i++) {
    const ambigFrom = moves[i].from
    const ambigTo = moves[i].to
    const ambigPieceType = moves[i].piece.type

    /*
     * if a move of the same piece type ends on the same to square, we'll need
     * to add a disambiguator to the algebraic notation
     */
    if (pieceType === ambigPieceType && from !== ambigFrom && to === ambigTo) {
      ambiguities++

      if (rank(from) === rank(ambigFrom)) {
        sameRank++
      }

      if (file(from) === file(ambigFrom)) {
        sameFile++
      }
    }
  }

  if (ambiguities > 0) {
    if (sameRank > 0 && sameFile > 0) {
      /*
       * if there exists a similar moving piece on the same rank and file as
       * the move in question, use the square as the disambiguator
       */
      return algebraic(from)
    } else if (sameFile > 0) {
      /*
       * if the moving piece rests on the same file, use the rank symbol as the
       * disambiguator
       */
      return algebraic(from).charAt(1)
    } else {
      // else use the file symbol
      return algebraic(from).charAt(0)
    }
  }

  return ''
}

export function printBoard(board: Record<number, Piece | undefined>) {
  const ranks: { [key: number]: string[] } = {}

  // Group squares by their display rank (12 down to 1)
  for (const [alg, sq] of Object.entries(SQUARE_MAP)) {
    const displayRank = 12 - rank(sq)
    if (!ranks[displayRank]) ranks[displayRank] = []
    ranks[displayRank].push(alg)
  }

  console.log('\nCurrent Board:')

  // Print from rank 12 (top) to 1 (bottom)
  for (let dr = 12; dr >= 1; dr--) {
    let line = `${dr}`.padStart(2, ' ') + ' '
    for (const alg of ranks[dr] || []) {
      const sq = SQUARE_MAP[alg as Square]
      const piece = board[sq]
      const isNavyZone = NAVY_MASK[sq] && !LAND_MASK[sq] // Pure navy (a, b files usually)
      const isMixedZone = NAVY_MASK[sq] && LAND_MASK[sq] // c file and river banks d6,e6,d7,e7
      const isBridge = ['f6', 'f7', 'h6', 'h7'].includes(alg)

      let bgCode = ''
      let fgCode = piece ? (piece.color === RED ? '\x1b[31m' : '\x1b[34m') : ''

      // Use fixed-width display for all pieces (heroic or not)
      let symbol = ' '
      if (piece) {
        symbol =
          (piece.heroic ?? false)
            ? '+' + piece.type.toUpperCase()
            : ' ' + piece.type.toUpperCase()
      } else {
        symbol = ' ·'
      }

      if (isBridge) {
        bgCode = piece ? '\x1b[43m' : '\x1b[47m' // Yellow if piece, White if empty
      } else if (isMixedZone) {
        bgCode = '\x1b[48;5;194m' // Cyan
      } else if (isNavyZone) {
        bgCode = '\x1b[48;5;159m' // Blue
      } else {
        bgCode = '\x1b[48;5;255m' // Light Gray
      }
      // Pure Land zones have no bgCode

      if (bgCode) {
        // Apply background and foreground colors
        line += `${bgCode}${fgCode}${symbol}\x1b[0m${bgCode} \x1b[0m` // Add space with bg color
      } else {
        // No background, just foreground for piece or symbol for empty
        line += piece ? `${fgCode}${symbol}\x1b[0m ` : `${symbol} `
      }
    }
    console.log(line)
    // Add a separator line between rank 7 (dr=7) and rank 6 (dr=6)
    if (dr === 7) {
      console.log('   ---------------------------------') // Adjust length as needed
    }
  }
  // Update the file labels to align with the 2-character piece display
  console.log('    a  b  c  d  e  f  g  h  i  j  k')
}
// Helper function to add a move to the list
// Updated for Stay Capture logic
export function addMove(
  moves: InternalMove[],
  color: Color,
  from: number,
  to: number, // Destination square for normal move, Target square for stay capture
  piece: Piece,
  otherPiece?: Piece,
  flags: number = BITS.NORMAL,
) {
  // No piece promotion in this variant based on rules
  const moveToAdd: InternalMove = {
    color,
    from,
    to,
    piece,
    ...(flags & CAPTURE_MASK && { captured: otherPiece }),
    ...(flags & BITS.COMBINATION && { combined: otherPiece }),
    flags,
  }
  // 'to' correctly represents destination or target based on flag context in _moves
  moves.push(moveToAdd)
}

/**
 * Validates FEN format
 * @param tokens - The FEN tokens
 * @throws Error if the FEN format is invalid
 */
export function validateFenFormat(tokens: string[]): void {
  if (tokens.length < 6) {
    throw new Error(
      `Invalid FEN: expected at least 6 tokens, got ${tokens.length}`,
    )
  }
  // Additional validation can be added here
}

/**
 * Validates a complete FEN string
 * @param fen - The FEN string to validate
 * @throws Error if the FEN is invalid
 */
export function validateFen(fen: string): void {
  console.warn('Validating FEN not implmented', fen)
}
export function makeSanSinglePiece(piece: Piece): string {
  const symbol = piece.type.toUpperCase()
  const heroic = piece.heroic ? '+' : ''
  return heroic + symbol
}

export function makeSanPiece(combinedPiece: Piece, derimiter = false): string {
  const carrier = makeSanSinglePiece(combinedPiece)
  if (!combinedPiece.carrying?.length) return carrier
  const stack = combinedPiece.carrying?.map(makeSanSinglePiece).join('') || ''
  return `(${carrier}${derimiter ? '|' : ''}${stack})`
}

export function strippedSan(move: string): string {
  let cleanMove = move.replace(/\([^)]*\)/g, '') //Drop combination guide
  cleanMove = cleanMove.replace(/[+#]?[?!]*$/, '') //Drop flags and modifiers
  return cleanMove
}

export function inferPieceType(san: string): PieceSymbol | undefined {
  let pieceType = san.charAt(0)
  if (pieceType === '+') {
    pieceType = san.charAt(1)
  }
  pieceType = pieceType.toLowerCase()
  if (VALID_PIECE_TYPES[pieceType]) {
    return pieceType as PieceSymbol
  }
  return undefined
}

//Flatten a combined piece to a multiple single pieces
export function flattenPiece(piece: Piece): Piece[] {
  if (!piece.carrying?.length) return [piece]
  return [{ ...piece, carrying: undefined }, ...piece.carrying]
}

export function getStepsBetweenSquares(
  square1: number,
  square2: number,
): number {
  if (!isSquareOnBoard(square1) || !isSquareOnBoard(square2)) return -1

  // Get the rank and file differences
  const rankDiff = Math.abs(rank(square1) - rank(square2))
  const fileDiff = Math.abs(file(square1) - file(square2))

  if (rankDiff === 0 || fileDiff === 0) return Math.max(rankDiff, fileDiff)
  else if (rankDiff === fileDiff) return rankDiff

  return -1 //nor diagonal or horizontal
}

export const haveCommander = (p: Piece) =>
  flattenPiece(p).some((fp) => fp.type === COMMANDER)
