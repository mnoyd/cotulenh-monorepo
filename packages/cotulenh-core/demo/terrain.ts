import { CoTuLenh } from '../src/cotulenh';

console.log('Cotulenh Terrain Zones Demonstration\n');
const game = new CoTuLenh();
// game.printTerrainZones();

console.log('\nNote:');
console.log('- Water zones: Naval units can station here');
console.log('- Mixed zones: Both naval and land units can station');
console.log('- Land zones: Only land units can station');
game.printBoard();