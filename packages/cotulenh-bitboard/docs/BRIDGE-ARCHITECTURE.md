# Bridge Architecture: Engine ↔ UI Communication

## Lessons from Chess Programming

### How chessground + chessops communicate:

```typescript
// ❌ NOT like this (expensive):
setInterval(() => {
  const fen = engine.toFEN();
  board.loadFEN(fen);
}, 100);

// ✅ Like this (efficient):
const move = engine.makeMove(from, to);
board.movePiece(move.from, move.to);
if (move.captured) {
  board.removePiece(move.to);
}
```

## Architecture Layers

```
┌─────────────────────────────────────┐
│  UI Layer (Chessground/React/Vue)  │
│  - Renders pieces                   │
│  - Handles user input               │
│  - Shows legal move highlights      │
└──────────────┬──────────────────────┘
               │ Simple Objects
               │ (UIMove, UIPiece)
┌──────────────▼──────────────────────┐
│      Bridge Layer (game-bridge.ts)  │
│  - Converts between formats         │
│  - Caches frequently used data      │
│  - Emits events for updates         │
└──────────────┬──────────────────────┘
               │ Internal Types
               │ (InternalMove, Bitboards)
┌──────────────▼──────────────────────┐
│   Engine Layer (BitboardPosition)   │
│  - Bitboard operations              │
│  - Move generation                  │
│  - Check detection                  │
│  - Air defense zones                │
└─────────────────────────────────────┘
```

## Communication Patterns

### 1. Initialization (Cold Path)

```typescript
// UI requests full position once
const position = bridge.getPosition();
// Returns: Map<number, UIPiece>
// { 0: {type: 'c', color: 'r', heroic: false}, ... }

board.setPosition(position);
```

### 2. User Interaction (Warm Path)

```typescript
// User clicks a piece
const legalMoves = bridge.getLegalMoves(square);
// Returns: { from: 42, destinations: [43, 44, 52], canDeploy: false }

board.highlightSquares(legalMoves.destinations);
```

### 3. Move Execution (Hot Path)

```typescript
// User makes a move
const move = bridge.makeMove(from, to);
// Returns: { from: 42, to: 43, piece: {...}, captured: {...} }

if (move) {
  board.animateMove(move.from, move.to);
  if (move.captured) {
    board.showCaptureAnimation(move.to);
  }
}
```

### 4. Event-Driven Updates (Optional)

```typescript
const bridge = new BitboardGameBridge(position, 'r', {
  onMove: (move) => {
    board.animateMove(move.from, move.to);
    updateMoveHistory(move);
  },
  onStateChange: (state) => {
    updateTurnIndicator(state.turn);
    if (state.isCheck) showCheckWarning();
  }
});
```

## Data Structures

### Internal (Engine) vs External (UI)

| Purpose     | Internal (Engine)             | External (UI)            |
| ----------- | ----------------------------- | ------------------------ |
| Position    | Bitboards (3 x u64)           | Map<number, UIPiece>     |
| Move        | InternalMove (flags, offsets) | UIMove (from, to, piece) |
| Legal Moves | InternalMove[]                | number[] (destinations)  |
| State       | Full game state               | UIGameState (minimal)    |

### Why This Separation?

1. **Performance**: Bitboards are fast for computation, slow for iteration
2. **Simplicity**: UI doesn't need internal flags (DEPLOY, COMBINATION, etc.)
3. **Flexibility**: Can change internal representation without breaking UI
4. **Testability**: Can test engine and UI independently

## Comparison with cotulenh-core

### Current (cotulenh-core) Pattern:

```typescript
// Every frame or interaction:
const fen = game.fen(); // Serializes entire board
const moves = game.moves({ square: 'e2' }); // Returns SAN strings
const move = game.move('e4'); // Parses SAN string
```

**Issues:**

- FEN generation is expensive (string building, piece iteration)
- SAN parsing is expensive (regex, ambiguity resolution)
- No incremental updates
- UI must parse FEN to render

### New (bitboard + bridge) Pattern:

```typescript
// Initialization only:
const position = bridge.getPosition(); // Map of pieces

// Per interaction:
const moves = bridge.getLegalMoves(42); // Array of square indices
const move = bridge.makeMove(42, 43); // Direct square indices

// Optional: Event-driven
bridge.on('move', (move) => updateUI(move));
```

**Benefits:**

- No serialization in hot path
- Direct square indices (no parsing)
- Incremental updates via events
- UI gets exactly what it needs

## Implementation Status

### ✅ Completed

- Bridge interface definition (`bridge.ts`)
- Basic bridge implementation (`game-bridge.ts`)
- Position class with bitboards (`position.ts`)

### 🚧 In Progress

- Move generator integration
- Check detection integration
- Deploy session handling in bridge

### 📋 TODO

- FEN serialization/deserialization
- Event system implementation
- Performance benchmarks vs cotulenh-core
- UI adapter examples (React, Vue, Svelte)

## Performance Goals

| Operation       | cotulenh-core         | Target (bitboard) |
| --------------- | --------------------- | ----------------- |
| Get position    | ~1ms (FEN parse)      | <0.1ms (direct)   |
| Legal moves     | ~2ms (generate + SAN) | <0.5ms (indices)  |
| Make move       | ~1ms (SAN parse)      | <0.2ms (direct)   |
| Check detection | ~0.5ms                | <0.1ms (bitboard) |

## Usage Example

```typescript
import { BitboardPosition } from './position';
import { BitboardGameBridge } from './game-bridge';

// Create engine
const position = new BitboardPosition();
// ... load starting position ...

// Create bridge
const bridge = new BitboardGameBridge(position, 'r', {
  onMove: (move) => console.log('Move:', move),
  onStateChange: (state) => console.log('State:', state)
});

// UI integration
const board = new ChessgroundBoard();
board.setPosition(bridge.getPosition());

board.on('select', (square) => {
  const moves = bridge.getLegalMoves(square);
  board.highlightSquares(moves.destinations);
});

board.on('move', (from, to) => {
  const move = bridge.makeMove(from, to);
  if (move) {
    board.animateMove(move);
  }
});
```

## Next Steps

1. Integrate move generator with bridge
2. Add check/checkmate detection
3. Implement FEN serialization
4. Create UI adapter examples
5. Performance benchmarks
6. Deploy session support in bridge
