import { beforeEach, describe, expect, it } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import { RED, BLUE, TANK, MILITIA, AIR_FORCE } from '../src/type.js'
import { setupGameBasic } from './test-helpers.js'

describe('Deploy Session - Turn Switching on Commit', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })

  it('should switch turn from RED to BLUE after manual commit', () => {
    // Set up position: Red (TM) stack at c3
    game.put(
      { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
      'c3',
    )
    game['_turn'] = RED

    expect(game.turn()).toBe(RED)

    // Deploy Tank to c4
    const moveResult = game.move({
      from: 'c3',
      to: 'c4',
      piece: TANK,
      deploy: true,
    })
    expect(moveResult).toBeTruthy()

    // Session should be active
    const session = game.getDeploySession()
    expect(session).toBeTruthy()
    expect(session?.commands.length).toBe(1)

    // Turn should NOT switch yet (still in deploy session)
    expect(game.turn()).toBe(RED)

    // Manually commit the deploy session
    const commitResult = game.commitDeploySession()

    // Verify commit succeeded
    expect(commitResult.success).toBe(true)

    // Verify turn switched to BLUE
    expect(game.turn()).toBe(BLUE)

    // Verify session is cleared
    expect(game.getDeploySession()).toBeNull()
  })

  it('should properly handle turn switching with auto-stay pieces', () => {
    // Set up position: Red (TM) stack at c3
    game.put(
      { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
      'c3',
    )
    game['_turn'] = RED

    expect(game.turn()).toBe(RED)

    // Deploy only Tank - Militia should auto-stay
    game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

    const session = game.getDeploySession()
    expect(session?.getRemainingPieces()).toBeTruthy() // Militia remains

    // Commit - should auto-mark Militia as staying AND switch turn
    const commitResult = game.commitDeploySession()

    expect(commitResult.success).toBe(true)
    expect(game.turn()).toBe(BLUE)

    // Verify Militia stayed at c3
    const pieceAtC3 = game.get('c3')
    expect(pieceAtC3).toBeTruthy()
    expect(pieceAtC3?.type).toBe(MILITIA)
  })

  it('should add deploy move to history and switch turn', () => {
    // Set up position
    game.put(
      { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
      'c3',
    )
    game['_turn'] = RED

    const historyBefore = game.history().length

    // Deploy Tank
    game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

    // History should NOT change during deploy session
    expect(game.history().length).toBe(historyBefore)

    // Commit
    const result = game.commitDeploySession()
    expect(result.success).toBe(true)

    // Turn should be switched IMMEDIATELY after commit
    expect(game.turn()).toBe(BLUE)

    // History should now have one more entry
    // NOTE: history() undoes and replays all moves, which changes game state!
    expect(game.history().length).toBe(historyBefore + 1)

    // After history() replay, turn should still be BLUE
    expect(game.turn()).toBe(BLUE)
  })
})
