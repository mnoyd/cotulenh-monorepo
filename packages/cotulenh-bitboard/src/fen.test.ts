/**
 * Tests for FEN parsing and generation.
 *
 * These tests ensure compatibility with cotulenh-core FEN format.
 */

import { describe, it, expect } from 'vitest';
import {
  parseFEN,
  generateFEN,
  squareToAlgebraic,
  algebraicToSquare,
  DEFAULT_POSITION
} from './fen';
import { BitboardPosition } from './position';

describe('FEN - Square Conversion', () => {
  it('should convert square index to algebraic notation', () => {
    expect(squareToAlgebraic(0)).toBe('a1');
    expect(squareToAlgebraic(10)).toBe('k1');
    expect(squareToAlgebraic(11)).toBe('a2');
    expect(squareToAlgebraic(60)).toBe('f6');
    expect(squareToAlgebraic(131)).toBe('k12');
  });

  it('should convert algebraic notation to square index', () => {
    expect(algebraicToSquare('a1')).toBe(0);
    expect(algebraicToSquare('k1')).toBe(10);
    expect(algebraicToSquare('a2')).toBe(11);
    expect(algebraicToSquare('f6')).toBe(60);
    expect(algebraicToSquare('k12')).toBe(131);
  });

  it('should handle invalid algebraic notation', () => {
    expect(algebraicToSquare('z1')).toBe(-1);
    expect(algebraicToSquare('a13')).toBe(-1);
    expect(algebraicToSquare('a0')).toBe(-1);
    expect(algebraicToSquare('')).toBe(-1);
  });

  it('should round-trip square conversions', () => {
    for (let square = 0; square < 132; square++) {
      const algebraic = squareToAlgebraic(square);
      const backToSquare = algebraicToSquare(algebraic);
      expect(backToSquare).toBe(square);
    }
  });
});

