import * as cg from './types.js';
import { invRanks, pos2key } from './util.js';

export const initial_no_engineer: string =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2i3m3i/11/11/2I3M3I/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4';
export const initial: string =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4';

const roles: { [letter: string]: cg.Role } = {
  c: 'commander',
  i: 'infantry',
  t: 'tank',
  m: 'militia',
  e: 'engineer',
  a: 'artillery',
  g: 'anti_air',
  s: 'missile',
  f: 'air_force',
  n: 'navy',
  h: 'headquarter',
};

const letters: { [role in cg.Role]: string } = {
  commander: 'c',
  infantry: 'i',
  tank: 't',
  militia: 'm',
  engineer: 'e',
  artillery: 'a',
  anti_air: 'g',
  missile: 's',
  air_force: 'f',
  navy: 'n',
  headquarter: 'h',
};

function charToPiece(c: string, promoted: boolean): cg.Piece {
  const role = roles[c.toLowerCase()];
  return {
    role: role,
    color: c === c.toLowerCase() ? 'blue' : 'red',
    promoted,
  };
}

export function read(fen: string): cg.Pieces {
  if (fen === 'start') fen = initial;
  const pieces: cg.Pieces = new Map();
  let row = 11;
  let col = 0;
  let promoteNextPiece = false;
  let readingCombinedPiece = false;
  let combinedPiece: cg.Piece | null = null;

  const piecePlacement = fen.split(' ')[0]; // Process only the piece placement part

  for (let i = 0; i < piecePlacement.length; i++) {
    const char = piecePlacement[i];

    switch (char) {
      case '/':
        row--;
        col = 0;
        if (row < 0) {
          // console.warn("FEN parsing warning: row became negative."); // Optional: for debugging
          return pieces;
        }
        break;
      case '+':
        promoteNextPiece = true;
        break;
      case '(':
        readingCombinedPiece = true;
        break;
      case ')':
        readingCombinedPiece = false;
        if (combinedPiece) {
          pieces.set(pos2key([col, row]), combinedPiece);
          combinedPiece = null;
          col++; // A combined piece occupies one square, so advance column
        }
        break;
      default:
        if (char >= '0' && char <= '9') {
          let numStr = char;
          while (
            i + 1 < piecePlacement.length &&
            piecePlacement[i + 1] >= '0' &&
            piecePlacement[i + 1] <= '9'
          ) {
            i++; // Consume the digit
            numStr += piecePlacement[i];
          }
          const emptySquares = parseInt(numStr, 10);
          if (isNaN(emptySquares)) {
          } else {
            col += emptySquares;
          }
        } else {
          // It's a piece character
          const currentPiece = charToPiece(char, promoteNextPiece);
          promoteNextPiece = false; // Reset promotion flag

          if (readingCombinedPiece) {
            if (combinedPiece === null) {
              combinedPiece = currentPiece;
              combinedPiece.carrying = []; // Initialize for the main carrier piece
            } else {
              // combinedPiece exists and its .carrying array is initialized
              combinedPiece.carrying!.push(currentPiece); // Add to existing array, ! asserts carrying is not null
            }
          } else {
            pieces.set(pos2key([col, row]), currentPiece);
            col++; // Advance column for a standalone piece
          }
        }
        break;
    }
  }
  return pieces;
}

function pieceToString(piece: cg.Piece): string {
  let p = letters[piece.role];
  if (piece.color === 'red') p = p.toUpperCase();
  if (piece.promoted) p = '+' + p;
  return p;
}

export function write(pieces: cg.Pieces): cg.FEN {
  return invRanks
    .map(y =>
      cg.files
        .map(x => {
          const piece = pieces.get(x + y);
          if (piece) {
            let p = pieceToString(piece);

            // Handle carried pieces
            if (piece.carrying && piece.carrying.length > 0) {
              const carriedStr = piece.carrying.map(carried => pieceToString(carried)).join('');
              p = `(${p}${carriedStr})`; // Combine carrier and carried pieces in parentheses
            }

            return p;
          } else return '1';
        })
        .join(''),
    )
    .join('/')
    .replace(/1{2,}/g, s => s.length.toString());
}
