/**
 * Tests for history and undo functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BitboardPosition } from './position';
import {
  makeMoveTemporary,
  undoMoveTemporary,
  makeMovePermanent,
  undoMovePermanent,
  createHistoryEntry,
  type UndoInfo,
  type HistoryEntry
} from './history';
import type { Move } from './move-generator';
import { MOVE_FLAGS } from './move-generator';
import { parseFEN } from './fen';

describe('History - Temporary Move (Level 1)', () => {
  let position: BitboardPosition;

  beforeEach(() => {
    position = new BitboardPosition();
  });

  it('should execute and undo a simple move', () => {
    // Set up a simple position with a red infantry at e2
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    // Create a move from e2 to e3
    const move: Move = {
      from: 15, // e2
      to: 26, // e3
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    // Verify initial state
    expect(position.isOccupied(15)).toBe(true);
    expect(position.isOccupied(26)).toBe(false);

    // Execute move temporarily
    const undoInfo = makeMoveTemporary(position, move);

    // Verify move was executed
    expect(position.isOccupied(15)).toBe(false);
    expect(position.isOccupied(26)).toBe(true);

    // Undo the move
    undoMoveTemporary(position, undoInfo);

    // Verify state was restored
    expect(position.isOccupied(15)).toBe(true);
    expect(position.isOccupied(26)).toBe(false);
  });

  it('should handle captures in temporary moves', () => {
    // Set up position with red infantry at e2 and blue infantry at e3
    const fenData = parseFEN('11/11/11/11/11/11/11/11/4i6/4i6/11/11 r 0 1', position);

    // Create a capture move
    const move: Move = {
      from: 15, // e2
      to: 26, // e3
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.CAPTURE
    };

    // Execute move temporarily
    const undoInfo = makeMoveTemporary(position, move);

    // Verify capture was recorded
    expect(undoInfo.captured).toBeDefined();
    expect(undoInfo.captured?.type).toBe('i');
    expect(undoInfo.captured?.color).toBe('b');

    // Verify move was executed
    expect(position.isOccupied(15)).toBe(false);
    expect(position.isOccupied(26)).toBe(true);
    const piece = position.getPieceAt(26);
    expect(piece?.color).toBe('r');

    // Undo the move
    undoMoveTemporary(position, undoInfo);

    // Verify both pieces are restored
    expect(position.isOccupied(15)).toBe(true);
    expect(position.isOccupied(26)).toBe(true);
    const redPiece = position.getPieceAt(15);
    const bluePiece = position.getPieceAt(26);
    expect(redPiece?.color).toBe('r');
    expect(bluePiece?.color).toBe('b');
  });
});

describe('History - Permanent Move (Level 2)', () => {
  let position: BitboardPosition;
  let history: HistoryEntry[];

  beforeEach(() => {
    position = new BitboardPosition();
    history = [];
  });

  it('should create full history entry before move', () => {
    // Set up a simple position
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    // Create a move
    const move: Move = {
      from: 15, // e2
      to: 26, // e3
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    // Execute permanent move
    const entry = makeMovePermanent({
      position,
      move,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    // Verify history entry was created
    expect(entry).toBeDefined();
    expect(entry.move).toEqual(move);
    expect(entry.gameState.turn).toBe('r');
    expect(entry.gameState.moveNumber).toBe(1);
    expect(history.length).toBe(1);

    // Verify move was executed
    expect(position.isOccupied(15)).toBe(false);
    expect(position.isOccupied(26)).toBe(true);
  });

  it('should restore complete state on undo', () => {
    // Set up a simple position
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    // Create a move
    const move: Move = {
      from: 15, // e2
      to: 26, // e3
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    // Execute permanent move
    makeMovePermanent({
      position,
      move,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    // Verify move was executed
    expect(position.isOccupied(15)).toBe(false);
    expect(position.isOccupied(26)).toBe(true);
    expect(history.length).toBe(1);

    // Undo the move
    const result = undoMovePermanent(position, history);

    // Verify undo was successful
    expect(result).toBeDefined();
    expect(result?.gameState.turn).toBe('r');
    expect(history.length).toBe(0);

    // Verify state was restored
    expect(position.isOccupied(15)).toBe(true);
    expect(position.isOccupied(26)).toBe(false);
  });

  it('should handle multiple moves and undos', () => {
    // Set up a simple position
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    // Make first move
    const move1: Move = {
      from: 15, // e2
      to: 26, // e3
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    makeMovePermanent({
      position,
      move: move1,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    // Make second move
    const move2: Move = {
      from: 26, // e3
      to: 37, // e4
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    makeMovePermanent({
      position,
      move: move2,
      turn: 'b',
      halfMoves: 1,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    // Verify both moves were executed
    expect(position.isOccupied(15)).toBe(false);
    expect(position.isOccupied(26)).toBe(false);
    expect(position.isOccupied(37)).toBe(true);
    expect(history.length).toBe(2);

    // Undo second move
    undoMovePermanent(position, history);
    expect(position.isOccupied(26)).toBe(true);
    expect(position.isOccupied(37)).toBe(false);
    expect(history.length).toBe(1);

    // Undo first move
    undoMovePermanent(position, history);
    expect(position.isOccupied(15)).toBe(true);
    expect(position.isOccupied(26)).toBe(false);
    expect(history.length).toBe(0);
  });
});

describe('History - Memory Efficiency', () => {
  it('should use minimal memory for temporary undo', () => {
    const position = new BitboardPosition();

    // Set up a simple position
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    const move: Move = {
      from: 15,
      to: 26,
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    // Execute temporary move
    const undoInfo = makeMoveTemporary(position, move);

    // Verify undo info is minimal (only what changed)
    expect(undoInfo.move).toBeDefined();
    expect(undoInfo.captured).toBeUndefined(); // No capture
    expect(undoInfo.stackChanges).toBeUndefined(); // No stacks

    // UndoInfo should be much smaller than a full history entry
    const undoInfoSize = JSON.stringify(undoInfo).length;

    // Create a full history entry for comparison
    const historyEntry = createHistoryEntry(move, position, 'r', 0, 1, 60, 70);

    const historyEntrySize = JSON.stringify(historyEntry).length;

    // Undo info should be at least 5x smaller than full history
    expect(undoInfoSize).toBeLessThan(historyEntrySize / 5);
  });
});

describe('History - Stacks', () => {
  let position: BitboardPosition;
  let history: HistoryEntry[];

  beforeEach(() => {
    position = new BitboardPosition();
    history = [];
  });

  it('should handle undo with stack creation', () => {
    // Set up position with two red infantry pieces that can combine
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/4i6/11 r 0 1', position);

    // Place second infantry at e3 (to combine with e2)
    position.placePiece({ type: 'i', color: 'r' }, 26);

    // Create a move that combines pieces into a stack
    const move: Move = {
      from: 15, // e2
      to: 26, // e3 (where another red infantry is)
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    // Execute permanent move
    makeMovePermanent({
      position,
      move,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    // Verify stack was created
    expect(position.stackManager.hasStack(26)).toBe(true);
    expect(history.length).toBe(1);

    // Undo the move
    undoMovePermanent(position, history);

    // Verify stack was removed and pieces restored
    expect(position.stackManager.hasStack(26)).toBe(false);
    expect(position.isOccupied(15)).toBe(true);
    expect(position.isOccupied(26)).toBe(true);
    expect(history.length).toBe(0);
  });

  it('should handle temporary undo with stacks', () => {
    // Set up position with a stack
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4(ii)5/11/11 r 0 1', position);

    // Verify stack exists
    expect(position.stackManager.hasStack(15)).toBe(true);
    const stackBefore = position.stackManager.getStack(15);
    expect(stackBefore).toBeDefined();
    expect(stackBefore!.carried.length).toBe(1);

    // Create a move from the stack
    const move: Move = {
      from: 15, // e2 (stack location)
      to: 26, // e3
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    // Execute temporary move
    const undoInfo = makeMoveTemporary(position, move);

    // Verify stack changes were recorded
    expect(undoInfo.stackChanges).toBeDefined();
    expect(undoInfo.stackChanges!.length).toBeGreaterThan(0);

    // Verify move was executed (stack moved)
    expect(position.isOccupied(15)).toBe(false);
    expect(position.isOccupied(26)).toBe(true);

    // Undo the move
    undoMoveTemporary(position, undoInfo);

    // Verify stack was restored
    expect(position.stackManager.hasStack(15)).toBe(true);
    const stackAfter = position.stackManager.getStack(15);
    expect(stackAfter).toBeDefined();
    expect(stackAfter!.carried.length).toBe(1);
  });

  it('should preserve stack composition through undo', () => {
    // Set up position with a complex stack (carrier + 2 carried)
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4(iii)5/11/11 r 0 1', position);

    const stackBefore = position.stackManager.getStack(15);
    expect(stackBefore).toBeDefined();
    expect(stackBefore!.carrier.type).toBe('i');
    expect(stackBefore!.carried.length).toBe(2);

    // Create a move
    const move: Move = {
      from: 15,
      to: 26,
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    // Execute permanent move
    makeMovePermanent({
      position,
      move,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    // Verify stack moved
    expect(position.stackManager.hasStack(15)).toBe(false);
    expect(position.stackManager.hasStack(26)).toBe(true);

    // Undo the move
    undoMovePermanent(position, history);

    // Verify stack composition was fully restored
    const stackAfter = position.stackManager.getStack(15);
    expect(stackAfter).toBeDefined();
    expect(stackAfter!.carrier.type).toBe('i');
    expect(stackAfter!.carried.length).toBe(2);
    expect(stackAfter!.carried[0].type).toBe('i');
    expect(stackAfter!.carried[1].type).toBe('i');
  });
});

describe('History - Deploy Sessions', () => {
  let position: BitboardPosition;
  let history: HistoryEntry[];

  beforeEach(() => {
    position = new BitboardPosition();
    history = [];
  });

  it('should handle undo with active deploy session', () => {
    // Set up position with a stack
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4(ii)5/11/11 r 0 1', position);

    const stack = position.stackManager.getStack(15);
    expect(stack).toBeDefined();

    // Initiate a deploy session
    position.deploySessionManager.initiateSession(15, stack!, 'r');
    expect(position.deploySessionManager.hasActiveSession()).toBe(true);

    // Deploy first piece
    const move: Move = {
      from: 15,
      to: 26,
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    // Execute permanent move (first deploy step)
    makeMovePermanent({
      position,
      move,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    // Verify deploy session is still active
    expect(position.deploySessionManager.hasActiveSession()).toBe(true);
    expect(history.length).toBe(1);

    // Undo the move
    const result = undoMovePermanent(position, history);

    // Verify deploy session was restored
    expect(result).toBeDefined();
    expect(position.deploySessionManager.hasActiveSession()).toBe(true);
    const session = position.deploySessionManager.getActiveSession();
    expect(session).toBeDefined();
    expect(session!.deployedMoves.length).toBe(0);
    expect(history.length).toBe(0);
  });

  it('should restore deploy session state correctly', () => {
    // Set up position with a stack of 3 pieces
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4(iii)5/11/11 r 0 1', position);

    const stack = position.stackManager.getStack(15);
    expect(stack).toBeDefined();

    // Initiate deploy session
    position.deploySessionManager.initiateSession(15, stack!, 'r');

    // Deploy first piece
    position.deploySessionManager.deployPiece({ type: 'i', color: 'r' }, 26);

    // Create history entry before second deploy
    const move: Move = {
      from: 15,
      to: 37,
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    makeMovePermanent({
      position,
      move,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    // Verify session has 2 deployed moves
    const sessionBefore = position.deploySessionManager.getActiveSession();
    expect(sessionBefore!.deployedMoves.length).toBe(2);

    // Undo
    undoMovePermanent(position, history);

    // Verify session was restored to 1 deployed move
    const sessionAfter = position.deploySessionManager.getActiveSession();
    expect(sessionAfter).toBeDefined();
    expect(sessionAfter!.deployedMoves.length).toBe(1);
  });

  it('should clear deploy session when undoing to before session started', () => {
    // Set up position with a stack
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4(ii)5/11/11 r 0 1', position);

    // Make a normal move first (no deploy session)
    const normalMove: Move = {
      from: 26,
      to: 37,
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };

    makeMovePermanent({
      position,
      move: normalMove,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 70,
      history
    });

    expect(position.deploySessionManager.hasActiveSession()).toBe(false);
    expect(history.length).toBe(1);

    // Undo to state before any deploy session
    undoMovePermanent(position, history);

    // Verify no deploy session is active
    expect(position.deploySessionManager.hasActiveSession()).toBe(false);
    expect(history.length).toBe(0);
  });
});

describe('History - Multiple Undo Operations', () => {
  let position: BitboardPosition;
  let history: HistoryEntry[];

  beforeEach(() => {
    position = new BitboardPosition();
    history = [];
  });

  it('should handle multiple consecutive undos', () => {
    // Set up a simple position
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    // Make 5 moves
    const moves: Move[] = [
      { from: 15, to: 26, piece: { type: 'i', color: 'r' }, flags: MOVE_FLAGS.NORMAL },
      { from: 26, to: 37, piece: { type: 'i', color: 'r' }, flags: MOVE_FLAGS.NORMAL },
      { from: 37, to: 48, piece: { type: 'i', color: 'r' }, flags: MOVE_FLAGS.NORMAL },
      { from: 48, to: 59, piece: { type: 'i', color: 'r' }, flags: MOVE_FLAGS.NORMAL },
      { from: 59, to: 70, piece: { type: 'i', color: 'r' }, flags: MOVE_FLAGS.NORMAL }
    ];

    // Execute all moves
    for (let i = 0; i < moves.length; i++) {
      makeMovePermanent({
        position,
        move: moves[i],
        turn: 'r',
        halfMoves: i,
        moveNumber: i + 1,
        redCommander: 60,
        blueCommander: 80,
        history
      });
    }

    expect(history.length).toBe(5);
    expect(position.isOccupied(70)).toBe(true);
    expect(position.isOccupied(15)).toBe(false);

    // Undo all moves
    for (let i = 4; i >= 0; i--) {
      const result = undoMovePermanent(position, history);
      expect(result).toBeDefined();
      expect(history.length).toBe(i);
    }

    // Verify we're back to the initial state
    expect(history.length).toBe(0);
    expect(position.isOccupied(15)).toBe(true);
    expect(position.isOccupied(70)).toBe(false);
  });

  it('should maintain correct game state through multiple undos', () => {
    // Set up a simple position
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    // Make 3 moves with different game states
    const moves = [
      {
        move: { from: 15, to: 26, piece: { type: 'i', color: 'r' }, flags: MOVE_FLAGS.NORMAL },
        turn: 'r' as Color,
        halfMoves: 0,
        moveNumber: 1
      },
      {
        move: { from: 26, to: 37, piece: { type: 'i', color: 'r' }, flags: MOVE_FLAGS.NORMAL },
        turn: 'b' as Color,
        halfMoves: 1,
        moveNumber: 1
      },
      {
        move: { from: 37, to: 48, piece: { type: 'i', color: 'r' }, flags: MOVE_FLAGS.NORMAL },
        turn: 'r' as Color,
        halfMoves: 2,
        moveNumber: 2
      }
    ];

    // Execute all moves
    for (const { move, turn, halfMoves, moveNumber } of moves) {
      makeMovePermanent({
        position,
        move,
        turn,
        halfMoves,
        moveNumber,
        redCommander: 60,
        blueCommander: 80,
        history
      });
    }

    // Undo and verify game state is restored correctly
    let result = undoMovePermanent(position, history);
    expect(result?.gameState.turn).toBe('r');
    expect(result?.gameState.halfMoves).toBe(2);
    expect(result?.gameState.moveNumber).toBe(2);

    result = undoMovePermanent(position, history);
    expect(result?.gameState.turn).toBe('b');
    expect(result?.gameState.halfMoves).toBe(1);
    expect(result?.gameState.moveNumber).toBe(1);

    result = undoMovePermanent(position, history);
    expect(result?.gameState.turn).toBe('r');
    expect(result?.gameState.halfMoves).toBe(0);
    expect(result?.gameState.moveNumber).toBe(1);
  });

  it('should handle undo when history is empty', () => {
    // Set up a simple position
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    // Try to undo with no history
    const result = undoMovePermanent(position, history);

    // Should return undefined
    expect(result).toBeUndefined();
    expect(history.length).toBe(0);
  });

  it('should handle alternating moves and undos', () => {
    // Set up a simple position
    const fenData = parseFEN('11/11/11/11/11/11/11/11/11/4i6/11/11 r 0 1', position);

    // Make a move
    const move1: Move = {
      from: 15,
      to: 26,
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };
    makeMovePermanent({
      position,
      move: move1,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 80,
      history
    });

    expect(history.length).toBe(1);
    expect(position.isOccupied(26)).toBe(true);

    // Undo it
    undoMovePermanent(position, history);
    expect(history.length).toBe(0);
    expect(position.isOccupied(15)).toBe(true);

    // Make a different move
    const move2: Move = {
      from: 15,
      to: 37,
      piece: { type: 'i', color: 'r' },
      flags: MOVE_FLAGS.NORMAL
    };
    makeMovePermanent({
      position,
      move: move2,
      turn: 'r',
      halfMoves: 0,
      moveNumber: 1,
      redCommander: 60,
      blueCommander: 80,
      history
    });

    expect(history.length).toBe(1);
    expect(position.isOccupied(37)).toBe(true);
    expect(position.isOccupied(26)).toBe(false);

    // Undo it
    undoMovePermanent(position, history);
    expect(history.length).toBe(0);
    expect(position.isOccupied(15)).toBe(true);
    expect(position.isOccupied(37)).toBe(false);
  });
});
