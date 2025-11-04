# API Reference

Complete reference for all exported APIs from Cotulenh Board.

## Main Exports

```typescript
import {
  CotulenhBoard, // Main board constructor
  initModule, // Alternative initialization
  origMoveToKey, // Utility function
} from '@repo/cotulenh-board';

import type {
  Api, // Main API interface
  Config, // Configuration interface
  // ... all types
} from '@repo/cotulenh-board';
```

## Primary API Interface

### `Api` Interface

The main interface returned by `CotulenhBoard()`:

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

### Method Details

#### `set(config: Config): void`

Updates board configuration. Supports partial updates.

```typescript
// Update turn color and valid moves
board.set({
  turnColor: 'blue',
  movable: {
    color: 'blue',
    dests: newValidMoves,
  },
});
```

#### `toggleOrientation(): void`

Flips the board orientation between red and blue perspective.

```typescript
board.toggleOrientation(); // Flips board view
```

#### `getFen(): string`

Returns current board position as FEN string.

```typescript
const position = board.getFen();
// Returns: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R"
```

#### `setPieces(pieces: PiecesDiff): void`

Updates multiple pieces on the board with animation.

```typescript
// Add, remove, or modify pieces
board.setPieces(
  new Map([
    ['e4', { role: 'tank', color: 'red' }], // Add piece
    ['e5', undefined], // Remove piece
    ['d4', { role: 'infantry', color: 'blue' }], // Change piece
  ]),
);
```

#### `move(orig: OrigMove, dest: DestMove): void`

Programmatically execute a move with animation.

```typescript
board.move({ square: 'e2', type: 'infantry' }, { square: 'e4' });
```

#### `newPiece(piece: Piece, key: Key): void`

Add a new piece to the board with animation.

```typescript
board.newPiece({ role: 'commander', color: 'red' }, 'e1');
```

#### `setShapes(shapes: DrawShape[]): void`

Add visual annotations to the board.

```typescript
board.setShapes([
  {
    orig: 'e4',
    dest: 'e6',
    brush: 'green',
  },
  {
    orig: 'd5',
    brush: 'red', // Circle on d5
  },
]);
```

#### `dragNewPiece(piece: Piece, event: MouchEvent, force?: boolean): void`

Start dragging a new piece from outside the board (for editors).

```typescript
// In a piece palette click handler
function onPieceClick(piece: Piece, event: MouseEvent) {
  board.dragNewPiece(piece, event, true); // force=true allows replacing pieces
}
```

#### `redrawAll(): void`

Force complete board redraw. Use sparingly as it's expensive.

```typescript
// After major DOM changes
board.redrawAll();
```

#### `destroy(): void`

Clean up all event listeners and resources.

```typescript
// Component unmount
board.destroy();
```

## Configuration Interface

### `Config` Interface

```typescript
interface Config {
  // Board setup
  orientation?: 'red' | 'blue';
  numericCoordinates?: boolean;
  turnColor?: 'red' | 'blue';
  fen?: string;
  check?: 'red' | 'blue' | boolean;
  lastMove?: Key[];

  // Animation
  animation?: {
    enabled?: boolean;
    duration?: number; // milliseconds
  };

  // Movement rules
  movable?: MovableConfig;

  // Event callbacks
  events?: BoardEvents;

  // Drawing system
  drawable?: DrawableConfig;

  // Air defense
  airDefense?: AirDefenseConfig;
}
```

### `MovableConfig` Interface

```typescript
interface MovableConfig {
  free?: boolean; // All moves valid (editor mode)
  color?: 'red' | 'blue' | 'both'; // Who can move
  dests?: Dests; // Valid move destinations
  showDests?: boolean; // Highlight valid moves
  events?: MovableEvents; // Movement callbacks
}

/**
 * When specifying `movable.dests`, you must provide destination keys for both
 * the carrier piece and any pieces it may be carrying. This is necessary to
 * correctly highlight valid moves for each piece in the stack.
 *
 * For example, if a square contains a stack with a `tank` carrier and an
 * `infantry` piece, you should include the following keys in your `Dests`
 * mapping:
 *
 * - `square.tank` for the carrier's destinations
 * - `square.infantry` for the carried piece's destinations
 *
 * If a square contains a single piece, you only need to provide a single key
 * for that piece.
 */
```

### `Dests` Type

Valid move destinations mapping:

```typescript
type Dests = Map<OrigMoveKey, DestMove[]>;
type OrigMoveKey = `${Key}.${Role}`;

// Example:
const dests = new Map([
  ['e2.infantry', [{ square: 'e3' }, { square: 'e4' }]],
  ['d1.commander', [{ square: 'd2' }, { square: 'e1' }]],
]);
```

#### Stack selection keys

When a square contains a stack, the board may look up destinations using **two** keys:

1. `square.role` — used when a specific piece has been chosen (for example from the combine-piece popup).
2. `square.undefined` — used when the user clicks the stack itself without selecting a particular piece. This key should only list the carrier piece's legal moves so the board highlights the correct squares.

In deploy mode every piece in the stack can move independently, so include entries for each `square.role`. In normal mode you typically provide the carrier's destinations for `square.undefined` and restrict carried pieces to popup selection only.

## Key Types

### `Piece` Interface

```typescript
interface Piece {
  role: Role;
  color: 'red' | 'blue';
  promoted?: boolean;
  carrying?: Piece[]; // For stacked pieces
}
```

### `Role` Type

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

### `OrigMove` and `DestMove`

```typescript
interface OrigMove {
  square: Key;
  type: Role;
  stackMove?: boolean;
  carrying?: Role[];
}

interface DestMove {
  square: Key;
  stay?: boolean; // For capture-and-stay moves
}
```

### `Key` Type

Board coordinates:

```typescript
type Key = 'a0' | `${File}${Rank}`;
type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
```

## Utility Functions

### `origMoveToKey(origMove: OrigMove): OrigMoveKey`

Converts an OrigMove to a string key for use in Dests mapping:

```typescript
import { origMoveToKey } from '@repo/cotulenh-board';

const key = origMoveToKey({ square: 'e2', type: 'infantry' });
// Returns: "e2.infantry"
```

## Constructor Functions

### `CotulenhBoard(element: HTMLElement, config?: Config): Api`

Main constructor function:

```typescript
const board = CotulenhBoard(document.getElementById('board'), {
  orientation: 'red',
  movable: { color: 'red' },
});
```

### `initModule({ el, config }: { el: HTMLElement; config?: Config }): Api`

Alternative initialization (same as CotulenhBoard):

```typescript
const board = initModule({
  el: document.getElementById('board'),
  config: { orientation: 'red' },
});
```
