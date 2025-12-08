import { beforeEach, describe, expect, it } from 'vitest'
import { CoTuLenh, StandardMove } from '../src/cotulenh'
import {
  RED,
  BLUE,
  NAVY,
  AIR_FORCE,
  INFANTRY,
  TANK,
  ARTILLERY,
  ANTI_AIR,
  DEFAULT_POSITION,
  Piece,
  InternalMove,
  COMMANDER,
  MILITIA,
} from '../src/type'
import { setupGameBasic } from './test-helpers'

describe('CoTuLenh Stay Capture Logic', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  it('Land piece (Tank) capturing on Land should REPLACE', () => {
    game.put({ type: TANK, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = RED // Access private for test setup

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd4' &&
        m.to === 'd5' &&
        m.piece.type === TANK &&
        m.captured?.[0]?.type === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('d5')
    expect(captureMove?.captured?.[0]?.type).toBe(INFANTRY)
  })

  it('Heavy piece (Artillery) capturing across river on Land should REPLACE', () => {
    game.put({ type: ARTILLERY, color: RED }, 'i5')
    game.put({ type: INFANTRY, color: BLUE }, 'i8')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'i5' &&
        m.to === 'i8' &&
        m.piece.type === ARTILLERY &&
        m.captured?.[0]?.type === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('i8')
    expect(captureMove?.captured?.[0]?.type).toBe(INFANTRY)
  })

  it('Navy capturing Navy on Water should REPLACE', () => {
    game.put({ type: NAVY, color: RED }, 'b3')
    game.put({ type: NAVY, color: BLUE }, 'b5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'b3' &&
        m.to === 'b5' &&
        m.piece.type === NAVY &&
        m.captured?.[0]?.type === NAVY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('b5')
    expect(captureMove?.captured?.[0]?.type).toBe(NAVY)
  })

  it('Navy capturing Land piece on Mixed terrain (c file) should REPLACE', () => {
    game.put({ type: NAVY, color: RED }, 'c4')
    game.put({ type: TANK, color: BLUE }, 'c5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'c4' &&
        m.to === 'c5' &&
        m.piece.type === NAVY &&
        m.captured?.[0]?.type === TANK
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('c5')
    expect(captureMove?.captured?.[0]?.type).toBe(TANK)
  })

  it('Land piece (Tank) capturing Navy on pure Water should STAY', () => {
    // Tank d3, Navy b3
    game.put({ type: TANK, color: RED }, 'd3')
    game.put({ type: NAVY, color: BLUE }, 'b3')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd3' &&
        m.to === 'b3' &&
        m.piece.type === TANK &&
        m.captured?.[0]?.type === NAVY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(true)
    expect(captureMove?.from).toBe('d3')
    expect(captureMove?.to).toBe('b3') // Tank stays
    expect(captureMove?.captured?.[0]?.type).toBe(NAVY)
  })

  it('Navy capturing Land piece on pure Land should STAY', () => {
    // Navy c3, Tank f3 (range 3)
    game.put({ type: NAVY, color: RED }, 'c3')
    game.put({ type: TANK, color: BLUE }, 'f3')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'c3' &&
        m.to === 'f3' &&
        m.piece.type === NAVY &&
        m.captured?.[0]?.type === TANK
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(true)
    expect(captureMove?.from).toBe('c3')
    expect(captureMove?.to).toBe('f3') // Navy stays
    expect(captureMove?.captured?.[0]?.type).toBe(TANK)
  })

  it('Air Force capturing Navy kamikaze', () => {
    // AF d2, Navy b2
    game.put({ type: AIR_FORCE, color: RED }, 'd2')
    game.put({ type: NAVY, color: BLUE }, 'b2')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const suicideCaptureMove = moves.find((m) => {
      return (
        m.from === 'd2' &&
        m.to === 'b2' &&
        m.piece.type === AIR_FORCE &&
        m.captured?.[0]?.type === NAVY
      )
    })

    expect(suicideCaptureMove).toBeDefined()
    expect(suicideCaptureMove?.isSuicideCapture()).toBe(true)
    expect(suicideCaptureMove?.from).toBe('d2')
    expect(suicideCaptureMove?.to).toBe('b2') // AF stays
    expect(suicideCaptureMove?.captured?.[0]?.type).toBe(NAVY)
  })

  it('Air Force capturing Land piece on Land should REPLACE', () => {
    game.put({ type: AIR_FORCE, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd4' &&
        m.to === 'd5' &&
        m.piece.type === AIR_FORCE &&
        m.captured?.[0]?.type === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('d5')
    expect(captureMove?.captured?.[0]?.type).toBe(INFANTRY)
  })
})

describe('Move History and Undo', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = new CoTuLenh(DEFAULT_POSITION) // Start with default position
  })

  it('history() should record moves correctly (simple and verbose)', () => {
    const move1 = game.move({ from: 'c5', to: 'c6' }) // Red Infantry forward
    const move2 = game.move({ from: 'g8', to: 'g7' }) // Blue Militia forward

    expect(move1).not.toBeNull()
    expect(move2).not.toBeNull()

    const historySimple = game.history()
    const historyVerbose = game.history({ verbose: true }) as StandardMove[]

    // Basic SAN check - exact format depends on _moveToSan implementation details
    expect(historySimple.length).toBe(2)
    expect(historySimple[0]).toMatch(/^Ic6/)
    expect(historySimple[1]).toMatch(/^Mg7/)

    expect(historyVerbose.length).toBe(2)
    expect(historyVerbose[0].from).toBe('c5')
    expect(historyVerbose[0].to).toBe('c6')
    expect(historyVerbose[1].from).toBe('g8')
    expect(historyVerbose[1].to).toBe('g7')
  })

  it('undo() should revert the last move', () => {
    const initialFen = game.fen()
    game.move({ from: 'd3', to: 'd4' }) // Red Tank
    const fenAfterMove = game.fen()
    expect(fenAfterMove).not.toBe(initialFen)

    game.undo()
    const fenAfterUndo = game.fen()

    expect(fenAfterUndo).toBe(initialFen)
    expect(game.history().length).toBe(0)
    expect(game.turn()).toBe(RED) // Turn should revert
  })

  it('undo() multiple moves', () => {
    const initialFen = game.fen()
    game.move({ from: 'd3', to: 'd4' }) // R Tank
    const fen1 = game.fen()
    game.move({ from: 'e9', to: 'e8' }) // B AntiAir
    const fen2 = game.fen()
    game.move({ from: 'f4', to: 'f6' }) // R Tank
    const fen3 = game.fen()

    expect(game.history().length).toBe(3)

    game.undo() // Undo f4f6
    expect(game.history().length).toBe(2)
    expect(game.turn()).toBe(RED)
    expect(game.fen()).toBe(fen2)
    expect(game.get('f6')).toBeUndefined()
    expect(game.get('f4')?.type).toBe(TANK)

    game.undo() // Undo e9e8
    expect(game.history().length).toBe(1)
    expect(game.turn()).toBe(BLUE)
    expect(game.fen()).toBe(fen1)
    expect(game.get('e8')).toBeUndefined()
    expect(game.get('e9')?.type).toBe(ANTI_AIR)

    game.undo() // Undo d3d4
    expect(game.history().length).toBe(0)
    expect(game.turn()).toBe(RED)
    expect(game.fen()).toBe(initialFen)
  })

  it('undo() a suicide capture move', () => {
    // Setup: Red Air Force d2, Blue Navy b2
    game.load('5c5/11/11/11/11/11/11/11/11/11/1n1F7/4C6 r - - 0 1')
    const initialFen = game.fen()
    const move = game.move({ from: 'd2', to: 'b2' }) // AF attacks Navy

    expect(move).not.toBeNull()
    expect(game.get('d2')?.type).toBeUndefined() // AF stays
    expect(game.get('b2')).toBeUndefined() // Navy removed
    const fenAfterMove = game.fen()

    game.undo()

    expect(game.fen()).toBe(initialFen)
    expect(game.get('d2')?.type).toBe(AIR_FORCE)
    expect(game.get('b2')?.type).toBe(NAVY)
    expect(game.get('b2')?.color).toBe(BLUE)
    expect(game.history().length).toBe(0)
    expect(game.turn()).toBe(RED)
  })
})

describe('SAN Conversion', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = new CoTuLenh(DEFAULT_POSITION)
  })

  it('move() should accept basic SAN strings', () => {
    const initialFen = game.fen()
    // Use a valid move from the default position
    const move = game.move('c5-c6') // Red Infantry

    expect(move).not.toBeNull()
    expect(move?.san).toBe('Ic6') // Basic SAN format
    expect(game.fen()).not.toBe(initialFen)
    expect(game.get('c5')).toBeUndefined()
    expect(game.get('c6')?.type).toBe(INFANTRY)
    expect(game.get('c6')?.color).toBe(RED)
  })

  it('move() should handle SAN for captures', () => {
    // Setup: Red Infantry d4, Blue Infantry d5
    game.load('5c5/11/11/11/11/11/11/3i7/3I7/11/11/4C6 r - - 0 1')
    const move = game.move('Id4xd5') as StandardMove // Capture using SAN

    expect(move).not.toBeNull()
    expect(move?.san).toBe('Ixd5')
    expect(move?.isCapture()).toBe(true)
    expect(game.get('d5')?.type).toBe(INFANTRY)
    expect(game.get('d5')?.color).toBe(RED)
    expect(game.get('d4')).toBeUndefined()
  })

  it('move() should handle SAN for stay captures', () => {
    // Setup: Red AF d2, Blue Navy b2
    game.load('5c5/11/11/11/11/11/11/11/11/11/1n1F7/4C6 r - - 0 1')
    //TODO update ambiguous moves SAN
    const move = game.move('Fd2@b2') as StandardMove // Stay capture SAN

    expect(move).not.toBeNull()
    expect(move?.isSuicideCapture()).toBe(true)
    expect(move?.san).toBe('F@b2')
    expect(move?.from).toBe('d2')
    expect(move?.to).toBe('b2') // Piece ends up at origin
    expect(move?.captured?.[0]?.type).toBe(NAVY)
    expect(game.get('d2')?.type).toBeUndefined()
    expect(game.get('b2')).toBeUndefined()
  })

  // TODO: Add tests for _moveToSan and _moveFromSan directly if needed for more granular checks
  // TODO: Add tests for ambiguous moves SAN if applicable
  // TODO: Add tests for Heroic promotion SAN if implemented
  // TODO: Add tests for Deploy SAN parsing/generation
})

