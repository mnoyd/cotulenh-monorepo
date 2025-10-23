// __tests__/deploy-session.test.ts

import { describe, it, expect } from 'vitest'
import { DeploySession } from '../src/deploy-session.js'
import {
  BITS,
  RED,
  BLUE,
  NAVY,
  AIR_FORCE,
  TANK,
  INFANTRY,
} from '../src/type.js'
import type { Piece, InternalMove } from '../src/type.js'

describe('DeploySession', () => {
  // Helper to create a test piece
  const createPiece = (type: string, carrying?: Piece[]): Piece => ({
    color: RED,
    type: type as any,
    carrying,
  })

  // Helper to create a test move
  const createMove = (
    from: number,
    to: number,
    piece: Piece,
    flags = BITS.DEPLOY,
  ): InternalMove => ({
    color: RED,
    from,
    to,
    piece,
    flags,
  })

  describe('Constructor', () => {
    it('should create a session with required fields', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      expect(session.stackSquare).toBe(0x92)
      expect(session.turn).toBe(RED)
      expect(session.originalPiece).toEqual(originalPiece)
      expect(session.startFEN).toBe('test-fen')
      expect(session.actions).toEqual([])
      expect(session.stayPieces).toBeUndefined()
    })

    it('should accept optional actions and stayPieces', () => {
      const originalPiece = createPiece(NAVY)
      const actions = [createMove(0x92, 0x72, createPiece(NAVY))]
      const stayPieces = [createPiece(TANK)]

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
        actions,
        stayPieces,
      })

      expect(session.actions).toEqual(actions)
      expect(session.stayPieces).toEqual(stayPieces)
    })
  })

  describe('getRemainingPieces', () => {
    it('should return original piece when no moves made', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      const remaining = session.getRemainingPieces()
      expect(remaining).toEqual(originalPiece)
    })

    it('should calculate remaining after one piece deployed', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      // Deploy Navy
      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))

      const remaining = session.getRemainingPieces()
      expect(remaining).toBeTruthy()
      expect(remaining?.type).toBe(AIR_FORCE)
      expect(remaining?.carrying).toHaveLength(1)
      expect(remaining?.carrying?.[0].type).toBe(TANK)
    })

    it('should return null when all pieces deployed', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      // Deploy all pieces
      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE)))
      session.addMove(createMove(0x92, 0x93, createPiece(TANK)))

      const remaining = session.getRemainingPieces()
      expect(remaining).toBeNull()
    })

    it('should only count moves from the stack square', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      // Deploy Navy from stack
      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))

      // Add a move from different square (shouldn't affect remaining)
      session.addMove(createMove(0x72, 0x73, createPiece(NAVY)))

      const remaining = session.getRemainingPieces()
      expect(remaining).toBeTruthy()
      expect(remaining?.type).toBe(AIR_FORCE)
    })

    it('should only count moves with DEPLOY flag', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      // Add a non-deploy move (shouldn't affect remaining)
      session.addMove(createMove(0x92, 0x72, createPiece(NAVY), BITS.NORMAL))

      const remaining = session.getRemainingPieces()
      expect(remaining).toEqual(originalPiece) // Should be unchanged
    })
  })

  describe('getDeployedSquares', () => {
    it('should return empty array when no moves made', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      expect(session.getDeployedSquares()).toEqual([])
    })

    it('should return squares where pieces were deployed', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE)))
      session.addMove(createMove(0x92, 0x93, createPiece(TANK)))

      const squares = session.getDeployedSquares()
      expect(squares).toHaveLength(3)
      expect(squares).toContain(0x72)
      expect(squares).toContain(0x82)
      expect(squares).toContain(0x93)
    })

    it('should not duplicate squares if multiple pieces go to same square', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      // Both pieces to same square (recombine scenario)
      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))
      session.addMove(createMove(0x92, 0x72, createPiece(AIR_FORCE)))

      const squares = session.getDeployedSquares()
      expect(squares).toHaveLength(1)
      expect(squares[0]).toBe(0x72)
    })
  })

  describe('addMove and undoLastMove', () => {
    it('should add moves to actions array', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      const move = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move)

      expect(session.actions).toHaveLength(1)
      expect(session.actions[0]).toEqual(move)
    })

    it('should undo last move', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))

      session.addMove(move1)
      session.addMove(move2)

      const undone = session.undoLastMove()

      expect(undone).toEqual(move2)
      expect(session.actions).toHaveLength(1)
      expect(session.actions[0]).toEqual(move1)
    })

    it('should return null when undoing empty session', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      const undone = session.undoLastMove()
      expect(undone).toBeNull()
    })
  })

  describe('canCommit', () => {
    it('should return false when no moves made', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      expect(session.canCommit()).toBe(false)
    })

    it('should return true when all pieces deployed', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE)))

      expect(session.canCommit()).toBe(true)
    })

    it('should return true when staying pieces specified', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
        stayPieces: [createPiece(AIR_FORCE)],
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))

      expect(session.canCommit()).toBe(true)
    })

    it('should return false when pieces remain and no stay specified', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))

      expect(session.canCommit()).toBe(false)
    })
  })

  describe('isComplete', () => {
    it('should return true when all pieces accounted for', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE)))
      session.addMove(createMove(0x92, 0x93, createPiece(TANK)))

      expect(session.isComplete()).toBe(true)
    })

    it('should return true when moved + staying = original', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
        stayPieces: [createPiece(TANK)],
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE)))

      expect(session.isComplete()).toBe(true)
    })

    it('should return false when pieces remain unaccounted', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))

      expect(session.isComplete()).toBe(false)
    })
  })

  describe('cancel', () => {
    it('should return moves in reverse order', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      const move3 = createMove(0x92, 0x93, createPiece(TANK))

      session.addMove(move1)
      session.addMove(move2)
      session.addMove(move3)

      const toUndo = session.cancel()

      expect(toUndo).toHaveLength(3)
      expect(toUndo[0]).toEqual(move3)
      expect(toUndo[1]).toEqual(move2)
      expect(toUndo[2]).toEqual(move1)
    })

    it('should not modify original actions array', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))

      const toUndo = session.cancel()
      toUndo.pop()

      expect(session.actions).toHaveLength(1) // Original unchanged
    })
  })

  describe('toLegacyDeployState', () => {
    it('should convert to legacy format', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
        stayPieces: [createPiece(TANK)],
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE)))

      const legacy = session.toLegacyDeployState()

      expect(legacy.stackSquare).toBe(0x92)
      expect(legacy.turn).toBe(RED)
      expect(legacy.originalPiece).toEqual(originalPiece)
      expect(legacy.movedPieces).toHaveLength(2)
      expect(legacy.movedPieces[0].type).toBe(NAVY)
      expect(legacy.movedPieces[1].type).toBe(AIR_FORCE)
      expect(legacy.stay).toEqual([createPiece(TANK)])
    })
  })

  describe('toString', () => {
    it('should return readable string representation', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession({
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))

      const str = session.toString()
      expect(str).toContain('c3')
      expect(str).toContain('moves=1')
      expect(str).toContain('remaining=f(t)')
    })
  })

  describe('clone', () => {
    it('should create independent copy', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))

      const cloned = session.clone()

      // Modify original
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE)))

      // Clone should be unchanged
      expect(cloned.actions).toHaveLength(1)
      expect(session.actions).toHaveLength(2)
    })
  })

  describe('toExtendedFEN', () => {
    it('should generate extended FEN with no moves', () => {
      const session = new DeploySession({
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'base-fen r - - 0 1',
      })

      const extendedFEN = session.toExtendedFEN('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:')
    })

    it('should generate extended FEN with moves', () => {
      const session = new DeploySession({
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece: createPiece(NAVY, [
          createPiece(AIR_FORCE),
          createPiece(TANK),
        ]),
        startFEN: 'base-fen r - - 0 1',
      })

      session.addMove(createMove(0x92, 0x72, createPiece(NAVY))) // c3 to c5
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE))) // c3 to c4

      const extendedFEN = session.toExtendedFEN('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nc5,Fc4...')
    })

    it('should generate extended FEN with capture', () => {
      const originalPiece = createPiece(NAVY, [createPiece(TANK)])
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'base-fen r - - 0 1',
      })

      session.addMove(
        createMove(0x92, 0x72, createPiece(NAVY), BITS.DEPLOY | BITS.CAPTURE),
      )

      const extendedFEN = session.toExtendedFEN('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nxc5...')
    })

    it('should generate extended FEN with combined pieces', () => {
      const combinedPiece = createPiece(NAVY, [createPiece(TANK)])
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: combinedPiece,
        startFEN: 'base-fen r - - 0 1',
      })

      session.addMove(createMove(0x92, 0x72, combinedPiece))

      const extendedFEN = session.toExtendedFEN('base-fen r - - 0 1')
      // This is complete because we deployed the entire stack
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:N(T)c5')
    })

    it('should not include ... when complete', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'base-fen r - - 0 1',
      })

      // Deploy all pieces
      session.addMove(createMove(0x92, 0x72, createPiece(NAVY)))
      session.addMove(createMove(0x92, 0x82, createPiece(AIR_FORCE)))

      const extendedFEN = session.toExtendedFEN('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nc5,Fc4')
    })
  })
})
