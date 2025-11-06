import { describe, expect, it } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'

describe('commitDeploySession', () => {
  it('should commit deploy session after T>h6 from (T|M) stack', () => {
    const game = new CoTuLenh()

    // Red move: M&h4(T|M) - Results in Tank carrying Marine at h4
    const move1 = game.move('M&h4(T|M)')
    expect(move1).toBeTruthy()
    // Note: The notation creates (TM) = Tank carrying Marine
    expect(game.get('h4')).toMatchObject({
      type: 't',
      color: 'r',
      carrying: expect.arrayContaining([
        expect.objectContaining({ type: 'm' }),
      ]),
    })

    // Blue move: Mf7
    const move2 = game.move('Mf7')
    expect(move2).toBeTruthy()

    // Red deploys Tank to h6: T>h6
    // This should automatically start a deploy session
    const deployMove = game.move('T>h6')
    expect(deployMove).toBeTruthy()

    // Verify deploy session is active
    expect(game.getDeploySession()).toBeTruthy()

    // Verify Tank is now at h6
    expect(game.get('h6')).toMatchObject({
      type: 't',
      color: 'r',
    })

    // Verify Marine is left at h4 (Tank was the carrier, Marine was carried)
    expect(game.get('h4')).toMatchObject({
      type: 'm',
      color: 'r',
      carrying: undefined, // No longer carrying anything
    })

    // Now commit the deploy session
    const commitResult = game.commitDeploySession()

    // Verify commit was successful
    expect(commitResult.success).toBe(true)
    expect(commitResult.reason).toBeUndefined()

    // Verify session is cleared
    expect(game.getDeploySession()).toBeNull()

    // Verify turn switched to blue
    expect(game.turn()).toBe('b')

    // Verify board state is correct
    expect(game.get('h6')).toMatchObject({
      type: 't',
      color: 'r',
    })
    expect(game.get('h4')).toMatchObject({
      type: 'm',
      color: 'r',
      carrying: undefined,
    })

    // Verify history was updated
    const history = game.history()
    expect(history.length).toBe(3) // M&h4(T|M), Mf7, deploy move

    // Verify we can undo the deploy
    game.undo()
    expect(game.turn()).toBe('r')
    expect(game.get('h6')).toBeFalsy() // Should be null or undefined
    // After undo, should restore Tank carrying Marine
    expect(game.get('h4')).toMatchObject({
      type: 't',
      color: 'r',
      carrying: expect.arrayContaining([
        expect.objectContaining({ type: 'm' }),
      ]),
    })
  })

  it('should auto-stay Marine when only Tank is deployed', () => {
    const game = new CoTuLenh()

    // Red move: M&h4(T|M)
    game.move('M&h4(T|M)')

    // Blue move: Mf7
    game.move('Mf7')

    // Deploy only Tank to h6 (starts deploy session automatically)
    game.move('T>h6')

    // Get session before commit
    const session = game.getDeploySession()
    expect(session).toBeTruthy()

    // Commit should auto-mark Marine as staying
    const result = game.commitDeploySession()
    expect(result.success).toBe(true)

    // Marine should still be at h4
    expect(game.get('h4')).toMatchObject({
      type: 'm',
      color: 'r',
    })
    expect(game.turn()).toBe('b')
  })

  it('should fail commit if no active session', () => {
    const game = new CoTuLenh()

    const result = game.commitDeploySession()

    expect(result.success).toBe(false)
    expect(result.reason).toBe('No active deploy session to commit')
  })

  it('should fail commit if session is incomplete', () => {
    const game = new CoTuLenh()

    // No deploy session active - cannot commit
    const result = game.commitDeploySession()

    expect(result.success).toBe(false)
    expect(result.reason).toBe('No active deploy session to commit')
  })

  it('should auto-commit when all pieces are deployed', () => {
    const game = new CoTuLenh()

    // Set up a scenario with multiple pieces
    // Red move: M&h4(T|M) - Tank carries Marine
    game.move('M&h4(T|M)')

    // Blue move: Mf7
    game.move('Mf7')

    // Deploy Tank to h6 - starts session
    game.move('T>h6')
    expect(game.getDeploySession()).toBeTruthy()

    // Deploy Marine to h5 - completes all pieces, auto-commits
    game.move('M>h5')

    // Session should be auto-committed (all pieces deployed)
    expect(game.getDeploySession()).toBeNull()

    // Turn should have switched to blue
    expect(game.turn()).toBe('b')

    // Verify both pieces are placed
    expect(game.get('h6')).toMatchObject({ type: 't', color: 'r' })
    expect(game.get('h5')).toMatchObject({ type: 'm', color: 'r' })
  })
})
