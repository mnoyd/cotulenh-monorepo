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
  isDigit,
  VALID_PIECE_TYPES,
  isSquareOnBoard,
} from './type.js'

import { formStack } from '@repo/cotulenh-combine-piece'

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

export function createCombinedPiece(
  pieceFrom: Piece,
  pieceTo: Piece,
): Piece | null {
  const combinedPiece = formStack<Piece>(
    pieceFrom,
    pieceTo,
    getRoleFromCoreType,
  )
  return combinedPiece
}
export function createCombineStackFromPieces(pieces: Piece[]): {
  combined: Piece | undefined
  uncombined: Piece[] | undefined
} {
  if (!pieces || pieces.length === 0)
    return { combined: undefined, uncombined: undefined }
  const uncombined: Piece[] = []
  const piece = pieces.reduce((acc, p) => {
    if (!acc) return p
    const combined = createCombinedPiece(acc, p)
    if (!combined) {
      uncombined.push(p)
      return acc
    }
    return combined
  }, pieces[0])
  return { combined: piece, uncombined: uncombined.splice(1) }
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
        bgCode = '\x1b[48;5;231m' // Cyan
      } else if (isNavyZone) {
        bgCode = '\x1b[48;5;159m' // Blue
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
      console.log('   --------------------------------') // Adjust length as needed
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
    ...(flags & (BITS.CAPTURE | BITS.STAY_CAPTURE) && { captured: otherPiece }),
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
 * Parses a rank string from FEN
 * @param rankStr - The rank string to parse
 * @param r - The rank index
 * @param fileIndex - The starting file index
 * @returns Object containing the new index and number of empty squares
 */
export function handleEmptySquares(
  rankStr: string,
  i: number,
  r: number,
  fileIndex: number,
): { newIndex: number; emptySquares: number } {
  let numStr = rankStr.charAt(i)
  let newIndex = i

  // Check for multi-digit numbers
  while (
    newIndex + 1 < rankStr.length &&
    isDigit(rankStr.charAt(newIndex + 1))
  ) {
    newIndex++
    numStr += rankStr.charAt(newIndex)
  }

  const emptySquares = parseInt(numStr, 10)
  if (fileIndex + emptySquares > 11) {
    throw new Error(
      `Invalid FEN: rank ${12 - r} has too many squares (${rankStr})`,
    )
  }

  return { newIndex, emptySquares }
}

/**
 * Validates a complete FEN string
 * @param fen - The FEN string to validate
 * @throws Error if the FEN is invalid
 */
export function validateFen(fen: string): void {
  // Parse FEN string into tokens
  const tokens = fen.split(/\s+/)
  const position = tokens[0]

  // Validate FEN format
  validateFenFormat(tokens)

  // Validate board position (ranks)
  const ranks = position.split('/')
  if (ranks.length !== 12) {
    throw new Error(`Invalid FEN: expected 12 ranks, got ${ranks.length}`)
  }

  // Validate each rank has correct number of squares
  for (let r = 0; r < 12; r++) {
    let fileIndex = 0
    let currentRankSquares = 0
    const rankStr = ranks[r]

    for (let i = 0; i < rankStr.length; i++) {
      const char = rankStr.charAt(i)

      if (isDigit(char)) {
        // Handle multi-digit numbers for empty squares
        const { newIndex, emptySquares } = handleEmptySquares(
          rankStr,
          i,
          r,
          fileIndex,
        )
        i = newIndex
        fileIndex += emptySquares
        currentRankSquares += emptySquares
      } else if (char === '(') {
        // Parse stack notation
        const endParen = rankStr.indexOf(')', i)
        if (endParen === -1) {
          throw new Error(
            `Invalid FEN: Unmatched parenthesis in rank ${12 - r}`,
          )
        }

        const stackContent = rankStr.substring(i + 1, endParen)
        if (stackContent.length === 0) {
          throw new Error(`Invalid FEN: Empty stack '()' in rank ${12 - r}`)
        }

        // Skip to end of stack notation
        i = endParen
        fileIndex++
        currentRankSquares++
      } else if (char === '+') {
        // Handle heroic piece notation ('+' followed by piece symbol)
        if (i + 1 >= rankStr.length) {
          throw new Error(
            `Invalid FEN: '+' at end of rank ${12 - r} without piece symbol`,
          )
        }
        // Skip the '+' and process the piece symbol in the next iteration
        // We don't increment fileIndex or currentRankSquares here because
        // the piece symbol will be processed in the next iteration
      } else {
        // Single piece (or piece symbol after '+')
        fileIndex++
        currentRankSquares++
      }
    }

    if (currentRankSquares !== 11) {
      throw new Error(
        `Invalid FEN: rank ${12 - r} does not have 11 squares (${rankStr}, counted ${currentRankSquares})`,
      )
    }
  }

  // Validate turn
  const turn = tokens[1]
  if (turn !== 'r' && turn !== 'b') {
    throw new Error(`Invalid FEN: turn must be 'r' or 'b', got '${turn}'`)
  }

  // Validate halfmoves and fullmoves if present
  if (tokens[4] && !/^\d+$/.test(tokens[4])) {
    throw new Error(
      `Invalid FEN: halfmoves must be a number, got '${tokens[4]}'`,
    )
  }

  if (tokens[5] && !/^\d+$/.test(tokens[5])) {
    throw new Error(
      `Invalid FEN: fullmoves must be a number, got '${tokens[5]}'`,
    )
  }
}
export function makeSanSinglePiece(piece: Piece): string {
  const symbol = piece.type.toUpperCase()
  const heroic = piece.heroic ? '+' : ''
  return heroic + symbol
}

export function makeSanPiece(combinedPiece: Piece): string {
  const carrier = makeSanSinglePiece(combinedPiece)
  if (!combinedPiece.carrying?.length) return carrier
  const stack = combinedPiece.carrying?.map(makeSanSinglePiece).join('') || ''
  return `(${carrier}|${stack})`
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
