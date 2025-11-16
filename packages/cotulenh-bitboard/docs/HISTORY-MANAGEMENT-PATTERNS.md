# History Management Patterns in Chess Engines

## The Question

Does chessops keep move history and state? How do mature chess engines handle undo/redo?

## Research Findings

### Pattern 1: Immutable Position (chessops approach)

**chessops does NOT keep history internally.** Instead, it uses an **immutable position pattern**:

```typescript
// chessops pattern - immutable
const pos1 = Chess.default();
const pos2 = pos1.play({ from: 'e2', to: 'e4' }); // Returns NEW position
const pos3 = pos2.play({ from: 'e7', to: 'e5' }); // Returns NEW position

// To "undo", you just keep the old position
const backToPos2 = pos2; // Still have it!
```

**Key characteristics:**

- Each `play()` returns a **new Position object**
- Original position is unchanged (immutable)
- History is managed by **caller** (UI/application layer)
- Engine is stateless - just transforms positions

**Pros:**

- Simple engine design
- No history management in engine
- Easy to implement time travel
- Thread-safe (immutable)

**Cons:**

- Memory overhead (multiple position copies)
- Caller must manage history
- More complex for UI integration

### Pattern 2: Mutable Position with History (chess.js approach)

**chess.js DOES keep history internally:**

```typescript
// chess.js pattern - mutable with history
const chess = new Chess();
chess.move('e4'); // Mutates position, adds to history
chess.move('e5'); // Mutates position, adds to history
chess.undo(); // Restores previous position
chess.redo(); // Replays move
```

**Key characteristics:**

- Single Position object that mutates
- Internal `_history` array
- Built-in undo/redo support
- Engine manages state

**Pros:**

- Convenient API (undo/redo built-in)
- Less memory (single position)
- Simpler for UI (engine handles history)

**Cons:**

- More complex engine
- Must store full state snapshots
- Not thread-safe (mutable)

### Pattern 3: Hybrid - Mutable with Reversible Moves

**Stockfish/high-performance engines use reversible moves:**

```typescript
// High-performance pattern
class Position {
  makeMove(move: Move): UndoInfo {
    // Apply move, return info needed to undo
    const undo = {
      captured: this.board[move.to],
      castlingRights: this.castlingRights,
      enPassant: this.enPassant
      // ... minimal state
    };
    // Mutate position
    return undo;
  }

  unmakeMove(move: Move, undo: UndoInfo): void {
    // Reverse the move using undo info
  }
}

// Usage
const undoStack: UndoInfo[] = [];
undoStack.push(pos.makeMove(move)); // Save undo info
pos.unmakeMove(move, undoStack.pop()); // Undo
```

**Key characteristics:**

- Mutable position
- Minimal undo info (not full snapshots)
- Caller manages undo stack
- Reversible operations

**Pros:**

- Minimal memory (just undo deltas)
- Fast (no copying)
- Flexible (caller controls history)
- Engine stays focused

**Cons:**

- More complex undo logic
- Caller must manage undo stack
- Must carefully track what changed

## Comparison Table

| Aspect      | Immutable (chessops)   | Mutable + History (chess.js) | Reversible (Stockfish) |
| ----------- | ---------------------- | ---------------------------- | ---------------------- |
| Memory      | High (multiple copies) | Medium (full snapshots)      | Low (deltas only)      |
| Speed       | Medium (copying)       | Fast (mutation)              | Fastest (mutation)     |
| Complexity  | Low (simple)           | Medium (history mgmt)        | High (undo logic)      |
| History     | Caller manages         | Engine manages               | Caller manages         |
| Thread-safe | Yes                    | No                           | No                     |
| Undo/Redo   | Manual                 | Built-in                     | Manual                 |

## Recommendation for CoTuLenh Bitboard

### Option A: Follow chess.js (Mutable + History)

**Recommended for MVP** - matches cotulenh-core API:

