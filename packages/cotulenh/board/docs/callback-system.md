# Callback System

Comprehensive guide to the event handling and callback mechanisms in Cotulenh Board.

## Overview

The callback system provides hooks into every aspect of board interaction, from piece movements to drawing operations. Events are organized into categories and fired at specific points in the interaction lifecycle.

## Event Categories

### 1. Board Events (`events` in Config)

Global board-level events that track overall state changes.

```typescript
interface BoardEvents {
  change?: () => void;
  move?: (orig: OrigMove, dest: DestMove, capturedPiece?: Piece) => void;
  dropNewPiece?: (piece: Piece, key: Key) => void;
  select?: (key: OrigMove) => void;
  insert?: (elements: Elements) => void;
}
```

### 2. Movement Events (`movable.events` in Config)

Events specific to piece movement operations.

```typescript
interface MovableEvents {
  after?: (orig: OrigMove, dest: DestMove, metadata: MoveMetadata) => void;
  afterStackMove?: (stackMove: StackMove, metadata: MoveMetadata) => void;
  afterNewPiece?: (role: Role, key: Key, metadata: MoveMetadata) => void;
}
```

### 3. Drawing Events (`drawable.onChange` in Config)

Events for drawing and shape operations.

```typescript
interface DrawableConfig {
  onChange?: (shapes: DrawShape[]) => void;
}
```

## Event Lifecycle

### Move Sequence

When a user makes a move, events fire in this order:

1. **`events.select`** - When origin square is selected
2. **`events.move`** - When move is executed (with captured piece if any)
3. **`movable.events.after`** - After move animation completes
4. **`events.change`** - After board state updates

```typescript
const board = CotulenhBoard(element, {
  events: {
    select: origMove => {
      console.log('Selected:', origMove);
      // { square: 'e2', type: 'infantry' }
    },
    move: (orig, dest, captured) => {
      console.log('Move:', orig, dest, captured);
      // orig: { square: 'e2', type: 'infantry' }
      // dest: { square: 'e4' }
      // captured: { role: 'tank', color: 'blue' } | undefined
    },
    change: () => {
      console.log('Board state changed');
      // Update UI, save state, etc.
    },
  },
  movable: {
    events: {
      after: (orig, dest, metadata) => {
        console.log('Move completed:', orig, dest, metadata);
        // metadata: { ctrlKey: false, holdTime: 250, captured: [...] }

        // Send move to server
        sendMoveToServer(orig, dest);
      },
    },
  },
});
```

### Stack Move Sequence

For complex stack movements:

1. **`events.select`** - Stack piece selected
2. **`movable.events.afterStackMove`** - Stack move completed
3. **`events.change`** - Board state updated

```typescript
const board = CotulenhBoard(element, {
  movable: {
    events: {
      afterStackMove: (stackMove, metadata) => {
        console.log('Stack move:', stackMove);
        // stackMove: {
        //   orig: 'e4',
        //   moves: [
        //     { piece: {...}, dest: 'e5', capturedPiece: {...} },
        //     { piece: {...}, dest: 'f4' }
        //   ],
        //   stay: { role: 'infantry', color: 'red' }
        // }

        // Handle complex move logic
        processStackMove(stackMove);
      },
    },
  },
});
```

## Event Data Structures

### `MoveMetadata`

Additional information about moves:

```typescript
interface MoveMetadata {
  ctrlKey?: boolean; // Was Ctrl key held?
  holdTime?: number; // How long was piece held (ms)
  captured?: Piece[]; // All pieces captured in this move
}
```

### `StackMove`

Complex multi-piece movements:

```typescript
interface StackMove {
  orig: Key; // Origin square
  moves: SingleMove[]; // Individual piece movements
  stay: Piece; // Piece that stays at origin
}

interface SingleMove {
  piece: Piece; // Piece being moved
  dest: Key; // Destination square
  capturedPiece?: Piece; // Piece captured at destination
}
```

### `OrigMove`

Origin move specification:

```typescript
interface OrigMove {
  square: Key; // Square coordinate
  type: Role; // Piece type being moved
  stackMove?: boolean; // Is this a stack move?
  carrying?: Role[]; // Pieces being carried
}
```

## Practical Examples

### Game Engine Integration

