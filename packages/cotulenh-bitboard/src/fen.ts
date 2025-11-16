/**
 * FEN (Forsyth-Edwards Notation) parsing and generation for CoTuLenh bitboard engine.
 *
 * This module handles:
 * - Standard FEN parsing and generation
 * - Extended FEN with stack notation (parentheses)
 * - Extended FEN with heroic notation (+)
 * - Extended FEN with deploy session markers (DEPLOY)
 *
 * FEN Format:
 * - Piece placement: 12 ranks separated by '/', pieces in uppercase (red) or lowercase (blue)
 * - Stacks: (CarrierPiece1Piece2...) e.g., (Nif) = Navy carrying infantry and air force
 * - Heroic: + prefix before piece, e.g., +C for heroic commander
 * - Turn: 'r' for red, 'b' for blue
 * - Castling: '-' (not used in CoTuLenh)
 * - En passant: '-' (not used in CoTuLenh)
 * - Half moves: number of half-moves since last capture or pawn move
 * - Move number: current move number
 * - Deploy session: DEPLOY square:moves... (optional)
 *
 * Example FEN:
 * "6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1"
 *
 * Example with stack:
 * "6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2(Nie)2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1"
 *
 * Example with deploy session:
 * "6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1 DEPLOY e5:Nc7,Ixd6..."
 */

import type { BitboardPosition } from './position';
import type { Color, PieceSymbol, Piece, Square } from './types';
import type { DeploySession } from './deploy-session';

/**
 * Default starting position FEN for CoTuLenh.
 */
export const DEFAULT_POSITION =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1';

/**
 * Piece symbol mapping from FEN character to piece type.
 */
const PIECE_SYMBOLS: Record<string, PieceSymbol> = {
  c: 'c', // commander
  i: 'i', // infantry
  t: 't', // tank
  m: 'm', // militia
  e: 'e', // engineer
  a: 'a', // artillery
  g: 'g', // anti-air
  s: 's', // missile
  f: 'f', // air force
  n: 'n', // navy
  h: 'h' // headquarter
};

/**
 * Reverse mapping from piece type to FEN character.
 */
const PIECE_CHARS: Record<PieceSymbol, string> = {
  c: 'c',
  i: 'i',
  t: 't',
  m: 'm',
  e: 'e',
  a: 'a',
  g: 'g',
  s: 's',
  f: 'f',
  n: 'n',
  h: 'h'
};

/**
 * Square name mapping for algebraic notation.
 * Maps (file, rank) to square name like 'e4'.
 */
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/**
 * Converts a square index (0-131) to algebraic notation (e.g., 'e4').
 *
 * @param square - Square index (0-131)
 * @returns Algebraic notation string
 */
export function squareToAlgebraic(square: number): Square {
  const rank = Math.floor(square / 11);
  const file = square % 11;
  return `${FILES[file]}${RANKS[rank]}` as Square;
}

/**
 * Converts algebraic notation (e.g., 'e4') to square index (0-131).
 *
 * @param algebraic - Algebraic notation string
 * @returns Square index (0-131), or -1 if invalid
 */
export function algebraicToSquare(algebraic: string): number {
  // Parse file (a-k)
  const file = algebraic.codePointAt(0)! - 'a'.codePointAt(0)!;
  if (file < 0 || file > 10) {
    return -1;
  }

  // Parse rank (1-12)
  const rankStr = algebraic.substring(1);
  const rank = Number.parseInt(rankStr, 10);
  if (Number.isNaN(rank) || rank < 1 || rank > 12) {
    return -1;
  }

  // Convert to square index (rank 1 = row 0, rank 12 = row 11)
  const square = (rank - 1) * 11 + file;
  return square;
}

/**
 * Parsed FEN result containing position state and optional deploy session.
 */
export interface ParsedFEN {
  /** Turn to move */
  turn: Color;
  /** Half-move clock (for fifty-move rule) */
  halfMoves: number;
  /** Full move number */
  moveNumber: number;
  /** Optional deploy session information */
  deploySession?: {
    /** Origin square of the deploy */
    originSquare: Square;
    /** Deploy moves made so far */
    moves: Array<{
      /** Piece notation (e.g., "N", "F(EI)") */
      piece: string;
      /** Destination square */
      to: Square;
      /** Whether this was a capture */
      capture: boolean;
    }>;
    /** Whether the deploy is complete (false if ends with "...") */
    isComplete: boolean;
  };
}

