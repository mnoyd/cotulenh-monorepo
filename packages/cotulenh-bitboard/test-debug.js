const { CoTuLenh } = require('./dist/cotulenh.js');

const game = new CoTuLenh();
game.clear();

// Place red Navy at a6 (water)
game.put({ type: 'n', color: 'r' }, 'a6');

// Place blue Infantry at b6 (land)
game.put({ type: 'i', color: 'b' }, 'b6');

console.log('Board:');
console.log(game.board());

console.log('\nAll moves:');
const moves = game.moves({ verbose: true });
console.log(moves.map((m) => ({ from: m.from, to: m.to, flags: m.flags, piece: m.piece.type })));

console.log('\nMoves from a6:');
const a6Moves = game.moves({ square: 'a6', verbose: true });
console.log(a6Moves.map((m) => ({ from: m.from, to: m.to, flags: m.flags, piece: m.piece.type })));
