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

import { PieceStacker, ROLE_FLAGS } from '@repo/cotulenh-combine-piece'

// Encapsulated piece stacking operations
const createPieceStackingOperations = () => {
  // Direct symbol to flag mapping
  const SYMBOL_TO_FLAG: Record<PieceSymbol, number> = {
    [COMMANDER]: ROLE_FLAGS.COMMANDER,
    [INFANTRY]: ROLE_FLAGS.INFANTRY,
    [TANK]: ROLE_FLAGS.TANK,
    [MILITIA]: ROLE_FLAGS.MILITIA,
    [ENGINEER]: ROLE_FLAGS.ENGINEER,
    [ARTILLERY]: ROLE_FLAGS.ARTILLERY,
    [ANTI_AIR]: ROLE_FLAGS.ANTI_AIR,
    [MISSILE]: ROLE_FLAGS.MISSILE,
    [AIR_FORCE]: ROLE_FLAGS.AIR_FORCE,
    [NAVY]: ROLE_FLAGS.NAVY,
    [HEADQUARTER]: ROLE_FLAGS.HEADQUARTER,
  }

  // PieceStacker instance with direct flag mapping
  const stacker = new PieceStacker<Piece>(
    (piece) => SYMBOL_TO_FLAG[piece.type] || 0,
  )

  return {
    combine: (pieces: Piece[]): Piece | null => {
      return stacker.combine(pieces)
    },

    remove: (stackPiece: Piece, pieceToRemove: Piece): Piece | null => {
      return stacker.remove(stackPiece, pieceToRemove)
    },
  }
}

// Create the operations instance
const pieceOps = createPieceStackingOperations()

/**
 * Combines multiple pieces into a single stack
 * @param pieces - Array of pieces to combine
 * @returns Combined piece or null if combination fails
 */
export function combinePieces(pieces: Piece[]): Piece | null {
  // Ensure all pieces have the same color
  if (pieces.length === 0) return null
  const color = pieces[0].color
  if (pieces.some((p) => p.color !== color)) return null

  // Use PieceStacker to combine
  return pieceOps.combine(pieces)
}

/**
 * Removes a specific piece type from a stack
 * @param stackPiece - The stack to remove from
 * @param pieceToRemove - The piece containing the type to remove
 * @returns Remaining stack after removal, or null if no pieces remain
 */
export function removePieceFromStack(
  stackPiece: Piece,
  pieceToRemove: Piece,
): Piece | null {
  return pieceOps.remove(stackPiece, pieceToRemove)
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

/**
 * Creates all possible ways to split a piece stack into combinations of subsets.
 * For example, given (A|BC), it returns [(A|BC)], [(A|B),C], [(A|C),B], [A,(B|C)], [A,B,C]
 * @param piece - The piece stack to split
 * @returns An array of arrays, each containing a valid combination of subsets
 */
export function createAllPieceSplits(piece: Piece): Piece[][] {
  // Flatten the piece stack into individual pieces
  const flattenedPieces = flattenPiece(piece)

  // If there's only one piece (no carrying pieces), return just that piece
  if (flattenedPieces.length <= 1) return [[piece]]

  // The original piece itself is always a valid split (as a single piece)
  const result: Piece[][] = [[piece]]

  // Get all flattened pieces to check if combinations are valid
  const originalPieceTypes = new Set(flattenedPieces.map((p) => p.type))

  // Generate all possible subsets first (excluding the original piece and empty set)
  const subsets: Piece[] = []

  // Generate all possible combinations using bit manipulation
  const n = flattenedPieces.length
  const totalCombinations = 1 << n // 2^n combinations

  // Start from 1 to skip the empty set
  for (let i = 1; i < totalCombinations; i++) {
    // Skip the combination that would recreate the original piece
    // The original piece is when all bits are set (all pieces included)
    if (i === totalCombinations - 1) continue

    const currentCombination: Piece[] = []

    // Check each bit position
    for (let j = 0; j < n; j++) {
      // If jth bit is set, include the jth piece
      if ((i & (1 << j)) !== 0) {
        currentCombination.push(flattenedPieces[j])
      }
    }

    // Create a stack from the current combination
    if (currentCombination.length > 0) {
      const combined = combinePieces([...currentCombination])
      // Only add to result if combined exists
      if (combined) {
        subsets.push(combined)
      }
    }
  }

  // Generate all possible partitions of the subsets
  const generatePartitions = (
    remaining: Piece[],
    current: Piece[] = [],
    usedPieces: Set<string> = new Set(),
    start: number = 0,
  ) => {
    // Check if we've used all pieces from the original stack
    const allPiecesUsed =
      Array.from(usedPieces).length === originalPieceTypes.size

    // If we've used all pieces, add the current partition to the result
    if (allPiecesUsed && current.length > 0) {
      // Verify that the combination of pieces in 'current' can form the original piece
      // by checking that all original piece types are represented
      const currentTypes = new Set<string>()
      current.forEach((p) => {
        flattenPiece(p).forEach((fp) => currentTypes.add(fp.type))
      })

      // Only add if all original piece types are represented
      if (currentTypes.size === originalPieceTypes.size) {
        result.push([...current])
      }
      return
    }

    // Try adding each remaining subset to the current partition
    for (let i = start; i < remaining.length; i++) {
      const subset = remaining[i]

      // Get the types in this subset
      const subsetTypes = new Set<string>()
      flattenPiece(subset).forEach((p) => subsetTypes.add(p.type))

      // Check if adding this subset would cause duplicate piece types
      let canAdd = true
      subsetTypes.forEach((type) => {
        if (usedPieces.has(type)) canAdd = false
      })

      if (canAdd) {
        // Add the subset to the current partition
        current.push(subset)

        // Mark the piece types as used
        subsetTypes.forEach((type) => usedPieces.add(type))

        // Recursively generate partitions with the remaining subsets
        generatePartitions(remaining, current, usedPieces, i + 1)

        // Backtrack: remove the subset from the current partition
        current.pop()

        // Unmark the piece types
        subsetTypes.forEach((type) => usedPieces.delete(type))
      }
    }
  }

  // Start generating partitions with all subsets
  generatePartitions(subsets)

  return result
}

export const haveCommander = (p: Piece) =>
  flattenPiece(p).some((fp) => fp.type === COMMANDER)

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
/**
 * Creates a deep clone of a Piece object
 * @param piece - The piece to clone
 * @returns A new Piece object with the same properties
 */
export function clonePiece(piece: Piece | undefined): Piece | undefined {
  if (!piece) return undefined

  const clonedPiece: Piece = {
    color: piece.color,
    type: piece.type,
    heroic: piece.heroic,
  }

  if (piece.carrying && piece.carrying.length > 0) {
    clonedPiece.carrying = piece.carrying.map((p) => clonePiece(p) as Piece)
  }

  return clonedPiece
}

/**
 * Creates a deep clone of an InternalMove object
 * @param move - The move to clone
 * @returns A new InternalMove object with the same properties
 */
export function cloneInternalMove(move: InternalMove): InternalMove {
  const clonedMove: InternalMove = {
    color: move.color,
    from: move.from,
    to: move.to,
    piece: clonePiece(move.piece) as Piece,
    flags: move.flags,
  }

  if (move.captured) {
    clonedMove.captured = clonePiece(move.captured)
  }

  if (move.combined) {
    clonedMove.combined = clonePiece(move.combined)
  }

  return clonedMove
}
