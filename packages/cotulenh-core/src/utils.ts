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
  InternalMove
} from './type'

export function getDisambiguator(
  move: InternalMove,
  moves: InternalMove[],
): string {
  const from = move.from
  const to = move.to
  const piece = move.piece

  let ambiguities = 0
  let sameRank = 0
  let sameFile = 0

  for (let i = 0, len = moves.length; i < len; i++) {
    const ambigFrom = moves[i].from
    const ambigTo = moves[i].to
    const ambigPiece = moves[i].piece

    /*
     * if a move of the same piece type ends on the same to square, we'll need
     * to add a disambiguator to the algebraic notation
     */
    if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
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
