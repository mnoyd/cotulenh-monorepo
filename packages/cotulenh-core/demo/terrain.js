import { CoTuLenh } from '../dist/esm/src/cotulenh.js'
import { DEFAULT_POSITION } from '../dist/esm/src/type.js'

// Get FEN string from command line arguments (process.argv[2]) or use default
const fen = process.argv[2] || DEFAULT_POSITION

console.log('Cotulenh Terrain Zones Demonstration\n')
console.log(`Using FEN: ${fen}\n`) // Log the FEN being used

const game = new CoTuLenh(fen) // Use the determined FEN string

console.log('\nNote:')
console.log('- Water zones: Naval units can station here')
console.log('- Mixed zones: Both naval and land units can station')
console.log('- Land zones: Only land units can station')
game.printBoard()
