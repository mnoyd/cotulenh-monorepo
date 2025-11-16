# Make/Undo Without History: The Reversible Move Pattern

## The Question

How do we make/undo moves for legality checking WITHOUT storing full history?

## The Answer: Store Only What Changed

### The Key Insight

You don't need to save the ENTIRE position to undo a move. You only need to save **what the move changed**.

## Pattern 1: Full History (What We Thought)

```typescript
// ❌ Expensive - save everything
interface HistoryEntry {
  // Save ENTIRE position state
  bitboards: {
    commanders: Bitboard;
    infantry: Bitboard;
    // ... all 11 piece types
    redPieces: Bitboard;
    bluePieces: Bitboard;
    occupied: Bitboard;
    carriers: Bitboard;
    heroic: Bitboard;
  };
  stacks: Map<number, StackData>;
  turn: Color;
  moveNumber: number;
  // ... everything
}

function makeMove(move) {
  history.push(captureFullState()); // ~500 bytes
  applyMove(move);
}

function undo() {
  const state = history.pop();
  restoreFullState(state); // Restore everything
}
```

**Cost:** ~500 bytes per move × 30 moves = 15 KB just for legality checking!

## Pattern 2: Minimal Undo Info (Reversible Moves)

```typescript
// ✅ Efficient - save only what changed
interface UndoInfo {
  captured?: Piece; // 20 bytes
  fromBitboards?: number[]; // 8 bytes (which bitboards changed)
  toBitboards?: number[]; // 8 bytes
  // ... only deltas
}

function makeMove(move): UndoInfo {
  const undo: UndoInfo = {
    captured: board[move.to] // Save captured piece
  };

  // Apply move (mutate position)
  board[move.to] = board[move.from];
  board[move.from] = null;

  return undo; // ~50 bytes
}

function undoMove(move, undo: UndoInfo) {
  // Reverse the move
  board[move.from] = board[move.to];
  board[move.to] = undo.captured || null;
}
```

**Cost:** ~50 bytes per move × 30 moves = 1.5 KB (10x less!)

## How It Works: Step by Step

### Example: Moving a piece

```typescript
// Initial state:
// e2: white pawn
// e4: empty

// 1. MAKE MOVE - save minimal info
function makeMove(from: 42, to: 44): UndoInfo {
  const undo: UndoInfo = {
    captured: getPieceAt(to) // null (empty square)
    // That's it! Just the captured piece
  };

  // Apply move
  const piece = removePiece(from); // Remove from e2
  placePiece(piece, to); // Place on e4

  return undo;
}

// 2. CHECK LEGALITY
const legal = !isKingAttacked();

// 3. UNDO MOVE - reverse using undo info
function undoMove(from: 42, to: 44, undo: UndoInfo) {
  const piece = removePiece(to); // Remove from e4
  placePiece(piece, from); // Place back on e2

  if (undo.captured) {
    placePiece(undo.captured, to); // Restore captured piece
  }
}
```

### Example: Capture move

```typescript
// Initial state:
// e4: white pawn
// e5: black pawn

// 1. MAKE MOVE
function makeMove(from: 44, to: 45): UndoInfo {
  const undo: UndoInfo = {
    captured: getPieceAt(to) // black pawn (save it!)
  };

  const piece = removePiece(from);
  placePiece(piece, to); // Overwrites black pawn

  return undo;
}

// 2. UNDO MOVE
function undoMove(from: 44, to: 45, undo: UndoInfo) {
  const piece = removePiece(to);
  placePiece(piece, from);
  placePiece(undo.captured!, to); // Restore black pawn
}
```

## What to Store in UndoInfo

### Minimal (for simple moves):

```typescript
interface UndoInfo {
  captured?: Piece; // Piece that was captured (if any)
}
```

### Extended (for complex games):

