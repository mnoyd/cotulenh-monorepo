import {
  CoTuLenh,
  TANK,
  RED,
  Move, // Import Move type for verbose output
  Square, // Import Square type
  PieceSymbol, // Import PieceSymbol
  AIR_FORCE, // Import AIR_FORCE
  MISSILE, // Import MISSILE
} from '../src/cotulenh'

// Simplified helper to check if a move exists in the verbose list
// (We don't need all options of findVerboseMove for these basic tests)
const findMove = (
  moves: Move[],
  from: Square,
  to: Square,
): Move | undefined => {
  return moves.find(
    (m) => m.from === from && m.to === to && !m.isDeploy && !m.isStayCapture(),
  )
}

// Helper to extract just the 'to' squares for simple comparison
const getDestinationSquares = (moves: Move[]): Square[] => {
  return moves.map((m) => m.to).sort()
}

describe('Basic TANK Moves on Empty Board', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    game['_turn'] = RED // Set turn for the piece being tested
  })

  it('should return correct moves for TANK in the middle (e4 - Land)', () => {
    const startSquare: Square = 'e4'
    game.put({ type: TANK, color: RED }, startSquare)

    // Get verbose moves for the tank at e4
    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]

    //prettier-ignore
    const expectedDestinations: Square[] = [
                'e6',
                'e5',
      'c4', 'd4',    'f4', 'g4',
                'e3',
                'e2',
    ].sort()
    const actualDestinations = getDestinationSquares(moves)

    // Check specific moves exist
    expect(findMove(moves, startSquare, 'd4')).toBeDefined()
    expect(findMove(moves, startSquare, 'f4')).toBeDefined()
    expect(findMove(moves, startSquare, 'e3')).toBeDefined()
    expect(findMove(moves, startSquare, 'e5')).toBeDefined()

    // Check the overall list of destinations
    expect(actualDestinations).toEqual(expectedDestinations)
    expect(moves).toHaveLength(8) // Ensure only the expected moves are present
  })

  it('should return NO moves for TANK at the edge (a1 - Navy)', () => {
    const startSquare: Square = 'a1'
    game.put({ type: TANK, color: RED }, startSquare)

    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]
    const actualDestinations = getDestinationSquares(moves)

    expect(actualDestinations).toEqual([])
    expect(moves).toHaveLength(0)
  })

  it('should return NO moves for TANK at the coast (c6 - Coast/River)', () => {
    const startSquare: Square = 'c6'
    game.put({ type: TANK, color: RED }, startSquare)

    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]

    //prettier-ignore
    const expectedDestinations: Square[] = [
      'c8',
      'c7',
            'd6', 'e6',
      'c5',
      'c4',
    ].sort()
    const actualDestinations = getDestinationSquares(moves)

    // Check specific moves exist
    expect(findMove(moves, startSquare, 'c4')).toBeDefined()
    expect(findMove(moves, startSquare, 'c5')).toBeDefined()
    expect(findMove(moves, startSquare, 'c7')).toBeDefined()
    expect(findMove(moves, startSquare, 'c8')).toBeDefined()
    expect(findMove(moves, startSquare, 'd6')).toBeDefined()
    expect(findMove(moves, startSquare, 'e6')).toBeDefined()

    // Check the overall list of destinations
    expect(actualDestinations).toEqual(expectedDestinations)
    expect(moves).toHaveLength(6) // Ensure only the expected moves are present
  })

  // TODO: Add more Tank tests (corners, edges, near river)
})

