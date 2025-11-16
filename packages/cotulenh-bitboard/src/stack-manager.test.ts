import { describe, it, expect, beforeEach } from 'vitest';
import { StackManager } from './stack-manager';
import { isSet, popCount } from './bitboard';
import type { Piece } from './types';

describe('StackManager', () => {
  let manager: StackManager;

  beforeEach(() => {
    manager = new StackManager();
  });

  describe('Initialization', () => {
    it('should start with empty carrier bitboard', () => {
      expect(popCount(manager.carrierBitboard)).toBe(0);
    });

    it('should start with no stacks', () => {
      expect(manager.getStackCount()).toBe(0);
      expect(manager.getAllStacks()).toEqual([]);
    });

    it('should not have stack at any square initially', () => {
      expect(manager.hasStack(0)).toBe(false);
      expect(manager.hasStack(50)).toBe(false);
      expect(manager.hasStack(131)).toBe(false);
    });
  });

  describe('Stack Creation', () => {
    it('should create a stack with carrier and carried pieces', () => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [{ type: 'i', color: 'r' }];

      manager.createStack(carrier, carried, 50);

      expect(manager.hasStack(50)).toBe(true);
      expect(isSet(manager.carrierBitboard, 50)).toBe(true);
    });

    it('should store stack data correctly', () => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [
        { type: 'i', color: 'r' },
        { type: 'i', color: 'r' }
      ];

      manager.createStack(carrier, carried, 50);

      const stack = manager.getStack(50);
      expect(stack).toBeDefined();
      expect(stack?.square).toBe(50);
      expect(stack?.carrier).toEqual(carrier);
      expect(stack?.carried).toHaveLength(2);
      expect(stack?.carried[0]).toEqual(carried[0]);
      expect(stack?.carried[1]).toEqual(carried[1]);
    });

    it('should create stack with empty carried array', () => {
      const carrier: Piece = { type: 't', color: 'r' };

      manager.createStack(carrier, [], 50);

      const stack = manager.getStack(50);
      expect(stack).toBeDefined();
      expect(stack?.carried).toEqual([]);
    });

    it('should create stack with heroic carrier', () => {
      const carrier: Piece = { type: 't', color: 'r', heroic: true };
      const carried: Piece[] = [{ type: 'i', color: 'r' }];

      manager.createStack(carrier, carried, 50);

      const stack = manager.getStack(50);
      expect(stack?.carrier.heroic).toBe(true);
    });

    it('should create stack with heroic carried pieces', () => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [
        { type: 'i', color: 'r', heroic: true },
        { type: 'i', color: 'r', heroic: false }
      ];

      manager.createStack(carrier, carried, 50);

      const stack = manager.getStack(50);
      expect(stack?.carried[0].heroic).toBe(true);
      expect(stack?.carried[1].heroic).toBe(false);
    });

    it('should throw error if stack already exists at square', () => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [{ type: 'i', color: 'r' }];

      manager.createStack(carrier, carried, 50);

      expect(() => {
        manager.createStack(carrier, carried, 50);
      }).toThrow('Stack already exists at square 50');
    });

    it('should create multiple stacks at different squares', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 10);
      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);
      manager.createStack({ type: 'a', color: 'r' }, [{ type: 'i', color: 'r' }], 100);

      expect(manager.getStackCount()).toBe(3);
      expect(manager.hasStack(10)).toBe(true);
      expect(manager.hasStack(50)).toBe(true);
      expect(manager.hasStack(100)).toBe(true);
      expect(popCount(manager.carrierBitboard)).toBe(3);
    });

    it('should copy carried array to avoid external mutations', () => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [{ type: 'i', color: 'r' }];

      manager.createStack(carrier, carried, 50);

      // Mutate original array
      carried.push({ type: 'i', color: 'r' });

      // Stack should not be affected
      const stack = manager.getStack(50);
      expect(stack?.carried).toHaveLength(1);
    });
  });

  describe('Stack Destruction', () => {
    it('should destroy a stack and return its data', () => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [{ type: 'i', color: 'r' }];

      manager.createStack(carrier, carried, 50);
      const destroyed = manager.destroyStack(50);

      expect(destroyed).toBeDefined();
      expect(destroyed?.square).toBe(50);
      expect(destroyed?.carrier).toEqual(carrier);
      expect(destroyed?.carried).toEqual(carried);
    });

    it('should remove stack from manager', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 50);

      manager.destroyStack(50);

      expect(manager.hasStack(50)).toBe(false);
      expect(manager.getStack(50)).toBeUndefined();
      expect(manager.getStackCount()).toBe(0);
    });

    it('should clear carrier bitboard', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 50);

      manager.destroyStack(50);

      expect(isSet(manager.carrierBitboard, 50)).toBe(false);
      expect(popCount(manager.carrierBitboard)).toBe(0);
    });

    it('should return undefined if no stack exists', () => {
      const destroyed = manager.destroyStack(50);
      expect(destroyed).toBeUndefined();
    });

    it('should only destroy specified stack', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 10);
      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);
      manager.createStack({ type: 'a', color: 'r' }, [{ type: 'i', color: 'r' }], 100);

      manager.destroyStack(50);

      expect(manager.getStackCount()).toBe(2);
      expect(manager.hasStack(10)).toBe(true);
      expect(manager.hasStack(50)).toBe(false);
      expect(manager.hasStack(100)).toBe(true);
    });
  });

  describe('Adding to Stack', () => {
    beforeEach(() => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [{ type: 'i', color: 'r' }];
      manager.createStack(carrier, carried, 50);
    });

    it('should add piece to existing stack', () => {
      const newPiece: Piece = { type: 'i', color: 'r' };

      manager.addToStack(newPiece, 50);

      const stack = manager.getStack(50);
      expect(stack?.carried).toHaveLength(2);
      expect(stack?.carried[1]).toEqual(newPiece);
    });

    it('should add multiple pieces to stack', () => {
      manager.addToStack({ type: 'i', color: 'r' }, 50);
      manager.addToStack({ type: 'i', color: 'r' }, 50);

      const stack = manager.getStack(50);
      expect(stack?.carried).toHaveLength(3);
    });

    it('should add heroic piece to stack', () => {
      const heroicPiece: Piece = { type: 'i', color: 'r', heroic: true };

      manager.addToStack(heroicPiece, 50);

      const stack = manager.getStack(50);
      expect(stack?.carried[1].heroic).toBe(true);
    });

    it('should throw error if no stack exists at square', () => {
      expect(() => {
        manager.addToStack({ type: 'i', color: 'r' }, 99);
      }).toThrow('No stack exists at square 99');
    });

    it('should copy piece to avoid external mutations', () => {
      const piece: Piece = { type: 'i', color: 'r' };

      manager.addToStack(piece, 50);

      // Mutate original piece
      piece.heroic = true;

      // Stack should not be affected
      const stack = manager.getStack(50);
      expect(stack?.carried[1].heroic).toBeUndefined();
    });
  });

  describe('Removing from Stack', () => {
    beforeEach(() => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [
        { type: 'i', color: 'r' },
        { type: 'e', color: 'r' },
        { type: 'i', color: 'r' }
      ];
      manager.createStack(carrier, carried, 50);
    });

    it('should remove first occurrence of piece type', () => {
      const removed = manager.removeFromStack('i', 50);

      expect(removed).toBeDefined();
      expect(removed?.type).toBe('i');

      const stack = manager.getStack(50);
      expect(stack?.carried).toHaveLength(2);
      expect(stack?.carried[0].type).toBe('e');
      expect(stack?.carried[1].type).toBe('i');
    });

    it('should remove specific piece type', () => {
      const removed = manager.removeFromStack('e', 50);

      expect(removed?.type).toBe('e');

      const stack = manager.getStack(50);
      expect(stack?.carried).toHaveLength(2);
      expect(stack?.carried.every((p) => p.type === 'i')).toBe(true);
    });

    it('should return undefined if piece type not found', () => {
      const removed = manager.removeFromStack('a', 50);

      expect(removed).toBeUndefined();

      const stack = manager.getStack(50);
      expect(stack?.carried).toHaveLength(3);
    });

    it('should throw error if no stack exists at square', () => {
      expect(() => {
        manager.removeFromStack('i', 99);
      }).toThrow('No stack exists at square 99');
    });

    it('should handle removing all carried pieces', () => {
      manager.removeFromStack('i', 50);
      manager.removeFromStack('e', 50);
      manager.removeFromStack('i', 50);

      const stack = manager.getStack(50);
      expect(stack?.carried).toHaveLength(0);
      // Stack still exists with carrier
      expect(manager.hasStack(50)).toBe(true);
    });

    it('should preserve heroic status of removed piece', () => {
      manager.destroyStack(50);
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [{ type: 'i', color: 'r', heroic: true }];
      manager.createStack(carrier, carried, 50);

      const removed = manager.removeFromStack('i', 50);

      expect(removed?.heroic).toBe(true);
    });
  });

  describe('Stack Validation', () => {
    describe('Valid Compositions', () => {
      it('should validate empty carried array', () => {
        const carrier: Piece = { type: 't', color: 'r' };
        const carried: Piece[] = [];

        expect(manager.validateStackComposition(carrier, carried)).toBe(true);
      });

      it('should validate tank carrying infantry', () => {
        const carrier: Piece = { type: 't', color: 'r' };
        const carried: Piece[] = [{ type: 'i', color: 'r' }];

        expect(manager.validateStackComposition(carrier, carried)).toBe(true);
      });

      it('should use PieceStacker for validation', () => {
        // Test that validation delegates to PieceStacker
        // The specific rules are tested in PieceStacker tests
        const carrier: Piece = { type: 't', color: 'r' };
        const carried: Piece[] = [{ type: 'i', color: 'r' }];

        const result = manager.validateStackComposition(carrier, carried);
        expect(typeof result).toBe('boolean');
      });
    });

    describe('Invalid Compositions', () => {
      it('should reject mixed colors', () => {
        const carrier: Piece = { type: 't', color: 'r' };
        const carried: Piece[] = [{ type: 'i', color: 'b' }];

        expect(manager.validateStackComposition(carrier, carried)).toBe(false);
      });

      it('should reject stack exceeding size limit', () => {
        const carrier: Piece = { type: 't', color: 'r' };
        const carried: Piece[] = [
          { type: 'i', color: 'r' },
          { type: 'i', color: 'r' },
          { type: 'i', color: 'r' },
          { type: 'i', color: 'r' }
        ];

        expect(manager.validateStackComposition(carrier, carried)).toBe(false);
      });

      it('should reject invalid piece combinations', () => {
        const carrier: Piece = { type: 'i', color: 'r' };
        const carried: Piece[] = [{ type: 'i', color: 'r' }];

        // Infantry cannot carry other infantry (not a valid combination)
        expect(manager.validateStackComposition(carrier, carried)).toBe(false);
      });
    });

    describe('Validate Add to Stack', () => {
      beforeEach(() => {
        const carrier: Piece = { type: 't', color: 'r' };
        const carried: Piece[] = [{ type: 'i', color: 'r' }];
        manager.createStack(carrier, carried, 50);
      });

      it('should check color compatibility', () => {
        const samePiece: Piece = { type: 'i', color: 'r' };
        const diffPiece: Piece = { type: 'i', color: 'b' };

        // Same color should pass color check (may fail on other rules)
        const sameResult = manager.validateAddToStack(samePiece, 50);
        expect(typeof sameResult).toBe('boolean');

        // Different color should always fail
        expect(manager.validateAddToStack(diffPiece, 50)).toBe(false);
      });

      it('should reject adding piece of different color', () => {
        const piece: Piece = { type: 'i', color: 'b' };

        expect(manager.validateAddToStack(piece, 50)).toBe(false);
      });

      it('should reject adding piece that would exceed size limit', () => {
        // Add pieces to reach limit
        manager.addToStack({ type: 'i', color: 'r' }, 50);
        manager.addToStack({ type: 'i', color: 'r' }, 50);

        // Now stack has 4 pieces (1 carrier + 3 carried)
        const piece: Piece = { type: 'i', color: 'r' };

        expect(manager.validateAddToStack(piece, 50)).toBe(false);
      });

      it('should return false if no stack exists', () => {
        const piece: Piece = { type: 'i', color: 'r' };

        expect(manager.validateAddToStack(piece, 99)).toBe(false);
      });
    });
  });

  describe('Query Operations', () => {
    it('should check if square has stack', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 50);

      expect(manager.hasStack(50)).toBe(true);
      expect(manager.hasStack(51)).toBe(false);
    });

    it('should get stack data', () => {
      const carrier: Piece = { type: 't', color: 'r' };
      const carried: Piece[] = [{ type: 'i', color: 'r' }];
      manager.createStack(carrier, carried, 50);

      const stack = manager.getStack(50);

      expect(stack).toBeDefined();
      expect(stack?.square).toBe(50);
      expect(stack?.carrier).toEqual(carrier);
      expect(stack?.carried).toEqual(carried);
    });

    it('should return undefined for non-existent stack', () => {
      expect(manager.getStack(50)).toBeUndefined();
    });

    it('should get all stacks', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 10);
      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);

      const allStacks = manager.getAllStacks();

      expect(allStacks).toHaveLength(2);
      expect(allStacks.some((s) => s.square === 10)).toBe(true);
      expect(allStacks.some((s) => s.square === 50)).toBe(true);
    });

    it('should get stack count', () => {
      expect(manager.getStackCount()).toBe(0);

      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 10);
      expect(manager.getStackCount()).toBe(1);

      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);
      expect(manager.getStackCount()).toBe(2);

      manager.destroyStack(10);
      expect(manager.getStackCount()).toBe(1);
    });
  });

  describe('Clear Operation', () => {
    it('should clear all stacks', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 10);
      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);
      manager.createStack({ type: 'a', color: 'r' }, [{ type: 'i', color: 'r' }], 100);

      manager.clear();

      expect(manager.getStackCount()).toBe(0);
      expect(manager.getAllStacks()).toEqual([]);
      expect(popCount(manager.carrierBitboard)).toBe(0);
    });

    it('should allow creating stacks after clear', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 50);
      manager.clear();

      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);

      expect(manager.hasStack(50)).toBe(true);
      expect(manager.getStackCount()).toBe(1);
    });
  });

  describe('Integration with Bitboards', () => {
    it('should sync carrier bitboard with stack creation', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 50);

      expect(isSet(manager.carrierBitboard, 50)).toBe(true);
      expect(manager.hasStack(50)).toBe(true);
    });

    it('should sync carrier bitboard with stack destruction', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 50);
      manager.destroyStack(50);

      expect(isSet(manager.carrierBitboard, 50)).toBe(false);
      expect(manager.hasStack(50)).toBe(false);
    });

    it('should maintain carrier bitboard for multiple stacks', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 10);
      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);
      manager.createStack({ type: 'a', color: 'r' }, [{ type: 'i', color: 'r' }], 100);

      expect(isSet(manager.carrierBitboard, 10)).toBe(true);
      expect(isSet(manager.carrierBitboard, 50)).toBe(true);
      expect(isSet(manager.carrierBitboard, 100)).toBe(true);
      expect(popCount(manager.carrierBitboard)).toBe(3);
    });

    it('should update carrier bitboard when destroying one of multiple stacks', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 10);
      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);
      manager.createStack({ type: 'a', color: 'r' }, [{ type: 'i', color: 'r' }], 100);

      manager.destroyStack(50);

      expect(isSet(manager.carrierBitboard, 10)).toBe(true);
      expect(isSet(manager.carrierBitboard, 50)).toBe(false);
      expect(isSet(manager.carrierBitboard, 100)).toBe(true);
      expect(popCount(manager.carrierBitboard)).toBe(2);
    });

    it('should clear carrier bitboard on clear', () => {
      manager.createStack({ type: 't', color: 'r' }, [{ type: 'i', color: 'r' }], 10);
      manager.createStack({ type: 't', color: 'b' }, [{ type: 'i', color: 'b' }], 50);

      manager.clear();

      expect(popCount(manager.carrierBitboard)).toBe(0);
      expect(isSet(manager.carrierBitboard, 10)).toBe(false);
      expect(isSet(manager.carrierBitboard, 50)).toBe(false);
    });
  });
});