/**
 * Parses a FEN string and loads it into a BitboardPosition.
 *
 * Supports:
 * - Standard FEN format
 * - Stack notation with parentheses: (CarrierPiece1Piece2)
 * - Heroic notation with +: +C for heroic commander
 * - Deploy session markers: DEPLOY square:moves...
 *
 * @param fen - FEN string to parse
 * @param position - BitboardPosition to load into
 * @returns Parsed FEN metadata (turn, counters, deploy session)
 * @throws Error if FEN format is invalid
 */
export function parseFEN(fen: string, position: BitboardPosition): ParsedFEN {
  // Clear the position first
  position.clear();

  // Check for deploy session marker
  const deployRegex = /^(.+)\s+DEPLOY\s+([a-k](?:1[0-2]|[1-9])):(.*)$/;
  const deployMatch = deployRegex.exec(fen);

  let baseFEN = fen;
  let deploySession: ParsedFEN['deploySession'] | undefined;

  if (deployMatch) {
    // Extract base FEN and deploy session info
    baseFEN = deployMatch[1];
    const originSquare = deployMatch[2] as Square;
    const movesStr = deployMatch[3];

    // Parse deploy moves
    const isComplete = !movesStr.endsWith('...');
    const cleanMovesStr = movesStr.replace(/\.\.\.$/, '');
    const moves = parseDeployMoves(cleanMovesStr);

    deploySession = {
      originSquare,
      moves,
      isComplete
    };
  }

  // Split FEN into tokens
  const tokens = baseFEN.trim().split(/\s+/);

  if (tokens.length < 2) {
    throw new Error('Invalid FEN: must have at least piece placement and turn');
  }

  const piecePlacement = tokens[0];
  const turn = tokens[1] as Color;
  // tokens[2] is castling (not used)
  // tokens[3] is en passant (not used)
  const halfMoves = tokens[4] ? Number.parseInt(tokens[4], 10) : 0;
  const moveNumber = tokens[5] ? Number.parseInt(tokens[5], 10) : 1;

  // Validate turn
  if (turn !== 'r' && turn !== 'b') {
    throw new Error(`Invalid FEN: turn must be 'r' or 'b', got '${turn}'`);
  }

  // Parse piece placement
  parsePiecePlacement(piecePlacement, position);

  return {
    turn,
    halfMoves,
    moveNumber,
    deploySession
  };
}

/**
 * Parses the piece placement part of a FEN string.
 *
 * @param placement - Piece placement string (first part of FEN)
 * @param position - BitboardPosition to load pieces into
 * @throws Error if placement format is invalid
 */
