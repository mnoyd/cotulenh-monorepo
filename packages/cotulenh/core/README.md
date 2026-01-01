# @cotulenh/core

The central game engine for CoTuLenh (Commander Chess). Highly optimized,
adapted from the architecture of chess.js to support specialized military chess
rules.

## Installation

```bash
pnpm add @cotulenh/core
```

## Usage

```typescript
import { CoTuLenh } from '@cotulenh/core'

const game = new CoTuLenh()
game.move('i e4') // Move Infantry
console.log(game.fen())
```

## Features

- **Full Rule Implementation**: Handles all CoTuLenh specific moves, captures,
  and restrictions.
- **Advanced Move Generation**: Support for specialized units (Navy, Air Force,
  Engineers).
- **Stacking Logic**: Integrated with piece combination rules.
- **Game Analysis**: Detects check, checkmate, stalemate, and commander
  exposure.
- **FEN/SAN**: Complete support for Commander Chess notation.

## License

BSD-2-Clause