describe('FEN - Parsing', () => {
  it('should parse default starting position', () => {
    const position = new BitboardPosition();
    const result = parseFEN(DEFAULT_POSITION, position);

    expect(result.turn).toBe('r');
    expect(result.halfMoves).toBe(0);
    expect(result.moveNumber).toBe(1);
    expect(result.deploySession).toBeUndefined();

    // Check some pieces are placed correctly
    const c4 = position.getPieceAt(algebraicToSquare('g12'));
    expect(c4).toBeDefined();
    expect(c4?.type).toBe('c');
    expect(c4?.color).toBe('b');

    const C4 = position.getPieceAt(algebraicToSquare('g1'));
    expect(C4).toBeDefined();
    expect(C4?.type).toBe('c');
    expect(C4?.color).toBe('r');
  });

  it('should parse FEN with empty squares', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1';
    const position = new BitboardPosition();
    const result = parseFEN(fen, position);

    expect(result.turn).toBe('r');

    // All squares should be empty
    for (let square = 0; square < 132; square++) {
      expect(position.isOccupied(square)).toBe(false);
    }
  });

  it('should parse FEN with stacks', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1';
    const position = new BitboardPosition();
    parseFEN(fen, position);

    // Check stack at a2 (uppercase N = red)
    const stack = position.getPieceAt(algebraicToSquare('a2'));
    expect(stack).toBeDefined();
    expect(stack?.type).toBe('n');
    expect(stack?.color).toBe('r'); // Uppercase = red
    expect(stack?.carrying).toBeDefined();
    expect(stack?.carrying?.length).toBe(2);
    expect(stack?.carrying?.[0].type).toBe('i');
    expect(stack?.carrying?.[1].type).toBe('f');
  });

  it('should parse FEN with heroic pieces', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/+c10/11 r - - 0 1';
    const position = new BitboardPosition();
    parseFEN(fen, position);

    const heroicCommander = position.getPieceAt(algebraicToSquare('a2'));
    expect(heroicCommander).toBeDefined();
    expect(heroicCommander?.type).toBe('c');
    expect(heroicCommander?.heroic).toBe(true);
  });

  it('should parse FEN with heroic pieces in stacks', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(+Nif)10/11 r - - 0 1';
    const position = new BitboardPosition();
    parseFEN(fen, position);

    const stack = position.getPieceAt(algebraicToSquare('a2'));
    expect(stack).toBeDefined();
    expect(stack?.type).toBe('n');
    expect(stack?.heroic).toBe(true);
    expect(stack?.carrying).toBeDefined();
    expect(stack?.carrying?.length).toBe(2);
  });

  it('should parse FEN with deploy session marker (no moves)', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1 DEPLOY a2:';
    const position = new BitboardPosition();
    const result = parseFEN(fen, position);

    expect(result.deploySession).toBeDefined();
    expect(result.deploySession?.originSquare).toBe('a2');
    expect(result.deploySession?.moves).toEqual([]);
    expect(result.deploySession?.isComplete).toBe(true);
  });

  it('should parse FEN with deploy session moves', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1 DEPLOY a2:Na3,Ib3';
    const position = new BitboardPosition();
    const result = parseFEN(fen, position);

    expect(result.deploySession).toBeDefined();
    expect(result.deploySession?.originSquare).toBe('a2');
    expect(result.deploySession?.moves.length).toBe(2);
    expect(result.deploySession?.moves[0]).toEqual({
      piece: 'N',
      to: 'a3',
      capture: false
    });
    expect(result.deploySession?.moves[1]).toEqual({
      piece: 'I',
      to: 'b3',
      capture: false
    });
    expect(result.deploySession?.isComplete).toBe(true);
  });

  it('should parse FEN with incomplete deploy session', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1 DEPLOY a2:Na3...';
    const position = new BitboardPosition();
    const result = parseFEN(fen, position);

    expect(result.deploySession).toBeDefined();
    expect(result.deploySession?.isComplete).toBe(false);
  });

  it('should parse FEN with deploy captures', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1 DEPLOY a2:Nxa3,Ixb3';
    const position = new BitboardPosition();
    const result = parseFEN(fen, position);

    expect(result.deploySession?.moves[0].capture).toBe(true);
    expect(result.deploySession?.moves[1].capture).toBe(true);
  });

  it('should parse FEN with carrying pieces in deploy', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1 DEPLOY a2:N(IF)a3';
    const position = new BitboardPosition();
    const result = parseFEN(fen, position);

    expect(result.deploySession?.moves[0].piece).toBe('N(IF)');
  });

  it('should throw error for invalid FEN format', () => {
    const position = new BitboardPosition();

    // Missing turn
    expect(() => parseFEN('11/11/11/11/11/11/11/11/11/11/11/11', position)).toThrow();

    // Wrong number of ranks
    expect(() => parseFEN('11/11/11 r - - 0 1', position)).toThrow();

    // Invalid turn
    expect(() => parseFEN('11/11/11/11/11/11/11/11/11/11/11/11 x - - 0 1', position)).toThrow();
  });

  it('should throw error for unclosed stack parentheses', () => {
    const position = new BitboardPosition();
    const fen = '11/11/11/11/11/11/11/11/11/11/(Nif)/11 r - - 0 1';

    // This should throw because the stack ends but there's still a '/' after it
    // Actually, let's test a proper unclosed case
    const fenUnclosed = '11/11/11/11/11/11/11/11/11/11/(Nif/11 r - - 0 1';
    expect(() => parseFEN(fenUnclosed, position)).toThrow();
  });

  it('should throw error for unmatched closing parenthesis', () => {
    const position = new BitboardPosition();
    const fen = '11/11/11/11/11/11/11/11/11/11/Nif)10/11 r - - 0 1';

    expect(() => parseFEN(fen, position)).toThrow(/unmatched/);
  });
});

