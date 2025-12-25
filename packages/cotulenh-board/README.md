# @repo/cotulenh-board

Professional, customizable Svelte board component for Commander Chess (Cờ Tư Lệnh). Renders interactive game board with piece movement, animations, and full theme support.

[![npm version](https://img.shields.io/npm/v/@repo/cotulenh-board)](https://www.npmjs.com/package/@repo/cotulenh-board)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](./LICENSE)

## Overview

`cotulenh-board` provides a production-ready board UI component inspired by the battle-tested [lichess.org Chessground](https://github.com/lichess-org/chessground). It offers complete customization while maintaining a clean, intuitive API.

**Perfect for:**

- Building chess web applications with a professional UI
- Creating chess puzzles and educational tools
- Embedding chess boards in websites
- Learning how to build interactive game UIs

## Features

- ♟ Interactive board with drag-and-drop piece movement
- 🎨 Fully customizable themes, colors, and piece styles
- ✨ Smooth animations and visual feedback
- 🔍 Move highlighting and validation feedback
- 📱 Responsive design for all screen sizes
- 🎯 Works standalone or with [@repo/cotulenh-core](../cotulenh-core)
- 🧩 Modular architecture with optional features
- 🌍 SVG and image asset support
- 📦 Zero external UI dependencies
- 🚀 Built with Svelte 5 for optimal performance

## Installation

```bash
npm install @repo/cotulenh-board
```

Or with other package managers:

```bash
# Using pnpm
pnpm add @repo/cotulenh-board

# Using yarn
yarn add @repo/cotulenh-board
```

## Quick Start

### Basic Usage

```svelte
<script>
  import CotuLenhBoard from '@repo/cotulenh-board';

  let position = {
    // 12x11 board position (standard starting position)
    a1: 'rR', // red Rook at a1
    a2: 'rS', // red Soldier at a2
    // ... etc
  };

  function handleMove(from, to) {
    console.log(`Move: ${from} -> ${to}`);
    // Update position after validation
    position[to] = position[from];
    delete position[from];
  }
</script>

<CotuLenhBoard
  {position}
  onMove={handleMove}
/>

<style>
  /* Board takes full container */
  :global(div) {
    width: 100%;
    height: 100%;
  }
</style>
```

### With Game Logic

```svelte
<script>
  import CotuLenhBoard from '@repo/cotulenh-board';
  import { Game } from '@repo/cotulenh-core';

  const game = new Game();

  function handleMove(from, to) {
    // Validate with core logic
    const result = game.move(from, to);
    if (result.success) {
      // Update board
      position = getPositionFromGame(game);
    }
  }

  function getPositionFromGame(game) {
    // Convert game state to board position
    const pos = {};
    const board = game.getBoardState();
    // ... conversion logic
    return pos;
  }
</script>

<CotuLenhBoard
  position={getPositionFromGame(game)}
  onMove={handleMove}
/>
```

## API Reference

### Component Props

```typescript
interface CotuLenhBoardProps {
  // Board state and configuration
  position: BoardPosition; // Current piece positions
  orientation?: 'red' | 'black'; // Board perspective (default: 'red')

  // Interaction
  onMove?: (from: string, to: string) => void; // Move callback
  onSquareClick?: (square: string) => void; // Square click callback
  moveValidator?: (from: string, to: string) => boolean; // Custom validation

  // Visual customization
  theme?: ThemeConfig; // Colors and styling
  animated?: boolean; // Enable animations (default: true)
  draggable?: boolean; // Enable drag-and-drop (default: true)
  showCoordinates?: boolean; // Show a-k, 1-12 labels (default: true)

  // Highlights and feedback
  lastMove?: [string, string]; // Highlight last move
  validMoves?: string[]; // Highlight valid moves
  selectedSquare?: string; // Highlight selected piece
  highlightColor?: string; // Custom highlight color

  // Advanced
  disableDragOutside?: boolean; // Don't allow dragging outside board
  snapOnRelease?: boolean; // Snap pieces to squares (default: true)
}
```

### Board Position Format

```typescript
type BoardPosition = Record<string, string>;

// Example:
const position = {
  a1: 'rR', // red Rook
  a2: 'rS', // red Soldier
  d1: 'rC', // red Commander (General)
  a10: 'bR', // black Rook
  a11: 'bS', // black Soldier
  d12: 'bC', // black Commander
};

// Piece notation: [color][type]
// Color: r (red) | b (black)
// Type: C (Commander) | A (Advisor) | E (Elephant) | H (Horse) | R (Rook) | N (Cannon) | S (Soldier)
```

### Theme Customization

```typescript
interface ThemeConfig {
  // Board colors
  lightSquare?: string; // Light square color (default: #f0d9b5)
  darkSquare?: string; // Dark square color (default: #b58863)
  riverColor?: string; // River color (default: #d0d0d0)

  // Piece colors
  redPieceColor?: string; // Red piece color (default: #d91e18)
  blackPieceColor?: string; // Black piece color (default: #1a1a1a)

  // UI elements
  highlightColor?: string; // Valid move highlight (default: #baca44)
  selectedColor?: string; // Selected piece highlight (default: #f4d03f)
  lastMoveColor?: string; // Last move highlight (default: #9d9d9d)

  // Borders
  borderColor?: string; // Board border (default: #000)
  borderWidth?: number; // Border width in px (default: 2)
}
```

## Examples

### Example 1: Standalone Board

```svelte
<script>
  import CotuLenhBoard from '@repo/cotulenh-board';

  const standardPosition = {
    'a1': 'rR', 'c1': 'rH', 'e1': 'rA', 'd1': 'rC', 'f1': 'rA', 'h1': 'rH', 'k1': 'rR',
    'a3': 'rE', 'i3': 'rE',
    'b2': 'rN', 'j2': 'rN',
    'a4': 'rS', 'c4': 'rS', 'e4': 'rS', 'g4': 'rS', 'i4': 'rS',

    'a12': 'bR', 'c12': 'bH', 'e12': 'bA', 'd12': 'bC', 'f12': 'bA', 'h12': 'bH', 'k12': 'bR',
    'a10': 'bE', 'i10': 'bE',
    'b11': 'bN', 'j11': 'bN',
    'a9': 'bS', 'c9': 'bS', 'e9': 'bS', 'g9': 'bS', 'i9': 'bS',
  };

  let position = standardPosition;

  function handleMove(from, to) {
    position[to] = position[from];
    delete position[from];
  }
</script>

<div class="board-container">
  <CotuLenhBoard
    {position}
    onMove={handleMove}
  />
</div>

<style>
  .board-container {
    width: 600px;
    height: 660px;
  }
</style>
```

### Example 2: Custom Theme

```svelte
<script>
  import CotuLenhBoard from '@repo/cotulenh-board';

  const customTheme = {
    lightSquare: '#eae6dd',
    darkSquare: '#d4af9c',
    riverColor: '#b8b3a3',
    redPieceColor: '#c41e3a',
    blackPieceColor: '#2c3e50',
    highlightColor: '#9dd837',
    selectedColor: '#f0d03f',
  };
</script>

<CotuLenhBoard
  {position}
  theme={customTheme}
  onMove={handleMove}
/>
```

### Example 3: Puzzle Mode

```svelte
<script>
  import CotuLenhBoard from '@repo/cotulenh-board';
  import { Game } from '@repo/cotulenh-core';

  const game = new Game(puzzlePosition);
  let validMoves = [];

  function handleSquareClick(square) {
    validMoves = game.getValidMoves(square);
  }

  function handleMove(from, to) {
    const result = game.move(from, to);
    if (result.success) {
      validMoves = [];
      checkPuzzleSolution();
    }
  }

  function checkPuzzleSolution() {
    if (game.isSolved()) {
      alert('Puzzle solved!');
    }
  }
</script>

<CotuLenhBoard
  position={currentPosition}
  onMove={handleMove}
  onSquareClick={handleSquareClick}
  {validMoves}
/>
```

## Styling and CSS

The component uses CSS custom properties for easy theming:

```css
.cotulenh-board {
  --light-square: #f0d9b5;
  --dark-square: #b58863;
  --river-color: #d0d0d0;
  --highlight-color: #baca44;
  --selected-color: #f4d03f;
  --last-move-color: #9d9d9d;
}
```

## Asset Management

The component includes SVG assets for pieces:

```bash
# Assets are automatically included
dist/assets/pieces/ # SVG piece files
```

## Browser Compatibility

- Modern browsers (ES2020+)
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- No external UI library dependencies

## Performance

- Optimized Svelte components
- Hardware-accelerated animations
- Efficient DOM updates
- Suitable for real-time gameplay

## Related Packages

- **[@repo/cotulenh-core](../cotulenh-core)** - Game logic engine
- **[cotulenh-app](../../apps/cotulenh-app)** - Full demo application

## Contributing

Contributions welcome! Areas for improvement:

- Additional themes and piece styles
- Accessibility improvements
- Mobile touch optimizations
- Performance enhancements
- Documentation improvements

## License

GPL-3.0-or-later License - See [LICENSE](./LICENSE) file for details

## Resources

- [Component Demo](./demo.html)
- [Board Editor](./simple-board-editor.html)
- [Monorepo Documentation](../../README.md)
- [Bug Reports & Feature Requests](https://github.com/mnoyd/cotulenh-monorepo/issues)

## Inspiration

Inspired by the excellent [lichess.org Chessground](https://github.com/lichess-org/chessground) board component, adapted for Commander Chess.

## Support

- 📖 [Read the docs](./docs/README.md)
- 🐛 [Report issues](https://github.com/mnoyd/cotulenh-monorepo/issues)
- 💬 [Start a discussion](https://github.com/mnoyd/cotulenh-monorepo/discussions)
