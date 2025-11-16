# Board-Engine Integration Strategy

## The Critical Insight

You're absolutely right! **chess.js** and **chessops** have **different interfaces**, but both integrate with **chessground** (the board UI). This reveals an important architectural pattern:

```
┌─────────────┐         ┌─────────────┐
│  chess.js   │         │  chessops   │
│  (0x88)     │         │ (bitboards) │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │  Different APIs       │
       │                       │
       └───────────┬───────────┘
                   │
                   ▼
           ┌───────────────┐
           │  chessground  │
           │   (Board UI)  │
           └───────────────┘
```

**The key question**: How should `cotulenh-core` and `cotulenh-bitboard` interact with `cotulenh-board`?

---

## Current State Analysis

### How chess.js Integrates with chessground

```typescript
// chess.js provides game logic
const chess = new Chess();

// chessground provides UI
const board = Chessground(element, {
  fen: chess.fen(),
  movable: {
    free: false,
    dests: toDests(chess), // Convert chess.js moves to chessground format
    events: {
      after: (orig, dest) => {
        // User moved piece on board
        chess.move({ from: orig, to: dest });

        // Update board with new state
        board.set({
          fen: chess.fen(),
          turnColor: toColor(chess),
          movable: { dests: toDests(chess) }
        });
      }
    }
  }
});

// Adapter function: chess.js → chessground
function toDests(chess) {
  const dests = new Map();
  for (const square of chess.SQUARES) {
    const moves = chess.moves({ square, verbose: true });
    if (moves.length) {
      dests.set(
        square,
        moves.map((m) => m.to)
      );
    }
  }
  return dests;
}
```

**Key Pattern**:

