# Data Flow Patterns

## Overview

The CoTuLenh system uses a **unidirectional data flow** pattern where state changes flow from the core engine through the application layer to the UI components.

## Primary Data Flow: Move Execution

### 1. User Interaction

```typescript
// User drags piece from e2 to e4
// Board captures this as:
const orig: OrigMove = { square: 'e2', type: 'infantry' };
const dest: DestMove = { square: 'e4', stay: false };
```

### 2. Board Event Callback

```typescript
// Board calls the registered callback
callUserFunction(state.movable.events.after, orig, dest);
```

### 3. Svelte App Processes Move

```typescript
// In +page.svelte
function handleMove(orig: OrigMove, dest: DestMove) {
  const moveResult = makeCoreMove(game, orig, dest);
  if (moveResult) {
    gameStore.applyMove(game, moveResult);
  }
}
```

### 4. Core Engine Processing

```typescript
// In cotulenh-core
game.move({
  from: 'e2',
  to: 'e4',
  piece: 'i', // infantry
  deploy: false
});
// Returns Move object or null
```

### 5. State Update and Propagation

```typescript
// In game store
applyMove(game: CoTuLenh, move: Move) {
  update((state) => ({
    ...state,
    fen: game.fen(),                    // New board state
    possibleMoves: getPossibleMoves(game), // Recalculated legal moves
    turn: game.turn(),                  // Updated turn
    deployState: game.getDeployState()  // Deploy session state
  }));
}
```

### 6. Reactive UI Update

```typescript
// In +page.svelte - reactive statement
$: if (boardApi && $gameStore.fen) {
  reSetupBoard(); // Updates board with new state
}
```

## Deploy Session Data Flow

Deploy sessions have a more complex flow because they involve multiple steps:

### 1. Deploy Session Initiation

```typescript
// User clicks on a stack piece
// Board detects it's a stack and allows selection
// First move from stack triggers deploy session creation in core
```

### 2. Individual Deploy Steps

```typescript
// Each piece movement from the stack:
User Action → Board Event → App Processing → Core Update → State Propagation

// Core maintains deploy session with virtual state:
{
  originalSquare: 'd5',
  originalPiece: { type: 'stack', carrying: [tank, infantry] },
  movedPieces: [tank], // Pieces already moved
  virtualChanges: Map { 'e5' → tank, 'd5' → infantry } // Virtual overlay
}
```

### 3. FEN with Virtual State

```typescript
// Core generates FEN that includes virtual state
generateFEN(gameState: IGameState): string {
  // For each square, use effective piece (considering deploy session)
  const piece = gameState.deploySession
    ? gameState.deploySession.getEffectivePiece(gameState.board, square)
    : gameState.board.get(square);
}
```

### 4. Legal Moves Recalculation

```typescript
// After each deploy step, legal moves are recalculated
// This ensures moves like "air force can now fly past captured anti-air" work correctly
const newMoves = game.moves(); // Fresh calculation based on current virtual state
```

## State Synchronization Pattern

### Game Store as Central Hub

```typescript
interface GameState {
  fen: string; // Complete board state (including virtual)
  turn: Color | null; // Current player
  possibleMoves: Move[]; // Legal moves from current state
  deployState: DeployState | null; // Deploy session info
  // ... other state
}
```

### Reactive Updates

```typescript
// Svelte's reactive system ensures UI stays in sync
$: boardConfig = {
  fen: $gameStore.fen,
  turnColor: coreToBoardColor($gameStore.turn),
  movable: {
    dests: mapPossibleMovesToDests($gameStore.possibleMoves)
  }
};
```

## Type Conversion Patterns

### Core ↔ Board Type Mapping

```typescript
// Core uses internal types
type CorePiece = { type: PieceSymbol; color: Color; heroic?: boolean };

// Board uses display types
type BoardPiece = { role: Role; color: 'red' | 'blue'; promoted?: boolean };

// Conversion functions
function convertBoardPieceToCorePiece(piece: BoardPiece): CorePiece;
function getRoleFromCoreType(coreType: PieceSymbol): Role;
```

### Move Format Conversion

```typescript
// Board move format
interface OrigMove {
  square: Key;
  type?: Role;
}
interface DestMove {
  square: Key;
  stay?: boolean;
}

// Core move format
interface Move {
  from: Square;
  to: Square;
  piece: PieceSymbol;
  stay?: boolean;
}
```

## Error Handling Pattern

### Graceful Degradation

```typescript
function handleMove(orig: OrigMove, dest: DestMove) {
  try {
    const moveResult = makeCoreMove(game, orig, dest);
    if (moveResult) {
      gameStore.applyMove(game, moveResult);
    } else {
      // Move was illegal - no state change needed
      console.warn('Illegal move attempted');
    }
  } catch (error) {
    // Reset board to consistent state
    reSetupBoard();
    console.error('Error making move:', error);
  }
}
```

## Performance Considerations

### Efficient Updates

- **FEN Comparison**: Only update board when FEN actually changes
- **Move Caching**: Core can cache legal moves until state changes
- **Virtual State**: Deploy sessions don't mutate base state (faster rollback)

### Reactive Optimization

```typescript
// Only recalculate when necessary
$: if (boardApi && $gameStore.fen) {
  // This only runs when FEN changes, not on every store update
  reSetupBoard();
}
```

## Debug Data Flow

### Logging Pattern

```typescript
// Trace data flow for debugging
console.log('1. Board move attempt:', orig, '->', dest);
console.log('2. Core move result:', moveResult);
console.log('3. Updated game state:', $gameStore);
console.log('4. Board config update:', boardConfig);
```

### State Inspection

```typescript
// Access internal state for debugging
const deployState = game.getDeployState();
const fen = game.fen();
const legalMoves = game.moves();
```

## Common Data Flow Issues

### ❌ Board Managing State

```typescript
// WRONG: Board trying to manage game state
state.pieces.set(dest.square, piece); // Board mutating its own state
```

### ✅ Proper Delegation

```typescript
// CORRECT: Board delegates to app, app delegates to core
callUserFunction(state.movable.events.after, orig, dest);
```

### ❌ Stale Legal Moves

```typescript
// WRONG: Using cached moves after state change
const moves = cachedMoves; // These might be outdated after deploy step
```

### ✅ Fresh Legal Moves

```typescript
// CORRECT: Always get fresh moves from core
possibleMoves: getPossibleMoves(game); // Recalculated after every state change
```