```typescript
interface UndoInfo {
  // What was captured
  captured?: Piece;

  // Special flags that changed
  castlingRights?: number; // Chess-specific
  enPassantSquare?: number; // Chess-specific

  // For CoTuLenh:
  stackChanges?: {
    square: number;
    oldStack: Piece[];
  };

  heroicChanges?: {
    square: number;
    wasHeroic: boolean;
  };

  // Air defense zones (if we want to avoid recalculation)
  airDefenseChanges?: {
    oldZones: number[];
  };
}
```

## Implementation for CoTuLenh Bitboard

### Current Approach (for legality checking):

```typescript
// In check-detection.ts
export function isMoveLegal(position: BitboardPosition, move: Move, color: Color): boolean {
  // 1. Make move and save undo info
  const undo = makeMoveTempor(position, move);

  // 2. Check if legal
  const legal = !isCheck(position, color) && !isCommanderExposed(position, color);

  // 3. Undo using undo info
  undoMoveTemporary(position, move, undo);

  return legal;
}

// Helper: Make move temporarily
function makeMoveTemporary(position: BitboardPosition, move: Move): UndoInfo {
  const undo: UndoInfo = {
    captured: position.getPieceAt(move.to)
  };

  // For stacks
  if (position.stackManager.hasStack(move.from)) {
    undo.stackChanges = {
      square: move.from,
      oldStack: position.stackManager.getStack(move.from)?.carried || []
    };
  }

  // Apply move
  const piece = position.removePiece(move.from);
  if (piece) {
    position.placePiece(piece, move.to);
  }

  return undo;
}

// Helper: Undo move
function undoMoveTemporary(position: BitboardPosition, move: Move, undo: UndoInfo): void {
  // Reverse the move
  const piece = position.removePiece(move.to);
  if (piece) {
    position.placePiece(piece, move.from);
  }

  // Restore captured piece
  if (undo.captured) {
    position.placePiece(undo.captured, move.to);
  }

  // Restore stack
  if (undo.stackChanges) {
    // Restore original stack
    position.stackManager.createStack(piece!, undo.stackChanges.oldStack, move.from);
  }
}
```

## Two Different Use Cases

### Use Case 1: Legality Checking (Temporary)

```typescript
// Make/undo many times, don't keep history
function filterLegalMoves(moves: Move[]): Move[] {
  return moves.filter((move) => {
    const undo = makeMove(move); // Save minimal info
    const legal = !isKingAttacked();
    undoMove(move, undo); // Restore using undo info
    return legal;
  });
}
```

**Storage:** Just one UndoInfo at a time (~50 bytes)

### Use Case 2: Game History (Permanent)

```typescript
// Keep history for user undo/redo
class CoTuLenh {
  private history: HistoryEntry[] = [];

  move(from, to) {
    // Save FULL state for user undo
    this.history.push({
      move: { from, to },
      // Full state snapshot
      bitboards: this.position.cloneBitboards(),
      stacks: this.position.stackManager.clone()
      // ... everything
    });

    // Apply move
    this.position.makeMove(from, to);
  }

  undo() {
    // Restore full state
    const entry = this.history.pop();
    this.position.restore(entry);
  }
}
```

**Storage:** Full snapshots (~500 bytes each)

## Comparison

| Aspect         | Full History          | Minimal Undo Info      |
| -------------- | --------------------- | ---------------------- |
| **Use Case**   | User undo/redo        | Legality checking      |
| **Storage**    | ~500 bytes/move       | ~50 bytes/move         |
| **Speed**      | Slower (copy all)     | Faster (copy minimal)  |
| **Complexity** | Simple (save/restore) | Medium (track changes) |
| **When**       | Permanent moves       | Temporary validation   |

## The Two-Level Approach

