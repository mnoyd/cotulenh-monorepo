// __tests__/move-session.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MoveSession, handleMove } from '../src/move-session.js'
import {
  BITS,
  RED,
  algebraic,
  BLUE,
  NAVY,
  AIR_FORCE,
  TANK,
  INFANTRY,
  COMMANDER,
  HEADQUARTER,
  SQUARE_MAP,
} from '../src/type.js'
import type { Piece, Color, InternalMove } from '../src/type.js'
import { CoTuLenh } from '../src/cotulenh.js'
import { makeMove, makePiece } from './test-helpers.js'

// Helper to create a test piece
const createPiece = (
  type: string,
  carrying?: Piece[],
  color: Color = RED,
): Piece => ({
  color,
  type: type as any,
  carrying,
  heroic: false,
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

      const session = new MoveSession(game, {
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece,
        isDeploy: true,
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

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
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

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
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

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
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

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        isDeploy: false,
      })

      const move = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move)

      expect(session.moves).toHaveLength(1)
      expect(session.moves[0]).toEqual(move)
      expect(session.commands).toHaveLength(1)
    })

    it('should undo last move', () => {
      game.put(createPiece(NAVY), 'c3')

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        isDeploy: false,
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

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
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
      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece: createPiece(NAVY),
        isDeploy: false,
      })

      expect(session.isComplete).toBe(false)
    })

    it('should return true when all pieces deployed', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])
      game.put(originalPiece, 'c3')

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
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
      const session = new MoveSession(game, {
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece: createPiece(NAVY),
        isDeploy: true,
      })

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      // Navy is staying at c3 because no moves made yet
      expect(extendedFEN).toBe('base-fen r - - 0 1 c3:N<...')
    })

    it('should generate extended FEN with moves', () => {
      const originalPiece = createPiece(NAVY, [
        createPiece(AIR_FORCE),
        createPiece(TANK),
      ])
      game.put(originalPiece, 'c3')

      const session = new MoveSession(game, {
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      const move1 = createMove(0x92, 0x72, createPiece(NAVY)) // c3 to c5
      session.addMove(move1)

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE)) // c3 to c4
      session.addMove(move2)

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      // Tank remains at c3 -> T<
      // Moves are N>c5, F>c4
      expect(extendedFEN).toBe('base-fen r - - 0 1 c3:T<N>c5,F>c4...')
    })

    it('should generate extended FEN with capture', () => {
      const originalPiece = createPiece(NAVY, [createPiece(TANK)])
      game.put(originalPiece, 'c3')
      game.put(createPiece(INFANTRY, undefined, BLUE), 'c5') // Target for capture

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      const move = createMove(
        0x92,
        0x72,
        createPiece(NAVY),
        BITS.DEPLOY | BITS.CAPTURE,
      )
      session.addMove(move)

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      // Tank remains -> T<
      // Move -> N>xc5
      expect(extendedFEN).toBe('base-fen r - - 0 1 c3:T<N>xc5...')
    })

    it('should generate extended FEN with combined pieces', () => {
      const combinedPiece = createPiece(NAVY, [createPiece(TANK)])
      game.put(combinedPiece, 'c3')

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece: combinedPiece,
        isDeploy: true,
      })

      const move = createMove(0x92, 0x72, combinedPiece)
      session.addMove(move)

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      // This is complete because we deployed the entire stack, nothing stays
      // Output: (NT)>c5
      expect(extendedFEN).toBe('base-fen r - - 0 1 c3:(NT)>c5')
    })

    it('should not include ... when complete', () => {
      const originalPiece = createPiece(NAVY, [createPiece(AIR_FORCE)])
      game.put(originalPiece, 'c3')

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      // Deploy all pieces
      const move1 = createMove(0x92, 0x72, createPiece(NAVY))
      session.addMove(move1)

      const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
      session.addMove(move2)

      const extendedFEN = session.toFenString('base-fen r - - 0 1')
      // Nothing stays -> no < notation
      expect(extendedFEN).toBe('base-fen r - - 0 1 c3:N>c5,F>c4')
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

  // TODO: Update this test to use the new handleMove() API instead of the removed deployMove() method
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
    // Use handleMove() instead for incremental deploy moves
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
    // Spy on commitSession
    const commitSpy = vi.spyOn(game, 'commitSession')

    // 1. Deploy Navy (incomplete)
    const move1 = createMove(0x92, 0x72, createPiece(NAVY))
    handleMove(game, move1)
    expect(commitSpy).not.toHaveBeenCalled()

    // 2. Deploy AirForce (complete)
    const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
    handleMove(game, move2)

    expect(commitSpy).toHaveBeenCalled()
  })

  it('should NOT auto-commit when autoCommit is false', () => {
    // Spy on commitSession
    const commitSpy = vi.spyOn(game, 'commitSession')

    // 1. Deploy Navy (incomplete)
    const move1 = createMove(0x92, 0x72, createPiece(NAVY))
    handleMove(game, move1, false)
    expect(commitSpy).not.toHaveBeenCalled()

    // 2. Deploy AirForce (complete)
    const move2 = createMove(0x92, 0x82, createPiece(AIR_FORCE))
    handleMove(game, move2, false)

    expect(commitSpy).not.toHaveBeenCalled()

    // Verify session is still active and complete
    const session = game.getSession()
    expect(session).not.toBeNull()
    expect(session?.isComplete).toBe(true)
  })

  describe('Normal Move Handling', () => {
    it('should handle normal moves correctly', () => {
      // Create a game with a piece (General) at c3 (0x92)
      const game = new CoTuLenh()
      // Use default position but clear c3/c4 first to be safe
      game.remove('c3')
      game.remove('c4')

      // Remove existing Red Commander to avoid limit
      const existingCommanderSq = game.getCommanderSquare(RED)
      if (existingCommanderSq !== -1) {
        game.remove(algebraic(existingCommanderSq))
      }

      const piece = createPiece(COMMANDER, [], RED)
      game.put(piece, 'c3')

      // Verify setup
      expect(game.get('c3')).toEqual(piece)
      expect(game.get('d4')).toBeUndefined()

      // Spy on commitSession
      const commitSpy = vi.spyOn(game, 'commitSession')

      // Move General from c3 to d4 (0x83)
      const move = createMove(0x92, 0x83, piece, BITS.NORMAL) // c3 -> d4

      // Handle the move
      const result = handleMove(game, move)

      // Should be complete and committed immediately
      expect(result.completed).toBe(true)
      expect(commitSpy).toHaveBeenCalled()

      // Verify board state
      expect(game.get('c3')).toBeUndefined()
      const pieceAtDest = game.get('d4')
      expect(pieceAtDest).toBeDefined()
      expect(pieceAtDest?.type).toBe(COMMANDER)
      expect(pieceAtDest?.color).toBe(RED)

      // Verify undo works (implies state capture was correct)
      game.undo()
      const pieceAtStart = game.get('c3')
      expect(pieceAtStart).toBeDefined()
      expect(pieceAtStart?.type).toBe(COMMANDER)
      expect(pieceAtStart?.color).toBe(RED)
      expect(game.get('d4')).toBeUndefined()
    })
  })
})