describe('Basic MISSILE Moves on Empty Board', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    game['_turn'] = RED // Set turn for the piece being tested
  })

  test('Missile basic moves from g3 (Land - middle)', () => {
    const startSquare: Square = 'g3'
    game.put({ type: MISSILE, color: RED }, startSquare)

    // Use verbose moves as required by findMove helper
    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]
    const actualDestinations = getDestinationSquares(moves)

    // Missile moves in a circular pattern with radius 2
    // - 2 steps in orthogonal directions
    // - 1 step in diagonal directions

    //prettier-ignore
    const expectedDestinations: Square[] = [
                'g5',
          'f4', 'g4', 'h4',
    'e3', 'f3',       'h3', 'i3',
          'f2', 'g2', 'h2',
                'g1',
    ].sort();

    // Check individual orthogonal moves (2 steps away)
    expect(findMove(moves, startSquare, 'g5')).toBeDefined() // N (2 steps)
    expect(findMove(moves, startSquare, 'i3')).toBeDefined() // E (2 steps)
    expect(findMove(moves, startSquare, 'g1')).toBeDefined() // S (2 steps)
    expect(findMove(moves, startSquare, 'e3')).toBeDefined() // W (2 steps)

    // Check individual orthogonal moves (1 step away)
    expect(findMove(moves, startSquare, 'g4')).toBeDefined() // N (1 step)
    expect(findMove(moves, startSquare, 'g2')).toBeDefined() // E (1 step)
    expect(findMove(moves, startSquare, 'h3')).toBeDefined() // S (1 step)
    expect(findMove(moves, startSquare, 'f3')).toBeDefined() // W (1 step)

    // Check individual diagonal moves (1 step only)
    expect(findMove(moves, startSquare, 'f4')).toBeDefined() // NW (1 step)
    expect(findMove(moves, startSquare, 'h4')).toBeDefined() // NE (1 step)
    expect(findMove(moves, startSquare, 'h2')).toBeDefined() // SE (1 step)
    expect(findMove(moves, startSquare, 'f2')).toBeDefined() // SW (1 step)

    // Check the overall list of destinations matches expected
    expect(moves).toHaveLength(expectedDestinations.length)
    expect(actualDestinations).toEqual(expectedDestinations)
  })

  test('Missile move with obstacles', () => {
    const startSquare: Square = 'g3'
    game.put({ type: MISSILE, color: RED }, startSquare)

    // Place a piece that blocks orthogonal movement in one direction
    game.put({ type: TANK, color: RED }, 'g4') // Friendly piece blocks N direction

    // Use verbose moves
    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]

    //prettier-ignore
    const expectedDestinations: Square[] = [
            'f4',       'h4',
      'e3', 'f3',       'h3', 'i3',
            'f2', 'g2', 'h2',
                  'g1',
    ].sort()
    const actualDestinations = getDestinationSquares(moves)

    // With a piece at g3, the missile can't move to g5
    expect(findMove(moves, startSquare, 'g5')).toBeUndefined()
    expect(findMove(moves, startSquare, 'g4')).toBeUndefined()

    // But it should still be able to move to other valid squares
    // Check individual orthogonal moves (2 steps away)
    expect(findMove(moves, startSquare, 'i3')).toBeDefined() // E (2 steps)
    expect(findMove(moves, startSquare, 'g1')).toBeDefined() // S (2 steps)
    expect(findMove(moves, startSquare, 'e3')).toBeDefined() // W (2 steps)

    // Check individual orthogonal moves (1 step away)
    expect(findMove(moves, startSquare, 'g2')).toBeDefined() // E (1 step)
    expect(findMove(moves, startSquare, 'h3')).toBeDefined() // S (1 step)
    expect(findMove(moves, startSquare, 'f3')).toBeDefined() // W (1 step)

    // Check individual diagonal moves (1 step only)
    expect(findMove(moves, startSquare, 'f4')).toBeDefined() // NW (1 step)
    expect(findMove(moves, startSquare, 'h4')).toBeDefined() // NE (1 step)
    expect(findMove(moves, startSquare, 'h2')).toBeDefined() // SE (1 step)
    expect(findMove(moves, startSquare, 'f2')).toBeDefined() // SW (1 step)
    // Check the overall list of destinations matches expected
    expect(moves).toHaveLength(expectedDestinations.length)
    expect(actualDestinations).toEqual(expectedDestinations)
  })

  test('Missile basic moves near the board edge', () => {
    const startSquare: Square = 'c1'
    game.put({ type: MISSILE, color: RED }, startSquare)

    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]

    //prettier-ignore
    const expectedDestinations: Square[] = [
    'c3',
    'c2', 'd2',
          'd1', 'e1',
    ].sort();
    const actualDestinations = getDestinationSquares(moves)

    // Test that the missile respects board boundaries
    // Movements toward the edge should be limited
    expect(findMove(moves, startSquare, 'c2')).toBeDefined() // W (1 step allowed)
    expect(findMove(moves, startSquare, 'd1')).toBeDefined() // S (1 step allowed)

    // Check the overall list of destinations matches expected
    expect(moves).toHaveLength(expectedDestinations.length)
    expect(actualDestinations).toEqual(expectedDestinations)
  })
})

