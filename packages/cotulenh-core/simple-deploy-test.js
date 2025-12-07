// Simple test to isolate the deploy turn issue
import { CoTuLenh } from './dist/cotulenh.js'

const game = new CoTuLenh()
game.clear()
game.put({ type: 'c', color: 'r' }, 'f1')
game.put({ type: 'c', color: 'b' }, 'g12')

// Put a Tank carrying Militia at f4
const carrierStack = {
  type: 't',
  color: 'r',
  carrying: [{ type: 'm', color: 'r' }],
}
game.put(carrierStack, 'f4')
game['_turn'] = 'r'

console.log('Initial turn:', game.turn())
console.log('Initial piece at f4:', game.get('f4'))

// Execute deploy move using the internal method directly
const deployMove = {
  color: 'r',
  from: 133, // f4
  to: 117, // f5
  piece: { type: 'm', color: 'r' },
  flags: 17, // DEPLOY flag
}

console.log('\nExecuting deploy move directly...')
game['_makeMove'](deployMove)

console.log('After deploy move:')
console.log('Turn:', game.turn())
console.log('Piece at f4:', game.get('f4'))
console.log('Piece at f5:', game.get('f5'))
console.log('Deploy session exists:', !!game.getSession())
console.log('Deploy session commands:', game.getSession()?.commands.length)

// The turn should still be RED
if (game.turn() === 'r') {
  console.log('✅ Turn correctly stayed RED')
} else {
  console.log('❌ Turn incorrectly switched to BLUE')
}