describe('Random finding', () => {
  it('should deploy move with commander', () => {
    const game = new CoTuLenh(
      '11/4+F2(hc)3/11/7i1M1/11/11/11/11/11/5C5/11/11 b - - 3 2',
    )
    const moves = game.moves({ square: 'h11' })
    game.move('C>h12')
  })
  it('should handle navy deploy move', () => {
    const game = new CoTuLenh(
      '6c4/4fh1hf2/1n1a2s2a1/1n2gt1tg2/2ie2m2ei/11/1(NF)9/2IE2M2EI/2N1GT1TG2/3A2S2A1/5H1HF2/6C4 r - - 4 3',
    )
    const moves = game.moves({ square: 'b6' })
    game.move({ from: 'b6', to: 'e9', piece: NAVY, deploy: true })
    const fen = game.fen()
    console.log(fen)
  })
})

describe('Remaining pieces have no move', () => {
  it('should complete session when remaining piece (HQ) has no moves', () => {
    const game = new CoTuLenh()
    game.clear()

    // Setup:
    // Red HQ (h) carrying Red Commander (c) at f2 (0x81 if using hex, algebraic 'f2' is 0x81?? No, wait.
    // Let's use algebraic to be safe or verify hex.
    // f2 -> col=5, row=1 (0-indexed logic in some places?)
    // In cotulenh.ts: 12 ranks (0-11?).
    // Let's just use game.put with algebraic string.

    // Helper arguments: makePiece(type, color, heroic, carrying)
    // Red HQ, carrying Commander (wrapped in array)
    const commander = makePiece(COMMANDER, RED, false, [])
    const hq = makePiece(HEADQUARTER, RED, false, [commander])

    game.put(hq, 'f2')
    game.put(makePiece(INFANTRY, RED, false, []), 'e2') // Red Infantry
    game.put(makePiece(COMMANDER, BLUE, false, []), 'f11') // Blue Commander
    game.put(makePiece(INFANTRY, BLUE, false, []), 'e11') // Blue Infantry

    game['_turn'] = RED // Ensure Red turn

    // Check moves from f2
    // Cast result to StandardMove[] to access properties
    const movesFromF2 = game.moves({ square: 'f2', verbose: true }) as any[]
    // Should find Commander deploy move.
    const deployMove = movesFromF2.find((m) => m.piece.type === 'c')
    expect(deployMove).toBeDefined()

    // Use the algebraic string 'f2' -> converting to internal index if needed
    // Deployed move from is the stack square
    // const f2Index = deployMove.from_index || deployMove.from // StandardMove has 'from' as string, need index?
    // Wait, StandardMove.from is string 'f2'. MoveSession needs NUMBER.
    // We can get number from internal moves or parse it.
    // Let's use internal API for setup or parsing.

    // Let's just hardcode f2 index for now or assume internal 'moves' logic.
    // f2 index:
    // In cotulenh.ts: 9 << 4 | 5 = 144 + 5 = 149? No.
    // Let's use: game.get('f2') works.
    // We can use a helper to get square index if not exported.
    // Or simply iterate board to find it? No.
    // Let's rely on the deployMove.from if it was an internal move... but it is StandardMove.

    // Use game.moves({ verbose: true, square: 'f2' }) to get the move,
    // and SQUARE_MAP to get the numeric index for MoveSession.
    const f2Num = SQUARE_MAP['f2']
    const deployMoveVerbose = movesFromF2.find((m) => m.piece.type === 'c')
    expect(deployMoveVerbose).toBeDefined()
    const internalDeployMove = {
      to: SQUARE_MAP[deployMoveVerbose!.to],
    }

    const session = new MoveSession(game, {
      stackSquare: f2Num,
      turn: RED,
      originalPiece: hq,
      isDeploy: true,
    })
    game['setSession'](session)

    expect(session.isComplete).toBe(false)

    // 2. Deploy Commander
    const moveCmd = makeMove({
      from: f2Num,
      to: internalDeployMove!.to,
      piece: makePiece(COMMANDER, RED, false, []),
      flags: 16, // DEPLOY
    })

    session.addMove(moveCmd)

    const remaining = session.remaining
    expect(remaining).toHaveLength(1)
    expect(remaining[0].type).toBe('h') // Headquarter

    expect(session.isComplete).toBe(true)
  })
})
