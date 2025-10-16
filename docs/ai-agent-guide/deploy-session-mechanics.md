# Deploy Session Mechanics

## Overview

Deploy sessions are the most complex part of the CoTuLenh system. They allow players to split stacked pieces across multiple squares in a single turn, with each individual move potentially affecting what moves are legal for the remaining pieces.

## Why Deploy Sessions Are Complex

### The Core Problem

```typescript
// Example scenario:
// Air Force carrying Tank at d5
// Enemy Anti-Air at e6 (2 squares away)
//
// Initial legal moves: Air Force can't fly past e6 (blocked by Anti-Air)
// After Tank captures Anti-Air: Air Force can now fly past e6
//
// This means legal moves CHANGE during the deploy session!
```

### Traditional vs Deploy Session Moves

**Traditional Move**: One atomic action

- Calculate legal moves → Execute move → Recalculate legal moves

**Deploy Session**: Multiple related actions

- Calculate legal moves → Execute first piece move → **Recalculate legal moves** → Execute second piece move → etc.

## Deploy Session Architecture

### Virtual State Pattern

Deploy sessions use a **virtual overlay** that doesn't mutate the base board state:

```typescript
class DeploySession {
  readonly originalSquare: number; // Where the stack started
  readonly originalPiece: Piece; // The original stacked piece
  readonly movedPieces: Piece[]; // Pieces already deployed
  readonly stay?: Piece[]; // Pieces staying at original square

  private virtualChanges: Map<number, Piece | null>; // Virtual overlay

  // Get effective piece considering virtual changes
  getEffectivePiece(board: IBoard, square: number): Piece | null {
    if (this.virtualChanges.has(square)) {
      return this.virtualChanges.get(square) || null;
    }
    return board.get(square); // Fall back to real board state
  }
}
```

### FEN Integration

The FEN string includes the virtual state, making it the single source of truth:

```typescript
function generateFEN(gameState: IGameState): string {
  // For each square, use effective piece (real + virtual)
  const piece = gameState.deploySession
    ? gameState.deploySession.getEffectivePiece(gameState.board, square)
    : gameState.board.get(square);

  // FEN represents the "current reality" including partial deployments
}
```

## Deploy Session Flow

### 1. Session Initiation

```typescript
// User selects a stacked piece
const stackPiece = {
  type: 'stack',
  carrying: [tank, infantry, airForce]
};

// Core creates deploy session
const deploySession = DeploySession.create(square, stackPiece, currentTurn);
```

### 2. Individual Deploy Steps

```typescript
// User moves Tank from d5 to e6 (capturing Anti-Air)
game.move({
  from: 'd5',
  to: 'e6',
  piece: 't', // tank
  deploy: true
});

// Core updates deploy session:
deploySession = deploySession.withMovedPiece(tank);
deploySession.addVirtualChange('e6', tank); // Tank now at e6
deploySession.addVirtualChange('d5', infantryAirForceStack); // Remaining pieces at d5
```

### 3. Legal Move Recalculation

```typescript
// After each deploy step, legal moves are recalculated
// This considers the NEW virtual state where Tank captured Anti-Air
const newLegalMoves = generateMoves(gameStateWithVirtualChanges);

// Now Air Force can fly past e6 because Anti-Air is gone!
```

### 4. Session Completion

```typescript
// When all pieces are accounted for:
if (deploySession.isComplete()) {
  // Commit virtual changes to real board state
  // Clear deploy session
  // Switch turns
}
```

## Current Implementation Issues

### Problem: Board Package Manages Deploy Sessions

The current board implementation tries to manage deploy sessions internally:

```typescript
// CURRENT (PROBLEMATIC) - in board.ts
if (state.stackPieceMoves) {
  // Board trying to manage deploy session state
  handleStackPieceMoves(state, piecesPrepared, origMove, destMove);
  const stackMove = deployStateToMove(state);
  // ... complex internal logic
}
```

**Issues with this approach:**

1. **Duplicate Logic**: Both board and core manage deploy state
2. **Stale Legal Moves**: Board calculates moves once, doesn't recalculate
3. **Inconsistent State**: Board state can diverge from core state
4. **Complex Debugging**: Two sources of truth for deploy sessions

### Solution: Delegate Everything to Core

The board should be "dumb" and delegate all deploy logic:

