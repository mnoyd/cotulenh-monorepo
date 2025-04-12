import {
  CoTuLenh,
  Move,
  RED,
  BLUE,
  NAVY,
  AIR_FORCE,
  INFANTRY,
  MILITIA,
  COMMANDER,
  TANK,
  ENGINEER,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
  HEADQUARTER,
  Square,
  PieceSymbol,
  DEFAULT_POSITION,
} from '../src/cotulenh'

describe('CoTuLenh Stay Capture Logic', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  test('Land piece (Tank) capturing on Land should REPLACE', () => {
    game.put({ type: TANK, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = RED // Access private for test setup

    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd4' &&
        m.to === 'd5' &&
        m.piece === TANK &&
        m.captured === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('d5')
    expect(captureMove?.captured).toBe(INFANTRY)
  })

  test('Heavy piece (Artillery) capturing across river on Land should REPLACE', () => {
    game.put({ type: ARTILLERY, color: RED }, 'i5')
    game.put({ type: INFANTRY, color: BLUE }, 'i8')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'i5' &&
        m.to === 'i8' &&
        m.piece === ARTILLERY &&
        m.captured === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('i8')
    expect(captureMove?.captured).toBe(INFANTRY)
  })

  test('Navy capturing Navy on Water should REPLACE', () => {
    game.put({ type: NAVY, color: RED }, 'b3')
    game.put({ type: NAVY, color: BLUE }, 'b5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'b3' &&
        m.to === 'b5' &&
        m.piece === NAVY &&
        m.captured === NAVY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('b5')
    expect(captureMove?.captured).toBe(NAVY)
  })

  test('Navy capturing Land piece on Mixed terrain (c file) should REPLACE', () => {
    game.put({ type: NAVY, color: RED }, 'c4')
    game.put({ type: TANK, color: BLUE }, 'c5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'c4' &&
        m.to === 'c5' &&
        m.piece === NAVY &&
        m.captured === TANK
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('c5')
    expect(captureMove?.captured).toBe(TANK)
  })

  test('Land piece (Tank) capturing Navy on pure Water should STAY', () => {
    // Tank d3, Navy b3
    game.put({ type: TANK, color: RED }, 'd3')
    game.put({ type: NAVY, color: BLUE }, 'b3')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd3' &&
        m.to === 'd3' &&
        m.piece === TANK &&
        m.captured === NAVY &&
        m.targetSquare === 'b3'
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(true)
    expect(captureMove?.from).toBe('d3')
    expect(captureMove?.to).toBe('d3') // Tank stays
    expect(captureMove?.captured).toBe(NAVY)
    expect(captureMove?.targetSquare).toBe('b3')
  })

  test('Navy capturing Land piece on pure Land should STAY', () => {
    // Navy c3, Tank f3 (range 3)
    game.put({ type: NAVY, color: RED }, 'c3')
    game.put({ type: TANK, color: BLUE }, 'f3')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'c3' &&
        m.to === 'c3' &&
        m.piece === NAVY &&
        m.captured === TANK &&
        m.targetSquare === 'f3'
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(true)
    expect(captureMove?.from).toBe('c3')
    expect(captureMove?.to).toBe('c3') // Navy stays
    expect(captureMove?.captured).toBe(TANK)
    expect(captureMove?.targetSquare).toBe('f3')
  })

  test('Air Force capturing Navy on pure Water should STAY', () => {
    // AF d2, Navy b2
    game.put({ type: AIR_FORCE, color: RED }, 'd2')
    game.put({ type: NAVY, color: BLUE }, 'b2')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd2' &&
        m.to === 'd2' &&
        m.piece === AIR_FORCE &&
        m.captured === NAVY &&
        m.targetSquare === 'b2'
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(true)
    expect(captureMove?.from).toBe('d2')
    expect(captureMove?.to).toBe('d2') // AF stays
    expect(captureMove?.captured).toBe(NAVY)
    expect(captureMove?.targetSquare).toBe('b2')
  })

  test('Air Force capturing Land piece on Land should REPLACE', () => {
    game.put({ type: AIR_FORCE, color: RED }, 'd4')
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = RED

    const moves = game.moves({ verbose: true, ignoreSafety: true }) as Move[]
    const captureMove = moves.find((m) => {
      return (
        m.from === 'd4' &&
        m.to === 'd5' &&
        m.piece === AIR_FORCE &&
        m.captured === INFANTRY
      )
    })

    expect(captureMove).toBeDefined()
    expect(captureMove?.isStayCapture()).toBe(false)
    expect(captureMove?.to).toBe('d5')
    expect(captureMove?.captured).toBe(INFANTRY)
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
    expect(historySimple[0]).toMatch(/^Ic5-c6/)
    expect(historySimple[1]).toMatch(/^Mg8-g7/)

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

  test('undo() a stay capture move', () => {
    // Setup: Red Air Force d2, Blue Navy b2
    game.load('5c5/11/11/11/11/11/11/11/11/11/1n1F7/5C5 r - - 0 1')
    const initialFen = game.fen()
    const move = game.move({ from: 'd2', to: 'b2', stay: true }) // AF attacks Navy

    expect(move).not.toBeNull()
    expect(game.get('d2')?.type).toBe(AIR_FORCE) // AF stays
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
    expect(move?.san).toBe('Ic5-c6') // Basic SAN format
    expect(game.fen()).not.toBe(initialFen)
    expect(game.get('c5')).toBeUndefined()
    expect(game.get('c6')?.type).toBe(INFANTRY)
    expect(game.get('c6')?.color).toBe(RED)
  })

  test('move() should handle SAN for captures', () => {
    // Setup: Red Infantry d4, Blue Infantry d5
    game.load('5c5/11/11/11/11/11/11/3i7/3I7/11/11/5C5 r - - 0 1')
    const move = game.move('Id4xd5') // Capture using SAN

    expect(move).not.toBeNull()
    expect(move?.san).toBe('Id4xd5')
    expect(move?.captured).toBe(INFANTRY)
    expect(game.get('d5')?.type).toBe(INFANTRY)
    expect(game.get('d5')?.color).toBe(RED)
    expect(game.get('d4')).toBeUndefined()
  })

  test('move() should handle SAN for stay captures', () => {
    // Setup: Red AF d2, Blue Navy b2
    game.load('5c5/11/11/11/11/11/11/11/11/11/1n1F7/5C5 r - - 0 1')
    const move = game.move('Fd2<b2') // Stay capture SAN

    expect(move).not.toBeNull()
    expect(move?.isStayCapture()).toBe(true)
    expect(move?.san).toBe('Fd2<b2')
    expect(move?.from).toBe('d2')
    expect(move?.to).toBe('d2') // Piece ends up at origin
    expect(move?.targetSquare).toBe('b2') // Target was b2
    expect(move?.captured).toBe(NAVY)
    expect(game.get('d2')?.type).toBe(AIR_FORCE)
    expect(game.get('b2')).toBeUndefined()
  })

  // TODO: Add tests for _moveToSan and _moveFromSan directly if needed for more granular checks
  // TODO: Add tests for ambiguous moves SAN if applicable
  // TODO: Add tests for Heroic promotion SAN if implemented
  // TODO: Add tests for Deploy SAN parsing/generation
})
