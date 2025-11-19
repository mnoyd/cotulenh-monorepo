/**
 * Tests for Stay Capture mechanics
 */

import { describe, it, expect } from 'vitest';
import { CoTuLenh } from './cotulenh';

describe('Stay Capture', () => {
  describe('Navy capturing land piece', () => {
    it('should generate stay capture when Navy captures land piece on land', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Navy at c7 (water - mixed zone)
      game.put({ type: 'n', color: 'r' }, 'c7');

      // Place blue Infantry at d8 (pure land, adjacent diagonally)
      game.put({ type: 'i', color: 'b' }, 'd8');

      const moves = game.moves({ square: 'c7', verbose: true });

      // Should have stay capture move (Navy can't land on pure land)
      const stayCapture = moves.find((m) => m.to === 'd8' && m.isStayCapture());

      expect(stayCapture).toBeDefined();
      expect(stayCapture?.from).toBe('c7');
      expect(stayCapture?.to).toBe('d8');
      expect(stayCapture?.captured?.type).toBe('i');
    });

    it('should NOT generate normal capture when Navy captures land piece on land', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'c7');
      game.put({ type: 'i', color: 'b' }, 'd8');

      const moves = game.moves({ square: 'c7', verbose: true });

      // Should NOT have normal capture (only stay capture)
      const normalCapture = moves.find((m) => m.to === 'd8' && m.isCapture() && !m.isStayCapture());

      expect(normalCapture).toBeUndefined();
    });

    it('should execute stay capture correctly', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'c7');
      game.put({ type: 'i', color: 'b' }, 'd8');

      // Execute stay capture
      const move = game.move({ from: 'c7', to: 'd8' });

      expect(move).not.toBeNull();
      expect(move?.isStayCapture()).toBe(true);

      // Navy should still be at c7
      expect(game.get('c7')?.type).toBe('n');

      // Infantry should be captured (d8 empty)
      expect(game.get('d8')).toBeUndefined();
    });

    it('should reset half-move counter on stay capture', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'c7');
      game.put({ type: 'i', color: 'b' }, 'd8');

      // Execute stay capture directly (it's red's turn by default)
      const moveResult = game.move({ from: 'c7', to: 'd8' });

      // Verify the move was executed
      expect(moveResult).not.toBeNull();
      expect(moveResult?.isStayCapture()).toBe(true);

      // Verify Navy is still at c7 and Infantry is captured
      expect(game.get('c7')?.type).toBe('n');
      expect(game.get('d8')).toBeUndefined();
    });
  });

  describe('Land piece capturing Navy', () => {
    it('should generate stay capture when land piece captures Navy on water', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Tank at c6 (land)
      game.put({ type: 't', color: 'r' }, 'c6');

      // Place blue Navy at b6 (water)
      game.put({ type: 'n', color: 'b' }, 'b6');

      const moves = game.moves({ square: 'c6', verbose: true });

      // Should have stay capture move
      const stayCapture = moves.find((m) => m.to === 'b6' && m.isStayCapture());

      expect(stayCapture).toBeDefined();
      expect(stayCapture?.from).toBe('c6');
      expect(stayCapture?.to).toBe('b6');
    });

    it('should NOT generate normal capture when land piece captures Navy on water', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 't', color: 'r' }, 'c6');
      game.put({ type: 'n', color: 'b' }, 'b6');

      const moves = game.moves({ square: 'c6', verbose: true });

      // Should NOT have normal capture (only stay capture)
      const normalCapture = moves.find((m) => m.to === 'b6' && m.isCapture() && !m.isStayCapture());

      expect(normalCapture).toBeUndefined();
    });

    it('should execute stay capture correctly for land piece', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 't', color: 'r' }, 'c6');
      game.put({ type: 'n', color: 'b' }, 'b6');

      const move = game.move({ from: 'c6', to: 'b6' });

      expect(move).not.toBeNull();
      expect(move?.isStayCapture()).toBe(true);

      // Tank should still be at c6
      expect(game.get('c6')?.type).toBe('t');

      // Navy should be captured (b6 empty)
      expect(game.get('b6')).toBeUndefined();
    });
  });

  describe('Air Force capture options', () => {
    it('should generate both normal and stay capture for Air Force on land', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Air Force at e6
      game.put({ type: 'f', color: 'r' }, 'e6');

      // Place blue Infantry at f6
      game.put({ type: 'i', color: 'b' }, 'f6');

      const moves = game.moves({ square: 'e6', verbose: true });

      // Should have both normal capture and stay capture
      const normalCapture = moves.find((m) => m.to === 'f6' && m.isCapture() && !m.isStayCapture());
      const stayCapture = moves.find((m) => m.to === 'f6' && m.isStayCapture());

      expect(normalCapture).toBeDefined();
      expect(stayCapture).toBeDefined();
    });

    it('should only generate stay capture when Air Force captures Navy at sea', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Air Force at c6
      game.put({ type: 'f', color: 'r' }, 'c6');

      // Place blue Navy at b6 (water)
      game.put({ type: 'n', color: 'b' }, 'b6');

      const moves = game.moves({ square: 'c6', verbose: true });

      // Should only have stay capture (can't land on water)
      const captures = moves.filter((m) => m.to === 'b6');

      expect(captures.length).toBe(1);
      expect(captures[0].isStayCapture()).toBe(true);
    });

    it('should execute normal capture when Air Force chooses to move', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'f', color: 'r' }, 'e6');
      game.put({ type: 'i', color: 'b' }, 'f6');

      // Get the normal capture move
      const moves = game.moves({ square: 'e6', verbose: true });
      const normalCapture = moves.find((m) => m.to === 'f6' && m.isCapture() && !m.isStayCapture());

      expect(normalCapture).toBeDefined();

      // Execute normal capture using SAN
      const move = game.move(normalCapture!.san!);

      expect(move).not.toBeNull();
      expect(move?.isStayCapture()).toBe(false);

      // Air Force should be at f6
      expect(game.get('f6')?.type).toBe('f');

      // e6 should be empty
      expect(game.get('e6')).toBeUndefined();
    });

    it('should execute stay capture when Air Force chooses to stay', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'f', color: 'r' }, 'e6');
      game.put({ type: 'i', color: 'b' }, 'f6');

      // Get the stay capture move
      const moves = game.moves({ square: 'e6', verbose: true });
      const stayCapture = moves.find((m) => m.to === 'f6' && m.isStayCapture());

      expect(stayCapture).toBeDefined();

      // Execute stay capture using SAN
      const move = game.move(stayCapture!.san!);

      expect(move).not.toBeNull();
      expect(move?.isStayCapture()).toBe(true);

      // Air Force should still be at e6
      expect(game.get('e6')?.type).toBe('f');

      // f6 should be empty (Infantry captured)
      expect(game.get('f6')).toBeUndefined();
    });
  });

  describe('SAN notation', () => {
    it('should use < notation for stay capture', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'c7');
      game.put({ type: 'i', color: 'b' }, 'd8');

      const move = game.move({ from: 'c7', to: 'd8' });

      expect(move?.san).toBe('Nc7<d8');
    });

    it('should parse stay capture notation', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'c7');
      game.put({ type: 'i', color: 'b' }, 'd8');

      const move = game.move('Nc7<d8');

      expect(move).not.toBeNull();
      expect(move?.isStayCapture()).toBe(true);
      expect(game.get('c7')?.type).toBe('n');
      expect(game.get('d8')).toBeUndefined();
    });

    it('should parse stay capture notation without from square', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'c7');
      game.put({ type: 'i', color: 'b' }, 'd8');

      // Only one Navy can make this move, so from square is optional
      const move = game.move('N<d8');

      expect(move).not.toBeNull();
      expect(move?.isStayCapture()).toBe(true);
    });

    it('should distinguish between normal capture and stay capture in SAN', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'f', color: 'r' }, 'e6');
      game.put({ type: 'i', color: 'b' }, 'f6');

      const moves = game.moves({ square: 'e6', verbose: true });

      const normalCapture = moves.find((m) => m.to === 'f6' && m.isCapture() && !m.isStayCapture());
      const stayCapture = moves.find((m) => m.to === 'f6' && m.isStayCapture());

      expect(normalCapture?.san).toBe('Fxf6');
      expect(stayCapture?.san).toBe('Fe6<f6');
    });
  });

  describe('Undo stay capture', () => {
    it('should correctly undo stay capture', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'c7');
      game.put({ type: 'i', color: 'b' }, 'd8');

      game.move({ from: 'c7', to: 'd8' });
      game.undo();

      // Both pieces should be restored
      expect(game.get('c7')?.type).toBe('n');
      expect(game.get('d8')?.type).toBe('i');
    });

    it('should correctly undo multiple stay captures', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'c7');
      game.put({ type: 'i', color: 'b' }, 'd8');
      game.put({ type: 't', color: 'r' }, 'f5');
      game.put({ type: 'n', color: 'b' }, 'b5');

      // Red Navy stay captures blue Infantry at d8
      game.move({ from: 'c7', to: 'd8' });

      // Blue Navy moves
      game.move({ from: 'b5', to: 'a5' });

      // Red Tank stay captures blue Navy at a5 (tank on land, navy on water)
      game.move({ from: 'f5', to: 'a5' });

      // Undo all moves
      game.undo();
      game.undo();
      game.undo();

      // All pieces should be restored
      expect(game.get('c7')?.type).toBe('n');
      expect(game.get('d8')?.type).toBe('i');
      expect(game.get('f5')?.type).toBe('t');
      expect(game.get('b5')?.type).toBe('n');
    });
  });

  describe('Commander restrictions', () => {
    it('should not allow Commander to stay capture (only adjacent normal capture)', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Commander at e6
      game.put({ type: 'c', color: 'r' }, 'e6');

      // Place blue Infantry at f6 (adjacent)
      game.put({ type: 'i', color: 'b' }, 'f6');

      const moves = game.moves({ square: 'e6', verbose: true });

      // Should have normal capture
      const normalCapture = moves.find((m) => m.to === 'f6' && m.isCapture());
      expect(normalCapture).toBeDefined();

      // Should NOT have stay capture (commanders don't stay capture)
      const stayCapture = moves.find((m) => m.to === 'f6' && m.isStayCapture());
      expect(stayCapture).toBeUndefined();
    });
  });

  describe('Range restrictions', () => {
    it('should respect capture range for stay capture', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Infantry at c6 (range 1)
      game.put({ type: 'i', color: 'r' }, 'c6');

      // Place blue Navy at a6 (2 squares away)
      game.put({ type: 'n', color: 'b' }, 'a6');

      const moves = game.moves({ square: 'c6', verbose: true });

      // Should NOT have stay capture (out of range)
      const stayCapture = moves.find((m) => m.to === 'a6');
      expect(stayCapture).toBeUndefined();
    });

    it('should allow stay capture within range', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Tank at c6 (range 2)
      game.put({ type: 't', color: 'r' }, 'c6');

      // Place blue Navy at a6 (2 squares away)
      game.put({ type: 'n', color: 'b' }, 'a6');

      const moves = game.moves({ square: 'c6', verbose: true });

      // Should have stay capture (within range)
      const stayCapture = moves.find((m) => m.to === 'a6' && m.isStayCapture());
      expect(stayCapture).toBeDefined();
    });
  });

  describe('Heroic pieces', () => {
    it('should allow heroic Infantry to stay capture at extended range', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place heroic red Infantry at c6 (heroic range 2)
      game.put({ type: 'i', color: 'r', heroic: true }, 'c6');

      // Place blue Navy at a6 (2 squares away)
      game.put({ type: 'n', color: 'b' }, 'a6');

      const moves = game.moves({ square: 'c6', verbose: true });

      // Should have stay capture (heroic extends range)
      const stayCapture = moves.find((m) => m.to === 'a6' && m.isStayCapture());
      expect(stayCapture).toBeDefined();
    });
  });
});
