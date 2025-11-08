import { describe, it, expect, beforeEach } from 'vitest'
import { CoTuLenh } from '../src/cotulenh'
import { RED, BLUE, TANK, INFANTRY, COMMANDER } from '../src/type'

describe('Quick Deploy Test', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    game.put({ type: COMMANDER, color: RED }, 'g1')
    game.put({ type: COMMANDER, color: BLUE }, 'h12')
  })

  it('should deploy from a simple stack', () => {
    // Put a Tank carrying Infantry at c3
    game.put(
      {
        type: TANK,
        color: RED,
        carrying: [{ type: INFANTRY, color: RED }],
      },
      'c3',
    )

    console.log('Initial FEN:', game.fen())
    console.log('Piece at c3:', JSON.stringify(game.get('c3')))

    // Try to deploy Infantry to c4
    const result = game.move({
      from: 'c3',
      to: 'c4',
      piece: INFANTRY,
      deploy: true,
    })

    console.log('Move result:', result)
    console.log('After move FEN:', game.fen())
    console.log('Piece at c3:', JSON.stringify(game.get('c3')))
    console.log('Piece at c4:', JSON.stringify(game.get('c4')))

    expect(result).not.toBeNull()
    expect(game.get('c4')?.type).toBe(INFANTRY)
    expect(game.get('c3')?.type).toBe(TANK)
  })

  it('should deploy two pieces sequentially', () => {
    game.put(
      {
        type: TANK,
        color: RED,
        carrying: [{ type: INFANTRY, color: RED }],
      },
      'c3',
    )

    console.log('\n=== First Deploy ===')
    const result1 = game.move({
      from: 'c3',
      to: 'c4',
      piece: INFANTRY,
      deploy: true,
    })
    console.log('After first deploy - c3:', JSON.stringify(game.get('c3')))
    console.log('After first deploy - c4:', JSON.stringify(game.get('c4')))

    expect(result1).not.toBeNull()

    console.log('\n=== Second Deploy ===')
    const result2 = game.move({
      from: 'c3',
      to: 'd3',
      piece: TANK,
      deploy: true,
    })
    console.log('After second deploy - c3:', JSON.stringify(game.get('c3')))
    console.log('After second deploy - d3:', JSON.stringify(game.get('d3')))

    expect(result2).not.toBeNull()
    expect(game.get('c3')).toBeUndefined()
    expect(game.get('d3')?.type).toBe(TANK)
  })
})
