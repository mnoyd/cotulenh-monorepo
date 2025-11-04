import { describe, it, expect } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import { RED, BLUE, NAVY, AIR_FORCE, TANK, INFANTRY } from '../src/type.js'
import type { Move } from '../src/cotulenh.js'

describe('Debug Recombine', () => {
  it('debug multiple recombines', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: 'c', color: RED }, 'g1')
    game.put({ type: 'c', color: BLUE }, 'h12')

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

    console.log('\n=== Initial State ===')
    console.log('c3:', JSON.stringify(game.get('c3'), null, 2))

    // Deploy Navy to c5
    console.log('\n=== Step 1: Deploy Navy to c5 ===')
    const move1 = game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })
    console.log('Move result:', move1)
    console.log(
      'c3 after Navy deploy:',
      JSON.stringify(game.get('c3'), null, 2),
    )
    console.log(
      'c5 after Navy deploy:',
      JSON.stringify(game.get('c5'), null, 2),
    )
    console.log('Deploy session:', game.getDeployState())

    // Check available moves
    console.log('\n=== Available moves from c3 ===')
    const movesAfterNavy = game.moves({ verbose: true, square: 'c3' }) as Move[]
    console.log(`Total moves: ${movesAfterNavy.length}`)
    movesAfterNavy.forEach((m) => {
      console.log(
        `  ${m.piece.type} -> ${m.to} [${m.flags}] ${m.flags.includes('b') ? 'RECOMBINE' : ''}`,
      )
    })

    // Recombine AirForce with Navy
    console.log('\n=== Step 2: Recombine AirForce to c5 ===')
    const move2 = game.move({
      from: 'c3',
      to: 'c5',
      piece: AIR_FORCE,
      deploy: true,
    })
    console.log('Move result:', move2)
    console.log(
      'c3 after AirForce recombine:',
      JSON.stringify(game.get('c3'), null, 2),
    )
    console.log(
      'c5 after AirForce recombine:',
      JSON.stringify(game.get('c5'), null, 2),
    )
    console.log('Deploy session:', game.getDeployState())

    // Check available moves again
    console.log('\n=== Available moves from c3 after AirForce recombine ===')
    const movesAfterAirForce = game.moves({
      verbose: true,
      square: 'c3',
    }) as Move[]
    console.log(`Total moves: ${movesAfterAirForce.length}`)
    movesAfterAirForce.forEach((m) => {
      console.log(
        `  ${m.piece.type} -> ${m.to} [${m.flags}] ${m.flags.includes('b') ? 'RECOMBINE' : ''}`,
      )
    })

    const tankRecombine = movesAfterAirForce.find(
      (m) => m.piece.type === TANK && m.to === 'c5' && m.flags.includes('b'),
    )
    console.log('\nTank recombine move found?', !!tankRecombine)
    if (tankRecombine) {
      console.log('Tank recombine:', JSON.stringify(tankRecombine, null, 2))
    }

    // Try to execute Tank recombine
    console.log('\n=== Step 3: Attempt Tank recombine to c5 ===')
    try {
      const move3 = game.move({
        from: 'c3',
        to: 'c5',
        piece: TANK,
        deploy: true,
      })
      console.log('Move result:', move3)
      console.log(
        'c3 after Tank recombine:',
        JSON.stringify(game.get('c3'), null, 2),
      )
      console.log(
        'c5 after Tank recombine:',
        JSON.stringify(game.get('c5'), null, 2),
      )
    } catch (error: any) {
      console.error('ERROR:', error?.message || error)

      // Check what's at the squares
      console.log('\nCurrent board state:')
      console.log('c3:', JSON.stringify(game.get('c3'), null, 2))
      console.log('c5:', JSON.stringify(game.get('c5'), null, 2))
    }
  })
})
