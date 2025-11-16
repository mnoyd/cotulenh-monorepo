# Architecture Summary: Key Decisions

## Two Major Insights from Chess Programming

### 1. Bridge Layer for UI Communication

**Problem:** Serialization (FEN/SAN) is expensive in hot path (~2-3ms per interaction)

**Solution:** Bridge layer with simple objects

```
UI Layer ←→ Bridge Layer ←→ Engine Layer
(render)    (convert)       (compute)
```

**Benefits:**

- ~5x faster UI interactions
- No FEN/SAN parsing in hot path
- Clean separation of concerns

**Files:**

- `bridge.ts` - Interface definitions
- `game-bridge.ts` - Implementation
- `BRIDGE-ARCHITECTURE.md` - Full guide

### 2. History Management Pattern

**Question:** Does chessops keep history?

**Answer:** No - chessops is immutable (returns new positions)

**Our Choice:** Follow cotulenh-core pattern (mutable + history)

```typescript
// We do this (like chess.js, cotulenh-core):
game.move('e4'); // Mutates, saves history
game.undo(); // Restores previous state

// Not this (like chessops):
const pos2 = pos1.play('e4'); // Returns new position
```

**Why:**

- ✅ Matches cotulenh-core API
- ✅ Built-in undo/redo
- ✅ Simpler for users
- ✅ Can optimize later

**Files:**

- `HISTORY-MANAGEMENT-PATTERNS.md` - Detailed analysis

## Architecture Layers

```
┌─────────────────────────────────────┐
│  Public API (CoTuLenh class)       │
│  - Matches cotulenh-core interface  │
│  - Manages history internally       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Bridge Layer (Optional)            │
│  - For UI integration               │
│  - Simple objects, no serialization │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Engine Layer (BitboardPosition)    │
│  - Bitboard operations              │
│  - Move generation                  │
│  - Check detection                  │
└─────────────────────────────────────┘
```

## Data Flow Examples

### Making a Move

```typescript
// User calls
game.move(42, 43);

// Internally:
1. Save current state to history
2. Apply move to bitboards
3. Update stacks/deploy session
4. Switch turn
5. Return move object

// For UI (via bridge):
const move = bridge.makeMove(42, 43);
board.animateMove(move.from, move.to);
```

### Undoing a Move

```typescript
// User calls
game.undo();

// Internally:
1. Pop history entry
2. Restore bitboards
3. Restore stacks
4. Restore deploy session
5. Restore game state
```

### Getting Legal Moves (via Bridge)

```typescript
// User selects piece
const moves = bridge.getLegalMoves(42);
// Returns: { from: 42, destinations: [43, 44, 52] }

// UI highlights squares
board.highlightSquares(moves.destinations);

// No FEN, no SAN, just square indices!
```

## Performance Targets

| Operation          | cotulenh-core | Target | Method           |
| ------------------ | ------------- | ------ | ---------------- |
| Move generation    | ~2ms          | <0.5ms | Bitboards        |
| Check detection    | ~0.5ms        | <0.1ms | Bitboards        |
| Make move          | ~1ms          | <0.2ms | Direct mutation  |
| Undo               | ~1ms          | <0.2ms | State restore    |
| UI update (bridge) | ~3ms          | <0.8ms | No serialization |

## Implementation Status

### ✅ Completed

- Bitboard operations
- Position representation
- Stack manager
- Deploy session manager
- Air defense zones
- Move generation
- Check detection
- Bridge layer interfaces

### 🚧 In Progress

- Bridge integration with move generator
- Bridge integration with check detection

### 📋 Next Steps

1. Implement history management (Task 10)
2. Implement FEN parsing/generation (Task 9)
3. Implement public API (Task 11)
4. Integration tests (Task 12)
5. Performance optimization (Task 13)

## Key Takeaways

1. **Don't copy everything from cotulenh-core**

   - Learn from chess programming patterns
   - Optimize for performance
   - Keep API compatible

2. **Separate concerns**

   - Engine: Fast computation (bitboards)
   - Bridge: Simple communication (objects)
   - API: Convenient interface (matches cotulenh-core)

3. **Start simple, optimize later**

   - Full state snapshots for history (MVP)
   - Can optimize to deltas later
   - Bridge layer is already optimized

4. **Learn from mature projects**
   - chessops: Immutable positions
   - chess.js: Mutable with history
   - chessground: UI with simple objects
   - Stockfish: Reversible moves

## Files to Read

1. **Architecture Decisions:**

   - `ARCHITECTURE-DECISION.md` - Bridge layer rationale
   - `HISTORY-MANAGEMENT-PATTERNS.md` - History patterns
   - `ARCHITECTURE-SUMMARY.md` - This file

2. **Implementation Guides:**

   - `BRIDGE-ARCHITECTURE.md` - Bridge usage guide
   - `IMPLEMENTATION-GUIDE.md` - Overall plan
   - `tasks.md` - Task breakdown

3. **Analysis:**
   - `COVERAGE-ANALYSIS.md` - API coverage
   - `requirements.md` - Requirements

## Questions Answered

✅ How do chess engines communicate with UI? → Bridge layer with simple objects  
✅ Do they use FEN in hot path? → No, only for save/load  
✅ Does chessops keep history? → No, it's immutable  
✅ Should we keep history? → Yes, like cotulenh-core  
✅ How to store history? → Full snapshots (MVP), optimize later

## Next Question to Answer

🤔 How to implement FEN parsing efficiently with bitboards?  
🤔 How to handle SAN notation generation?  
🤔 How to optimize memory usage for history?

These will be addressed in upcoming implementation phases.
