# How chessops Handles Move Legality

## The Question

Does chessops use the "make move → check if king attacked → undo move" pattern for filtering illegal moves?

## Answer: NO - They Use a Smarter Approach

### Traditional Pattern (Expensive)

```typescript
// ❌ What we might think they do:
function isLegalMove(move) {
  makeMove(move); // Apply move
  const legal = !isKingAttacked(); // Check king safety
  undoMove(move); // Undo move
  return legal;
}

// For 30 pseudo-legal moves:
// - 30 makeMove operations
// - 30 king attack checks
// - 30 undoMove operations
// Total: 90 operations!
```

### chessops Pattern (Efficient)

**chessops uses IMMUTABLE positions** - they don't make/undo moves at all!

```typescript
// ✅ What chessops actually does:
class Position {
  // Returns NEW position (immutable)
  play(move: Move): Position {
    return new Position(/* new state */);
  }

  // Checks legality WITHOUT mutating
  isLegal(move: Move): boolean {
    // 1. Check if move puts own king in check
    // 2. Uses VIRTUAL position (doesn't mutate this)
    const after = this.play(move);
    return !after.isCheck();
  }

  // Get all legal moves
  legalMoves(): Move[] {
    const pseudo = this.pseudoLegalMoves();
    return pseudo.filter((m) => this.isLegal(m));
  }
}
```

**Key insight:** Since positions are immutable, `play()` returns a NEW position. No undo needed!

## But Wait - Isn't That Expensive?

### The Trick: Lazy Evaluation

chessops doesn't copy the ENTIRE position for every move check. They use:

1. **Structural sharing** - Only copy what changes
2. **Lazy evaluation** - Don't compute everything upfront
3. **Efficient data structures** - Bitboards for fast queries

```typescript
// Simplified concept:
class Position {
  private board: Board; // Shared reference
  private state: State; // Small state object

  play(move: Move): Position {
    // Only copy what changes!
    return new Position(
      this.board.withMove(move), // Structural sharing
      this.state.next() // Small state update
    );
  }
}
```

## Alternative Pattern: Pre-compute King Safety

Some engines (including Stockfish) use a different optimization:

```typescript
// Pattern: Check king safety BEFORE generating moves
function generateLegalMoves() {
  const moves = [];
  const kingSquare = findKing(us);
  const attackers = getAttackers(kingSquare, them);

  if (attackers.length === 0) {
    // King not in check - generate all moves
    moves.push(...generateAllPseudoLegalMoves());
  } else if (attackers.length === 1) {
    // Single check - can block or capture
    moves.push(...generateBlockingMoves(attackers[0]));
    moves.push(...generateCaptureMoves(attackers[0]));
  } else {
    // Double check - only king moves
    moves.push(...generateKingMoves());
  }

  // Still need to filter king moves for safety
  return moves.filter((m) => {
    if (m.piece === 'king') {
      return !isSquareAttacked(m.to, them);
    }
    return true;
  });
}
```

**Benefits:**

- Fewer moves to validate
- Can skip validation for non-king moves in many cases
- More efficient than make/undo for every move

## What About Our Bitboard Implementation?

### Current Approach (Task 7.3)

We're using the traditional make/undo pattern:

```typescript
// From check-detection.ts
export function filterIllegalMoves(
  position: BitboardPosition,
  moves: Move[],
  color: Color
): Move[] {
  return moves.filter((move) => isMoveLegal(position, move, color));
}

export function isMoveLegal(position: BitboardPosition, move: Move, color: Color): boolean {
  // Make move temporarily
  const captured = applyMove(position, move);

  // Check if king is safe
  const legal = !isCheck(position, color) && !isCommanderExposed(position, color);

  // Undo move
  undoMove(position, move, captured);

  return legal;
}
```

**This works, but is it optimal?**

### Optimization Options

#### Option 1: Keep Current (Simple)

**Pros:**

- Already implemented
- Easy to understand
- Works correctly

**Cons:**

- Make/undo overhead for every move
- ~30-50 moves × (make + check + undo) per position

#### Option 2: Immutable Positions (Like chessops)

```typescript
class BitboardPosition {
  // Returns NEW position
  applyMove(move: Move): BitboardPosition {
    const newPos = this.clone(); // Shallow clone
    newPos.makeMove(move);
    return newPos;
  }

  isLegal(move: Move): boolean {
    const after = this.applyMove(move);
    return !after.isCheck();
  }
}
```

