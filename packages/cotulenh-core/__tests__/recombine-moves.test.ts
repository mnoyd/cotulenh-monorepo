// __tests__/recombine-moves.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import {
  BITS,
  RED,
  BLUE,
  NAVY,
  AIR_FORCE,
  TANK,
  INFANTRY,
} from '../src/type.js'
import type { Move } from '../src/cotulenh.js'

describe('Recombine Moves', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    // Add commanders to make moves legal
    game.put({ type: 'c', color: RED }, 'g1')
    game.put({ type: 'c', color: BLUE }, 'h12')
  })

  it('should generate recombine move to rejoin deployed pieces', () => {
    // Setup: Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )

    // Deploy Navy to c5
    game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })

    // Now check available moves for remaining pieces
    const moves = game.moves({ verbose: true, square: 'c3' }) as Move[]

    // Should have normal deploy moves for AirForce and Tank
    const normalAirForceMoves = moves.filter(
      (m) =>
        m.piece.type === AIR_FORCE && m.from === 'c3' && !m.to.includes('c5'),
    )
    expect(normalAirForceMoves.length).toBeGreaterThan(0)

    // Should have recombine move for AirForce to c5 (where Navy is)
    const recombineMove = moves.find(
      (m) => m.piece.type === AIR_FORCE && m.from === 'c3' && m.to === 'c5',
    )

    expect(recombineMove).toBeDefined()
    expect(recombineMove?.flags).toContain('d') // DEPLOY flag
    expect(recombineMove?.flags).toContain('b') // COMBINATION flag
  })

  it('should not generate recombine for carrier piece', () => {
    // Setup: Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )

    // Deploy AirForce to c4
    game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE, deploy: true })

    // Deploy Tank to d3
    game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true })

    // Now carrier (Navy) should be able to move normally
    const moves = game.moves({ verbose: true, square: 'c3' }) as Move[]
    const navyMoves = moves.filter((m) => m.piece.type === NAVY)

    // Navy moves should all be normal deploy moves, not recombines
    for (const move of navyMoves) {
      // If Navy moves to c4 or d3 (where deployed pieces are),
      // it should NOT be a combination move
      if (move.to === 'c4' || move.to === 'd3') {
        expect(move.flags).not.toContain('b') // Should NOT have COMBINATION flag
      }
    }
  })

  it('should not duplicate normal moves with recombine', () => {
    // Setup: Navy at c3 carrying AirForce
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [{ type: AIR_FORCE, color: RED }],
      },
      'c3',
    )

    // Deploy Navy to c4 (orthogonally adjacent)
    game.move({ from: 'c3', to: 'c4', piece: NAVY, deploy: true })

    // Now AirForce can move
    const moves = game.moves({ verbose: true, square: 'c3' }) as Move[]
    const airForceToC4 = moves.filter(
      (m) => m.piece.type === AIR_FORCE && m.to === 'c4',
    )

    // Should only have ONE move to c4 (the recombine), not a duplicate normal move
    expect(airForceToC4.length).toBe(1)
    expect(airForceToC4[0].flags).toContain('b') // Should be combination
  })

  it('should only combine friendly pieces', () => {
    // Setup: Red Navy at c3 carrying AirForce, Blue Tank at c5
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [{ type: AIR_FORCE, color: RED }],
      },
      'c3',
    )
    game.put({ type: TANK, color: BLUE }, 'c5')

    // Deploy Navy to c4
    game.move({ from: 'c3', to: 'c4', piece: NAVY, deploy: true })

    // Check moves for AirForce
    const moves = game.moves({ verbose: true, square: 'c3' }) as Move[]
    const recombineToEnemy = moves.find(
      (m) =>
        m.piece.type === AIR_FORCE && m.to === 'c5' && m.flags.includes('b'),
    )

    // Should NOT have recombine move to enemy piece
    expect(recombineToEnemy).toBeUndefined()

    // But might have capture move (normal deploy)
    const captureMove = moves.find(
      (m) =>
        m.piece.type === AIR_FORCE && m.to === 'c5' && m.flags.includes('c'),
    )
    // Capture is possible if AirForce can reach c5
  })

  it('should execute recombine move correctly', () => {
    // Setup: Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )

    // Deploy Navy to c5
    game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })

    // Execute recombine: AirForce joins Navy at c5
    const result = game.move({
      from: 'c3',
      to: 'c5',
      piece: AIR_FORCE,
      deploy: true,
    })

    expect(result).not.toBeNull()

    // Check that c5 now has Navy carrying AirForce
    const pieceAtC5 = game.get('c5')
    expect(pieceAtC5?.type).toBe(NAVY)
    expect(pieceAtC5?.carrying).toBeDefined()
    expect(pieceAtC5?.carrying?.length).toBe(1)
    expect(pieceAtC5?.carrying?.[0].type).toBe(AIR_FORCE)

    // Check that c3 still has Tank
    const pieceAtC3 = game.get('c3')
    expect(pieceAtC3?.type).toBe(TANK)
    expect(pieceAtC3?.carrying).toBeUndefined()

    // Turn should still be Red (deployment not complete)
    expect(game.turn()).toBe(RED)
  })

  it('should allow multiple recombines to same square', () => {
    // Setup: Navy at c3 carrying AirForce, Tank, and Infantry
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
          { type: INFANTRY, color: RED },
        ],
      },
      'c3',
    )

    // Deploy Navy to c5
    game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })

    // Recombine AirForce with Navy
    game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })

    // Check that we can still recombine Tank
    const moves = game.moves({ verbose: true, square: 'c3' }) as Move[]
    const tankRecombine = moves.find(
      (m) => m.piece.type === TANK && m.to === 'c5' && m.flags.includes('b'),
    )

    expect(tankRecombine).toBeDefined()

    // Execute Tank recombine
    game.move({ from: 'c3', to: 'c5', piece: TANK, deploy: true })

    // Check final state: N(FT) at c5, I at c3
    const pieceAtC5 = game.get('c5')
    expect(pieceAtC5?.type).toBe(NAVY)
    expect(pieceAtC5?.carrying?.length).toBe(2)

    const pieceAtC3 = game.get('c3')
    expect(pieceAtC3?.type).toBe(INFANTRY)
  })

  it('should not generate recombine to squares not yet deployed to', () => {
    // Setup: Navy at c3 carrying AirForce and Tank
    // Place another friendly piece at d5
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )
    game.put({ type: INFANTRY, color: RED }, 'd5')

    // Deploy Navy to c5
    game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })

    // Check moves for AirForce
    const moves = game.moves({ verbose: true, square: 'c3' }) as Move[]

    // Should have recombine to c5 (deployed square)
    const recombineToC5 = moves.find(
      (m) =>
        m.piece.type === AIR_FORCE && m.to === 'c5' && m.flags.includes('b'),
    )
    expect(recombineToC5).toBeDefined()

    // Should NOT have recombine to d5 (not deployed from this stack)
    const recombineToD5 = moves.find(
      (m) =>
        m.piece.type === AIR_FORCE && m.to === 'd5' && m.flags.includes('b'),
    )
    expect(recombineToD5).toBeUndefined()
  })
})
