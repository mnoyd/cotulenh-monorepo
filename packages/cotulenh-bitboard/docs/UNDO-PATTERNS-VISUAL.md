# Visual Guide: Make/Undo Patterns

## The Confusion

"How do we make/undo without history?"

The confusion comes from mixing two different use cases!

## Two Different Use Cases

```
┌─────────────────────────────────────────────────────────┐
│                    USE CASE 1                           │
│              Legality Checking (Internal)               │
│                                                         │
│  Need: Validate 30 moves quickly                       │
│  Pattern: Minimal undo info                            │
│  Storage: ~50 bytes per move                           │
│  Lifetime: Milliseconds (temporary)                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    USE CASE 2                           │
│              User Undo/Redo (Public API)               │
│                                                         │
│  Need: Let user undo moves                             │
│  Pattern: Full state snapshots                         │
│  Storage: ~500 bytes per move                          │
│  Lifetime: Entire game (permanent)                     │
└─────────────────────────────────────────────────────────┘
```

## Pattern 1: Minimal Undo (for Legality)

### What Happens

```
Step 1: BEFORE MOVE
┌─────────────────────┐
│  e2: white pawn     │
│  e4: empty          │
│  King: safe         │
└─────────────────────┘

Step 2: MAKE MOVE (save minimal info)
┌─────────────────────┐
│  undo = {           │
│    captured: null   │  ← Only save what changed!
│  }                  │
└─────────────────────┘
│
│  Apply move:
│  e2 → e4
│
▼
┌─────────────────────┐
│  e2: empty          │
│  e4: white pawn     │
│  King: safe?        │  ← Check this
└─────────────────────┘

Step 3: CHECK LEGALITY
Is king attacked? NO → Legal!

Step 4: UNDO MOVE (using undo info)
┌─────────────────────┐
│  undo = {           │
│    captured: null   │  ← Use this to restore
│  }                  │
└─────────────────────┘
│
│  Reverse move:
│  e4 → e2
│  Restore captured: none
│
▼
┌─────────────────────┐
│  e2: white pawn     │  ← Back to original!
│  e4: empty          │
│  King: safe         │
└─────────────────────┘
```

### Code

```typescript
// Minimal undo info
interface UndoInfo {
  captured?: Piece; // Just 20 bytes!
}

// Make move temporarily
const undo = makeMove(move); // Returns { captured: null }

// Check legality
const legal = !isKingAttacked();

// Undo using undo info
undoMove(move, undo); // Restores using { captured: null }
```

**Storage:** 20-50 bytes per validation  
**Speed:** Fast (minimal copying)  
**Lifetime:** Milliseconds

## Pattern 2: Full History (for User Undo)

### What Happens

```
Step 1: USER MAKES MOVE
┌─────────────────────────────────────┐
│  User: "Move pawn e2 to e4"         │
└─────────────────────────────────────┘
│
│  Save FULL state to history
│
▼
┌─────────────────────────────────────┐
│  history.push({                     │
│    bitboards: { ... },  ← All 11 piece types
│    stacks: { ... },     ← All stacks
│    turn: 'r',           ← Game state
│    moveNumber: 5,       ← Counters
│    // ... everything    ← ~500 bytes
│  })                                 │
└─────────────────────────────────────┘
│
│  Apply move permanently
│
▼
┌─────────────────────────────────────┐
│  Position updated                   │
│  Turn switched                      │
│  Move counter incremented           │
└─────────────────────────────────────┘

Step 2: USER CLICKS UNDO
┌─────────────────────────────────────┐
│  User: "Undo last move"             │
└─────────────────────────────────────┘
│
│  Pop from history
│
▼
┌─────────────────────────────────────┐
│  state = history.pop()              │
│  restore(state)  ← Restore everything
└─────────────────────────────────────┘
│
│  Position restored
│
▼
┌─────────────────────────────────────┐
│  Back to before move                │
│  Turn restored                      │
│  Move counter restored              │
└─────────────────────────────────────┘
```

### Code

```typescript
// Full history entry
interface HistoryEntry {
  bitboards: { ... },  // ~400 bytes
  stacks: { ... },     // ~50 bytes
  turn: Color,         // ~1 byte
  moveNumber: number,  // ~4 bytes
  // ... everything
}

// User makes move
function move(from, to) {
  // Save full state
  history.push(captureFullState());  // ~500 bytes

  // Apply move
  applyMove(from, to);
}

// User undoes
function undo() {
  const state = history.pop();
  restoreFullState(state);  // Restore all 500 bytes
}
```

**Storage:** 500 bytes per move  
**Speed:** Slower (full copy)  
**Lifetime:** Entire game

