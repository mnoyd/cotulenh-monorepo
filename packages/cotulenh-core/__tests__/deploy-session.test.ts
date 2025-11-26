// __tests__/deploy-session.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeploySession, handleDeployMove } from '../src/deploy-session.js'
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
import { CoTuLenh } from '../src/cotulenh.js'

// Helper to create a test piece
const createPiece = (
  type: string,
  carrying?: Piece[],
  color: Color = RED,
): Piece => ({
  color,
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

// Helper to create a mock command
const createMockCommand = (move: InternalMove): any => ({
  move,
  execute: vi.fn(),
  undo: vi.fn(),
})

describe('DeploySession', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
  })
  describe('Constructor', () => {
    it('should create a session with required fields', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession(game, {
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece,
      })

      expect(session.stackSquare).toBe(0x92)
      expect(session.turn).toBe(RED)
      expect(session.originalPiece).toEqual(originalPiece)
      expect(session.commands).toEqual([])
    })
  })

  describe('remaining', () => {
    it('should return original piece when no moves made', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      const remaining = session.remaining
      expect(remaining).toHaveLength(3) // Navy + AirForce + Tank
      // remaining[0] is Navy without carrying
      expect(remaining[0].type).toBe(NAVY)
      expect(remaining[0].carrying).toBeUndefined()
      // remaining[1] is AirForce
      expect(remaining[1].type).toBe(AIR_FORCE)
      // remaining[2] is Tank
      expect(remaining[2].type).toBe(TANK)
    })

    it('should calculate remaining after one piece deployed', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      // Setup board with the stack
      game.put(originalPiece, 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      // Deploy Navy
      const move = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move)

      const remaining = session.remaining
      expect(remaining).toHaveLength(2) // AirForce + Tank
      expect(remaining[0].type).toBe(AIR_FORCE)
      expect(remaining[0].carrying).toBeUndefined()
      expect(remaining[1].type).toBe(TANK)
    })

    it('should return empty array when all pieces deployed', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])

      // Setup board with the stack
      game.put(originalPiece, 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      // Deploy all pieces
      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1)

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      session.addMove(move2)

      const move3 = createMove(0x92, 0x93, createPiece(TANK))
      session.addMove(move3)

      const remaining = session.remaining
      expect(remaining).toHaveLength(0)
    })
  })

  describe('moves and commands', () => {
    it('should add moves and commands', () => {
      game.put(createPiece(NAVY), 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
      })

      const move = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move)

      expect(session.moves).toHaveLength(1)
      expect(session.moves[0]).toEqual(move)
      expect(session.commands).toHaveLength(1)
    })

    it('should undo last move', () => {
      game.put(createPiece(NAVY), 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1)

      const undone = session.undoLastMove()

      expect(undone).toBeDefined()
      expect(undone?.from).toBe(move1.from)
      expect(undone?.to).toBe(move1.to)
      expect(session.moves).toHaveLength(0)
      expect(session.commands).toHaveLength(0)
    })

    it('should cancel session and undo all commands', () => {
      game.clear() // Clear any leftover state
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])
      game.put(originalPiece, 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1)

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      session.addMove(move2)

      // Before cancel: Navy at c5, AirForce at c4, c3 should have nothing (all pieces deployed)
      expect(game.get('c5')).toBeDefined()
      expect(game.get('c4')).toBeDefined()
      expect(game.get('c3')).toBeUndefined() // All pieces deployed

      session.cancel()

      expect(session.moves).toHaveLength(0)
      expect(session.commands).toHaveLength(0)
      // After cancel: board should be restored to original state
      const pieceAtC3 = game.get('c3')
      expect(pieceAtC3).toBeDefined()
      expect(pieceAtC3?.type).toBe(NAVY)
      expect(pieceAtC3?.carrying).toHaveLength(1)
      expect(pieceAtC3?.carrying?.[0].type).toBe(AIR_FORCE)
      expect(game.get('c5')).toBeUndefined()
      expect(game.get('c4')).toBeUndefined()
    })
  })

  describe('isComplete', () => {
    it('should return false when no moves made', () => {
      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
      })

      expect(session.isComplete).toBe(false)
    })

    it('should return true when all pieces deployed', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])
      game.put(originalPiece, 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1)

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      session.addMove(move2)

      expect(session.isComplete).toBe(true)
    })
  })

  describe('toFenString', () => {
    it('should generate extended FEN with no moves', () => {
      const session = new DeploySession(game, {
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece: createPiece(NAVY),
      })

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:')
    })

    it('should generate extended FEN with moves', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])
      game.put(originalPiece, 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece,
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY)) // c3 to c5
      session.addMove(move1)

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE)) // c3 to c4
      session.addMove(move2)

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nc5,Fc4...')
    })

    it('should generate extended FEN with capture', () => {
      const originalPiece = createPiece(NAVY, [createPiece(TANK)])
      game.put(originalPiece, 'c3')
      game.put(createPiece(INFANTRY, undefined, BLUE), 'c5') // Target for capture

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      const move = createMove(
        0x92,
        0x72,
        createPiece(NAVY),
        BITS.DEPLOY | BITS.CAPTURE,
      )
      session.addMove(move)

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nxc5...')
    })

    it('should generate extended FEN with combined pieces', () => {
      const combinedPiece = createPiece(NAVY, [createPiece(TANK)])
      game.put(combinedPiece, 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece: combinedPiece,
      })

      const move = createMove(0x92, 0x72, combinedPiece)
      session.addMove(move)

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      // This is complete because we deployed the entire stack
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:N(T)c5')
    })

    it('should not include ... when complete', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])
      game.put(originalPiece, 'c3')

      const session = new DeploySession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      // Deploy all pieces
      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1)

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      session.addMove(move2)

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nc5,Fc4')
    })
  })
})

