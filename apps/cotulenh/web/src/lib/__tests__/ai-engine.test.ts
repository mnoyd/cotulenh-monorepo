import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- hoisted mocks ---
const {
  movesMock,
  moveMock,
  isGameOverMock,
  isCheckmateMock,
  isStalemateMock,
  isDrawMock,
  isCommanderCapturedMock,
  fenMock,
  turnMock,
  boardMock,
  CoTuLenhMock
} = vi.hoisted(() => {
  const movesMock = vi.fn();
  const moveMock = vi.fn();
  const isGameOverMock = vi.fn();
  const isCheckmateMock = vi.fn();
  const isStalemateMock = vi.fn();
  const isDrawMock = vi.fn();
  const isCommanderCapturedMock = vi.fn();
  const fenMock = vi.fn();
  const turnMock = vi.fn();
  const boardMock = vi.fn();

  const CoTuLenhMock = vi.fn(() => ({
    moves: movesMock,
    move: moveMock,
    isGameOver: isGameOverMock,
    isCheckmate: isCheckmateMock,
    isStalemate: isStalemateMock,
    isDraw: isDrawMock,
    isCommanderCaptured: isCommanderCapturedMock,
    fen: fenMock,
    turn: turnMock,
    undo: vi.fn(),
    board: boardMock
  }));

  return {
    movesMock,
    moveMock,
    isGameOverMock,
    isCheckmateMock,
    isStalemateMock,
    isDrawMock,
    isCommanderCapturedMock,
    fenMock,
    turnMock,
    boardMock,
    CoTuLenhMock
  };
});

vi.mock('@cotulenh/core', () => ({
  CoTuLenh: CoTuLenhMock
}));

import { selectAiMove, PIECE_VALUES } from '../ai-engine';