describe('Piece Blocking Movement Logic', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  it('Sliding piece (Tank) should be blocked by friendly pieces', () => {
    // Setup: Red Tank at d3, Red Infantry at d4
    game.put({ type: TANK, color: RED }, 'd3')
    game.put({ type: INFANTRY, color: RED }, 'd4')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]

    // Tank should not be able to move to d5 (beyond the blocking Infantry)
    const moveToD5 = moves.find((m) => m.from === 'd3' && m.to === 'd5')
    expect(moveToD5).toBeUndefined()

    // Tank should be able to move to other squares that aren't blocked
    const moveToE3 = moves.find((m) => m.from === 'd3' && m.to === 'e3')
    expect(moveToE3).toBeDefined()
  })

  it('Non-sliding piece (Infantry) should be blocked by friendly pieces', () => {
    // Setup: Red Infantry at d4, Red Tank at d5
    game.put({ type: INFANTRY, color: RED }, 'd4')
    game.put({ type: TANK, color: RED }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]

    // Infantry should not be able to move to d5 (occupied by friendly Tank)
    const moveToD5 = moves.find((m) => m.from === 'd5' && m.to === 'd3')
    expect(moveToD5).toBeUndefined()

    // Infantry should be able to move to other valid squares
    const moveToE4 = moves.find((m) => m.from === 'd5' && m.to === 'e5')
    expect(moveToE4).toBeDefined()
  })

  it('Air Force should ignore piece blocking', () => {
    // Setup: Red Air Force at d4, Red Infantry at d5, Blue Tank at d6
    game.put({ type: AIR_FORCE, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: RED }, 'd5')
    game.put({ type: TANK, color: BLUE }, 'd6')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]

    // Air Force should be able to move beyond friendly Infantry
    const moveToD7 = moves.find((m) => m.from === 'd4' && m.to === 'd7')
    expect(moveToD7).toBeDefined()

    // Air Force should be able to capture enemy Tank
    const captureD6 = moves.find(
      (m) => m.from === 'd4' && m.to === 'd6' && m.captured?.[0]?.type === TANK,
    )
    expect(captureD6).toBeDefined()
  })

  it('Artillery should be blocked for movement but not for capture', () => {
    // Setup: Red Artillery at d3, Red Infantry at d4, Blue Tank at d5
    game.put({ type: ARTILLERY, color: RED }, 'd3')
    game.put({ type: INFANTRY, color: RED }, 'd4')
    game.put({ type: TANK, color: BLUE }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]

    // Artillery should not be able to move to d5 or d6 (blocked by friendly Infantry)
    const moveToD5 = moves.find(
      (m) => m.from === 'd3' && m.to === 'd5' && !m.isCapture(),
    )
    const moveToD6 = moves.find((m) => m.from === 'd3' && m.to === 'd6')
    expect(moveToD5).toBeUndefined()
    expect(moveToD6).toBeUndefined()

    // Artillery should be able to capture enemy Tank at d5 despite blocking
    const captureD5 = moves.find(
      (m) => m.from === 'd3' && m.to === 'd5' && m.isCapture(),
    )
    expect(captureD5).toBeDefined()
  })

  it('Navy should ignore friendly piece blocking', () => {
    // Setup: Red Navy at b3, Red Navy at b4, Blue Navy at b5
    game.put({ type: NAVY, color: RED }, 'b3')
    game.put({ type: NAVY, color: RED }, 'b4')
    game.put({ type: NAVY, color: BLUE }, 'b6')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]

    // Navy should be able to move beyond friendly Navy
    const moveToB6 = moves.find((m) => m.from === 'b3' && m.to === 'b6')
    expect(moveToB6).toBeDefined()

    // Navy should be able to capture enemy Navy
    const captureB6 = moves.find(
      (m) => m.from === 'b3' && m.to === 'b6' && m.captured?.[0]?.type === NAVY,
    )
    expect(captureB6).toBeDefined()
  })

  it('Tank special rule: cannot shoot over blocking piece at range 2', () => {
    // Setup: Red Tank at d3, Red Infantry at d4, Blue Infantry at d5
    game.put({ type: TANK, color: RED }, 'd3')
    game.put({ type: INFANTRY, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]

    // Tank should not be able to move to d5 (blocked by friendly Infantry)
    const moveToD5 = moves.find(
      (m) => m.from === 'd3' && m.to === 'd5' && !m.isCapture(),
    )
    expect(moveToD5).toBeUndefined()

    // Tank should be able to capture enemy Infantry at d5 despite blocking (special rule)
    const captureD5 = moves.find((m) => m.from === 'd3' && m.to === 'd5')
    expect(captureD5).toBeUndefined()
  })
})

