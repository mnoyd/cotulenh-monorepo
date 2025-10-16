# Package Responsibilities

## Overview

The CoTuLenh monorepo is organized into distinct packages with clear responsibilities. Understanding what each package should and should NOT do is crucial for maintaining the architecture.

## packages/cotulenh-core/

### Primary Responsibilities ✅

**Game Logic & Rules**

- Move generation and validation
- Check/checkmate detection
- Game state transitions
- Rule enforcement (piece movement patterns, capture rules, etc.)

**State Management**

- Board state representation (0x88 board)
- Piece management (stacks, heroic status, carrying)
- Turn management and move counters
- Deploy session management with virtual state

**Serialization**

- FEN (Forsyth-Edwards Notation) generation and parsing
- SAN (Standard Algebraic Notation) for moves
- Game state persistence and loading

**Move Processing**

- Legal move calculation
- Move execution and rollback
- Deploy session step processing
- Capture and combination logic

**Air Defense System**

- Bitboard-based air defense zone calculation
- Influence zone computation
- Air defense radius management

### What Core Should NOT Do ❌

- UI rendering or visual representation
- User input handling (mouse, keyboard events)
- Animation or visual effects
- Direct DOM manipulation
- Framework-specific code (React, Svelte, etc.)

### Key Files and Their Roles

```
src/
├── core/
│   ├── Board.ts          # 0x88 board representation
│   ├── GameState.ts      # Immutable game state
│   ├── DeploySession.ts  # Virtual deploy state management
│   ├── Move.ts           # Move types and factory
│   └── Piece.ts          # Piece utilities and stack management
├── game/
│   └── GameController.ts # High-level game coordination
├── move-generation/
│   ├── MoveGenerator.ts  # Main move generation engine
│   └── pieces/           # Piece-specific move generators
├── serialization/
│   ├── FENSerializer.ts  # FEN encoding/decoding
│   └── SANParser.ts      # SAN parsing and generation
└── cotulenh.ts          # Public API facade
```

## packages/cotulenh-board/

### Primary Responsibilities ✅

**Visual Rendering**

- Piece sprites and animations
- Board square rendering
- Coordinate labels and decorations
- Visual highlights (selection, legal moves, check)

**User Interaction**

- Drag and drop handling
- Click/touch event processing
- Piece selection and deselection
- Visual feedback for user actions

**Animation System**

- Piece movement animations
- Capture animations
- Visual transitions

**Board Configuration**

- Theme and styling options
- Board orientation (red/blue perspective)
- Visual customization settings

### What Board Should NOT Do ❌

- Game logic decisions (what moves are legal)
- Game state management (whose turn, game status)
- Move validation or rule enforcement
- Deploy session management
- FEN parsing or generation
- Move history tracking

### Current Issues to Fix 🔧

The board package currently does some things it shouldn't:

```typescript
// REMOVE: Internal deploy session management
state.stackPieceMoves = { ... }; // Should be handled by core

// REMOVE: Move validation logic
if (canMove(state, orig, dest)) { ... } // Should delegate to core

// REMOVE: Game state mutations
state.pieces.set(dest.square, piece); // Should be driven by FEN updates
```

### Correct Board Pattern ✅

```typescript
// Board should be "dumb" and delegate everything
export function userMove(
  state: HeadlessState,
  origMove: cg.OrigMove,
  destMove: cg.DestMove
): boolean {
  // Just trigger callback - let app layer handle logic
  callUserFunction(state.movable.events.after, origMove, destMove);
  unselect(state);
  return true;
}
```

### Key Files and Their Roles

```
src/
├── board.ts        # Main board logic and user interaction
├── config.ts       # Board configuration and setup
├── drag.ts         # Drag and drop handling
├── draw.ts         # Canvas drawing and rendering
├── events.ts       # Event handling utilities
├── state.ts        # Board state management (visual only)
├── types.ts        # Board-specific type definitions
└── util.ts         # Board utility functions
```

## apps/cotulenh-app/

### Primary Responsibilities ✅

**Application Coordination**

- Connecting board UI with core engine
- Event handling and routing
- State synchronization between packages

**State Management**

- Svelte stores for reactive UI updates
- Game state caching and management
- UI state (selected pieces, highlights, etc.)

**Type Conversion**

- Converting between board and core type systems
- Data format transformation
- API adaptation

**User Interface**

- Game controls (undo, redo, reset)
- Move history display
- Game status information
- Deploy session UI feedback

**Demo Application**

