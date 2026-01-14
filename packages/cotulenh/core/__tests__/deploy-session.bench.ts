/**
 * Benchmark for move generation during deploy sessions
 *
 * Tests the performance of:
 * 1. Initial deploy move generation (stack with all pieces)
 * 2. Move generation during active deploy session (partial deployment)
 * 3. Recombine move generation
 * 4. Sequential deploy moves (simulating full deploy session)
 * 5. Commit session performance
 */

import { bench, describe } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'
import { RED, BLUE, NAVY, AIR_FORCE, TANK, COMMANDER } from '../src/type'
import { makePiece, placeAt } from './test-helpers'

/**
 * Set up a game with a stack piece at the given position
 * Uses test-helpers for validation against blueprints.yaml rules
 * Note: Carrier must match terrain (NAVY on water 'c3', others on land)
 */
function setupStackGame(
  stackSquare: Parameters<typeof placeAt>[1],
  carrierType: Parameters<typeof makePiece>[0],
  carrying: Parameters<typeof makePiece>[3],
): CoTuLenh {
  const game = new CoTuLenh()
  game.clear()

  // Place commanders for legal position
  placeAt(game, makePiece(COMMANDER, RED), 'g1')
  placeAt(game, makePiece(COMMANDER, BLUE), 'h12')

  // Create and place stack piece with carrying (validated via makePiece)
  const stackPiece = makePiece(carrierType, RED, false, carrying)
  placeAt(game, stackPiece, stackSquare)

  game['_turn'] = RED
  return game
}

describe('Deploy Session - Move Generation Performance', () => {
  // Benchmark 1: Initial deploy move generation for various stack sizes
  describe('Initial deploy move generation', () => {
    bench('2-piece stack (NF) - moves(verbose: false)', () => {
      const game = setupStackGame('c3', NAVY, [makePiece(AIR_FORCE)])
      game.moves({ verbose: false })
    })

    bench('2-piece stack (NF) - moves(verbose: true)', () => {
      const game = setupStackGame('c3', NAVY, [makePiece(AIR_FORCE)])
      game.moves({ verbose: true })
    })

    bench('3-piece stack (NFT) - moves(verbose: false)', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.moves({ verbose: false })
    })

    bench('3-piece stack (NFT) - moves(verbose: true)', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.moves({ verbose: true })
    })
  })

  // Benchmark 2: Move generation during active deploy session
  describe('Mid-deploy move generation', () => {
    bench('After 1st deploy (NFT -> FT) - moves()', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.moves({ verbose: true })
    })

    bench('After 1st deploy (NF -> F) - moves()', () => {
      const game = setupStackGame('c3', NAVY, [makePiece(AIR_FORCE)])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.moves({ verbose: true })
    })

    bench('After 2nd deploy (NFT -> T) - moves()', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.move({ from: 'c3', to: 'd3', piece: TANK })
      game.moves({ verbose: true })
    })
  })

  // Benchmark 3: Square-specific move generation during deploy
  describe('Square-specific deploy move generation', () => {
    bench('moves(square: "c3") on 2-piece stack', () => {
      const game = setupStackGame('c3', NAVY, [makePiece(AIR_FORCE)])
      game.moves({ square: 'c3', verbose: true })
    })

    bench('moves(square: "c3") on 3-piece stack', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.moves({ square: 'c3', verbose: true })
    })

    bench('moves(square: "c3", piece: "n") - filter by piece type', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.moves({ square: 'c3', piece: 'n', verbose: true })
    })
  })

  // Benchmark 4: Recombine move generation
  describe('Recombine move generation', () => {
    bench('generateRecombineMoves() with 2 deployed pieces', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.move({ from: 'c3', to: 'd3', piece: TANK })
      const session = game.getSession()
      session?.generateRecombineMoves()
    })

    bench('generateRecombineMoves() with 1 deployed piece', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      const session = game.getSession()
      session?.generateRecombineMoves()
    })
  })

  // Benchmark 5: Full deploy session simulation
  describe('Sequential deploy moves (full session)', () => {
    bench('Complete 2-piece deploy session', () => {
      const game = setupStackGame('c3', NAVY, [makePiece(AIR_FORCE)])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.move({ from: 'c3', to: 'b3', piece: NAVY })
    })

    bench('Complete 3-piece deploy session', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.move({ from: 'c3', to: 'd3', piece: TANK })
      game.move({ from: 'c3', to: 'b3', piece: NAVY })
    })
  })

  // Benchmark 6: Deploy session operations
  describe('Deploy session operations', () => {
    bench('getCurrentResult() during deploy', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      const session = game.getSession()
      session?.getCurrentResult()
    })

    bench('canCommit() during deploy', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      const session = game.getSession()
      session?.canCommit()
    })

    bench('isComplete check during deploy', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      const session = game.getSession()
      return session?.isComplete
    })

    bench('getDeployView() during deploy', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      const session = game.getSession()
      session?.getDeployView()
    })
  })

  // Benchmark 7: Undo during deploy session
  describe('Deploy session undo performance', () => {
    bench('undoLastMove() after 1 deploy', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      const session = game.getSession()
      session?.undoLastMove()
    })

    bench('undoLastMove() after 2 deploys', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.move({ from: 'c3', to: 'd3', piece: TANK })
      const session = game.getSession()
      session?.undoLastMove()
    })

    bench('cancel() full session', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.move({ from: 'c3', to: 'd3', piece: TANK })
      const session = game.getSession()
      session?.cancel()
    })
  })

  // Benchmark 8: Commit session performance
  describe('Commit session performance', () => {
    bench('commitSession() after 1 deploy (2-piece stack)', () => {
      const game = setupStackGame('c3', NAVY, [makePiece(AIR_FORCE)])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.move({ from: 'c3', to: 'b3', piece: NAVY })
    })

    bench('commitSession() after 2 deploys (3-piece stack)', () => {
      const game = setupStackGame('c3', NAVY, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
      game.move({ from: 'c3', to: 'd3', piece: TANK })
      game.move({ from: 'c3', to: 'b3', piece: NAVY })
    })
  })
})

// Benchmark 9: Comparison with normal move generation
describe('Deploy vs Normal move generation comparison', () => {
  bench('Normal: moves() from starting position', () => {
    const game = new CoTuLenh()
    game.moves({ verbose: true })
  })

  bench('Deploy: moves() from 2-piece stack (NF)', () => {
    const game = setupStackGame('c3', NAVY, [makePiece(AIR_FORCE)])
    game.moves({ verbose: true })
  })

  bench('Deploy: moves() from 3-piece stack (NFT)', () => {
    const game = setupStackGame('c3', NAVY, [
      makePiece(AIR_FORCE),
      makePiece(TANK),
    ])
    game.moves({ verbose: true })
  })
})
