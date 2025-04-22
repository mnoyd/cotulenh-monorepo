import { CoTuLenh } from '../src/cotulenh'
import {
  BLUE,
  RED,
  INFANTRY,
  TANK,
  ARTILLERY,
  COMMANDER,
  AIR_FORCE,
  NAVY,
  MILITIA,
} from '../src/type'

describe('_isCommanderAttacked Function Tests', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  test('Commander is not attacked when no enemy pieces are present', () => {
    // Place a commander with no enemies
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(false)
  })

  test('Commander is attacked by adjacent infantry', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Place an enemy infantry adjacent
    game.put({ type: INFANTRY, color: RED }, 'e6')

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is attacked by tank at range 2', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Place an enemy tank 2 squares away
    game.put({ type: TANK, color: RED }, 'e7')

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is not attacked by tank when blocked by friendly piece', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Place a friendly piece in between
    game.put({ type: INFANTRY, color: BLUE }, 'e6')

    // Place an enemy tank 2 squares away
    game.put({ type: TANK, color: RED }, 'e7')

    // Test if commander is attacked (should be false as tank is blocked)
    expect(game['_isCommanderAttacked'](BLUE)).toBe(false)
  })

  test('Commander is attacked by artillery over blocking pieces', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Place a friendly piece in between
    game.put({ type: INFANTRY, color: BLUE }, 'e6')

    // Place an enemy artillery 3 squares away
    game.put({ type: ARTILLERY, color: RED }, 'e8')

    // Test if commander is attacked (should be true as artillery can shoot over pieces)
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is attacked by air force over water', () => {
    // Place a commander on land
    game.put({ type: COMMANDER, color: BLUE }, 'c5')

    // Place an enemy air force over water (assuming f5 is water)
    game.put({ type: AIR_FORCE, color: RED }, 'f5')

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is attacked by navy from water', () => {
    // Place a commander near water
    game.put({ type: COMMANDER, color: BLUE }, 'c5')

    // Place an enemy navy on water (assuming f5 is water)
    game.put({ type: NAVY, color: RED }, 'b5')

    // Test if commander is attacked (should be true if within naval gun range)
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is attacked diagonally by militia', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Place an enemy militia diagonally adjacent
    game.put({ type: MILITIA, color: RED }, 'd6')

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is attacked by heroic infantry with diagonal movement', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Place an enemy heroic infantry diagonally adjacent
    game.put({ type: INFANTRY, color: RED, heroic: true }, 'd6')

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is not attacked when enemy pieces are out of range', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Place enemy pieces out of their attack range
    game.put({ type: INFANTRY, color: RED }, 'e8') // 3 squares away
    game.put({ type: TANK, color: RED }, 'a5') // 4 squares away

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(false)
  })

  test('Commander is considered attacked when captured (kings[color] === -1)', () => {
    // Setup a game state where the commander has been captured
    game.clear()
    // Manually set the king position to -1 to simulate capture
    game['_commanders'][BLUE] = -1

    // Test if commander is attacked (should be true when captured)
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is attacked by enemy commander', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e5')

    // Place an enemy commander adjacent
    game.put({ type: COMMANDER, color: RED }, 'e6')

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is attacked by enemy commander beyond range 1', () => {
    // Place a commander
    game.put({ type: COMMANDER, color: BLUE }, 'e3')

    // Place an enemy commander 2 squares away
    game.put({ type: COMMANDER, color: RED }, 'e7')

    // Test if commander is attacked (should be true as commander can capture beyond range 1)
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })

  test('Commander is attacked during stay capture scenario', () => {
    // Place a commander on land
    game.put({ type: COMMANDER, color: BLUE }, 'c5')

    // Place an enemy air force that would perform stay capture
    game.put({ type: AIR_FORCE, color: RED }, 'f5')

    // Test if commander is attacked
    expect(game['_isCommanderAttacked'](BLUE)).toBe(true)
  })
})
