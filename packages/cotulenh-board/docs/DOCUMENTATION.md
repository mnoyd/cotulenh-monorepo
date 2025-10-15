# Cotulenh Board Documentation

## Overview

Cotulenh Board is a JavaScript library for rendering and interacting with Commander Chess (Cờ Tư Lệnh) game boards. It provides a complete interactive chess board implementation with support for complex piece movements, stacking mechanics, combined pieces, and air defense systems.

## What Problem It Solves

Commander Chess is a complex variant of chess with unique mechanics that standard chess libraries cannot handle:

- **Piece Stacking**: Multiple pieces can occupy the same square and move together
- **Combined Pieces**: Certain pieces can combine to form more powerful units
- **Air Defense Systems**: Special influence zones and attack patterns
- **Complex Movement Rules**: Different piece types with unique movement and interaction patterns
- **Visual Feedback**: Real-time highlighting of valid moves, influence zones, and piece interactions

## Key Features

- 🎯 **Interactive Board**: Click-to-move and drag-and-drop piece movement
- 📚 **Piece Stacking**: Support for multiple pieces on the same square
- 🔗 **Piece Combination**: Automatic handling of piece merging mechanics
- 🛡️ **Air Defense**: Visual representation of influence zones
- 🎨 **Customizable Rendering**: Flexible styling and theming options
- ⚡ **Performance Optimized**: Efficient rendering and animation system
- 🎮 **Event System**: Comprehensive callback system for game integration

## Installation

```bash
npm install @repo/cotulenh-board
```

## Basic Usage

```typescript
import { CotulenhBoard } from '@repo/cotulenh-board';
import type { Config } from '@repo/cotulenh-board';

// Create a board instance
const boardElement = document.getElementById('board');
const config: Config = {
  orientation: 'red',
  turnColor: 'red',
  fen: 'starting-position-fen',
  movable: {
    color: 'red',
    showDests: true,
  },
};

const board = CotulenhBoard(boardElement, config);
```

## API Reference

### Main API Interface

```typescript
interface Api {
  // Configuration
  set(config: Config): void;

  // State access
  state: State;

  // Board manipulation
  toggleOrientation(): void;
  getFen(): string;
  setPieces(pieces: PiecesDiff): void;
  move(orig: OrigMove, dest: DestMove): void;
  newPiece(piece: Piece, key: Key): void;

  // Drawing and shapes
  setShapes(shapes: DrawShape[]): void;

  // Drag and drop
  dragNewPiece(piece: Piece, event: MouchEvent, force?: boolean): void;

  // Lifecycle
  redrawAll(): void;
  destroy(): void;
}
```

### Configuration Options

```typescript
interface Config {
  // Board orientation
  orientation?: 'red' | 'blue';
  numericCoordinates?: boolean;

  // Game state
  turnColor?: 'red' | 'blue';
  fen?: string;
  check?: 'red' | 'blue' | boolean;
  lastMove?: Key[];

  // Animation settings
  animation?: {
    enabled?: boolean;
    duration?: number;
  };

  // Movement configuration
  movable?: {
    free?: boolean;
    color?: 'red' | 'blue' | 'both';
    dests?: Dests;
    showDests?: boolean;
    events?: MovableEvents;
  };

  // Event callbacks
  events?: BoardEvents;

  // Drawing capabilities
  drawable?: DrawableConfig;

  // Air defense system
  airDefense?: AirDefenseConfig;
}
```

## Event System

### Board Events

```typescript
interface BoardEvents {
  // Called when board state changes
  change?: () => void;

  // Called after a piece move
  move?: (orig: OrigMove, dest: DestMove, capturedPiece?: Piece) => void;

  // Called when a new piece is dropped
  dropNewPiece?: (piece: Piece, key: Key) => void;

  // Called when a square is selected
  select?: (key: OrigMove) => void;

  // Called when DOM elements are inserted
  insert?: (elements: Elements) => void;
}
```

### Movement Events

```typescript
interface MovableEvents {
  // Called after a move is completed
  after?: (orig: OrigMove, dest: DestMove, metadata: MoveMetadata) => void;

  // Called after a stack move is completed
  afterStackMove?: (stackMove: StackMove, metadata: MoveMetadata) => void;

  // Called after a new piece is placed
  afterNewPiece?: (role: Role, key: Key, metadata: MoveMetadata) => void;
}
```