## Side-by-Side Comparison

```
┌──────────────────────────┬──────────────────────────┐
│   MINIMAL UNDO           │   FULL HISTORY           │
│   (Legality Checking)    │   (User Undo)            │
├──────────────────────────┼──────────────────────────┤
│                          │                          │
│  interface UndoInfo {    │  interface History {     │
│    captured?: Piece      │    bitboards: {...}      │
│  }                       │    stacks: {...}         │
│                          │    turn: Color           │
│  ~50 bytes               │    moveNumber: number    │
│                          │    // ... everything     │
│                          │  }                       │
│                          │                          │
│                          │  ~500 bytes              │
│                          │                          │
├──────────────────────────┼──────────────────────────┤
│                          │                          │
│  Used 30+ times          │  Used once               │
│  per move validation     │  per user move           │
│                          │                          │
├──────────────────────────┼──────────────────────────┤
│                          │                          │
│  Temporary               │  Permanent               │
│  (milliseconds)          │  (entire game)           │
│                          │                          │
├──────────────────────────┼──────────────────────────┤
│                          │                          │
│  Internal only           │  Public API              │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

## The Two-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│              PUBLIC API (CoTuLenh)                  │
│                                                     │
│  move(from, to) {                                  │
│    // Level 2: Full history for user              │
│    history.push(captureFullState());  // 500 bytes│
│    applyMove(from, to);                           │
│  }                                                 │
│                                                     │
│  undo() {                                          │
│    restoreFullState(history.pop());               │
│  }                                                 │
└─────────────────────────────────────────────────────┘
                        │
                        │ Uses internally
                        ▼
┌─────────────────────────────────────────────────────┐
│         INTERNAL VALIDATION (Position)              │
│                                                     │
│  isMoveLegal(move) {                               │
│    // Level 1: Minimal undo for validation        │
│    const undo = makeMove(move);  // 50 bytes      │
│    const legal = !isCheck();                      │
│    undoMove(move, undo);                          │
│    return legal;                                  │
│  }                                                 │
└─────────────────────────────────────────────────────┘
```

## Memory Usage Example

### Validating 30 moves:

```
❌ Using full history:
30 moves × 500 bytes = 15,000 bytes (15 KB)

✅ Using minimal undo:
1 undo info × 50 bytes = 50 bytes (0.05 KB)

Savings: 300x less memory!
```

### User plays 50 moves:

```
Full history (for user undo):
50 moves × 500 bytes = 25,000 bytes (25 KB)

This is fine! User only makes 50 moves per game.
```

## Common Mistake

```typescript
// ❌ WRONG - Using full history for legality
function filterLegalMoves(moves) {
  return moves.filter((move) => {
    history.push(captureFullState()); // 500 bytes × 30 = 15 KB!
    makeMove(move);
    const legal = !isCheck();
    restoreFullState(history.pop());
    return legal;
  });
}

// ✅ RIGHT - Using minimal undo for legality
function filterLegalMoves(moves) {
  return moves.filter((move) => {
    const undo = makeMove(move); // 50 bytes × 1 = 50 bytes
    const legal = !isCheck();
    undoMove(move, undo);
    return legal;
  });
}
```

## Summary

### The Answer

**"How do we make/undo without history?"**

We use **two different patterns** for two different needs:

1. **Legality checking:** Minimal undo info (50 bytes)

   - Make move → save what changed
   - Check legality
   - Undo using what changed
   - No history array needed!

2. **User undo:** Full history (500 bytes)
   - Save full state to history array
   - Apply move
   - User can undo by restoring from history

### Key Insight

```
Minimal Undo ≠ Full History

Minimal Undo:
- For internal validation
- Temporary (milliseconds)
- Just what changed
- 50 bytes

Full History:
- For user undo/redo
- Permanent (entire game)
- Complete state
- 500 bytes
```

### Implementation

```typescript
class CoTuLenh {
  // Level 1: Minimal undo (internal)
  private validateMove(move: Move): boolean {
    const undo = this.position.makeMove(move); // 50 bytes
    const legal = !this.isCheck();
    this.position.undoMove(move, undo);
    return legal;
  }

  // Level 2: Full history (public)
  private history: HistoryEntry[] = [];

  move(from, to) {
    if (!this.validateMove({ from, to })) {
      return null;
    }

    this.history.push(this.captureFullState()); // 500 bytes
    this.position.makeMove({ from, to });
    return { from, to };
  }

  undo() {
    const state = this.history.pop();
    if (state) this.restoreFullState(state);
  }
}
```

**Result:** Fast validation + user undo/redo support! 🎉
