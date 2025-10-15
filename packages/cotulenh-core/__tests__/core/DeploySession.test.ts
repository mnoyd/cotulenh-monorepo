/**
 * Unit tests for DeploySession
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DeploySession } from '../../src/core/DeploySession'
import { Board } from '../../src/core/Board'
import { pieceUtils } from '../../src/core/Piece'
import { RED, TANK, INFANTRY } from '../../src/types/Constants'

describe('DeploySession', () => {
  let stack: ReturnType<typeof pieceUtils.createStack>

  beforeEach(() => {
    const carrier = pieceUtils.createPiece(RED, TANK)
    const carried = pieceUtils.createPiece(RED, INFANTRY)
    stack = pieceUtils.createStack(carrier, carried)
  })

  describe('constructor', () => {
    it('should create deploy session', () => {
      const session = new DeploySession(0x00, RED, stack)

      expect(session.originalSquare).toBe(0x00)
      expect(session.turn).toBe(RED)
      expect(session.originalPiece).toEqual(stack)
      expect(session.movedPieces).toEqual([])
      expect(session.stay).toBeUndefined()
    })

    it('should accept moved pieces', () => {
      const moved = [pieceUtils.createPiece(RED, INFANTRY)]
      const session = new DeploySession(0x00, RED, stack, moved)

      expect(session.movedPieces).toEqual(moved)
    })

    it('should accept stay pieces', () => {
      const stay = [pieceUtils.createPiece(RED, TANK)]
      const session = new DeploySession(0x00, RED, stack, [], stay)

      expect(session.stay).toEqual(stay)
    })

    it('should clone pieces to prevent mutation', () => {
      const session = new DeploySession(0x00, RED, stack)

      expect(session.originalPiece).not.toBe(stack)
      expect(session.originalPiece).toEqual(stack)
    })
  })

  describe('getEffectivePiece', () => {
    it('should return board piece if no virtual changes', () => {
      const board = Board.createEmpty()
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      board.set(0x10, piece)

      const session = new DeploySession(0x00, RED, stack)

      expect(session.getEffectivePiece(board, 0x10)).toBe(piece)
    })

    it('should return null for empty square', () => {
      const board = Board.createEmpty()
      const session = new DeploySession(0x00, RED, stack)

      expect(session.getEffectivePiece(board, 0x10)).toBeNull()
    })
  })

  describe('getRemainingPieces', () => {
    it('should return all pieces initially', () => {
      const session = new DeploySession(0x00, RED, stack)
      const remaining = session.getRemainingPieces()

      expect(remaining).toHaveLength(2) // Tank + Infantry
    })

    it('should return fewer pieces after some moved', () => {
      const moved = [pieceUtils.createPiece(RED, INFANTRY)]
      const session = new DeploySession(0x00, RED, stack, moved)
      const remaining = session.getRemainingPieces()

      expect(remaining).toHaveLength(1) // Only tank left
    })

    it('should return empty when all accounted for', () => {
      const moved = [
        pieceUtils.createPiece(RED, TANK),
        pieceUtils.createPiece(RED, INFANTRY),
      ]
      const session = new DeploySession(0x00, RED, stack, moved)
      const remaining = session.getRemainingPieces()

      expect(remaining).toHaveLength(0)
    })

    it('should account for stay pieces', () => {
      const moved = [pieceUtils.createPiece(RED, TANK)]
      const stay = [pieceUtils.createPiece(RED, INFANTRY)]
      const session = new DeploySession(0x00, RED, stack, moved, stay)
      const remaining = session.getRemainingPieces()

      expect(remaining).toHaveLength(0) // All accounted for
    })
  })

  describe('isComplete', () => {
    it('should return false initially', () => {
      const session = new DeploySession(0x00, RED, stack)
      expect(session.isComplete()).toBe(false)
    })

    it('should return false with partial moves', () => {
      const moved = [pieceUtils.createPiece(RED, INFANTRY)]
      const session = new DeploySession(0x00, RED, stack, moved)
      expect(session.isComplete()).toBe(false)
    })

    it('should return true when all pieces moved', () => {
      const moved = [
        pieceUtils.createPiece(RED, TANK),
        pieceUtils.createPiece(RED, INFANTRY),
      ]
      const session = new DeploySession(0x00, RED, stack, moved)
      expect(session.isComplete()).toBe(true)
    })

    it('should return true with moved + stay pieces', () => {
      const moved = [pieceUtils.createPiece(RED, TANK)]
      const stay = [pieceUtils.createPiece(RED, INFANTRY)]
      const session = new DeploySession(0x00, RED, stack, moved, stay)
      expect(session.isComplete()).toBe(true)
    })
  })

  describe('clone', () => {
    it('should create independent copy', () => {
      const session = new DeploySession(0x00, RED, stack)
      const cloned = session.clone()

      expect(cloned).not.toBe(session)
      expect(cloned.originalSquare).toBe(session.originalSquare)
      expect(cloned.turn).toBe(session.turn)
    })

    it('should deep clone pieces', () => {
      const moved = [pieceUtils.createPiece(RED, INFANTRY)]
      const session = new DeploySession(0x00, RED, stack, moved)
      const cloned = session.clone()

      expect(cloned.movedPieces).not.toBe(session.movedPieces)
      expect(cloned.movedPieces).toEqual(session.movedPieces)
    })
  })

  describe('withMovedPiece', () => {
    it('should add moved piece', () => {
      const session = new DeploySession(0x00, RED, stack)
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      const newSession = session.withMovedPiece(piece)

      expect(newSession).not.toBe(session)
      expect(newSession.movedPieces).toHaveLength(1)
      expect(newSession.movedPieces[0]).toEqual(piece) // Deep equality, not reference
      expect(session.movedPieces).toHaveLength(0)
    })

    it('should accumulate moved pieces', () => {
      const session1 = new DeploySession(0x00, RED, stack)
      const session2 = session1.withMovedPiece(
        pieceUtils.createPiece(RED, INFANTRY),
      )
      const session3 = session2.withMovedPiece(
        pieceUtils.createPiece(RED, TANK),
      )

      expect(session3.movedPieces).toHaveLength(2)
    })
  })

  describe('withStayPieces', () => {
    it('should set stay pieces', () => {
      const session = new DeploySession(0x00, RED, stack)
      const stay = [pieceUtils.createPiece(RED, INFANTRY)]
      const newSession = session.withStayPieces(stay)

      expect(newSession).not.toBe(session)
      expect(newSession.stay).toEqual(stay)
      expect(session.stay).toBeUndefined()
    })
  })

  describe('create static method', () => {
    it('should create deploy session from stack', () => {
      const session = DeploySession.create(0x00, stack, RED)

      expect(session.originalSquare).toBe(0x00)
      expect(session.turn).toBe(RED)
      expect(session.originalPiece).toEqual(stack)
    })

    it('should throw for non-stack piece', () => {
      const simple = pieceUtils.createPiece(RED, INFANTRY)
      expect(() => DeploySession.create(0x00, simple, RED)).toThrow()
    })
  })

  describe('virtual state management', () => {
    it('should track virtual changes', () => {
      const session = new DeploySession(0x00, RED, stack)
      const board = Board.createEmpty()

      // Add virtual change (simulating piece placement)
      session.addVirtualChange(0x10, pieceUtils.createPiece(RED, INFANTRY))

      expect(session.getEffectivePiece(board, 0x10)?.type).toBe(INFANTRY)
    })

    it('should override board state', () => {
      const board = Board.createEmpty()
      board.set(0x10, pieceUtils.createPiece(RED, TANK))

      const session = new DeploySession(0x00, RED, stack)
      session.addVirtualChange(0x10, pieceUtils.createPiece(RED, INFANTRY))

      expect(session.getEffectivePiece(board, 0x10)?.type).toBe(INFANTRY)
    })

    it('should allow clearing squares virtually', () => {
      const board = Board.createEmpty()
      board.set(0x10, pieceUtils.createPiece(RED, TANK))

      const session = new DeploySession(0x00, RED, stack)
      session.addVirtualChange(0x10, null)

      expect(session.getEffectivePiece(board, 0x10)).toBeNull()
    })
  })
})