**Pros:**

- No undo logic needed
- Cleaner code
- Thread-safe

**Cons:**

- Cloning overhead
- More memory allocations
- Doesn't match cotulenh-core API

#### Option 3: Pre-compute King Safety (Like Stockfish)

```typescript
function generateLegalMoves(position: BitboardPosition, color: Color): Move[] {
  const kingSquare = findCommanderSquare(position, color);
  const attackers = getAttackers(position, kingSquare, oppositeColor(color));

  let moves: Move[];

  if (attackers.length === 0) {
    // Not in check - generate all moves
    moves = generateAllPseudoLegalMoves(position, color);

    // Only validate king moves and pinned pieces
    return moves.filter((m) => {
      if (m.piece === 'commander' || isPinned(m.from)) {
        return isMoveSafe(position, m, color);
      }
      return true; // Other moves are safe
    });
  } else if (attackers.length === 1) {
    // Single check - must block or capture
    const attacker = attackers[0];
    moves = [
      ...generateBlockingMoves(position, attacker, kingSquare),
      ...generateCaptureMoves(position, attacker),
      ...generateCommanderMoves(position, kingSquare)
    ];
  } else {
    // Double check - only king moves
    moves = generateCommanderMoves(position, kingSquare);
  }

  // Validate remaining moves
  return moves.filter((m) => isMoveSafe(position, m, color));
}
```

**Pros:**

- Much fewer moves to validate
- Smarter filtering
- Faster for most positions

**Cons:**

- More complex logic
- Need to track pins
- More code to maintain

#### Option 4: Hybrid - Optimize Hot Path

```typescript
function filterIllegalMoves(position: BitboardPosition, moves: Move[], color: Color): Move[] {
  const kingSquare = findCommanderSquare(position, color);
  const inCheck = isCheck(position, color);

  if (!inCheck) {
    // Not in check - only validate king moves and pinned pieces
    return moves.filter((m) => {
      if (m.piece === 'commander') {
        // King moves always need validation
        return isMoveLegal(position, m, color);
      }

      // TODO: Check if piece is pinned
      // For now, validate all non-king moves
      return isMoveLegal(position, m, color);
    });
  }

  // In check - validate all moves
  return moves.filter((m) => isMoveLegal(position, m, color));
}
```

**Pros:**

- Incremental optimization
- Keep existing code
- Optimize common case (not in check)

**Cons:**

- Still uses make/undo
- Partial optimization only

## Recommendation

### For MVP (Now): Keep Current Approach ✅

**Why:**

- Already implemented and working
- Correctness first, optimization later
- Bitboard operations are already fast

### For Optimization (Later): Option 3 or 4 📋

**When to optimize:**

- After profiling shows it's a bottleneck
- After MVP is complete and tested
- If move generation is too slow

**How to optimize:**

1. Profile current implementation
2. Identify hot paths
3. Implement pre-computed king safety
4. Add pin detection
5. Benchmark improvements

## Performance Comparison

### Estimated costs per position:

| Approach            | Operations                    | Relative Speed         |
| ------------------- | ----------------------------- | ---------------------- |
| Make/Undo all moves | 30 × (make + check + undo)    | 1x (baseline)          |
| Immutable positions | 30 × (clone + check)          | 0.8x (slightly slower) |
| Pre-compute safety  | 5-10 × (make + check + undo)  | 3-5x (much faster)     |
| Hybrid optimization | 10-15 × (make + check + undo) | 2-3x (faster)          |

**Note:** Bitboards make make/undo very fast, so current approach may be acceptable.

## Conclusion

**chessops uses immutable positions** - they don't make/undo moves because they return new positions.

**We're using make/undo** - which is fine for MVP, but can be optimized later using:

1. Pre-computed king safety checks
2. Pin detection
3. Smarter move filtering

**Key insight:** Don't optimize prematurely. Current approach works and bitboards are already fast. Profile first, then optimize if needed.

## Action Items

### Now (MVP):

- ✅ Keep current make/undo approach
- ✅ Ensure correctness
- ✅ Complete implementation

### Later (Optimization):

- 📋 Profile move generation performance
- 📋 Implement pin detection if needed
- 📋 Add pre-computed king safety if needed
- 📋 Benchmark improvements

### Never:

- ❌ Don't switch to immutable positions (breaks API)
- ❌ Don't over-optimize before profiling
- ❌ Don't sacrifice correctness for speed
