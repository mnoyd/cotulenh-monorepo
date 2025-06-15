import { CoTuLenh, DeployMove, Move, DeployMoveRequest } from '../src/cotulenh'
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
} from '../src/type'
import { setupGameBasic } from './test-helpers'

describe('CoTuLenh Stay Capture Logic', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  test('Land piece (Tank) capturing on Land should REPLACE', () => {
    game.put({ type: TANK, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = RED // Access private for test setup

    const moves = game.moves({ verbose: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd4' &&
        m.to === 'd5' &&
        m.piece.type === TANK &&
        m.captured?.type === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('d5')
    expect(captureMove?.captured?.type).toBe(INFANTRY)
  })

  test('Heavy piece (Artillery) capturing across river on Land should REPLACE', () => {
    game.put({ type: ARTILLERY, color: RED }, 'i5')
    game.put({ type: INFANTRY, color: BLUE }, 'i8')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'i5' &&
        m.to === 'i8' &&
        m.piece.type === ARTILLERY &&
        m.captured?.type === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('i8')
    expect(captureMove?.captured?.type).toBe(INFANTRY)
  })

  test('Navy capturing Navy on Water should REPLACE', () => {
    game.put({ type: NAVY, color: RED }, 'b3')
    game.put({ type: NAVY, color: BLUE }, 'b5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'b3' &&
        m.to === 'b5' &&
        m.piece.type === NAVY &&
        m.captured?.type === NAVY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('b5')
    expect(captureMove?.captured?.type).toBe(NAVY)
  })

  test('Navy capturing Land piece on Mixed terrain (c file) should REPLACE', () => {
    game.put({ type: NAVY, color: RED }, 'c4')
    game.put({ type: TANK, color: BLUE }, 'c5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'c4' &&
        m.to === 'c5' &&
        m.piece.type === NAVY &&
        m.captured?.type === TANK
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('c5')
    expect(captureMove?.captured?.type).toBe(TANK)
  })

  test('Land piece (Tank) capturing Navy on pure Water should STAY', () => {
    // Tank d3, Navy b3
    game.put({ type: TANK, color: RED }, 'd3')
    game.put({ type: NAVY, color: BLUE }, 'b3')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd3' &&
        m.to === 'b3' &&
        m.piece.type === TANK &&
        m.captured?.type === NAVY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(true)
    expect(captureMove?.from).toBe('d3')
    expect(captureMove?.to).toBe('b3') // Tank stays
    expect(captureMove?.captured?.type).toBe(NAVY)
  })

  test('Navy capturing Land piece on pure Land should STAY', () => {
    // Navy c3, Tank f3 (range 3)
    game.put({ type: NAVY, color: RED }, 'c3')
    game.put({ type: TANK, color: BLUE }, 'f3')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'c3' &&
        m.to === 'f3' &&
        m.piece.type === NAVY &&
        m.captured?.type === TANK
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(true)
    expect(captureMove?.from).toBe('c3')
    expect(captureMove?.to).toBe('f3') // Navy stays
    expect(captureMove?.captured?.type).toBe(TANK)
  })

  test('Air Force capturing Navy kamikaze', () => {
    // AF d2, Navy b2
    game.put({ type: AIR_FORCE, color: RED }, 'd2')
    game.put({ type: NAVY, color: BLUE }, 'b2')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const suicideCaptureMove = moves.find((m) => {
      return (
        m.from === 'd2' &&
        m.to === 'b2' &&
        m.piece.type === AIR_FORCE &&
        m.captured?.type === NAVY
      )
    })

    expect(suicideCaptureMove).toBeDefined()
    expect(suicideCaptureMove?.isSuicideCapture()).toBe(true)
    expect(suicideCaptureMove?.from).toBe('d2')
    expect(suicideCaptureMove?.to).toBe('b2') // AF stays
    expect(suicideCaptureMove?.captured?.type).toBe(NAVY)
  })

  test('Air Force capturing Land piece on Land should REPLACE', () => {
    game.put({ type: AIR_FORCE, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd4' &&
        m.to === 'd5' &&
        m.piece.type === AIR_FORCE &&
        m.captured?.type === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('d5')
    expect(captureMove?.captured?.type).toBe(INFANTRY)
  })
})

describe('Move History and Undo', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = new CoTuLenh(DEFAULT_POSITION) // Start with default position
  })

  test('history() should record moves correctly (simple and verbose)', () => {
    const move1 = game.move({ from: 'c5', to: 'c6' }) // Red Infantry forward
    const move2 = game.move({ from: 'g8', to: 'g7' }) // Blue Militia forward

    expect(move1).not.toBeNull()
    expect(move2).not.toBeNull()

    const historySimple = game.history()
    const historyVerbose = game.history({ verbose: true }) as Move[]

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

  test('undo() should revert the last move', () => {
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

  test('undo() multiple moves', () => {
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

  test('undo() a suicide capture move', () => {
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

  test('move() should accept basic SAN strings', () => {
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

  test('move() should handle SAN for captures', () => {
    // Setup: Red Infantry d4, Blue Infantry d5
    game.load('5c5/11/11/11/11/11/11/3i7/3I7/11/11/4C6 r - - 0 1')
    const move = game.move('Id4xd5') // Capture using SAN

    expect(move).not.toBeNull()
    expect(move?.san).toBe('Ixd5')
    expect(move?.isCapture()).toBe(true)
    expect(game.get('d5')?.type).toBe(INFANTRY)
    expect(game.get('d5')?.color).toBe(RED)
    expect(game.get('d4')).toBeUndefined()
  })

  test('move() should handle SAN for stay captures', () => {
    // Setup: Red AF d2, Blue Navy b2
    game.load('5c5/11/11/11/11/11/11/11/11/11/1n1F7/4C6 r - - 0 1')
    //TODO update ambiguous moves SAN
    const move = game.move('Fd2@b2') // Stay capture SAN

    expect(move).not.toBeNull()
    expect(move?.isSuicideCapture()).toBe(true)
    expect(move?.san).toBe('F@b2')
    expect(move?.from).toBe('d2')
    expect(move?.to).toBe('b2') // Piece ends up at origin
    expect(move?.captured?.type).toBe(NAVY)
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

  test('Sliding piece (Tank) should be blocked by friendly pieces', () => {
    // Setup: Red Tank at d3, Red Infantry at d4
    game.put({ type: TANK, color: RED }, 'd3')
    game.put({ type: INFANTRY, color: RED }, 'd4')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]

    // Tank should not be able to move to d5 (beyond the blocking Infantry)
    const moveToD5 = moves.find((m) => m.from === 'd3' && m.to === 'd5')
    expect(moveToD5).toBeUndefined()

    // Tank should be able to move to other squares that aren't blocked
    const moveToE3 = moves.find((m) => m.from === 'd3' && m.to === 'e3')
    expect(moveToE3).toBeDefined()
  })

  test('Non-sliding piece (Infantry) should be blocked by friendly pieces', () => {
    // Setup: Red Infantry at d4, Red Tank at d5
    game.put({ type: INFANTRY, color: RED }, 'd4')
    game.put({ type: TANK, color: RED }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]

    // Infantry should not be able to move to d5 (occupied by friendly Tank)
    const moveToD5 = moves.find((m) => m.from === 'd5' && m.to === 'd3')
    expect(moveToD5).toBeUndefined()

    // Infantry should be able to move to other valid squares
    const moveToE4 = moves.find((m) => m.from === 'd5' && m.to === 'e5')
    expect(moveToE4).toBeDefined()
  })

  test('Air Force should ignore piece blocking', () => {
    // Setup: Red Air Force at d4, Red Infantry at d5, Blue Tank at d6
    game.put({ type: AIR_FORCE, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: RED }, 'd5')
    game.put({ type: TANK, color: BLUE }, 'd6')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]

    // Air Force should be able to move beyond friendly Infantry
    const moveToD7 = moves.find((m) => m.from === 'd4' && m.to === 'd7')
    expect(moveToD7).toBeDefined()

    // Air Force should be able to capture enemy Tank
    const captureD6 = moves.find(
      (m) => m.from === 'd4' && m.to === 'd6' && m.captured?.type === TANK,
    )
    expect(captureD6).toBeDefined()
  })

  test('Artillery should be blocked for movement but not for capture', () => {
    // Setup: Red Artillery at d3, Red Infantry at d4, Blue Tank at d5
    game.put({ type: ARTILLERY, color: RED }, 'd3')
    game.put({ type: INFANTRY, color: RED }, 'd4')
    game.put({ type: TANK, color: BLUE }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]

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

  test('Navy should ignore friendly piece blocking', () => {
    // Setup: Red Navy at b3, Red Navy at b4, Blue Navy at b5
    game.put({ type: NAVY, color: RED }, 'b3')
    game.put({ type: NAVY, color: RED }, 'b4')
    game.put({ type: NAVY, color: BLUE }, 'b6')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]

    // Navy should be able to move beyond friendly Navy
    const moveToB6 = moves.find((m) => m.from === 'b3' && m.to === 'b6')
    expect(moveToB6).toBeDefined()

    // Navy should be able to capture enemy Navy
    const captureB6 = moves.find(
      (m) => m.from === 'b3' && m.to === 'b6' && m.captured?.type === NAVY,
    )
    expect(captureB6).toBeDefined()
  })

  test('Tank special rule: cannot shoot over blocking piece at range 2', () => {
    // Setup: Red Tank at d3, Red Infantry at d4, Blue Infantry at d5
    game.put({ type: TANK, color: RED }, 'd3')
    game.put({ type: INFANTRY, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]

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
  test('should generate all possible moves from initial position', () => {
    game.clear()
    game = new CoTuLenh()
    const moves = game.moves({ verbose: true }) as Move[]
    expect(moves.length).toBe(116)
  })
  test('should correctly filter moves by piece type', () => {
    const carried: Piece = { type: INFANTRY, color: RED }
    game.put({ type: TANK, color: RED, carrying: [carried] }, 'c2')
    game.load(game.fen())
    game['_turn'] = RED

    const allMoves = game.moves({ verbose: true }) as Move[]
    const filteredMoves = game.moves({
      verbose: true,
      pieceType: INFANTRY,
    }) as Move[]
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

  test('should block heavy piece movement across river', () => {
    game.put({ type: ARTILLERY, color: RED }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const moveD5D8 = moves.find((m) => m.from === 'd5' && m.to === 'd8')
    expect(moveD5D8).toBeUndefined()
  })

  test('should allow light piece movement across river', () => {
    game.put({ type: TANK, color: RED }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const moveD5D7 = moves.find((m) => m.from === 'd5' && m.to === 'd7')
    expect(moveD5D7).toBeDefined()
  })

  test('should allow heavy piece capture across river', () => {
    game.put({ type: ARTILLERY, color: RED }, 'd5')
    game.put({ type: INFANTRY, color: BLUE }, 'd8')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const captureD5D8 = moves.find((m) => m.from === 'd5' && m.to === 'd8')
    expect(captureD5D8).toBeDefined()
  })

  test('should allow heavy piece capture enemy navy at sea', () => {
    game.put({ type: ARTILLERY, color: RED }, 'd5')
    game.put({ type: NAVY, color: BLUE }, 'b5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const captureD5B5 = moves.find(
      (m) => m.from === 'd5' && m.to === 'b5' && m.captured?.type === NAVY,
    )
    expect(captureD5B5).toBeDefined()
  })

  test('should allow air force to fly to navy at sea and combine', () => {
    game.put({ type: AIR_FORCE, color: RED }, 'e2')
    game.put({ type: NAVY, color: RED }, 'a2')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const combineE2A2 = moves.find((m) => m.from === 'e2' && m.to === 'a2')
    expect(combineE2A2).toBeDefined()
  })

  test('should not allow navy to create combination with air force on land', () => {
    game.put({ type: AIR_FORCE, color: RED }, 'e2')
    game.put({ type: NAVY, color: RED }, 'b2')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true }) as Move[]
    const combineE2B2 = moves.find((m) => m.from === 'b2' && m.to === 'e2')
    expect(combineE2B2).toBeUndefined()
  })
})
describe('move sequesce', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })
  test('sequence of moves from initial position', () => {
    const game = new CoTuLenh()

    // Verify initial position
    expect(game.fen()).toBe(DEFAULT_POSITION)

    // First move: Red Air Force to b2 combined
    const move1 = game.move('F&b2')
    expect(move1).toBeInstanceOf(Move)
    expect(game['_turn']).toBe(BLUE)

    // Second move: Blue commander to e12
    const move2 = game.move('Ce12')
    expect(move2).toBeInstanceOf(Move)
    expect(game['_turn']).toBe(RED)

    // Third move: Red navy move forward to b6
    const move3 = game.move('(NF)b6')
    expect(move3).toBeInstanceOf(Move)
    expect(game['_turn']).toBe(BLUE)

    // Fourth move: Blue Commander return
    const move4 = game.move('Cg12')
    expect(move4).toBeInstanceOf(Move)
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
  //   // test('should fail move if move is invalid', () => {
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
  //   //   expect(result).toBeInstanceOf(Move)
  //   // })

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
    expect(move).toBeInstanceOf(DeployMove)
  })
  it('should filter illegal move commander to check', () => {
    const game = new CoTuLenh(
      '2c8/1n2fh1hf2/1N1a2s2a1/2n1gt1tg2/2ie2m3i/11/11/2IE2M3I/2N1GT1TG2/3A2S2A1/4FH1HF2/6C4 b - - 3 2',
    )
    const moves = game.moves({ pieceType: COMMANDER, verbose: true }) as Move[]
    expect(moves.find((m) => m.to === 'd12')).toBeUndefined()
    expect(moves).toHaveLength(7)
  })
})

describe('Move generate test', () => {
  it('should generate move', () => {
    const game = new CoTuLenh(
      '3c7/1(nf)3h1h3/6s4/4gt1(tm)g2/2(ni)(ea)4(ea)1(fi)/11/7(FTC)2I/1NIE2M1GE1/2(NFT)1G6/3A2S2A1/5H1H3/11 r - - 22 12',
    )
    const moves = game.moves({ verbose: true }) as Move[]
    expect(moves.length).toBeGreaterThan(0)
  })
  it('should generate move', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/11/6(FTI)4/1(NFT)9/11/11/11/5C5 r - - 0 1',
    )
    const moves = game.moves({ verbose: true }) as Move[]
    expect(moves.length).toBeGreaterThan(0)
  })
})