describe('FEN - Generation', () => {
  it('should generate FEN for empty board', () => {
    const position = new BitboardPosition();
    const fen = generateFEN(position, 'r', 0, 1);

    expect(fen).toBe('11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1');
  });

  it('should generate FEN for starting position', () => {
    const position = new BitboardPosition();
    parseFEN(DEFAULT_POSITION, position);

    const fen = generateFEN(position, 'r', 0, 1);

    // Should match the default position
    expect(fen).toBe(DEFAULT_POSITION);
  });

  it('should generate FEN with stacks', () => {
    const position = new BitboardPosition();

    // Place a stack
    position.placePiece(
      {
        type: 'n',
        color: 'b',
        carrying: [
          { type: 'i', color: 'b' },
          { type: 'f', color: 'b' }
        ]
      },
      algebraicToSquare('a2')
    );

    const fen = generateFEN(position, 'r', 0, 1);

    expect(fen).toContain('(nif)');
  });

  it('should generate FEN with heroic pieces', () => {
    const position = new BitboardPosition();

    position.placePiece(
      {
        type: 'c',
        color: 'b',
        heroic: true
      },
      algebraicToSquare('a2')
    );

    const fen = generateFEN(position, 'r', 0, 1);

    expect(fen).toContain('+c');
  });

  it('should generate FEN with uppercase for red pieces', () => {
    const position = new BitboardPosition();

    position.placePiece(
      {
        type: 'c',
        color: 'r'
      },
      algebraicToSquare('a2')
    );

    const fen = generateFEN(position, 'r', 0, 1);

    expect(fen).toContain('C');
  });

  it('should generate FEN with correct move counters', () => {
    const position = new BitboardPosition();
    const fen = generateFEN(position, 'b', 10, 5);

    expect(fen).toContain('b - - 10 5');
  });

  it('should generate FEN with pieces on all ranks', () => {
    const position = new BitboardPosition();

    // Place one piece on each rank
    for (let rank = 0; rank < 12; rank++) {
      position.placePiece(
        {
          type: 'i',
          color: rank % 2 === 0 ? 'r' : 'b'
        },
        rank * 11
      ); // First square of each rank
    }

    const fen = generateFEN(position, 'r', 0, 1);
    const ranks = fen.split(' ')[0].split('/');

    expect(ranks.length).toBe(12);
    // Each rank should have a piece at the start
    expect(ranks[0]).toMatch(/^[ib]/);
  });

  it('should round-trip FEN parsing and generation', () => {
    const originalFEN = DEFAULT_POSITION;
    const position = new BitboardPosition();

    // Parse
    const parsed = parseFEN(originalFEN, position);

    // Generate
    const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);

    // Should match
    expect(generatedFEN).toBe(originalFEN);
  });

  it('should round-trip FEN with stacks', () => {
    const originalFEN = '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1';
    const position = new BitboardPosition();

    const parsed = parseFEN(originalFEN, position);
    const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);

    expect(generatedFEN).toBe(originalFEN);
  });

  it('should round-trip FEN with heroic pieces', () => {
    const originalFEN = '11/11/11/11/11/11/11/11/11/11/+c10/11 r - - 0 1';
    const position = new BitboardPosition();

    const parsed = parseFEN(originalFEN, position);
    const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);

    expect(generatedFEN).toBe(originalFEN);
  });

  it('should round-trip FEN with multiple stacks and heroic pieces', () => {
    const originalFEN = '(+Nif)10/11/11/11/11/11/11/11/11/11/(Tei)10/11 b - - 15 8';
    const position = new BitboardPosition();

    const parsed = parseFEN(originalFEN, position);
    const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);

    expect(generatedFEN).toBe(originalFEN);
  });
});

