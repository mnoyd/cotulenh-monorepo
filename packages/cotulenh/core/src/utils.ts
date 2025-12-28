import { logger } from '@cotulenh/common'
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
  CAPTURE_MASK,
} from './type.js'

import { PieceStacker, ROLE_FLAGS } from '@cotulenh/combine-piece'

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

  logger.info('\nCurrent Board:')

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
    logger.info(line)
    // Add a separator line between rank 7 (dr=7) and rank 6 (dr=6)
    if (dr === 7) {
      logger.info('   ---------------------------------') // Adjust length as needed
    }
  }
  // Update the file labels to align with the 2-character piece display
  logger.info('    a  b  c  d  e  f  g  h  i  j  k')
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
  logger.warn('Validating FEN not implemented', { fen })
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
 * Extracts specific pieces from a source stack.
 * @param source - The source stack to extract from
 * @param request - The pieces to extract (as a stack or single piece)
 * @returns Object containing the extracted piece and the remaining piece (or null if empty)
 * @throws Error if pieces cannot be found or if recombination fails
 */
export function extractPieces(
  source: Piece,
  request: Piece,
): { extracted: Piece; remaining: Piece | null } {
  // 1. Verify existence of requested pieces in source
  const sourceParts = flattenPiece(source)
  const requestParts = flattenPiece(request)

  // Use a simple type check assuming types are unique in valid stacks
  const sourceTypes = new Set(sourceParts.map((p) => p.type))
  for (const req of requestParts) {
    if (!sourceTypes.has(req.type)) {
      throw new Error(`Piece ${req.type} not found in source stack`)
    }
  }

  // 2. Validate/Canonicalize the extracted part
  // Combine request parts to ensure it's a valid stack configuration itself
  const extracted = pieceOps.combine(requestParts)
  if (!extracted) {
    throw new Error(
      `Failed to combine extracted pieces: ${JSON.stringify(requestParts)}`,
    )
  }

  // 3. Calculate the remaining stack using optimized stack operations
  // pieceOps.remove handles promoting passengers to carrier if the carrier is removed
  const remaining = pieceOps.remove(source, extracted)

  return { extracted, remaining }
}

export const haveCommander = (p: Piece) =>
  flattenPiece(p).some((fp) => fp.type === COMMANDER)

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
 * Overload for deploy sessions where no disambiguation is needed
 * @param move - The move to generate notation for
 * @returns Tuple of [san, lan]
 */
export function moveToSanLan(move: InternalMove): [string, string]
/**
 * @param move - The move to generate notation for
 * @param moves - List of all legal moves (for disambiguation)
 * @returns Tuple of [san, lan]
 */
export function moveToSanLan(
  move: InternalMove,
  moves: InternalMove[],
): [string, string]
export function moveToSanLan(
  move: InternalMove,
  moves?: InternalMove[],
): [string, string] {
  const pieceEncoded = makeSanPiece(move.piece)
  // Only calculate disambiguator if moves list is provided
  const disambiguator = moves ? getDisambiguator(move, moves) : ''
  const toAlg = algebraic(move.to) // Target square
  const fromAlg = algebraic(move.from) // Origin square

  let separator = ''
  if (move.flags & BITS.DEPLOY) {
    separator += '>'
  }
  if (move.flags & BITS.STAY_CAPTURE) {
    separator += '_'
  }
  if (move.flags & BITS.CAPTURE) {
    separator += 'x'
  }
  if (move.flags & BITS.SUICIDE_CAPTURE) {
    separator += '@'
  }
  if (move.flags & BITS.COMBINATION) {
    separator += '&'
  }
  // Note: Check detection removed - notation generated without temp execute
  // Check symbols (^, #) can be added separately if needed
  const san = `${pieceEncoded}${disambiguator}${separator}${toAlg}`
  const lan = `${pieceEncoded}${fromAlg}${separator}${toAlg}`

  return [san, lan] // Return both SAN and LAN strings
}
