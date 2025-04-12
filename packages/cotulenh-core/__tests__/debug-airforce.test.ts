import { CoTuLenh, NAVY, AIR_FORCE, Move } from '../src/cotulenh'

describe('Debug Air Force Capturing Navy', () => {
  let game: CoTuLenh

  // Helper to print board state and available moves
  const debugMoves = (moves: Move[]) => {
    console.log('\nAvailable Moves:')
    moves.forEach((m) => {
      console.log(
        `- From: ${m.from}, To: ${m.to}`,
        m.isStayCapture() ? `(Stay Capture, Target: ${m.targetSquare})` : '',
        `Captured: ${m.captured || 'none'}`,
      )
    })
  }

  test('Debug Air Force capturing Navy on Water', () => {
    game = new CoTuLenh()
    game.clear()

    // FEN: Red Air Force at c2, Blue Navy at b2
    const testPosition = '11/11/11/11/11/11/11/11/11/1n1F7/11/11 r - - 0 1'
    game.load(testPosition)

    // Print initial board state
    console.log('\nInitial Position:')
    game.printBoard()

    // Get all possible moves with verbose output
    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    debugMoves(moves)

    // Find the specific capture move we're interested in
    const captureMove = moves.find(
      (m) =>
        m.from === 'c2' &&
        ((m.isStayCapture() && m.targetSquare === 'b2') ||
          (!m.isStayCapture() && m.to === 'b2')),
    )

    // Detailed move analysis
    console.log('\nCapture Move Details:')
    if (captureMove) {
      console.log({
        from: captureMove.from,
        to: captureMove.to,
        isStayCapture: captureMove.isStayCapture(),
        targetSquare: captureMove.targetSquare,
        captured: captureMove.captured,
        flags: captureMove.flags,
      })
    } else {
      console.log('No capture move found!')

      // Additional debugging: check all moves that involve these squares
      console.log('\nMoves involving c2 or b2:')
      moves
        .filter(
          (m) => m.from === 'c2' || m.to === 'b2' || m.targetSquare === 'b2',
        )
        .forEach((m) => console.log(m))
    }

    // Verify terrain masks at relevant squares
    const pieceAtB2 = game.get('b2')
    const pieceAtC2 = game.get('c2')

    console.log('\nPiece Positions:')
    console.log('b2:', pieceAtB2)
    console.log('c2:', pieceAtC2)
  })
})