describe('Basic AIR_FORCE Moves on Empty Board', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    game['_turn'] = RED // Set turn for the piece being tested
  })

  test('Air Force basic moves from g5 (Land)', () => {
    const startSquare: Square = 'g5'
    game.put({ type: AIR_FORCE, color: RED }, startSquare)

    // Use verbose moves as required by findMove helper
    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]
    const actualDestinations = getDestinationSquares(moves)

    // Air Force moves one square in any direction to land/mixed/air
    //prettier-ignore
    const expectedDestinations: Square[] = [
    'c9',                   'g9',                   'k9',
          'd8',             'g8',             'j8',
                'e7',       'g7',       'i7',
                      'f6', 'g6', 'h6',
    'c5', 'd5', 'e5', 'f5',       'h5', 'i5', 'j5', 'k5',
                      'f4', 'g4', 'h4',
                'e3',       'g3',       'i3',
          'd2',             'g2',             'j2',
    'c1',                   'g1',                   'k1'
    ].sort();

    // Check individual moves
    expectedDestinations.forEach((dest) => {
      expect(findMove(moves, startSquare, dest)).toBeDefined()
    })

    // Check the overall list of destinations
    expect(actualDestinations).toEqual(expectedDestinations)
    expect(moves).toHaveLength(expectedDestinations.length)
  })

  test('Air Force basic moves from c5 (Coast)', () => {
    const startSquare: Square = 'c5'
    game.put({ type: AIR_FORCE, color: RED }, startSquare)

    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]
    const actualDestinations = getDestinationSquares(moves)
    //prettier-ignore
    const expectedDestinations: Square[] = [
      'c9',                   'g9',
      'c8',             'f8',
      'c7',       'e7',
      'c6', 'd6',
            'd5', 'e5', 'f5', 'g5',
      'c4', 'd4',
      'c3',       'e3',
      'c2',             'f2',
      'c1',                   'g1',
      ].sort();

    expectedDestinations.forEach((dest) => {
      expect(findMove(moves, startSquare, dest)).toBeDefined()
    })
    expect(actualDestinations).toEqual(expectedDestinations)
    expect(moves).toHaveLength(expectedDestinations.length)
  })

  test('Air Force basic moves from a1 (Water)', () => {
    const startSquare: Square = 'a1'
    game.put({ type: AIR_FORCE, color: RED }, startSquare)

    const moves = game.moves({
      square: startSquare,
      verbose: true,
      ignoreSafety: true,
    }) as Move[]
    const actualDestinations = getDestinationSquares(moves)
    // Air Force can move to adjacent land/water/mixed
    //prettier-ignore
    const expectedDestinations: Square[] = [
                      'e5',
                'd4',
          'c3',

          'c1', 'd1', 'e1',
    ].sort();

    expectedDestinations.forEach((dest) => {
      expect(findMove(moves, startSquare, dest)).toBeDefined()
    })
    expect(actualDestinations).toEqual(expectedDestinations)
    expect(moves).toHaveLength(expectedDestinations.length)
  })

  // TODO: Add more Air Force tests (corners, edges, over water)
})

// Add tests for other pieces (e.g., NAVY unit on these squares)
// Example: NAVY on e4 (Land) should likely have 0 moves
// Example: NAVY on a1 (Navy) should have moves like a2, b1