```typescript
class CoTuLenh {
  // Level 1: User history (full snapshots)
  private history: HistoryEntry[] = [];

  // Level 2: Temporary validation (minimal undo)
  private validateMove(move: Move): boolean {
    const undo = this.position.makeMove(move); // Minimal info
    const legal = !this.isCheck();
    this.position.undoMove(move, undo); // Restore
    return legal;
  }

  // Public API: Uses full history
  move(from, to) {
    const move = { from, to };

    // Validate using minimal undo
    if (!this.validateMove(move)) {
      return null;
    }

    // Save full history for user undo
    this.history.push(this.captureFullState());

    // Apply permanently
    this.position.makeMove(move);

    return move;
  }

  // Public API: Restore from full history
  undo() {
    const state = this.history.pop();
    if (state) {
      this.position.restore(state);
    }
  }
}
```

## Key Insights

### 1. Two Different Needs

**Legality checking:** Make/undo 30+ times per move → need minimal storage  
**User undo:** Make/undo once per user action → can use full storage

### 2. Minimal Undo is Enough

For legality checking, you only need:

- Captured piece
- Stack changes (if any)
- That's it!

### 3. Don't Confuse the Two

```typescript
// ❌ Wrong - using full history for legality
function isLegal(move) {
  history.push(captureFullState()); // 500 bytes
  makeMove(move);
  const legal = !isCheck();
  restoreFullState(history.pop()); // Restore 500 bytes
  return legal;
}

// ✅ Right - using minimal undo for legality
function isLegal(move) {
  const undo = makeMove(move); // 50 bytes
  const legal = !isCheck();
  undoMove(move, undo); // Restore 50 bytes
  return legal;
}
```

## Implementation Checklist

### For Legality Checking (Now):

- [ ] Create `UndoInfo` interface
- [ ] Implement `makeMoveTemporary()` returning UndoInfo
- [ ] Implement `undoMoveTemporary()` using UndoInfo
- [ ] Update `isMoveLegal()` to use temporary make/undo
- [ ] Test with various move types

### For User History (Later):

- [ ] Create `HistoryEntry` interface (full state)
- [ ] Implement `captureFullState()`
- [ ] Implement `restoreFullState()`
- [ ] Add history array to CoTuLenh class
- [ ] Implement public `undo()` method

## Example Code

```typescript
// types.ts
export interface UndoInfo {
  captured?: Piece;
  stackChanges?: {
    square: number;
    oldStack: Piece[];
  };
}

// position.ts
export class BitboardPosition {
  /**
   * Make a move temporarily for validation.
   * Returns minimal undo info.
   */
  makeMoveTemporary(move: Move): UndoInfo {
    const undo: UndoInfo = {
      captured: this.getPieceAt(move.to)
    };

    // Handle stacks
    if (this.stackManager.hasStack(move.from)) {
      const stack = this.stackManager.getStack(move.from);
      if (stack) {
        undo.stackChanges = {
          square: move.from,
          oldStack: [...stack.carried]
        };
      }
    }

    // Apply move
    const piece = this.removePiece(move.from);
    if (piece) {
      this.placePiece(piece, move.to);
    }

    return undo;
  }

  /**
   * Undo a temporary move using undo info.
   */
  undoMoveTemporary(move: Move, undo: UndoInfo): void {
    // Reverse move
    const piece = this.removePiece(move.to);
    if (piece) {
      this.placePiece(piece, move.from);
    }

    // Restore captured
    if (undo.captured) {
      this.placePiece(undo.captured, move.to);
    }

    // Restore stack
    if (undo.stackChanges) {
      this.stackManager.createStack(piece!, undo.stackChanges.oldStack, move.from);
    }
  }
}

// check-detection.ts
export function isMoveLegal(position: BitboardPosition, move: Move, color: Color): boolean {
  const undo = position.makeMoveTemporary(move);
  const legal = !isCheck(position, color);
  position.undoMoveTemporary(move, undo);
  return legal;
}
```

## Summary

**Question:** How to make/undo without history?

**Answer:** Store only what changed (UndoInfo), not full state!

**Two patterns:**

1. **Temporary (legality):** Minimal undo info (~50 bytes)
2. **Permanent (user undo):** Full history (~500 bytes)

**Key insight:** Don't confuse the two! Use the right pattern for each use case.

**Result:** 10x less memory for legality checking, still support user undo/redo!