describe('Deploy Session History Management', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear() // Start with empty board
    game.put({ type: 'c', color: RED }, 'g1')
    game.put({ type: 'c', color: BLUE }, 'h12')
  })

  // TODO: Update this test to use the new handleDeployMove() API instead of the removed deployMove() method
  it.skip('should add entire deploy sequence to history as ONE entry (batch API)', () => {
    // This test uses the working setup from combined-stack.test.ts
    // and adds history assertions to document the behavior

    game.put(
      {
        type: TANK,
        color: RED,
        carrying: [{ type: INFANTRY, color: RED }],
      },
      'c3',
    )
    game['_turn'] = RED

    const initialHistoryLength = game.history().length
    const initialFEN = game.fen()

    // NOTE: The batch deployMove() API has been removed
    // Use handleDeployMove() instead for incremental deploy moves
    /* 
    const deployMove: DeployMoveRequest = {
      from: 'c3',
      moves: [
        { piece: { type: INFANTRY, color: RED }, to: 'c4' },
        { piece: { type: TANK, color: RED }, to: 'd3' },
      ],
    }
    game.deployMove(deployMove)
    */

    // ✅ KEY BEHAVIOR: ONE entry added to history for entire deploy sequence
    // expect(game.history().length).toBe(initialHistoryLength + 1)

    // Verify pieces are deployed
    // expect(game.get('c3')).toBeUndefined()
    // expect(game.get('c4')?.type).toBe(INFANTRY)
    // expect(game.get('d3')?.type).toBe(TANK)

    // ✅ KEY BEHAVIOR: Undo reverts ENTIRE deploy sequence at once
    // const undone = game.undo()
    // expect(undone).not.toBeNull() // Should return something

    // Board restored to initial state
    // expect(game.fen()).toBe(initialFEN)
    // expect(game.history().length).toBe(initialHistoryLength)

    // Original stack restored
    // const stackPiece = game.get('c3')
    // expect(stackPiece).toBeDefined()
    // expect(stackPiece?.type).toBe(TANK)
    // expect(stackPiece?.carrying).toHaveLength(1)
    // expect(stackPiece?.carrying?.[0].type).toBe(INFANTRY)

    // Deployed squares empty
    // expect(game.get('c4')).toBeUndefined()
    // expect(game.get('d3')).toBeUndefined()

    // Turn restored
    // expect(game.turn()).toBe(RED)
  })
})

describe('handleDeployMove', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    // Setup a simple deploy scenario: Navy carrying AirForce
    const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])
    game.put(originalPiece, 'c3')
    game['_turn'] = RED
  })

  it('should auto-commit when session completes by default', () => {
    // Spy on commitDeploySession
    const commitSpy = vi.spyOn(game, 'commitDeploySession')

    // 1. Deploy Navy (incomplete)
    const move1 = createMove(0x92, 0x72, createPiece(NAVY))
    handleDeployMove(game, move1)
    expect(commitSpy).not.toHaveBeenCalled()

    // 2. Deploy AirForce (complete)
    const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
    handleDeployMove(game, move2)

    expect(commitSpy).toHaveBeenCalled()
  })

  it('should NOT auto-commit when autoCommit is false', () => {
    // Spy on commitDeploySession
    const commitSpy = vi.spyOn(game, 'commitDeploySession')

    // 1. Deploy Navy (incomplete)
    const move1 = createMove(0x92, 0x72, createPiece(NAVY))
    handleDeployMove(game, move1, false)
    expect(commitSpy).not.toHaveBeenCalled()

    // 2. Deploy AirForce (complete)
    const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
    handleDeployMove(game, move2, false)

    expect(commitSpy).not.toHaveBeenCalled()

    // Verify session is still active and complete
    const session = game.getDeploySession()
    expect(session).not.toBeNull()
    expect(session?.isComplete).toBe(true)
  })
})
