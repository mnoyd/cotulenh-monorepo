// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

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

export interface ParsedFEN {
  pieces: cg.Pieces;
  deployState?: {
    originSquare: cg.Key;
    stay?: cg.Piece;
    moves: Array<{
      piece: cg.Piece;
      to: cg.Key;
    }>;
    isComplete: boolean; // false if ends with "..."
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parse a FEN string into pieces and optional deploy state.
 * Automatically applies deploy session to the board state if present.
 * @param fen - FEN string to parse (or 'start' for initial position)
 * @returns Parsed pieces and deploy state information
 */
export function read(fen: string): ParsedFEN {
  if (fen === 'start') fen = initial;

  // Split FEN string by whitespace
  const parts = fen.trim().split(/\s+/);
  const lastPart = parts[parts.length - 1];

  // Check if last part has deploy session format (contains ':')
  if (!lastPart.includes(':')) {
    // No deploy session, just parse base FEN
    return { pieces: parseBaseFEN(fen.trim()) };
  }

  // Extract base FEN (everything except last part) and deploy session
  const baseFEN = parts.slice(0, -1).join(' ');
  const pieces = parseBaseFEN(baseFEN);

  // Parse deploy session: "h4:M:T>h6..."
  const isComplete = !lastPart.endsWith('...');
  const cleanDeployPart = lastPart.replace(/\.\.\.$/, '');
  const sections = cleanDeployPart.split(':');

  if (sections.length < 2) {
    // Invalid format, return just pieces
    return { pieces };
  }

  const originSquare = sections[0] as cg.Key;
  const stay = parsePiece(sections[1]);
  const moveStr = sections.slice(2).join(':'); // Everything after stay piece
  const moves = parseDeployMoves(moveStr);

  const deployState = {
    originSquare,
    stay,
    moves,
    isComplete,
  };

  // Apply deploy session to pieces
  applyDeploySession(pieces, deployState);

  return { pieces, deployState };
}

/**
 * Convert pieces map to FEN string notation.
 * @param pieces - Map of pieces on the board
 * @returns FEN string representation
 */
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

/**
 * Parse a piece string notation into a Piece object.
 * Handles promoted pieces (+), combined pieces (parentheses), and stacks.
 * @param str - Piece notation string (e.g., "T", "+N", "(NF)")
 * @returns Parsed piece object
 */
export function parsePiece(str: string): cg.Piece {
  let piece: cg.Piece | null = null;
  let promoteNext = false;
  let inCombine = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '+') {
      promoteNext = true;
    } else if (char === '(') {
      inCombine = true;
    } else if (char === ')') {
      inCombine = false;
    } else {
      const p = charToPiece(char, promoteNext);
      promoteNext = false;
      if (!piece) {
        piece = p;
        if (inCombine) piece.carrying = [];
      } else {
        if (!piece.carrying) piece.carrying = [];
        piece.carrying.push(p);
      }
    }
  }
  if (!piece) throw new Error(`Invalid piece string: ${str}`);
  return piece;
}

// ============================================================================
// HELPER FUNCTIONS - PIECE PARSING
// ============================================================================

function charToPiece(c: string, promoted: boolean): cg.Piece {
  const role = roles[c.toLowerCase()];
  return {
    role: role,
    color: c === c.toLowerCase() ? 'blue' : 'red',
    promoted,
  };
}

function pieceToString(piece: cg.Piece): string {
  let p = letters[piece.role];
  if (piece.color === 'red') p = p.toUpperCase();
  if (piece.promoted) p = '+' + p;
  return p;
}

function extractPieceString(pl: string, start: number): { str: string; nextIndex: number } {
  let i = start;
  // Consume all leading '+' (though typically only one)
  while (i < pl.length && pl[i] === '+') {
    i++;
  }

  if (i < pl.length && pl[i] === '(') {
    // Find closing ')'
    while (i < pl.length && pl[i] !== ')') {
      i++;
    }
    if (i < pl.length) i++; // Consume ')'
  } else {
    // Single char (piece)
    if (i < pl.length) i++;
  }
  return { str: pl.substring(start, i), nextIndex: i };
}

// ============================================================================
// HELPER FUNCTIONS - FEN PARSING
// ============================================================================

function parseBaseFEN(fen: string): cg.Pieces {
  const pieces: cg.Pieces = new Map();
  let row = 11;
  let col = 0;

  const piecePlacement = fen.split(' ')[0]; // Process only the piece placement part

  let i = 0;
  while (i < piecePlacement.length) {
    const char = piecePlacement[i];

    if (char === '/') {
      row--;
      col = 0;
      if (row < 0) {
        return pieces;
      }
      i++;
    } else if (char >= '0' && char <= '9') {
      let numStr = char;
      let j = i + 1;
      while (j < piecePlacement.length && piecePlacement[j] >= '0' && piecePlacement[j] <= '9') {
        numStr += piecePlacement[j];
        j++;
      }
      const emptySquares = parseInt(numStr, 10);
      if (!isNaN(emptySquares)) {
        col += emptySquares;
      }
      i = j;
    } else {
      // It's a piece character (or start of one)
      const { str, nextIndex } = extractPieceString(piecePlacement, i);
      const piece = parsePiece(str);
      pieces.set(pos2key([col, row]), piece);
      col++; // Advance column for a standalone piece (even if combined, it's one square)
      i = nextIndex;
    }
  }
  return pieces;
}

function parseDeployMoves(moveStr: string): Array<{ piece: cg.Piece; to: cg.Key }> {
  if (!moveStr || moveStr.trim() === '') return [];

  // Parse format: "T>h6" or "N>xa2,F>b3"
  return moveStr.split(',').map(moveNotation => {
    const [pieceStr, dest] = moveNotation.split('>');
    const capture = dest?.startsWith('x') || dest?.startsWith('_');
    const to = (capture ? dest.substring(1) : dest) as cg.Key;

    return { piece: parsePiece(pieceStr), to };
  });
}

// ============================================================================
// HELPER FUNCTIONS - DEPLOY SESSION
// ============================================================================

function applyDeploySession(pieces: cg.Pieces, deployState: NonNullable<ParsedFEN['deployState']>) {
  // Update origin square
  if (deployState.stay) {
    pieces.set(deployState.originSquare, deployState.stay);
  } else {
    pieces.delete(deployState.originSquare);
  }

  // Apply moves
  for (const move of deployState.moves) {
    const existing = pieces.get(move.to);

    // Check for friendly piece to combine (stack)
    if (existing && existing.color === move.piece.color) {
      if (!existing.carrying) existing.carrying = [];
      existing.carrying.push(move.piece);
    } else {
      // Empty or enemy: replace
      pieces.set(move.to, move.piece);
    }
  }
}