- Example implementation of board + core integration
- Testing and development environment
- Reference implementation for other applications

### What App Should NOT Do ❌

- Game logic implementation (delegate to core)
- Direct board state manipulation (use board API)
- Move validation (trust core engine)
- Complex game rule implementation

### Key Files and Their Roles

```
src/
├── lib/
│   ├── stores/
│   │   └── game.ts           # Svelte store for game state
│   ├── components/
│   │   ├── GameInfo.svelte   # Game status display
│   │   ├── GameControls.svelte # Undo/redo/reset buttons
│   │   └── ...               # Other UI components
│   ├── utils.ts              # Type conversion utilities
│   └── types/
│       └── game.ts           # App-specific type definitions
└── routes/
    └── +page.svelte          # Main game page
```

## Package Interaction Patterns

### Correct Interaction Flow ✅

```
User Action → Board UI → App Layer → Core Engine → State Update → UI Refresh
```

**Example: Making a Move**

1. User drags piece (Board captures event)
2. Board calls `movable.events.after(orig, dest)` (Board → App)
3. App calls `game.move({from, to})` (App → Core)
4. Core processes move and returns result (Core → App)
5. App updates store with new state (App manages state)
6. Reactive update triggers board refresh (App → Board)

### Incorrect Patterns ❌

**Board Bypassing App Layer**

```typescript
// WRONG: Board directly calling core
const move = coreGame.move(orig, dest); // Board shouldn't know about core
```

**App Bypassing Core**

```typescript
// WRONG: App implementing game logic
if (isCheckmate(board, turn)) { ... } // Should use core.isCheckmate()
```

**Core Knowing About UI**

```typescript
// WRONG: Core handling UI concerns
function generateMoves() {
  // ... game logic ...
  updateBoardHighlights(); // Core shouldn't know about UI
}
```

## Dependency Rules

### Allowed Dependencies ✅

```
cotulenh-app → cotulenh-board  (App uses board for UI)
cotulenh-app → cotulenh-core   (App uses core for logic)
cotulenh-board → (no game packages) (Board is independent)
cotulenh-core → (no other packages) (Core is self-contained)
```

### Forbidden Dependencies ❌

```
cotulenh-board → cotulenh-core  (Board should not directly use core)
cotulenh-core → cotulenh-board  (Core should not know about UI)
cotulenh-core → cotulenh-app    (Core should not know about app)
```

## Testing Responsibilities

### Core Package Testing

- Unit tests for all game logic
- Move generation correctness
- Deploy session state management
- FEN/SAN serialization accuracy
- Performance benchmarks

### Board Package Testing

- Visual rendering tests
- User interaction simulation
- Animation and transition tests
- Cross-browser compatibility
- Accessibility testing

### App Package Testing

- Integration tests between board and core
- State synchronization tests
- User workflow testing
- Error handling and recovery
- Performance under load

## Common Responsibility Violations

### ❌ Board Implementing Game Logic

```typescript
// WRONG: Board deciding what moves are legal
function canMove(state, orig, dest) {
  // Complex game logic in board package
  return checkPieceMovement(orig, dest) && !wouldExposeKing(orig, dest);
}
```

### ✅ Board Delegating to Core

```typescript
// CORRECT: Board just captures user intent
function userMove(state, orig, dest) {
  callUserFunction(state.movable.events.after, orig, dest);
}
```

### ❌ Core Handling UI State

```typescript
// WRONG: Core managing visual highlights
class GameState {
  selectedSquare: string; // UI concern, not game logic
  highlightedSquares: string[]; // Visual state doesn't belong in core
}
```

### ✅ Core Focused on Game Logic

```typescript
// CORRECT: Core only manages game state
class GameState {
  board: IBoard;
  turn: Color;
  deploySession: IDeploySession | null;
  // Only game-relevant state
}
```

## Package Evolution Guidelines

### When Adding Features

**Ask These Questions:**

1. Is this game logic? → Add to `cotulenh-core`
2. Is this visual/interactive? → Add to `cotulenh-board`
3. Is this coordination/glue code? → Add to `cotulenh-app`

**Red Flags:**

- Board package importing from core package
- Core package with UI-related code
- App package implementing complex game rules
- Duplicate logic across packages

### Refactoring Guidelines

**Moving Logic to Correct Package:**

1. Identify what the code actually does (logic vs UI vs coordination)
2. Move to appropriate package
3. Update interfaces and dependencies
4. Add tests in the correct package
5. Remove duplicate implementations