## Advanced Features

### Piece Stacking

Handle multiple pieces on the same square:

```typescript
// Configure for stack moves
const config: Config = {
  movable: {
    events: {
      afterStackMove: (stackMove, metadata) => {
        console.log('Stack moved:', stackMove);
        // Handle stack movement logic
      },
    },
  },
};
```

### Combined Pieces

Automatic piece combination when compatible pieces meet:

```typescript
// Pieces will automatically combine based on game rules
// No additional configuration needed - handled internally
```

### Air Defense System

Configure influence zones for air defense pieces:

```typescript
const config: Config = {
  airDefense: {
    showInfluceZone: true,
    influenceZone: {
      red: new Map([['e5', ['d4', 'd5', 'd6', 'e4', 'e6', 'f4', 'f5', 'f6']]]),
      blue: new Map([['e7', ['d6', 'd7', 'd8', 'e6', 'e8', 'f6', 'f7', 'f8']]]),
    },
  },
};
```

### Drawing and Shapes

Add visual annotations to the board:

```typescript
import type { DrawShape } from '@repo/cotulenh-board';

const shapes: DrawShape[] = [
  {
    orig: 'e4',
    dest: 'e6',
    brush: 'green',
  },
  {
    orig: 'd5',
    brush: 'red', // Circle on d5
  },
];

board.setShapes(shapes);
```

## Piece Types and Roles

```typescript
type Role =
  | 'commander'
  | 'infantry'
  | 'tank'
  | 'militia'
  | 'engineer'
  | 'artillery'
  | 'anti_air'
  | 'missile'
  | 'air_force'
  | 'navy'
  | 'headquarter';
```

## Board Coordinates

The board uses an 11x12 grid system:

- Files: 'a' through 'k' (11 files)
- Ranks: '1' through '12' (12 ranks)
- Keys: Combination like 'e6', 'a1', 'k12'

## Integration Examples

### React Integration

```typescript
import React, { useEffect, useRef } from 'react';
import { CotulenhBoard } from '@repo/cotulenh-board';
import type { Api, Config } from '@repo/cotulenh-board';

const ChessBoard: React.FC = () => {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api>();

  useEffect(() => {
    if (boardRef.current) {
      const config: Config = {
        orientation: 'red',
        movable: {
          color: 'red',
          events: {
            after: (orig, dest, metadata) => {
              // Handle move completion
              console.log('Move:', orig, dest);
            }
          }
        }
      };

      apiRef.current = CotulenhBoard(boardRef.current, config);
    }

    return () => {
      apiRef.current?.destroy();
    };
  }, []);

  return <div ref={boardRef} className="board-container" />;
};
```

### Game Engine Integration

```typescript
class GameEngine {
  private board: Api;

  constructor(element: HTMLElement) {
    this.board = CotulenhBoard(element, {
      movable: {
        events: {
          after: this.handleMove.bind(this),
        },
      },
    });
  }

  private handleMove(orig: OrigMove, dest: DestMove, metadata: MoveMetadata) {
    // Validate move with game engine
    if (this.isValidMove(orig, dest)) {
      // Update game state
      this.updateGameState(orig, dest);

      // Update valid moves for next turn
      this.updateValidMoves();
    } else {
      // Revert invalid move
      this.revertMove();
    }
  }

  private updateValidMoves() {
    const dests = this.calculateValidMoves();
    this.board.set({ movable: { dests } });
  }
}
```

## Styling and Theming

The board comes with CSS classes for customization:

```css
/* Board container */
.cg-wrap {
  /* Board wrapper styles */
}

/* Individual squares */
.cg-board square {
  /* Square styling */
}

/* Pieces */
.cg-board piece {
  /* Piece styling */
}

/* Highlighted squares */
.cg-board square.move-dest {
  /* Valid move destination highlighting */
}

/* Selected square */
.cg-board square.selected {
  /* Selected square highlighting */
}
```

## Performance Considerations

- The board uses efficient DOM manipulation and animation systems
- Large numbers of pieces are handled with optimized rendering
- Animation can be disabled for better performance on slower devices
- Use `redrawAll()` sparingly as it rebuilds the entire board

## Browser Support

- Modern browsers with ES2015+ support
- Touch devices supported for mobile gameplay
- Requires DOM manipulation capabilities

## License

GPL-3.0-or-later - See LICENSE file for details.