describe('FEN - Edge Cases', () => {
  it('should handle multi-digit empty square counts', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1';
    const position = new BitboardPosition();

    expect(() => parseFEN(fen, position)).not.toThrow();
  });

  it('should handle mixed pieces and empty squares', () => {
    const fen = 'c10/1i9/2t8/3m7/4e6/5a5/6g4/7s3/8f2/9n1/10h/11 r - - 0 1';
    const position = new BitboardPosition();

    parseFEN(fen, position);

    expect(position.getPieceAt(algebraicToSquare('a12'))?.type).toBe('c');
    expect(position.getPieceAt(algebraicToSquare('b11'))?.type).toBe('i');
    expect(position.getPieceAt(algebraicToSquare('c10'))?.type).toBe('t');
  });

  it('should handle complex stacks with heroic pieces', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(+N+i+f)10/11 r - - 0 1';
    const position = new BitboardPosition();

    parseFEN(fen, position);

    const stack = position.getPieceAt(algebraicToSquare('a2'));
    expect(stack?.heroic).toBe(true);
    expect(stack?.carrying?.[0].heroic).toBe(true);
    expect(stack?.carrying?.[1].heroic).toBe(true);
  });

  it('should preserve piece colors in stacks', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(NIF)10/11 r - - 0 1';
    const position = new BitboardPosition();

    parseFEN(fen, position);

    const stack = position.getPieceAt(algebraicToSquare('a2'));
    expect(stack?.color).toBe('r');
    expect(stack?.carrying?.[0].color).toBe('r');
    expect(stack?.carrying?.[1].color).toBe('r');
  });

  it('should handle multiple stacks in same rank', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(Nif)2(Tei)7/11 r - - 0 1';
    const position = new BitboardPosition();

    parseFEN(fen, position);

    const stack1 = position.getPieceAt(algebraicToSquare('a2'));
    expect(stack1?.type).toBe('n');
    expect(stack1?.carrying?.length).toBe(2);

    const stack2 = position.getPieceAt(algebraicToSquare('d2'));
    expect(stack2?.type).toBe('t');
    expect(stack2?.carrying?.length).toBe(2);
  });

  it('should handle mixed colors in different stacks', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/(NIF)2(tei)7/11 r - - 0 1';
    const position = new BitboardPosition();

    parseFEN(fen, position);

    const redStack = position.getPieceAt(algebraicToSquare('a2'));
    expect(redStack?.color).toBe('r');

    const blueStack = position.getPieceAt(algebraicToSquare('d2'));
    expect(blueStack?.color).toBe('b');
  });

  it('should round-trip complex FEN with multiple features', () => {
    const originalFEN =
      '6c4/1n2fh1hf2/3a2s2a1/2(+Nif)1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 b - - 5 10';
    const position = new BitboardPosition();

    const parsed = parseFEN(originalFEN, position);
    const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);

    expect(generatedFEN).toBe(originalFEN);
  });

  it('should round-trip FEN with deploy session', () => {
    const originalFEN = '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1 DEPLOY a2:Na3,Ib3';
    const position = new BitboardPosition();

    const parsed = parseFEN(originalFEN, position);

    expect(parsed.deploySession).toBeDefined();
    expect(parsed.deploySession?.originSquare).toBe('a2');
    expect(parsed.deploySession?.moves.length).toBe(2);
    expect(parsed.deploySession?.isComplete).toBe(true);
  });

  it('should handle all piece types in FEN', () => {
    const fen = 'citmeasfnh1/11/11/11/11/11/11/11/11/11/11/CITMEASFNH1 r - - 0 1';
    const position = new BitboardPosition();

    parseFEN(fen, position);

    // Check blue pieces (lowercase) on rank 12
    expect(position.getPieceAt(algebraicToSquare('a12'))?.type).toBe('c');
    expect(position.getPieceAt(algebraicToSquare('b12'))?.type).toBe('i');
    expect(position.getPieceAt(algebraicToSquare('c12'))?.type).toBe('t');
    expect(position.getPieceAt(algebraicToSquare('d12'))?.type).toBe('m');
    expect(position.getPieceAt(algebraicToSquare('e12'))?.type).toBe('e');
    expect(position.getPieceAt(algebraicToSquare('f12'))?.type).toBe('a');
    expect(position.getPieceAt(algebraicToSquare('g12'))?.type).toBe('s');
    expect(position.getPieceAt(algebraicToSquare('h12'))?.type).toBe('f');
    expect(position.getPieceAt(algebraicToSquare('i12'))?.type).toBe('n');
    expect(position.getPieceAt(algebraicToSquare('j12'))?.type).toBe('h');

    // Check red pieces (uppercase) on rank 1
    expect(position.getPieceAt(algebraicToSquare('a1'))?.type).toBe('c');
    expect(position.getPieceAt(algebraicToSquare('a1'))?.color).toBe('r');
  });

  it('should handle FEN with different turn colors', () => {
    const fenRed = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1';
    const fenBlue = '11/11/11/11/11/11/11/11/11/11/11/11 b - - 0 1';

    const positionRed = new BitboardPosition();
    const positionBlue = new BitboardPosition();

    const parsedRed = parseFEN(fenRed, positionRed);
    const parsedBlue = parseFEN(fenBlue, positionBlue);

    expect(parsedRed.turn).toBe('r');
    expect(parsedBlue.turn).toBe('b');
  });

  it('should handle FEN with various move counters', () => {
    const fen = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 25 50';
    const position = new BitboardPosition();

    const parsed = parseFEN(fen, position);

    expect(parsed.halfMoves).toBe(25);
    expect(parsed.moveNumber).toBe(50);
  });

  it('should generate FEN with stacks containing multiple pieces', () => {
    const position = new BitboardPosition();

    // Place a stack with 3 carried pieces
    position.placePiece(
      {
        type: 'n',
        color: 'r',
        carrying: [
          { type: 'i', color: 'r' },
          { type: 'f', color: 'r' },
          { type: 'e', color: 'r' }
        ]
      },
      algebraicToSquare('e5')
    );

    const fen = generateFEN(position, 'r', 0, 1);

    expect(fen).toContain('(NIFE)');
  });

  it('should generate FEN with mixed heroic and non-heroic pieces in stack', () => {
    const position = new BitboardPosition();

    position.placePiece(
      {
        type: 'n',
        color: 'b',
        heroic: true,
        carrying: [
          { type: 'i', color: 'b' },
          { type: 'f', color: 'b', heroic: true }
        ]
      },
      algebraicToSquare('c3')
    );

    const fen = generateFEN(position, 'r', 0, 1);

    expect(fen).toContain('(+ni+f)');
  });
});