function parsePiecePlacement(placement: string, position: BitboardPosition): void {
  const ranks = placement.split('/');

  if (ranks.length !== 12) {
    throw new Error(`Invalid FEN: expected 12 ranks, got ${ranks.length}`);
  }

  // Process ranks from top to bottom (rank 12 to rank 1)
  for (let rankIndex = 0; rankIndex < 12; rankIndex++) {
    const rank = 11 - rankIndex; // Rank 12 = index 0, rank 1 = index 11
    const rankStr = ranks[rankIndex];

    let file = 0;
    let i = 0;
    let nextHeroic = false;
    let parsingStack = false;
    let stackPieces: Piece[] = [];

    while (i < rankStr.length) {
      const char = rankStr[i];

      if (char === '+') {
        // Next piece is heroic
        nextHeroic = true;
        i++;
      } else if (char === '(') {
        // Start of stack
        if (parsingStack) {
          throw new Error(`Invalid FEN: nested parentheses in rank ${rank + 1}`);
        }
        parsingStack = true;
        stackPieces = [];
        i++;
      } else if (char === ')') {
        // End of stack
        if (!parsingStack) {
          throw new Error(`Invalid FEN: unmatched ')' in rank ${rank + 1}`);
        }
        if (stackPieces.length < 2) {
          throw new Error(`Invalid FEN: stack must have at least 2 pieces in rank ${rank + 1}`);
        }

        // Place the stack (first piece is carrier, rest are carried)
        const carrier = stackPieces[0];
        const carried = stackPieces.slice(1);
        const square = rank * 11 + file;

        const stackPiece: Piece = {
          ...carrier,
          carrying: carried
        };

        position.placePiece(stackPiece, square);

        parsingStack = false;
        stackPieces = [];
        file++;
        i++;
      } else if (char >= '0' && char <= '9') {
        // Empty squares
        if (parsingStack) {
          throw new Error(`Invalid FEN: digit inside stack in rank ${rank + 1}`);
        }

        // Handle multi-digit numbers (e.g., "11")
        let numStr = char;
        while (i + 1 < rankStr.length && rankStr[i + 1] >= '0' && rankStr[i + 1] <= '9') {
          i++;
          numStr += rankStr[i];
        }

        const emptyCount = Number.parseInt(numStr, 10);
        file += emptyCount;
        i++;
      } else {
        // Piece character
        const lowerChar = char.toLowerCase();
        const pieceType = PIECE_SYMBOLS[lowerChar];

        if (!pieceType) {
          throw new Error(`Invalid FEN: unknown piece character '${char}' in rank ${rank + 1}`);
        }

        const color: Color = char === char.toUpperCase() ? 'r' : 'b';
        const piece: Piece = {
          type: pieceType,
          color,
          heroic: nextHeroic || undefined
        };

        if (parsingStack) {
          // Add to stack
          stackPieces.push(piece);
        } else {
          // Place single piece
          const square = rank * 11 + file;
          position.placePiece(piece, square);
          file++;
        }

        nextHeroic = false;
        i++;
      }
    }

    // Validate end of rank
    if (parsingStack) {
      throw new Error(`Invalid FEN: unclosed '(' in rank ${rank + 1}`);
    }
    if (nextHeroic) {
      throw new Error(`Invalid FEN: '+' without following piece in rank ${rank + 1}`);
    }
    if (file > 11) {
      throw new Error(`Invalid FEN: too many squares in rank ${rank + 1} (${file} > 11)`);
    }
  }
}

/**
 * Parses deploy move notation from extended FEN.
 *
 * Format: "Nc5,F(EI)xd4,Te5"
 * - Piece type (uppercase letter)
 * - Optional carrying pieces in parentheses
 * - Optional 'x' for capture
 * - Destination square
 *
 * @param movesStr - Deploy moves string
 * @returns Array of parsed deploy moves
 * @throws Error if move notation is invalid
 */
function parseDeployMoves(movesStr: string): Array<{
  piece: string;
  to: Square;
  capture: boolean;
}> {
  if (!movesStr || movesStr.trim() === '') {
    return [];
  }

  const moves: Array<{ piece: string; to: Square; capture: boolean }> = [];
  const moveTokens = movesStr.split(',');

  for (const token of moveTokens) {
    // Match pattern: Piece(Carrying)?x?Square
    // Examples: Nc5, F(EI)xd4, Te5
    const regex = /^([A-Z])(\([A-Z]+\))?(x)?([a-k](?:1[0-2]|[1-9]))$/;
    const match = regex.exec(token);

    if (!match) {
      throw new Error(`Invalid deploy move notation: ${token}`);
    }

    const [, pieceChar, carrying, captureMarker, square] = match;

    moves.push({
      piece: carrying ? `${pieceChar}${carrying}` : pieceChar,
      to: square as Square,
      capture: !!captureMarker
    });
  }

  return moves;
}

/**
 * Generates a FEN string from a BitboardPosition.
 *
 * @param position - BitboardPosition to generate FEN from
 * @param turn - Current turn ('r' or 'b')
 * @param halfMoves - Half-move clock
 * @param moveNumber - Full move number
 * @param deploySession - Optional active deploy session
 * @returns FEN string
 */
export function generateFEN(
  position: BitboardPosition,
  turn: Color,
  halfMoves: number,
  moveNumber: number,
  deploySession?: DeploySession | null
): string {
  // Generate piece placement
  const placement = generatePiecePlacement(position);

  // Build base FEN
  const baseFEN = [
    placement,
    turn,
    '-', // castling (not used)
    '-', // en passant (not used)
    halfMoves.toString(),
    moveNumber.toString()
  ].join(' ');

  // Add deploy session if active
  if (deploySession) {
    return generateExtendedFEN(baseFEN, deploySession);
  }

  return baseFEN;
}