```typescript
class CoTuLenh {
  private position: BitboardPosition;
  private history: HistoryEntry[] = [];

  move(from: number, to: number): Move | null {
    // Save state before move
    this.history.push(this.captureState());

    // Apply move
    const move = this.applyMove(from, to);

    return move;
  }

  undo(): boolean {
    if (this.history.length === 0) return false;

    // Restore previous state
    const state = this.history.pop()!;
    this.restoreState(state);

    return true;
  }

  private captureState(): HistoryEntry {
    return {
      // Snapshot bitboards
      bitboards: this.position.cloneBitboards(),
      // Snapshot stacks
      stacks: this.position.stackManager.clone(),
      // Snapshot deploy session
      deploySession: this.position.deploySessionManager.clone(),
      // Game state
      turn: this.turn,
      moveNumber: this.moveNumber,
      halfMoves: this.halfMoves
    };
  }
}
```

**Why this approach:**

1. ✅ Matches cotulenh-core API (has `undo()`)
2. ✅ Simple for users (built-in undo/redo)
3. ✅ Easier to implement initially
4. ✅ Can optimize later if needed

### Option B: Reversible Moves (Future Optimization)

**For performance optimization later:**

```typescript
interface UndoInfo {
  move: Move;
  captured?: Piece;
  // Minimal state changes
  stackChanges?: StackDelta;
  deploySessionState?: DeploySession;
  // Bitboard deltas (only changed bits)
  bitboardDeltas: BitboardDelta[];
}

class CoTuLenh {
  private position: BitboardPosition;
  private undoStack: UndoInfo[] = []; // Caller could manage this

  move(from: number, to: number): Move | null {
    const undo = this.position.makeMove(from, to);
    this.undoStack.push(undo);
    return move;
  }

  undo(): boolean {
    const undo = this.undoStack.pop();
    if (!undo) return false;
    this.position.unmakeMove(undo);
    return true;
  }
}
```

**Benefits:**

- Much less memory (only deltas)
- Faster (no full copies)
- Still supports undo/redo

**When to implement:**

- After MVP is working
- If memory becomes an issue
- If undo/redo is slow

## Decision for Implementation

### Phase 1 (MVP): Mutable + History (Option A)

Implement Task 10 as planned:

- Store full state snapshots in history
- Built-in undo/redo support
- Matches cotulenh-core API

### Phase 2 (Optimization): Consider Reversible Moves

If profiling shows issues:

- Implement reversible move operations
- Store minimal undo deltas
- Keep same public API

## Key Insight

**chessops is stateless by design** - it's a pure functional library. But **cotulenh-core has undo()**, so we need state management.

The best approach is:

1. Start with full snapshots (simple, correct)
2. Optimize to deltas if needed (complex, fast)
3. Keep the same public API throughout

This matches how chess engines evolved:

- Early engines: full snapshots
- Modern engines: reversible moves
- But both support undo/redo!

## Implementation Notes

### What to Store in History

```typescript
interface HistoryEntry {
  // Move that was made
  move: Move;

  // Complete state before move (for undo)
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

  // Stack state
  stacks: Map<number, StackData>;

  // Deploy session state
  deploySession: DeploySession | null;

  // Game state
  turn: Color;
  moveNumber: number;
  halfMoves: number;

  // Position count (for repetition)
  positionCount: Map<string, number>;
}
```

### Memory Estimation

For a typical game:

- 1 HistoryEntry ≈ 500 bytes (bitboards + metadata)
- 100 moves ≈ 50 KB
- Acceptable for modern systems

If this becomes an issue, optimize to deltas.

## References

- [chessops source](https://github.com/niklasf/chessops) - Immutable positions
- [chess.js source](https://github.com/jhlywa/chess.js) - Mutable with history
- [Stockfish](https://github.com/official-stockfish/Stockfish) - Reversible moves
- [Chess Programming Wiki - Unmake Move](https://www.chessprogramming.org/Unmake_Move)
