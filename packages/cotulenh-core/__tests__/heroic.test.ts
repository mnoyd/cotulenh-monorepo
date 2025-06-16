import { CoTuLenh, Move } from '../src/cotulenh'
import {
  BLUE,
  RED,
  INFANTRY,
  TANK,
  HEADQUARTER,
  COMMANDER,
  Square,
  algebraic,
  NAVY,
  AIR_FORCE,
} from '../src/type'
import { setupGameBasic } from './test-helpers'

describe('Heroic Piece Functionality', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  // Helper to make a piece heroic directly
  function makeHeroic(square: Square) {
    const piece = game.get(square)
    if (!piece) return false

    // Remove and put back with heroic status
    game.remove(square)
    return game.put({ ...piece, heroic: true }, square)
  }

  test('Infantry gains diagonal movement when heroic', () => {
    // Place an infantry piece
    game.put({ type: INFANTRY, color: BLUE }, 'd5')
    game['_turn'] = BLUE

    // Get moves before heroic
    const movesBefore = game.moves({
      verbose: true,
      square: 'd5',
    }).singleMoves as Move[]

    // Check for diagonal moves
    const diagonalMovesBefore = movesBefore.filter(
      (m) => m.from === 'd5' && ['c4', 'c6', 'e4', 'e6'].includes(m.to),
    )

    // Regular infantry shouldn't have diagonal moves
    expect(diagonalMovesBefore.length).toBe(0)

    // Make infantry heroic directly
    makeHeroic('d5')

    // Get moves after making it heroic
    const movesAfter = game.moves({
      verbose: true,
      square: 'd5',
    }).singleMoves as Move[]

    // Check for diagonal moves again
    const diagonalMovesAfter = movesAfter.filter(
      (m) => m.from === 'd5' && ['c4', 'c6', 'e4', 'e6'].includes(m.to),
    )

    // Heroic infantry should have diagonal moves
    expect(diagonalMovesAfter.length).toBeGreaterThan(0)
  })

  test('Tank gets +1 to movement range when heroic', () => {
    // Place a tank piece with clear path
    game.put({ type: TANK, color: BLUE }, 'e5')
    game['_turn'] = BLUE

    // Normal tank can move up to 2 spaces
    const movesBeforeHeroic = game.moves({
      verbose: true,
      square: 'e5',
    }).singleMoves as Move[]

    // Check if it can reach e3 (2 spaces away) but not e2 (3 spaces away)
    const canReachE3 = movesBeforeHeroic.some((m) => m.to === 'e3')
    const canReachE2 = movesBeforeHeroic.some((m) => m.to === 'e2')

    expect(canReachE3).toBe(true) // Should reach 2 spaces
    expect(canReachE2).toBe(false) // Shouldn't reach 3 spaces

    // Make tank heroic
    makeHeroic('e5')

    // Get moves again
    const movesAfterHeroic = game.moves({
      verbose: true,
      square: 'e5',
    }).singleMoves as Move[]

    // Now check if it can reach e2 (3 spaces away)
    const canReachE2After = movesAfterHeroic.some((m) => m.to === 'e2')
    expect(canReachE2After).toBe(true) // Should now reach 3 spaces
  })

  test('Heroic headquarters can move like militia', () => {
    // Normal HQ cannot move
    game.put({ type: HEADQUARTER, color: BLUE }, 'd5')
    game['_turn'] = BLUE

    const movesBefore = game.moves({
      verbose: true,
      square: 'd5',
    }).singleMoves as Move[]
    expect(movesBefore.length).toBe(0) // Shouldn't be able to move

    // Make HQ heroic
    makeHeroic('d5')

    // Get moves again
    const movesAfter = game.moves({
      verbose: true,
      square: 'd5',
    }).singleMoves as Move[]

    // Now HQ should move like militia (1 square in any direction)
    expect(movesAfter.length).toBeGreaterThan(0)

    // Check for orthogonal moves
    const orthogonalMoves = movesAfter.filter((m) =>
      ['d4', 'd6', 'c5', 'e5'].includes(m.to),
    )
    expect(orthogonalMoves.length).toBeGreaterThan(0)

    // Check for diagonal moves
    const diagonalMoves = movesAfter.filter((m) =>
      ['c4', 'c6', 'e4', 'e6'].includes(m.to),
    )
    expect(diagonalMoves.length).toBeGreaterThan(0)
  })

  test('Heroic status is reflected in move SAN notation', () => {
    // Setup a piece and make it heroic
    game.put({ type: INFANTRY, color: BLUE }, 'e4')
    game['_turn'] = BLUE
    makeHeroic('e4')

    // Get moves with the heroic piece
    const moves = game.moves({
      verbose: true,
      square: 'e4',
    }).singleMoves as Move[]

    expect(moves.length).toBeGreaterThan(0)

    // Check if SAN notation includes the heroic prefix (+)
    // Note: The FEN output uses '+', but SAN might use '*' or another symbol.
    // Adjust this assertion based on your actual SAN generation logic.
    const firstMove = moves[0]
    expect(firstMove.san).toBeDefined()
    // Assuming '+' is used for heroic in SAN as well for consistency
    expect(firstMove.san?.startsWith('+')).toBe(true)
  })
})

