import { describe, expect, it } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'

/**
 * Play random moves from the starting position up to a given depth, favoring moves with longer string length.
 * @param depth Number of moves to play
 * @returns The game instance after playing the moves
 */
export function playRandomGame(game: CoTuLenh, depth = 20) {
  let moves: string[] = []
  for (let i = 0; i < depth; i++) {
    const fenBeforeMove = game.fen() // Store FEN before making a move
    const legalMoves = game.moves() as string[]
    if (legalMoves.length === 0) break
    // Favor capture moves (those with 'x' or '_')
    const captureMoves = legalMoves.filter(
      (m) => m.includes('x') || m.includes('_'),
    )
    let move
    if (captureMoves.length > 0) {
      // Randomly select among capture moves
      move = captureMoves[Math.floor(Math.random() * captureMoves.length)]
    } else {
      // Otherwise, favor longer moves
      const weights = legalMoves.map((m) => m.length)
      const total = weights.reduce((a, b) => a + b, 0)
      let r = Math.random() * total
      let idx = 0
      while (r > weights[idx]) {
        r -= weights[idx]
        idx++
      }
      move = legalMoves[idx]
    }
    try {
      game.move(move)
      moves.push(move)
    } catch (e) {
      console.error(`Error during move: ${move}`)
      console.error(`FEN before move: ${fenBeforeMove}`)
      console.error(`Game history: ${moves.join(', ')}`)
      throw e // Re-throw the error to fail the test
    }
    // if (game.game_over()) break;
  }
  return moves
}

describe.skip('Stress Play random game', () => {
  it('should play a random game without errors for multiple runs', () => {
    const numberOfRuns = 5 // Or any number of runs you want
    for (let run = 0; run < numberOfRuns; run++) {
      console.log(`Starting run ${run + 1} of ${numberOfRuns}`)
      const game = new CoTuLenh()
      try {
        const playedMoves = playRandomGame(game, 50) // Play up to 50 moves
        expect(game.fen()).toBeDefined()
        expect(playedMoves.length).toBeGreaterThanOrEqual(0)
        console.log(
          `Run ${run + 1} completed. Moves: ${playedMoves.join(', ')}. Final FEN: ${game.fen()}`,
        )
      } catch (error) {
        console.error(`Error in run ${run + 1}:`, error)
        console.error(`Final FEN: ${game.fen()}`)
        // Optionally, rethrow to make the test fail immediately
        // throw error;
        expect(error).toBeNull() // This will make the test fail and show the error
      }
    }
  })
  it('should play a random game to depth 10', () => {
    const gameInstance = new CoTuLenh()
    const playedMoves = playRandomGame(gameInstance, 10)
    expect(gameInstance.fen()).toBeDefined()
    // You might want to add assertions about playedMoves if relevant, e.g.:
    // expect(playedMoves.length).toBeLessThanOrEqual(10);
  })

  it('should play a random game to depth 20', () => {
    const gameInstance = new CoTuLenh()
    const playedMoves = playRandomGame(gameInstance, 20)
    expect(gameInstance.fen()).toBeDefined()
  })
})
