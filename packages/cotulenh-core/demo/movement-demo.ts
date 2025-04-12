import { CoTuLenh, Move } from '../src/cotulenh';
// Helper to print moves
function printMoves(label: string, moves: string[] | Move[]) {
    console.log(`\n${label}:`)
    if (moves.length === 0) {
      console.log('(No legal moves)')
      return
    }
    if (typeof moves[0] === 'string') {
      console.log((moves as string[]).join(', '))
    } else {
      console.log((moves as Move[]).map((m) => m.san).join(', '))
    }
  }
function attemptMove(game: CoTuLenh, from: string, to: string) {
  console.log(`\nAttempting: ${from} -> ${to}`);
  game.put({ type: 'c', color: 'b' }, 'f12');
  game.put({ type: 'c', color: 'r' }, 'h1');
  console.log("Before:");
  game.printBoard();

  try {
    const moves = game.moves({ square: from, verbose: true, ignoreSafety: true })
    printMoves(`Moves for ${from}`, moves)
    const move = game.move({ from, to });
    console.log(`SUCCESS: ${move?.san}`); 
    console.log("After:");
    game.printBoard();
  } catch (e) {
    console.log(`FAILED: ${(e as Error).message}`);
  }finally {
    game.clear();
  }
}
const findMove = (
  moves: Move[],
  from: string,
  to: string,
  isStayCapture?: boolean,
): Move | undefined => {
  return moves.find((m) => {
    const matchFrom = m.from === from;
    // For stay capture, the move's 'to' is the original square,
    // and 'targetSquare' is the captured piece's square.
    // For normal capture, the move's 'to' is the destination/captured piece's square.
    const matchTo = isStayCapture
      ? m.to === from && m.targetSquare === to
      : m.to === to;
    const matchStayFlag =
      isStayCapture === undefined || m.isStayCapture() === isStayCapture;

    return matchFrom && matchTo && matchStayFlag;
  });
};

function demoSpecificMovements(){
  const game = new CoTuLenh();
  game.clear();
  game.load('11/11/11/11/11/11/5+F5/11/11/11/1n1F7/11 r - - 0 1');

  attemptMove(game, 'd2', 'b2');
}

// Run the demo
demoSpecificMovements();
console.log("\nDemo complete! Check above output for:");
console.log("- Successful moves (green)");
console.log("- Failed attempts (red)");
console.log("- Board state after each successful move");