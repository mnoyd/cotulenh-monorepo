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
        startFEN: 'test-fen',
      })

      expect(session.stackSquare).toBe(0x92)
      expect(session.turn).toBe(RED)
      expect(session.originalPiece).toEqual(originalPiece)
      expect(session.startFEN).toBe('test-fen')
      expect(session.commands).toEqual([])
      expect(session.stayPieces).toBeUndefined()
    })

    it('should accept optional commands and stayPieces', () => {
      const originalPiece = createPiece(NAVY)
      const move = createMove(0x92, 0x72, createPiece(NAVY))
      const commands = [createMockCommand(move)]
      const stayPieces = [createPiece(TANK)]

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
        commands,
        stayPieces,
      })

      expect(session.commands).toEqual(commands)
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
      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )

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
      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x82, createPiece(AIR_FORCE))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x93, createPiece(TANK))),
      )

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
      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )

      // Add a move from different square (shouldn't affect remaining)
      session.addCommand(
        createMockCommand(createMove(0x72, 0x73, createPiece(NAVY))),
      )

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
      session.addCommand(
        createMockCommand(
          createMove(0x92, 0x72, createPiece(NAVY), BITS.NORMAL),
        ),
      )

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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x82, createPiece(AIR_FORCE))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x93, createPiece(TANK))),
      )

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
      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(AIR_FORCE))),
      )

      const squares = session.getDeployedSquares()
      expect(squares).toHaveLength(1)
      expect(squares[0]).toBe(0x72)
    })
  })

  describe('addCommand and undoLastCommand', () => {
    it('should add commands to commands array', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      const move = createMove(0x92, 0x72, createPiece(NAVY))
      const command = createMockCommand(move)
      session.addCommand(command)

      expect(session.commands).toHaveLength(1)
      expect(session.commands[0]).toEqual(command)
    })

    it('should undo last command', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      const cmd1 = createMockCommand(move1)
      const cmd2 = createMockCommand(move2)

      session.addCommand(cmd1)
      session.addCommand(cmd2)

      const undone = session.undoLastCommand()

      expect(undone).toEqual(cmd2)
      expect(session.commands).toHaveLength(1)
      expect(session.commands[0]).toEqual(cmd1)
    })

    it('should return null when undoing empty session', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      const undone = session.undoLastCommand()
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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x82, createPiece(AIR_FORCE))),
      )

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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )

      expect(session.canCommit()).toBe(true)
    })

    it('should return true when pieces remain (auto-stay on commit)', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])

      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        startFEN: 'test-fen',
      })

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )

      // Can commit now - remaining pieces will be auto-marked as staying
      expect(session.canCommit()).toBe(true)
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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x82, createPiece(AIR_FORCE))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x93, createPiece(TANK))),
      )

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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x82, createPiece(AIR_FORCE))),
      )

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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )

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

      session.addCommand(createMockCommand(move1))
      session.addCommand(createMockCommand(move2))
      session.addCommand(createMockCommand(move3))

      const toUndo = session.cancel()

      expect(toUndo).toHaveLength(3)
      expect(toUndo[0]).toEqual(move3)
      expect(toUndo[1]).toEqual(move2)
      expect(toUndo[2]).toEqual(move1)
    })

    it('should not modify original commands array', () => {
      const session = new DeploySession({
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        startFEN: 'test-fen',
      })

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )

      const toUndo = session.cancel()
      toUndo.pop()

      expect(session.commands).toHaveLength(1) // Original unchanged
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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )

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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )

      const cloned = session.clone()

      // Modify original
      session.addCommand(
        createMockCommand(createMove(0x92, 0x82, createPiece(AIR_FORCE))),
      )

      // Clone should be unchanged
      expect(cloned.commands).toHaveLength(1)
      expect(session.commands).toHaveLength(2)
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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      ) // c3 to c5
      session.addCommand(
        createMockCommand(createMove(0x92, 0x82, createPiece(AIR_FORCE))),
      ) // c3 to c4

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

      session.addCommand(
        createMockCommand(
          createMove(0x92, 0x72, createPiece(NAVY), BITS.DEPLOY | BITS.CAPTURE),
        ),
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

      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, combinedPiece)),
      )

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
      session.addCommand(
        createMockCommand(createMove(0x92, 0x72, createPiece(NAVY))),
      )
      session.addCommand(
        createMockCommand(createMove(0x92, 0x82, createPiece(AIR_FORCE))),
      )

      const extendedFEN = session.toExtendedFEN('base-fen r - - 0 1')
      expect(extendedFEN).toBe('base-fen r - - 0 1 DEPLOY c3:Nc5,Fc4')
    })
  })
})

/**
 * Test suite for deploy session history behavior
 *
 * Key behaviors documented:
 * 1. During deploy session: individual moves are NOT added to history
 * 2. During deploy session: moves are stored in session.commands
 * 3. On commit/auto-commit: entire deploy sequence added to history as ONE entry
 * 4. On undo: entire deploy sequence undone at once
 *
 * IMPORTANT INSIGHT:
 * - When using internal _makeMove() with DEPLOY flag: moves go to session.commands (NOT history)
 * - When using batch deployMove() API: entire sequence auto-commits and goes to history as ONE entry
 * - On undo: the entire deploy sequence (all piece movements) is undone as a single operation
 *
 * This ensures that deploy moves maintain atomicity - either all pieces deploy or none do.
 */
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
    expect(undone).not.toBeNull()

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