describe('Move makes piece heroic test', () => {
  let game: CoTuLenh

  beforeEach(() => {
    // Use a fresh instance for each test
    game = new CoTuLenh()
    game.clear()
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: COMMANDER, color: RED }, 'f1')
    game.put({ type: INFANTRY, color: RED }, 'c6')
    game.put({ type: INFANTRY, color: BLUE }, 'c7')
  })

  test('Tank becomes heroic after checking commander', () => {
    game.put({ type: TANK, color: RED }, 'e11')
    game['_turn'] = RED

    // Move infantry to d4, attacking the commander
    const moveResult = game.move({ from: 'e11', to: 'e12', piece: TANK }) // Use algebraic notation for move

    // Assertions
    expect(moveResult).not.toBeNull() // Move should be successful
    expect(game.get('e12')?.heroic).toBe(true) // Infantry at d4 should be heroic
    expect(game.turn()).toBe(BLUE) // Turn should switch to Red
    expect(game.isCheck()).toBe(true) // Red should be in check

    // Test undo
    game.undo()
    expect(game.get('e11')?.heroic).toBe(false) // Infantry at d3 should not be heroic
    expect(game.get('e12')).toBeUndefined() // d4 should be empty
    expect(game.turn()).toBe(RED) // Turn should revert to Blue
    expect(game.isCheck()).toBe(false) // Red should not be in check anymore
  })

  test('Infantry becomes heroic after capture that results in check', () => {
    game.put({ type: TANK, color: BLUE }, 'g11')
    game.put({ type: INFANTRY, color: RED }, 'g10')
    game['_turn'] = RED

    // Move tank to capture infantry at c5, checking the commander
    const moveResult = game.move({ from: 'g10', to: 'g11', piece: INFANTRY }) // Use SAN for capture

    // Assertions
    expect(moveResult).not.toBeNull()
    expect(game.get('g11')?.type).toBe(INFANTRY) // Tank should be at c5
    expect(game.get('g11')?.heroic).toBe(true) // Tank at c5 should be heroic
    expect(game.turn()).toBe(BLUE)
    expect(game.isCheck()).toBe(true)

    // Test undo
    game.undo()
    expect(game.get('g10')?.heroic).toBe(false) // Tank at c3 should not be heroic
    expect(game.get('g10')?.type).toBe(INFANTRY) // Red Infantry should be back at c5
    expect(game.turn()).toBe(RED)
    expect(game.isCheck()).toBe(false)
  })

  test('Piece does NOT become heroic if move does not result in check', () => {
    game.put({ type: INFANTRY, color: BLUE }, 'd11')
    game['_turn'] = BLUE

    // Move infantry to d10 (does not attack commander)
    const moveResult = game.move({ from: 'd11', to: 'd10' })

    // Assertions
    expect(moveResult).not.toBeNull()
    expect(game.get('d10')?.heroic).toBe(false) // Infantry should NOT be heroic
    expect(game.turn()).toBe(RED)
    expect(game.isCheck()).toBe(false) // Red should NOT be in check
  })

  test('Piece move result in another piece become heroic', () => {
    game.put({ type: INFANTRY, color: RED, heroic: true }, 'f12')
    game.put({ type: TANK, color: RED }, 'e12')
    game['_turn'] = RED

    // Move infantry to d10 (does not attack commander)
    const moveResult = game.move({ from: 'f12', to: 'f11' })

    // Assertions
    expect(moveResult).not.toBeNull()
    expect(game.get('e12')?.heroic).toBe(true) // Infantry should NOT be heroic
    expect(game.turn()).toBe(BLUE)
    expect(game.isCheck()).toBe(true) // Red should NOT be in check
  })

  test('Nested pieces become heroic if multiple pieces can attack commander after a move', () => {
    game.put(
      { type: NAVY, color: BLUE, carrying: [{ type: AIR_FORCE, color: BLUE }] },
      'b2',
    )
    game['_turn'] = BLUE

    const moveResult = game.move({
      from: 'b2',
      to: 'c1',
      piece: NAVY,
      deploy: false,
    })

    // Assertions
    expect(moveResult).not.toBeNull()
    expect(game.getHeroicStatus('c1')).toBe(true)
    expect(game.getHeroicStatus('c1', AIR_FORCE)).toBe(true)
    expect(game.turn()).toBe(RED)
    expect(game.isCheck()).toBe(true)

    // Test undo
    game.undo()
    expect(game.getHeroicStatus('b2')).toBe(false)
    expect(game.getHeroicStatus('b2', AIR_FORCE)).toBe(false)
    expect(game.get('c1')).toBeUndefined()
    expect(game.turn()).toBe(BLUE)
    expect(game.isCheck()).toBe(false)
  })

  // Add more tests for Deploy and Combination moves resulting in check if needed
})
describe('setHeroicStatus', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: COMMANDER, color: RED }, 'f1')
    game.put({ type: INFANTRY, color: RED }, 'c6')
    game.put({ type: INFANTRY, color: BLUE }, 'c7')
    // Place an infantry at h2
    game.put({ type: INFANTRY, color: RED, heroic: false }, 'h2')
    // Place a tank at c3 carrying an artillery
    game.put(
      {
        type: TANK,
        color: BLUE,
        heroic: false,
        carrying: [{ type: NAVY, color: BLUE, heroic: false }],
      },
      'c3',
    )
  })

  test('sets heroic status for a direct piece', () => {
    expect(game.setHeroicStatus('h2', INFANTRY, true)).toBe(true)
    expect(game.getHeroicStatus('h2', INFANTRY)).toBe(true)
  })

  test('sets heroic status for a carried piece', () => {
    expect(game.setHeroicStatus('c3', NAVY, true)).toBe(true)
    expect(game.getHeroicStatus('c3', NAVY)).toBe(true)
  })

  test('returns false if square is empty', () => {
    expect(game.setHeroicStatus('d4', INFANTRY, true)).toBe(false)
  })

  test('returns false if piece type not found', () => {
    expect(game.setHeroicStatus('h2', TANK, true)).toBe(false)
    expect(game.setHeroicStatus('c3', COMMANDER, true)).toBe(false)
  })

  test('returns false if square is invalid', () => {
    expect(game.setHeroicStatus('z9' as any, INFANTRY, true)).toBe(false)
  })
})
