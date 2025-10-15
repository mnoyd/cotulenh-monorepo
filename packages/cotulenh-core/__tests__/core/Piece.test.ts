/**
 * Unit tests for Piece utilities
 */

import { describe, it, expect } from 'vitest'
import { pieceUtils } from '../../src/core/Piece'
import { RED, BLUE, INFANTRY, TANK, COMMANDER } from '../../src/types/Constants'
import type { Piece } from '../../src/types/Piece'

describe('PieceUtils', () => {
  describe('createPiece', () => {
    it('should create a simple piece', () => {
      const piece = pieceUtils.createPiece(RED, INFANTRY)

      expect(piece.color).toBe(RED)
      expect(piece.type).toBe(INFANTRY)
      expect(piece.heroic).toBeUndefined()
      expect(piece.carrying).toBeUndefined()
    })

    it('should create a heroic piece', () => {
      const piece = pieceUtils.createPiece(BLUE, TANK, true)

      expect(piece.color).toBe(BLUE)
      expect(piece.type).toBe(TANK)
      expect(piece.heroic).toBe(true)
    })

    it('should not add heroic property if false', () => {
      const piece = pieceUtils.createPiece(RED, COMMANDER, false)

      expect(piece.heroic).toBeUndefined()
    })
  })

  describe('createStack', () => {
    it('should create stack with single carried piece', () => {
      const carrier = pieceUtils.createPiece(RED, TANK)
      const carried = pieceUtils.createPiece(RED, INFANTRY)

      const stack = pieceUtils.createStack(carrier, carried)

      expect(stack.color).toBe(RED)
      expect(stack.type).toBe(TANK)
      expect(stack.carrying).toHaveLength(1)
      expect(stack.carrying![0].type).toBe(INFANTRY)
    })

    it('should create stack with multiple carried pieces', () => {
      const carrier = pieceUtils.createPiece(BLUE, TANK)
      const carried = [
        pieceUtils.createPiece(BLUE, INFANTRY),
        pieceUtils.createPiece(BLUE, INFANTRY),
      ]

      const stack = pieceUtils.createStack(carrier, carried)

      expect(stack.carrying).toHaveLength(2)
      expect(stack.carrying![0].type).toBe(INFANTRY)
      expect(stack.carrying![1].type).toBe(INFANTRY)
    })

    it('should preserve heroic status of carrier', () => {
      const carrier = pieceUtils.createPiece(RED, TANK, true)
      const carried = pieceUtils.createPiece(RED, INFANTRY)

      const stack = pieceUtils.createStack(carrier, carried)

      expect(stack.heroic).toBe(true)
      expect(stack.carrying![0].heroic).toBeUndefined()
    })
  })

  describe('flattenStack', () => {
    it('should flatten simple piece to single element', () => {
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      const flattened = pieceUtils.flattenStack(piece)

      expect(flattened).toHaveLength(1)
      expect(flattened[0].type).toBe(INFANTRY)
      expect(flattened[0].carrying).toBeUndefined()
    })

    it('should flatten 2-piece stack', () => {
      const carrier = pieceUtils.createPiece(RED, TANK)
      const carried = pieceUtils.createPiece(RED, INFANTRY)
      const stack = pieceUtils.createStack(carrier, carried)

      const flattened = pieceUtils.flattenStack(stack)

      expect(flattened).toHaveLength(2)
      expect(flattened[0].type).toBe(TANK)
      expect(flattened[1].type).toBe(INFANTRY)
    })

    it('should flatten 3-piece stack', () => {
      const carrier = pieceUtils.createPiece(BLUE, TANK)
      const carried = [
        pieceUtils.createPiece(BLUE, INFANTRY),
        pieceUtils.createPiece(BLUE, INFANTRY),
      ]
      const stack = pieceUtils.createStack(carrier, carried)

      const flattened = pieceUtils.flattenStack(stack)

      expect(flattened).toHaveLength(3)
      expect(flattened[0].type).toBe(TANK)
      expect(flattened[1].type).toBe(INFANTRY)
      expect(flattened[2].type).toBe(INFANTRY)
    })

    it('should not include carrying arrays in flattened pieces', () => {
      const carrier = pieceUtils.createPiece(RED, TANK)
      const carried = pieceUtils.createPiece(RED, INFANTRY)
      const stack = pieceUtils.createStack(carrier, carried)

      const flattened = pieceUtils.flattenStack(stack)

      expect(flattened[0].carrying).toBeUndefined()
      expect(flattened[1].carrying).toBeUndefined()
    })

    it('should preserve heroic status only for carrier', () => {
      const carrier = pieceUtils.createPiece(RED, TANK, true)
      const carried = pieceUtils.createPiece(RED, INFANTRY)
      const stack = pieceUtils.createStack(carrier, carried)

      const flattened = pieceUtils.flattenStack(stack)

      expect(flattened[0].heroic).toBe(true)
      expect(flattened[1].heroic).toBeUndefined()
    })
  })

  describe('getStackSize', () => {
    it('should return 1 for simple piece', () => {
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      expect(pieceUtils.getStackSize(piece)).toBe(1)
    })

    it('should return 2 for 2-piece stack', () => {
      const carrier = pieceUtils.createPiece(RED, TANK)
      const carried = pieceUtils.createPiece(RED, INFANTRY)
      const stack = pieceUtils.createStack(carrier, carried)

      expect(pieceUtils.getStackSize(stack)).toBe(2)
    })

    it('should return 3 for 3-piece stack', () => {
      const carrier = pieceUtils.createPiece(BLUE, TANK)
      const carried = [
        pieceUtils.createPiece(BLUE, INFANTRY),
        pieceUtils.createPiece(BLUE, INFANTRY),
      ]
      const stack = pieceUtils.createStack(carrier, carried)

      expect(pieceUtils.getStackSize(stack)).toBe(3)
    })
  })

  describe('isStack', () => {
    it('should return false for simple piece', () => {
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      expect(pieceUtils.isStack(piece)).toBe(false)
    })

    it('should return false for piece with empty carrying array', () => {
      const piece: Piece = { color: RED, type: INFANTRY, carrying: [] }
      expect(pieceUtils.isStack(piece)).toBe(false)
    })

    it('should return true for stack', () => {
      const carrier = pieceUtils.createPiece(RED, TANK)
      const carried = pieceUtils.createPiece(RED, INFANTRY)
      const stack = pieceUtils.createStack(carrier, carried)

      expect(pieceUtils.isStack(stack)).toBe(true)
    })
  })

  describe('clonePiece', () => {
    it('should deep clone simple piece', () => {
      const original = pieceUtils.createPiece(RED, INFANTRY, true)
      const cloned = pieceUtils.clonePiece(original)

      expect(cloned).not.toBe(original)
      expect(cloned.color).toBe(original.color)
      expect(cloned.type).toBe(original.type)
      expect(cloned.heroic).toBe(original.heroic)
    })

    it('should deep clone stack', () => {
      const carrier = pieceUtils.createPiece(RED, TANK)
      const carried = pieceUtils.createPiece(RED, INFANTRY)
      const original = pieceUtils.createStack(carrier, carried)

      const cloned = pieceUtils.clonePiece(original)

      expect(cloned).not.toBe(original)
      expect(cloned.carrying).not.toBe(original.carrying)
      expect(cloned.carrying![0]).not.toBe(original.carrying![0])
      expect(cloned.type).toBe(original.type)
      expect(cloned.carrying![0].type).toBe(original.carrying![0].type)
    })

    it('should not share references after cloning', () => {
      const carrier = pieceUtils.createPiece(RED, TANK)
      const carried = pieceUtils.createPiece(RED, INFANTRY)
      const original = pieceUtils.createStack(carrier, carried)

      const cloned = pieceUtils.clonePiece(original)

      // Modify cloned
      cloned.carrying![0] = pieceUtils.createPiece(BLUE, COMMANDER)

      // Original should be unchanged
      expect(original.carrying![0].type).toBe(INFANTRY)
      expect(original.carrying![0].color).toBe(RED)
    })
  })

  describe('piecesEqual', () => {
    it('should return true for identical simple pieces', () => {
      const p1 = pieceUtils.createPiece(RED, INFANTRY)
      const p2 = pieceUtils.createPiece(RED, INFANTRY)

      expect(pieceUtils.piecesEqual(p1, p2)).toBe(true)
    })

    it('should return false for different colors', () => {
      const p1 = pieceUtils.createPiece(RED, INFANTRY)
      const p2 = pieceUtils.createPiece(BLUE, INFANTRY)

      expect(pieceUtils.piecesEqual(p1, p2)).toBe(false)
    })

    it('should return false for different types', () => {
      const p1 = pieceUtils.createPiece(RED, INFANTRY)
      const p2 = pieceUtils.createPiece(RED, TANK)

      expect(pieceUtils.piecesEqual(p1, p2)).toBe(false)
    })

    it('should return false for different heroic status', () => {
      const p1 = pieceUtils.createPiece(RED, TANK, true)
      const p2 = pieceUtils.createPiece(RED, TANK, false)

      expect(pieceUtils.piecesEqual(p1, p2)).toBe(false)
    })

    it('should return true for identical stacks', () => {
      const carrier1 = pieceUtils.createPiece(RED, TANK)
      const carried1 = pieceUtils.createPiece(RED, INFANTRY)
      const stack1 = pieceUtils.createStack(carrier1, carried1)

      const carrier2 = pieceUtils.createPiece(RED, TANK)
      const carried2 = pieceUtils.createPiece(RED, INFANTRY)
      const stack2 = pieceUtils.createStack(carrier2, carried2)

      expect(pieceUtils.piecesEqual(stack1, stack2)).toBe(true)
    })

    it('should return false for stacks with different carried pieces', () => {
      const carrier1 = pieceUtils.createPiece(RED, TANK)
      const carried1 = pieceUtils.createPiece(RED, INFANTRY)
      const stack1 = pieceUtils.createStack(carrier1, carried1)

      const carrier2 = pieceUtils.createPiece(RED, TANK)
      const carried2 = pieceUtils.createPiece(RED, COMMANDER)
      const stack2 = pieceUtils.createStack(carrier2, carried2)

      expect(pieceUtils.piecesEqual(stack1, stack2)).toBe(false)
    })

    it('should return false for different stack sizes', () => {
      const carrier1 = pieceUtils.createPiece(RED, TANK)
      const carried1 = pieceUtils.createPiece(RED, INFANTRY)
      const stack1 = pieceUtils.createStack(carrier1, carried1)

      const carrier2 = pieceUtils.createPiece(RED, TANK)
      const carried2 = [
        pieceUtils.createPiece(RED, INFANTRY),
        pieceUtils.createPiece(RED, INFANTRY),
      ]
      const stack2 = pieceUtils.createStack(carrier2, carried2)

      expect(pieceUtils.piecesEqual(stack1, stack2)).toBe(false)
    })
  })
})