/**
 * Generates the piece placement part of a FEN string.
 *
 * @param position - BitboardPosition to generate from
 * @returns Piece placement string
 */
function generatePiecePlacement(position: BitboardPosition): string {
  const ranks: string[] = [];

  // Process ranks from top to bottom (rank 12 to rank 1)
  for (let rankIndex = 0; rankIndex < 12; rankIndex++) {
    const rank = 11 - rankIndex; // Rank 12 = index 0, rank 1 = index 11
    let rankStr = '';
    let emptyCount = 0;

    for (let file = 0; file < 11; file++) {
      const square = rank * 11 + file;
      const piece = position.getPieceAt(square);

      if (!piece) {
        // Empty square
        emptyCount++;
      } else {
        // Flush empty squares
        if (emptyCount > 0) {
          rankStr += emptyCount.toString();
          emptyCount = 0;
        }

        // Add piece
        rankStr += generatePieceNotation(piece);
      }
    }

    // Flush remaining empty squares
    if (emptyCount > 0) {
      rankStr += emptyCount.toString();
    }

    ranks.push(rankStr);
  }

  return ranks.join('/');
}

/**
 * Generates FEN notation for a single piece.
 *
 * @param piece - Piece to generate notation for
 * @returns FEN notation string
 */
function generatePieceNotation(piece: Piece): string {
  let notation = '';

  // Check if this is a stack
  if (piece.carrying && piece.carrying.length > 0) {
    notation += '(';

    // Carrier piece
    notation += generateSinglePieceChar(piece);

    // Carried pieces
    for (const carried of piece.carrying) {
      notation += generateSinglePieceChar(carried);
    }

    notation += ')';
  } else {
    // Single piece
    notation += generateSinglePieceChar(piece);
  }

  return notation;
}

/**
 * Generates FEN character for a single piece (without stack notation).
 *
 * @param piece - Piece to generate character for
 * @returns FEN character string
 */
function generateSinglePieceChar(piece: Piece): string {
  let char = PIECE_CHARS[piece.type];

  // Apply color (uppercase for red, lowercase for blue)
  if (piece.color === 'r') {
    char = char.toUpperCase();
  }

  // Apply heroic marker
  if (piece.heroic) {
    char = '+' + char;
  }

  return char;
}

/**
 * Generates extended FEN with deploy session information.
 *
 * Format: "base-fen DEPLOY square:moves..."
 *
 * @param baseFEN - Base FEN string
 * @param deploySession - Active deploy session
 * @returns Extended FEN string
 */
function generateExtendedFEN(baseFEN: string, deploySession: DeploySession): string {
  const originSquare = squareToAlgebraic(deploySession.stackSquare);

  if (deploySession.deployedMoves.length === 0) {
    // No moves yet, just indicate deploy started
    return `${baseFEN} DEPLOY ${originSquare}:`;
  }

  // Generate move notation
  const moveNotations: string[] = [];

  for (const move of deploySession.deployedMoves) {
    const pieceType = move.piece.type.toUpperCase();
    const dest = squareToAlgebraic(move.to);
    const capture = move.captured ? 'x' : '';

    // Handle carrying pieces
    if (move.piece.carrying && move.piece.carrying.length > 0) {
      const carryingTypes = move.piece.carrying.map((p) => p.type.toUpperCase()).join('');
      moveNotations.push(`${pieceType}(${carryingTypes})${capture}${dest}`);
    } else {
      moveNotations.push(`${pieceType}${capture}${dest}`);
    }
  }

  const movesStr = moveNotations.join(',');

  // Check if deploy is complete (no remaining pieces to deploy)
  const isComplete = deploySession.remainingPieces.length === 0;
  const unfinished = isComplete ? '' : '...';

  return `${baseFEN} DEPLOY ${originSquare}:${movesStr}${unfinished}`;
}

/**
 * Validates a FEN string format.
 *
 * @param fen - FEN string to validate
 * @returns True if valid, false otherwise
 */
export function validateFEN(fen: string): boolean {
  try {
    // Try to parse the FEN
    const position = new (require('./position').BitboardPosition)();
    parseFEN(fen, position);
    return true;
  } catch {
    return false;
  }
}
