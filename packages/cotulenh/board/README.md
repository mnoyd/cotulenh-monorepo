# @cotulenh/board

A high-performance UI component library for rendering CoTuLenh boards. Inspired by Lichess (cg-board) and cm-chessboard.

## Installation

```bash
pnpm add @cotulenh/board
```

## Usage

```typescript
import { CotulenhBoard } from '@cotulenh/board';

const board = CotulenhBoard(document.getElementById('board'), {
  fen: 'initial',
  movable: { color: 'red', free: false },
});
```

## Features

- **Custom Graphics**: Specialized piece sets for modern warfare roles.
- **Air Defense Overlays**: Visual representation of anti-air influence zones.
- **Deployment Workflow**: Built-in support for multi-step piece combination sessions.
- **Responsive**: Automatically handles resizing and layout adjustments.

## License

GPL-3.0-or-later