```typescript
class GameEngine {
  private board: Api;
  private gameState: GameState;

  constructor(element: HTMLElement) {
    this.board = CotulenhBoard(element, {
      events: {
        move: this.onMove.bind(this),
        change: this.onBoardChange.bind(this),
      },
      movable: {
        events: {
          after: this.onMoveComplete.bind(this),
          afterStackMove: this.onStackMoveComplete.bind(this),
        },
      },
    });
  }

  private onMove(orig: OrigMove, dest: DestMove, captured?: Piece) {
    // Validate move against game rules
    if (!this.isValidMove(orig, dest)) {
      // Revert the move
      this.revertLastMove();
      return;
    }

    // Update internal game state
    this.gameState.makeMove(orig, dest, captured);
  }

  private onMoveComplete(orig: OrigMove, dest: DestMove, metadata: MoveMetadata) {
    // Move is valid and animation complete
    // Update UI, check for game end, etc.
    this.updateGameStatus();

    // Send to server
    this.sendMoveToServer(orig, dest, metadata);
  }

  private onStackMoveComplete(stackMove: StackMove, metadata: MoveMetadata) {
    // Handle complex stack move
    this.gameState.makeStackMove(stackMove);
    this.updateGameStatus();
  }

  private onBoardChange() {
    // Board state changed - update valid moves
    const validMoves = this.calculateValidMoves();
    this.board.set({
      movable: { dests: validMoves },
    });
  }
}
```

### Real-time Multiplayer

```typescript
class MultiplayerBoard {
  private board: Api;
  private socket: WebSocket;

  constructor(element: HTMLElement, socket: WebSocket) {
    this.socket = socket;
    this.board = CotulenhBoard(element, {
      movable: {
        events: {
          after: (orig, dest, metadata) => {
            // Send move to other players
            this.socket.send(
              JSON.stringify({
                type: 'move',
                orig,
                dest,
                metadata,
              }),
            );
          },
        },
      },
    });

    // Listen for moves from other players
    this.socket.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.type === 'move') {
        // Apply move from other player
        this.board.move(data.orig, data.dest);
      }
    };
  }
}
```

### Board Editor with History

```typescript
class BoardEditor {
  private board: Api;
  private history: BoardState[] = [];
  private currentIndex = -1;

  constructor(element: HTMLElement) {
    this.board = CotulenhBoard(element, {
      movable: { free: true }, // Allow all moves in editor
      events: {
        change: () => {
          // Save state for undo/redo
          this.saveState();
        },
        dropNewPiece: (piece, key) => {
          console.log('New piece added:', piece, key);
          this.saveState();
        },
      },
    });
  }

  private saveState() {
    const currentState = {
      fen: this.board.getFen(),
      timestamp: Date.now(),
    };

    // Remove any future states if we're not at the end
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new state
    this.history.push(currentState);
    this.currentIndex++;
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const state = this.history[this.currentIndex];
      this.board.set({ fen: state.fen });
    }
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const state = this.history[this.currentIndex];
      this.board.set({ fen: state.fen });
    }
  }
}
```

### Drawing Event Handling

```typescript
const board = CotulenhBoard(element, {
  drawable: {
    enabled: true,
    onChange: shapes => {
      console.log('Shapes updated:', shapes);

      // Save drawing state
      localStorage.setItem('boardShapes', JSON.stringify(shapes));

      // Sync with other users
      syncShapesWithServer(shapes);
    },
  },
});

// Load saved shapes
const savedShapes = localStorage.getItem('boardShapes');
if (savedShapes) {
  board.setShapes(JSON.parse(savedShapes));
}
```

## Event Timing and Performance

### Debouncing Rapid Events

```typescript
class OptimizedBoard {
  private board: Api;
  private changeTimeout?: number;

  constructor(element: HTMLElement) {
    this.board = CotulenhBoard(element, {
      events: {
        change: this.debouncedChange.bind(this),
      },
    });
  }

  private debouncedChange() {
    // Debounce rapid changes
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }

    this.changeTimeout = window.setTimeout(() => {
      this.handleBoardChange();
    }, 100);
  }

  private handleBoardChange() {
    // Expensive operations here
    this.recalculateValidMoves();
    this.updateUI();
  }
}
```

### Async Event Handlers

```typescript
const board = CotulenhBoard(element, {
  movable: {
    events: {
      after: async (orig, dest, metadata) => {
        try {
          // Async operations
          await this.validateMoveWithServer(orig, dest);
          await this.updatePlayerStats(metadata);
          await this.checkForGameEnd();
        } catch (error) {
          console.error('Move processing failed:', error);
          // Handle error - maybe revert move
        }
      },
    },
  },
});
```

## Best Practices

1. **Keep event handlers lightweight** - Heavy operations should be debounced or async
2. **Use appropriate event types** - Don't use `change` for move-specific logic
3. **Handle errors gracefully** - Event handlers can fail, plan for it
4. **Clean up resources** - Remove listeners and clear timeouts when destroying board
5. **Validate in event handlers** - Use events to enforce game rules
6. **Separate concerns** - Use different events for different aspects (UI, game logic, networking)