describe('Generate Moves', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })
  it('should generate all possible moves from initial position', () => {
    game.clear()
    game = new CoTuLenh()
    const moves = game.moves({ verbose: true }) as StandardMove[]
    expect(moves.length).toBe(116)
  })
  it('should correctly filter moves by piece type', () => {
    const carried: Piece = { type: INFANTRY, color: RED }
    game.put({ type: TANK, color: RED, carrying: [carried] }, 'c2')
    game.load(game.fen())
    game['_turn'] = RED

    const allMoves = game.moves({ verbose: true }) as StandardMove[]
    const filteredMoves = game.moves({
      verbose: true,
      pieceType: INFANTRY,
    }) as StandardMove[]
    const infantryMovesFromAll = allMoves.filter(
      (m) => m.piece.type === INFANTRY,
    )
    expect(filteredMoves.length).toEqual(infantryMovesFromAll.length)
  })
})

describe('Terrain blocking movement logic', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })

  it('should block heavy piece movement across river', () => {
    game.put({ type: ARTILLERY, color: RED }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const moveD5D8 = moves.find((m) => m.from === 'd5' && m.to === 'd8')
    expect(moveD5D8).toBeUndefined()
  })

  it('should allow light piece movement across river', () => {
    game.put({ type: TANK, color: RED }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const moveD5D7 = moves.find((m) => m.from === 'd5' && m.to === 'd7')
    expect(moveD5D7).toBeDefined()
  })

  it('should allow heavy piece capture across river', () => {
    game.put({ type: ARTILLERY, color: RED }, 'd5')
    game.put({ type: INFANTRY, color: BLUE }, 'd8')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureD5D8 = moves.find((m) => m.from === 'd5' && m.to === 'd8')
    expect(captureD5D8).toBeDefined()
  })

  it('should allow heavy piece capture enemy navy at sea', () => {
    game.put({ type: ARTILLERY, color: RED }, 'd5')
    game.put({ type: NAVY, color: BLUE }, 'b5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const captureD5B5 = moves.find(
      (m) => m.from === 'd5' && m.to === 'b5' && m.captured?.[0]?.type === NAVY,
    )
    expect(captureD5B5).toBeDefined()
  })

  it('should allow air force to fly to navy at sea and combine', () => {
    game.put({ type: AIR_FORCE, color: RED }, 'e2')
    game.put({ type: NAVY, color: RED }, 'a2')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const combineE2A2 = moves.find((m) => m.from === 'e2' && m.to === 'a2')
    expect(combineE2A2).toBeDefined()
  })

  it('should not allow navy to create combination with air force on land', () => {
    game.put({ type: AIR_FORCE, color: RED }, 'e2')
    game.put({ type: NAVY, color: RED }, 'b2')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as StandardMove[]
    const combineE2B2 = moves.find((m) => m.from === 'b2' && m.to === 'e2')
    expect(combineE2B2).toBeUndefined()
  })
})
describe('move sequence', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })
  it('sequence of moves from initial position', () => {
    const game = new CoTuLenh()

    // Verify initial position
    expect(game.fen()).toBe(DEFAULT_POSITION)

    // First move: Red Air Force to b2 combined
    const move1 = game.move('F&b2')
    expect(move1).toBeInstanceOf(StandardMove)
    expect(game['_turn']).toBe(BLUE)

    // Second move: Blue commander to e12
    const move2 = game.move('Ce12')
    expect(move2).toBeInstanceOf(StandardMove)
    expect(game['_turn']).toBe(RED)

    // Third move: Red navy move forward to b6
    const move3 = game.move('(NF)b6')
    expect(move3).toBeInstanceOf(StandardMove)
    expect(game['_turn']).toBe(BLUE)

    // Fourth move: Blue Commander return
    const move4 = game.move('Cg12')
    expect(move4).toBeInstanceOf(StandardMove)
    expect(game['_turn']).toBe(RED)

    game.moves()

    // Verify move history
    const history = game.history({ verbose: true })
    expect(history).toHaveLength(4)
    expect(history[0].san).toContain('F&b2')
    expect(history[1].san).toBe('Ce12')
    expect(history[2].san).toBe('(NF)b6')
    expect(history[3].san).toBe('Cg12')
  })
})