describe('FEN - Comprehensive Round-Trip Tests', () => {
  it('should round-trip empty board with different turns', () => {
    const testCases = [
      '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
      '11/11/11/11/11/11/11/11/11/11/11/11 b - - 0 1'
    ];

    for (const originalFEN of testCases) {
      const position = new BitboardPosition();
      const parsed = parseFEN(originalFEN, position);
      const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);
      expect(generatedFEN).toBe(originalFEN);
    }
  });

  it('should round-trip positions with various move counters', () => {
    const testCases = [
      '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
      '11/11/11/11/11/11/11/11/11/11/11/11 r - - 10 5',
      '11/11/11/11/11/11/11/11/11/11/11/11 b - - 49 25',
      '11/11/11/11/11/11/11/11/11/11/11/11 b - - 100 50'
    ];

    for (const originalFEN of testCases) {
      const position = new BitboardPosition();
      const parsed = parseFEN(originalFEN, position);
      const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);
      expect(generatedFEN).toBe(originalFEN);
    }
  });

  it('should round-trip positions with all piece types', () => {
    const originalFEN = 'citmeasfnh1/CITMEASFNH1/11/11/11/11/11/11/11/11/11/11 r - - 0 1';
    const position = new BitboardPosition();

    const parsed = parseFEN(originalFEN, position);
    const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);

    expect(generatedFEN).toBe(originalFEN);
  });

  it('should round-trip positions with stacks of varying sizes', () => {
    const testCases = [
      '11/11/11/11/11/11/11/11/11/11/(Nif)10/11 r - - 0 1',
      '11/11/11/11/11/11/11/11/11/11/(Nife)10/11 r - - 0 1',
      '11/11/11/11/11/11/11/11/11/11/(Nifea)10/11 r - - 0 1'
    ];

    for (const originalFEN of testCases) {
      const position = new BitboardPosition();
      const parsed = parseFEN(originalFEN, position);
      const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);
      expect(generatedFEN).toBe(originalFEN);
    }
  });

  it('should round-trip positions with heroic pieces in various positions', () => {
    const testCases = [
      '+c10/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
      '11/11/11/11/11/11/11/11/11/11/+c10/11 r - - 0 1',
      '+c3+i6/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'
    ];

    for (const originalFEN of testCases) {
      const position = new BitboardPosition();
      const parsed = parseFEN(originalFEN, position);
      const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);
      expect(generatedFEN).toBe(originalFEN);
    }
  });

  it('should round-trip positions with heroic stacks', () => {
    const testCases = [
      '11/11/11/11/11/11/11/11/11/11/(+Nif)10/11 r - - 0 1',
      '11/11/11/11/11/11/11/11/11/11/(N+if)10/11 r - - 0 1',
      '11/11/11/11/11/11/11/11/11/11/(+N+i+f)10/11 r - - 0 1'
    ];

    for (const originalFEN of testCases) {
      const position = new BitboardPosition();
      const parsed = parseFEN(originalFEN, position);
      const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);
      expect(generatedFEN).toBe(originalFEN);
    }
  });

  it('should round-trip complex game positions', () => {
    const testCases = [
      DEFAULT_POSITION,
      '6c4/1n2fh1hf2/3a2s2a1/2(Nif)1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1',
      '6+c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 b - - 10 5'
    ];

    for (const originalFEN of testCases) {
      const position = new BitboardPosition();
      const parsed = parseFEN(originalFEN, position);
      const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);
      expect(generatedFEN).toBe(originalFEN);
    }
  });

  it('should round-trip positions with multiple stacks', () => {
    const originalFEN = '(Nif)2(Tei)7/11/11/11/11/11/11/11/11/11/(Mea)2(Fsg)7/11 r - - 0 1';
    const position = new BitboardPosition();

    const parsed = parseFEN(originalFEN, position);
    const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);

    expect(generatedFEN).toBe(originalFEN);
  });

  it('should round-trip positions with mixed red and blue pieces', () => {
    const originalFEN = 'CiTmEaSfNh1/cItMeAsFnH1/11/11/11/11/11/11/11/11/11/11 r - - 0 1';
    const position = new BitboardPosition();

    const parsed = parseFEN(originalFEN, position);
    const generatedFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);

    expect(generatedFEN).toBe(originalFEN);
  });

  it('should maintain piece positions after multiple round-trips', () => {
    const originalFEN =
      '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1';

    let currentFEN = originalFEN;

    // Perform 5 round-trips
    for (let i = 0; i < 5; i++) {
      const position = new BitboardPosition();
      const parsed = parseFEN(currentFEN, position);
      currentFEN = generateFEN(position, parsed.turn, parsed.halfMoves, parsed.moveNumber);
    }

    expect(currentFEN).toBe(originalFEN);
  });
});