describe('ai-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isGameOverMock.mockReturnValue(false);
    isCheckmateMock.mockReturnValue(false);
    isStalemateMock.mockReturnValue(false);
    isDrawMock.mockReturnValue(false);
    isCommanderCapturedMock.mockReturnValue(false);
    fenMock.mockReturnValue('some-fen');
    turnMock.mockReturnValue('b');
    boardMock.mockReturnValue([]);
  });

  describe('PIECE_VALUES', () => {
    it('assigns highest value to commander', () => {
      expect(PIECE_VALUES.c).toBeGreaterThan(PIECE_VALUES.t);
      expect(PIECE_VALUES.c).toBeGreaterThan(PIECE_VALUES.f);
    });

    it('assigns positive values to all piece types', () => {
      for (const value of Object.values(PIECE_VALUES)) {
        expect(value).toBeGreaterThan(0);
      }
    });
  });

  describe('selectAiMove', () => {
    it('returns null when no legal moves available', () => {
      movesMock.mockReturnValue([]);
      const result = selectAiMove('some-fen', 'easy');
      expect(result).toBeNull();
    });

    it('returns the only move when single legal move exists', () => {
      const singleMove = {
        san: 'Ic2-c3',
        from: 'c2',
        to: 'c3',
        piece: { type: 'i', color: 'b' },
        captured: undefined,
        flags: 'n'
      };
      movesMock.mockReturnValue([singleMove]);
      moveMock.mockReturnValue(singleMove);

      const result = selectAiMove('some-fen', 'easy');
      expect(result).toBe('Ic2-c3');
    });

    describe('easy difficulty', () => {
      it('returns a valid legal move SAN string', () => {
        const legalMoves = [
          { san: 'Ic2-c3', from: 'c2', to: 'c3', piece: { type: 'i', color: 'b' }, flags: 'n' },
          { san: 'Ta1-a2', from: 'a1', to: 'a2', piece: { type: 't', color: 'b' }, flags: 'n' },
          { san: 'Mf1-f2', from: 'f1', to: 'f2', piece: { type: 'm', color: 'b' }, flags: 'n' }
        ];
        movesMock.mockReturnValue(legalMoves);

        const result = selectAiMove('some-fen', 'easy');
        expect(result).not.toBeNull();
        expect(legalMoves.map((m) => m.san)).toContain(result);
      });

      it('selects randomly among all moves', () => {
        const legalMoves = [
          { san: 'Ic2-c3', from: 'c2', to: 'c3', piece: { type: 'i', color: 'b' }, flags: 'n' },
          { san: 'Ta1-a2', from: 'a1', to: 'a2', piece: { type: 't', color: 'b' }, flags: 'n' }
        ];
        movesMock.mockReturnValue(legalMoves);

        // Run multiple times, should produce valid moves each time
        const results = new Set<string | null>();
        for (let i = 0; i < 20; i++) {
          results.add(selectAiMove('some-fen', 'easy'));
        }
        // All results should be valid moves
        for (const r of results) {
          expect(legalMoves.map((m) => m.san)).toContain(r);
        }
      });
    });

    describe('medium difficulty', () => {
      it('returns a valid legal move', () => {
        const legalMoves = [
          { san: 'Ic2-c3', from: 'c2', to: 'c3', piece: { type: 'i', color: 'b' }, flags: 'n' },
          {
            san: 'Td4xd5',
            from: 'd4',
            to: 'd5',
            piece: { type: 't', color: 'b' },
            flags: 'c',
            captured: [{ type: 'i', color: 'r' }]
          }
        ];
        movesMock.mockReturnValue(legalMoves);

        const result = selectAiMove('some-fen', 'medium');
        expect(result).not.toBeNull();
        expect(legalMoves.map((m) => m.san)).toContain(result);
      });

      it('favors captures over non-captures', () => {
        const captureMove = {
          san: 'Td4xd5',
          from: 'd4',
          to: 'd5',
          piece: { type: 't', color: 'b' },
          flags: 'c',
          captured: [{ type: 'f', color: 'r' }]
        };
        const normalMove = {
          san: 'Ic2-c3',
          from: 'c2',
          to: 'c3',
          piece: { type: 'i', color: 'b' },
          flags: 'n'
        };
        movesMock.mockReturnValue([normalMove, captureMove]);

        const counts: Record<string, number> = {};
        for (let i = 0; i < 100; i++) {
          const r = selectAiMove('some-fen', 'medium')!;
          counts[r] = (counts[r] ?? 0) + 1;
        }
        // Capture move should be selected more often
        expect(counts[captureMove.san] ?? 0).toBeGreaterThan(counts[normalMove.san] ?? 0);
      });
    });

    describe('hard difficulty', () => {
      it('returns a valid legal move', () => {
        const legalMoves = [
          { san: 'Ic2-c3', from: 'c2', to: 'c3', piece: { type: 'i', color: 'b' }, flags: 'n' }
        ];
        movesMock.mockReturnValue(legalMoves);
        moveMock.mockReturnValue(legalMoves[0]);
        isGameOverMock.mockReturnValue(false);

        const result = selectAiMove('some-fen', 'hard');
        expect(result).not.toBeNull();
      });

      it('prefers capturing high-value pieces', () => {
        // Setup: two moves - one captures commander, one captures infantry
        const captureCommander = {
          san: 'Td4xd5',
          from: 'd4',
          to: 'd5',
          piece: { type: 't', color: 'b' },
          flags: 'c',
          captured: [{ type: 'c', color: 'r' }]
        };
        const captureInfantry = {
          san: 'Ie3xe4',
          from: 'e3',
          to: 'e4',
          piece: { type: 'i', color: 'b' },
          flags: 'c',
          captured: [{ type: 'i', color: 'r' }]
        };
        const normalMove = {
          san: 'Ma1-a2',
          from: 'a1',
          to: 'a2',
          piece: { type: 'm', color: 'b' },
          flags: 'n'
        };

        movesMock.mockReturnValue([normalMove, captureInfantry, captureCommander]);

        // For hard difficulty, after each move, engine evaluates board
        // We need to mock the evaluation chain:
        // - move() applies a move, then we evaluate, then undo()
        moveMock.mockReturnValue({});
        isGameOverMock.mockReturnValue(false);

        // For 1-ply evaluation, keep board material flat so capture bonus decides.
        boardMock.mockReturnValue([]);

        const counts: Record<string, number> = {};
        for (let i = 0; i < 50; i++) {
          const r = selectAiMove('some-fen', 'hard')!;
          counts[r] = (counts[r] ?? 0) + 1;
        }
        // Commander capture should be overwhelmingly preferred
        expect(counts[captureCommander.san] ?? 0).toBeGreaterThan(
          (counts[normalMove.san] ?? 0) + (counts[captureInfantry.san] ?? 0)
        );
      });

      it('detects checkmate in one', () => {
        const checkmateMove = {
          san: 'Td4xd5',
          from: 'd4',
          to: 'd5',
          piece: { type: 't', color: 'b' },
          flags: 'c',
          captured: [{ type: 'i', color: 'r' }]
        };
        const normalMove = {
          san: 'Ic2-c3',
          from: 'c2',
          to: 'c3',
          piece: { type: 'i', color: 'b' },
          flags: 'n'
        };

        movesMock.mockReturnValue([normalMove, checkmateMove]);

        // First move() call: normalMove - not game over
        // Second move() call: checkmateMove - game over (checkmate)
        let moveCallCount = 0;
        moveMock.mockImplementation(() => {
          moveCallCount++;
          return {};
        });

        isGameOverMock.mockImplementation(() => {
          // After applying checkmateMove, game is over
          return moveCallCount % 2 === 0;
        });
        isCheckmateMock.mockImplementation(() => moveCallCount % 2 === 0);

        const result = selectAiMove('some-fen', 'hard');
        expect(result).toBe(checkmateMove.san);
      });
    });
  });
});