describe('Re run random fail move', () => {
  //   //TODO: DeployMove: modify InternalMove generation to include instruction for what piece can move with the moving piece
  //   // it('should fail move if move is invalid', () => {
  //   //   const game = new CoTuLenh("10c/1n2fh2f2/9a1/4(eag)t1sg2/6m4/11/11/3EG1MA2I/4ATT1G2/6S4/5H1HF2/1N5C3 b - - 10 14")
  //   //   const move = {
  //   //     color: "b",
  //   //     from: 52,
  //   //     to: 36,
  //   //     piece: {
  //   //       type: "e",
  //   //       color: "b",
  //   //       heroic: false,
  //   //       carrying: undefined,
  //   //     },
  //   //     flags: 9,
  //   //   } as InternalMove
  //   //   const result = game['_makeMove'](move)
  //   //   expect(result).toBeInstanceOf(StandardMove)
  //   // })

  // TODO: Update this test to use handleDeployMove()
  /*
  it('should deploy move', () => {
    const game = new CoTuLenh(
      '11/1n2fh1h3/3a2s2a(+fc)/2n1gt1tg2/2ie2m3i/11/NN1E7/2I3M4/4GT1TG2/6S2A1/2A1FH1HF2/6C4 b - - 3 6',
    )
    const deployMoveRequest = {
      from: 'k10',
      moves: [
        {
          piece: {
            type: 'f',
            color: 'b',
            heroic: true,
          },
          to: 'f5',
        },
      ],
      stay: {
        type: 'c',
        color: 'b',
        heroic: false,
      },
    } as DeployMoveRequest
    const move = game.deployMove(deployMoveRequest)
    expect(move).toBeInstanceOf(DeploySequence)
  })
  */
  it('should filter illegal move commander to check', () => {
    const game = new CoTuLenh(
      '2c8/1n2fh1hf2/1N1a2s2a1/2n1gt1tg2/2ie2m3i/11/11/2IE2M3I/2N1GT1TG2/3A2S2A1/4FH1HF2/6C4 b - - 3 2',
    )
    const moves = game.moves({
      pieceType: COMMANDER,
      verbose: true,
    }) as StandardMove[]
    expect(moves.find((m) => m.to === 'd12')).toBeUndefined()
    expect(moves).toHaveLength(7)
  })

  it('should maintain RED turn during deploy move sequence until carrier moves', () => {
    // Setup: Use a simpler board configuration
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: COMMANDER, color: RED }, 'f1')
    game.put({ type: COMMANDER, color: BLUE }, 'g12')

    // Put a Tank carrying Militia at f4 - Tank is the carrier
    const carrierStack = {
      type: TANK,
      color: RED,
      carrying: [{ type: MILITIA, color: RED }],
    } as Piece
    game.put(carrierStack, 'f4')
    game.put({ type: MILITIA, color: BLUE }, 'g7')

    game['_turn'] = RED

    // Execute deploy move: Militia (from carrying) deploys to f5
    const moveResult1 = game.move({ from: 'f4', to: 'f5', piece: MILITIA })
    expect(moveResult1).not.toBeNull()
    expect(moveResult1!.isDeploy).toBe(true)

    // Verify piece states after Militia deploy
    expect(game.get('f5')?.type).toBe(MILITIA)
    expect(game.get('f5')?.color).toBe(RED)
    expect(game.get('f4')?.type).toBe(TANK) // Carrier Tank stays at f4
    expect(game.get('f4')?.carrying).toBeUndefined() // No more carrying

    // Turn should still be RED since carrier hasn't moved
    expect(game.turn()).toBe(RED)

    // Verify we can still move the carrier Tank
    const legalMoves = game.moves({ verbose: true }) as StandardMove[]
    const tankMoves = legalMoves.filter((m) => m.from === 'f4')
    expect(tankMoves.length).toBeGreaterThan(0)

    // Now move the Tank (carrier piece) to complete deploy sequence
    // Use the first available legal move for the Tank
    const tankMove = tankMoves[0]
    const moveResult2 = game.move({ from: 'f4', to: tankMove.to })
    expect(moveResult2).not.toBeNull()

    // Verify final piece positions
    expect(game.get(tankMove.to)?.type).toBe(TANK)
    expect(game.get(tankMove.to)?.color).toBe(RED)
    expect(game.get('f4')).toBeUndefined()

    // After carrier moves, deployment is complete and turn changes to BLUE
    expect(game.turn()).toBe(BLUE)
    // Make the blue move here and verify it work
    const moveResult3 = game.move({ from: 'g7', to: 'g6', piece: MILITIA })
    expect(moveResult3).not.toBeNull()
    expect(moveResult3!.isDeploy).toBe(false)
    expect(game.turn()).toBe(RED)
  })
})
