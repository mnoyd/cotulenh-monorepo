// __tests__/deploy-session.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
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
import { CoTuLenh, DeployMoveRequest } from '../src/cotulenh.js'

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

  // Helper to create a mock command
  const createMockCommand = (move: InternalMove): any => ({
    move,
    execute: () => {},
    undo: () => {},
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

      const session = new DeploySession({
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

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      // Deploy Navy
      const move = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move, createMockCommand(move))

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

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      // Deploy all pieces
      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1, createMockCommand(move1))

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      session.addMove(move2, createMockCommand(move2))

      const move3 = createMove(0x92, 0x93, createPiece(TANK))
      session.addMove(move3, createMockCommand(move3))

      const remaining = session.remaining
      expect(remaining).toHaveLength(0)
    })
  })

  describe('moves and commands', () => {
    it('should add moves and commands', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
      })

      const move = createMove(0x92, 0x72, createPiece(NAVY))
      const command = createMockCommand(move)
      session.addMove(move, command)

      expect(session.moves).toHaveLength(1)
      expect(session.moves[0]).toEqual(move)
      expect(session.commands).toHaveLength(1)
      expect(session.commands[0]).toEqual(command)
    })

    it('should undo last move', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      const cmd1 = createMockCommand(move1)

      session.addMove(move1, cmd1)

      const undone = session.undo()

      expect(undone).toBeDefined()
      expect(undone?.move).toEqual(move1)
      expect(undone?.command).toEqual(cmd1)
      expect(session.moves).toHaveLength(0)
      expect(session.commands).toHaveLength(0)
    })
  })

  describe('isComplete', () => {
    it('should return false when no moves made', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
      })

      expect(session.isComplete).toBe(false)
    })

    it('should return true when all pieces deployed', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1, createMockCommand(move1))

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      session.addMove(move2, createMockCommand(move2))

      expect(session.isComplete).toBe(true)
    })
  })

  describe('toFenString', () => {
    it('should generate extended FEN with no moves', () => {
      const session = new DeploySession({
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece: createPiece(NAVY),
      })

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
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
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY)) // c3 to c5
      session.addMove(move1, createMockCommand(move1))

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE)) // c3 to c4
      session.addMove(move2, createMockCommand(move2))

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nc5,Fc4...')
    })

    it('should generate extended FEN with capture', () => {
      const originalPiece = createPiece(NAVY, [createPiece(TANK)])
      const session = new DeploySession({
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
      session.addMove(move, createMockCommand(move))

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nxc5...')
    })

    it('should generate extended FEN with combined pieces', () => {
      const combinedPiece = createPiece(NAVY, [createPiece(TANK)])
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: combinedPiece,
      })

      const move = createMove(0x92, 0x72, combinedPiece)
      session.addMove(move, createMockCommand(move))

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      // This is complete because we deployed the entire stack
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:N(T)c5')
    })

    it('should not include ... when complete', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
      })

      // Deploy all pieces
      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1, createMockCommand(move1))

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      session.addMove(move2, createMockCommand(move2))

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

  it('should add entire deploy sequence to history as ONE entry (batch API)', () => {
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

    // Use batch deployMove API
    const deployMove: DeployMoveRequest = {
      from: 'c3',
      moves: [
        { piece: { type: INFANTRY, color: RED }, to: 'c4' },
        { piece: { type: TANK, color: RED }, to: 'd3' },
      ],
    }
    game.deployMove(deployMove)

    // ✅ KEY BEHAVIOR: ONE entry added to history for entire deploy sequence
    expect(game.history().length).toBe(initialHistoryLength + 1)

    // Verify pieces are deployed
    expect(game.get('c3')).toBeUndefined()
    expect(game.get('c4')?.type).toBe(INFANTRY)
    expect(game.get('d3')?.type).toBe(TANK)

    // ✅ KEY BEHAVIOR: Undo reverts ENTIRE deploy sequence at once
    const undone = game.undo()
    expect(undone).not.toBeNull() // Should return something

    // Board restored to initial state
    expect(game.fen()).toBe(initialFEN)
    expect(game.history().length).toBe(initialHistoryLength)

    // Original stack restored
    const stackPiece = game.get('c3')
    expect(stackPiece).toBeDefined()
    expect(stackPiece?.type).toBe(TANK)
    expect(stackPiece?.carrying).toHaveLength(1)
    expect(stackPiece?.carrying?.[0].type).toBe(INFANTRY)

    // Deployed squares empty
    expect(game.get('c4')).toBeUndefined()
    expect(game.get('d3')).toBeUndefined()

    // Turn restored
    expect(game.turn()).toBe(RED)
  })
})