- chess.js is **independent** (doesn't know about chessground)
- chessground is **independent** (doesn't know about chess.js)
- **Adapter layer** translates between them

### How chessops Integrates with chessground

```typescript
// chessops provides game logic
import { Chess } from 'chessops/chess';
import { parseFen, makeFen } from 'chessops/fen';
import { chessgroundDests } from 'chessops/compat';

const pos = Chess.default();

// chessground provides UI
const board = Chessground(element, {
  fen: makeFen(pos.toSetup()),
  movable: {
    dests: chessgroundDests(pos), // Built-in adapter!
    events: {
      after: (orig, dest) => {
        // User moved piece on board
        const move = parseUci(orig + dest)!;
        pos.play(move);

        // Update board
        board.set({
          fen: makeFen(pos.toSetup()),
          turnColor: pos.turn,
          movable: { dests: chessgroundDests(pos) }
        });
      }
    }
  }
});
```

**Key Pattern**:

- chessops is **independent** (doesn't know about chessground)
- chessground is **independent** (doesn't know about chessops)
- **Built-in adapter** (`chessgroundDests`) for convenience

---

## The Problem with CoTuLenh

### Current cotulenh-board Implementation

Looking at the repository map, `cotulenh-board` (chessground fork) has:

```typescript
// src/board.ts - TIGHTLY COUPLED!
interface PreparedPiece {
  updatedPieces: PiecesUpdated;
  originalPiece: OriginalPiece;
}

function handleStackPieceMoves(
  state: HeadlessState,
  piecesPrepared: PreparedPiece,
  origMove: cg.OrigMove,
  destMove: cg.DestMove
);

function handleDeployMove(
  state: HeadlessState,
  piecesPrepared: PreparedPiece,
  origMove: cg.OrigMove,
  destMove: cg.DestMove
);
```

**Problem**: `cotulenh-board` has **game logic** embedded in it!

- Stack handling logic
- Deploy move logic
- Piece combination logic

This is **wrong**! The board should be **dumb** - just UI.

---

## The Solution: Clean Separation

### Principle: Board is Dumb, Engine is Smart

```
┌─────────────────────────────────────────────────────┐
│                  Application Layer                  │
│              (Adapter/Integration Code)             │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
               ▼                      ▼
    ┌──────────────────┐   ┌──────────────────┐
    │  cotulenh-core   │   │cotulenh-bitboard │
    │  (Game Logic)    │   │  (Game Logic)    │
    │                  │   │                  │
    │  - Move gen      │   │  - Move gen      │
    │  - Validation    │   │  - Validation    │
    │  - Stack rules   │   │  - Stack rules   │
    │  - Deploy logic  │   │  - Deploy logic  │
    └──────────────────┘   └──────────────────┘
               │                      │
               └──────────┬───────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  cotulenh-board  │
                │   (Board UI)     │
                │                  │
                │  - Rendering     │
                │  - Drag & drop   │
                │  - Animations    │
                │  - NO LOGIC!     │
                └──────────────────┘
```

### What Should Change

#### 1. **cotulenh-board** Should Be Simplified

**Remove game logic**:

```typescript
// ❌ REMOVE from cotulenh-board
function handleStackPieceMoves(...)
function handleDeployMove(...)
function tryCombinePieces(...)
function removePieceFromStack(...)
```

**Keep only UI logic**:

```typescript
// ✅ KEEP in cotulenh-board
function renderPieces(...)
function handleDragStart(...)
function handleDragEnd(...)
function animateMove(...)
function renderStackVisually(...)  // Visual only!
```

#### 2. **cotulenh-core** and **cotulenh-bitboard** Should Be Independent

Both engines should:

- ✅ Have **identical public API**
- ✅ Be **completely independent** of cotulenh-board
- ✅ Handle **all game logic** internally
- ✅ Provide **adapter functions** for board integration

```typescript
// Both engines expose same API
interface CoTulenhEngine {
  // State
  fen(): string;
  load(fen: string): void;
  turn(): Color;

  // Pieces
  get(square: Square): Piece | undefined;
  put(piece: Piece, square: Square): boolean;
  remove(square: Square): Piece | undefined;

  // Moves
  moves(options?: MoveOptions): Move[] | string[];
  move(move: string | MoveObject): Move | null;
  undo(): Move | null;

  // Game state
  isCheck(): boolean;
  isCheckmate(): boolean;
  isGameOver(): boolean;

  // CoTuLenh-specific
  getValidDests(): Map<Square, Square[]>; // For board integration!
  getStackInfo(square: Square): StackInfo | undefined;
  getDeploySession(): DeploySession | undefined;
  getAirDefenseZones(): AirDefenseZones;
}
```

#### 3. **Adapter Layer** Should Handle Integration

```typescript
// packages/cotulenh-board-adapter/src/index.ts

import type { CoTulenhEngine } from '@repo/cotulenh-types';
import type { Api as BoardApi } from '@repo/cotulenh-board';

/**
 * Adapter that connects any CoTuLenh engine to the board
 * Works with both cotulenh-core and cotulenh-bitboard
 */
export class CoTulenhBoardAdapter {
  constructor(
    private engine: CoTulenhEngine,
    private board: BoardApi
  ) {
    this.syncBoardToEngine();
  }

  // Sync board state from engine
  private syncBoardToEngine() {
    this.board.set({
      fen: this.engine.fen(),
      turnColor: this.engine.turn(),
      movable: {
        color: this.engine.turn(),
        dests: this.engine.getValidDests(), // Engine provides this!
        events: {
          after: (orig, dest) => this.handleMove(orig, dest)
        }
      },
      // CoTuLenh-specific
      airDefense: {
        showInfluenceZone: true,
        influenceZone: this.engine.getAirDefenseZones()
      }
    });
  }

  // Handle move from board
  private handleMove(orig: string, dest: string) {
    const result = this.engine.move({ from: orig, to: dest });

    if (result) {
      // Move succeeded, update board
      this.syncBoardToEngine();
    } else {
      // Move failed, reset board
      this.board.set({ fen: this.engine.fen() });
    }
  }

  // Handle deploy moves
  handleDeployMove(moves: DeployMoveRequest) {
    const result = this.engine.deployMove(moves);

    if (result) {
      this.syncBoardToEngine();
    }
  }

  // Handle recombine
  handleRecombine(from: string, to: string, piece: string) {
    const result = this.engine.recombine(from, to, piece);

    if (result) {
      this.syncBoardToEngine();
    }
  }
}
```

---

## Proposed Architecture

### Package Structure

```
packages/
├── cotulenh-types/          # Shared types
│   ├── src/
│   │   ├── piece.ts         # Piece, Color, Square
│   │   ├── engine.ts        # CoTulenhEngine interface
│   │   ├── board.ts         # Board integration types
│   │   └── index.ts
│   └── package.json
│
├── cotulenh-core/           # Current 0x88 engine
│   ├── src/
│   │   ├── cotulenh.ts      # Implements CoTulenhEngine
│   │   └── ...
│   └── package.json
│
├── cotulenh-bitboard/       # New bitboard engine
│   ├── src/
│   │   ├── index.ts         # Implements CoTulenhEngine
│   │   └── ...
│   └── package.json
│
├── cotulenh-board/          # Board UI (simplified!)
│   ├── src/
│   │   ├── render.ts        # Rendering only
│   │   ├── drag.ts          # Drag & drop only
│   │   ├── anim.ts          # Animation only
│   │   └── index.ts         # NO GAME LOGIC!
│   └── package.json
│
└── cotulenh-board-adapter/  # Integration layer
    ├── src/
    │   ├── adapter.ts       # CoTulenhBoardAdapter
    │   ├── helpers.ts       # Conversion utilities
    │   └── index.ts
    └── package.json
```

### Usage Example

```typescript
// In your app
import { CoTuLenh as CoreEngine } from '@repo/cotulenh-core';
import { CoTuLenh as BitboardEngine } from '@repo/cotulenh-bitboard';
import { CotulenhBoard } from '@repo/cotulenh-board';
import { CoTulenhBoardAdapter } from '@repo/cotulenh-board-adapter';

// Choose engine (same API!)
const USE_BITBOARD = true;
const engine = USE_BITBOARD ? new BitboardEngine() : new CoreEngine();

// Create board
const board = CotulenhBoard(element, {
  // Board config only - no game logic!
  orientation: 'red',
  animation: { enabled: true }
});

// Connect them with adapter
const adapter = new CoTulenhBoardAdapter(engine, board);

// Now they work together!
// User drags piece → board notifies adapter → adapter calls engine → engine validates → adapter updates board
```

---

## Migration Strategy

### Phase 1: Create Shared Types Package

```bash
# Create @repo/cotulenh-types
pnpm create @repo/cotulenh-types
```

Extract common types:

- `Piece`, `Color`, `Square`, `PieceSymbol`
- `CoTulenhEngine` interface
- Board integration types

### Phase 2: Refactor cotulenh-board

**Remove game logic**:

1. Extract stack logic → move to cotulenh-core
2. Extract deploy logic → move to cotulenh-core
3. Extract combination logic → move to cotulenh-core
4. Keep only rendering/interaction

**Simplify API**:

```typescript
// Before (coupled)
board.set({
  movable: {
    dests: { a2: ['a3', 'a4'] }, // Board validates moves!
    events: {
      after: (orig, dest) => {
        // Board handles game logic!
      }
    }
  }
});

// After (decoupled)
board.set({
  fen: '...', // Just display this
  movable: {
    dests: validDests, // Engine provides this
    events: {
      after: (orig, dest) => {
        // Just notify, don't validate
        onMove(orig, dest);
      }
    }
  }
});
```

### Phase 3: Create Adapter Package

```bash
# Create @repo/cotulenh-board-adapter
pnpm create @repo/cotulenh-board-adapter
```

Implement `CoTulenhBoardAdapter` class that:

- Connects engine to board
- Handles move events
- Syncs state
- Manages deploy sessions
- Handles recombine moves

### Phase 4: Update cotulenh-core

Make cotulenh-core implement `CoTulenhEngine` interface:

```typescript
// packages/cotulenh-core/src/cotulenh.ts
import type { CoTulenhEngine } from '@repo/cotulenh-types';

export class CoTuLenh implements CoTulenhEngine {
  // Existing methods...

  // Add board integration helper
  getValidDests(): Map<Square, Square[]> {
    const dests = new Map();
    const moves = this.moves({ verbose: true });

    for (const move of moves) {
      if (!dests.has(move.from)) {
        dests.set(move.from, []);
      }
      dests.get(move.from)!.push(move.to);
    }

    return dests;
  }
}
```

### Phase 5: Implement cotulenh-bitboard

Build cotulenh-bitboard to implement same `CoTulenhEngine` interface:

```typescript
// packages/cotulenh-bitboard/src/index.ts
import type { CoTulenhEngine } from '@repo/cotulenh-types';

export class CoTuLenh implements CoTulenhEngine {
  // Same API as cotulenh-core!
  // But bitboard implementation internally

  getValidDests(): Map<Square, Square[]> {
    // Bitboard-based implementation
    // Same output format as cotulenh-core
  }
}
```

---

## Benefits of This Approach

### 1. **Clean Separation of Concerns**

- Board = UI only
- Engine = Logic only
- Adapter = Integration only

### 2. **Easy Engine Swapping**

```typescript
// Change one line!
const engine = new BitboardEngine(); // or CoreEngine()
```

### 3. **Independent Development**

- Board team works on UI
- Engine team works on logic
- No conflicts!

### 4. **Easy Testing**

```typescript
// Test engine without board
const engine = new CoTuLenh();
engine.move('e2-e4');
expect(engine.fen()).toBe('...');

// Test board without engine
const board = CotulenhBoard(element);
board.set({ fen: '...' });
expect(board.state.pieces.get('e4')).toBeDefined();

// Test integration
const adapter = new CoTulenhBoardAdapter(engine, board);
// Test adapter logic
```

### 5. **Follows Industry Patterns**

- Same pattern as chess.js + chessground
- Same pattern as chessops + chessground
- Proven architecture!

---

## Action Items

**Immediate**:

1. ✅ Create `@repo/cotulenh-types` package
2. ✅ Define `CoTulenhEngine` interface
3. ✅ Extract common types

**Short-term**: 4. Refactor `cotulenh-board` to remove game logic 5. Create `@repo/cotulenh-board-adapter` 6. Update `cotulenh-core` to implement interface

**Long-term**: 7. Implement `cotulenh-bitboard` with same interface 8. Performance comparison 9. Gradual migration

---

## Conclusion

You're absolutely right - the integration between board and engine needs to be **smart and clean**. The solution is:

1. **Separate concerns**: Board = UI, Engine = Logic
2. **Common interface**: Both engines implement same API
3. **Adapter layer**: Handles integration
4. **Independent packages**: Can develop/test separately

This follows the proven pattern from chess.js/chessops + chessground, and gives us maximum flexibility for the bitboard implementation.

**Should we start with creating `@repo/cotulenh-types`?**