```typescript
// PROPOSED (CORRECT) - in board.ts
export function userMove(
  state: HeadlessState,
  origMove: cg.OrigMove,
  destMove: cg.DestMove
): boolean {
  if (!canMove(state, origMove, destMove)) {
    unselect(state);
    return false;
  }

  // Just trigger callback - let Svelte app and core handle everything
  callUserFunction(state.movable.events.after, origMove, destMove);
  unselect(state);
  return true;
}
```

## Deploy Session Data Structures

### Core Deploy Session

```typescript
interface IDeploySession {
  readonly originalSquare: number;
  readonly turn: Color;
  readonly originalPiece: Piece;
  readonly movedPieces: readonly Piece[];
  readonly stay?: readonly Piece[];

  getEffectivePiece(board: IBoard, square: number): Piece | null;
  getRemainingPieces(): readonly Piece[];
  isComplete(): boolean;
}
```

### Board Deploy Indicators (for UI only)

```typescript
interface DeployIndicators {
  originalSquare: Key; // Visual highlight
  movedPieces: string[]; // For move history display
  remainingPieces: string[]; // For UI feedback
}
```

### Svelte App Deploy State

```typescript
interface GameState {
  deployState: {
    stackSquare: number;
    turn: Color;
  } | null;
}
```

## Deploy Session Examples

### Example 1: Simple Stack Split

```typescript
// Initial: Tank+Infantry stack at d5
// Step 1: Move Tank to e5
// Step 2: Move Infantry to d6
// Result: Tank at e5, Infantry at d6, d5 empty

// Virtual state after step 1:
// d5: Infantry (remaining)
// e5: Tank (moved)

// Virtual state after step 2:
// d5: empty
// e5: Tank
// d6: Infantry
```

### Example 2: Tactical Deploy with Legal Move Changes

```typescript
// Initial: Air Force+Tank stack at d5, Enemy Anti-Air at e6
// Legal moves initially: Air Force can't fly past e6

// Step 1: Move Tank to e6 (capture Anti-Air)
// Virtual state: d5: Air Force, e6: Tank
// Legal moves recalculated: Air Force can now fly past e6!

// Step 2: Move Air Force to f7 (now legal!)
// Final state: Tank at e6, Air Force at f7
```

### Example 3: Partial Deploy with Stay

```typescript
// Initial: Commander+Tank+Infantry stack at d5
// Step 1: Move Tank to e5
// Step 2: Choose to keep Commander+Infantry at d5
// Result: Tank at e5, Commander+Infantry stack at d5
```

## Integration Points

### Board → App → Core

```typescript
// Board captures user action
handleMove(orig: OrigMove, dest: DestMove)

// App processes through core
const moveResult = game.move({ from: orig.square, to: dest.square, deploy: true });

// Core updates deploy session and returns move
if (moveResult) {
  gameStore.applyMove(game, moveResult);
}
```

### Core → App → Board

```typescript
// Core provides updated state
const newState = {
  fen: game.fen(), // Includes virtual state
  possibleMoves: game.moves(), // Fresh legal moves
  deployState: game.getDeployState() // Deploy session info
};

// App updates board
boardApi.set({
  fen: newState.fen,
  movable: { dests: mapPossibleMovesToDests(newState.possibleMoves) }
});
```

## Testing Deploy Sessions

### Unit Tests (Core)

```typescript
test('deploy session updates legal moves correctly', () => {
  const game = new CoTuLenh();
  // Set up Air Force+Tank vs Anti-Air scenario

  const initialMoves = game.moves();
  // Assert Air Force can't fly past Anti-Air

  game.move({ from: 'd5', to: 'e6', piece: 't', deploy: true }); // Tank captures Anti-Air

  const updatedMoves = game.moves();
  // Assert Air Force can now fly past e6
});
```

### Integration Tests (App)

```typescript
test('board updates correctly during deploy session', () => {
  // Simulate user deploying stack
  // Verify board state updates after each step
  // Verify legal moves update correctly
});
```

## Common Deploy Session Bugs

### ❌ Stale Legal Moves

```typescript
// WRONG: Using legal moves calculated before deploy step
const moves = game.moves(); // Calculated once
// ... deploy step happens ...
// moves is now stale!
```

### ✅ Fresh Legal Moves

```typescript
// CORRECT: Recalculate after each deploy step
game.move(deployStep);
const freshMoves = game.moves(); // Always fresh
```

### ❌ State Mutation

```typescript
// WRONG: Mutating board state during deploy
board.set(square, piece); // Loses ability to rollback
```

### ✅ Virtual State

```typescript
// CORRECT: Using virtual overlay
deploySession.addVirtualChange(square, piece); // Preserves base state
```
