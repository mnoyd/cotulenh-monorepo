# Chessops Architecture Analysis: Production Bitboard Implementation

## Overview

Chessops is a production-grade chess library powering **millions of games on
lichess.org**. This document analyzes its architecture to inform CoTuLenh's
bitboard implementation.

**Repository:** https://github.com/niklasf/chessops  
**Language:** TypeScript  
**Board Size:** 8×8 (64 squares)  
**Bitboard Size:** 64-bit (split into two 32-bit numbers)

---

## Core Architecture

### 1. Immutable SquareSet (Bitboard)

```typescript
class SquareSet implements Iterable<Square> {
  readonly lo: number // Lower 32 bits
  readonly hi: number // Upper 32 bits

  constructor(lo: number, hi: number) {
    this.lo = lo | 0
    this.hi = hi | 0
  }

  // ALL operations return NEW instances (immutable)
  union(other: SquareSet): SquareSet {
    return new SquareSet(this.lo | other.lo, this.hi | other.hi)
  }

  intersect(other: SquareSet): SquareSet {
    return new SquareSet(this.lo & other.lo, this.hi & other.hi)
  }

  with(square: Square): SquareSet {
    return square >= 32
      ? new SquareSet(this.lo, this.hi | (1 << (square - 32)))
      : new SquareSet(this.lo | (1 << square), this.hi)
  }
}
```

**Key Design Decisions:**

- ✅ **Immutable:** All operations return new instances
- ✅ **Split storage:** Two 32-bit numbers instead of BigInt (better performance
  in JS)
- ✅ **Iterable:** Can use `for...of` to iterate through set bits
- ✅ **Chainable:** Functional programming style

**Adaptation for CoTuLenh:**

```typescript
// CoTuLenh needs 256-bit for 12×12 board
class CoTuLenhSquareSet {
  readonly bits: Uint32Array // 8 × 32-bit = 256-bit

  constructor(bits: Uint32Array = new Uint32Array(8)) {
    this.bits = bits
  }

  union(other: CoTuLenhSquareSet): CoTuLenhSquareSet {
    const result = new Uint32Array(8)
    for (let i = 0; i < 8; i++) {
      result[i] = this.bits[i] | other.bits[i]
    }
    return new CoTuLenhSquareSet(result)
  }
}
```

---

### 2. Board: Collection of Bitboards

```typescript
class Board {
  // Bitboards by color
  white: SquareSet
  black: SquareSet

  // Bitboards by role
  pawn: SquareSet
  knight: SquareSet
  bishop: SquareSet
  rook: SquareSet
  queen: SquareSet
  king: SquareSet

  // Aggregates
  occupied: SquareSet // All pieces
  promoted: SquareSet // For Crazyhouse variant

  // Query piece at square
  get(square: Square): Piece | undefined {
    const color = this.getColor(square)
    if (!color) return
    const role = this.getRole(square)!
    return { color, role, promoted: this.promoted.has(square) }
  }

  private getColor(square: Square): Color | undefined {
    if (this.white.has(square)) return 'white'
    if (this.black.has(square)) return 'black'
    return
  }

  private getRole(square: Square): Role | undefined {
    for (const role of ROLES) {
      if (this[role].has(square)) return role
    }
    return
  }
}
```

**Key Observations:**

- ❌ **No supplemental Map!** Pieces reconstructed by querying bitboards
- ✅ **Dual indexing:** Both by color AND by role
- ✅ **Aggregates cached:** `occupied` bitboard for fast queries
- ⚠️ **Works for simple pieces only** (no stacks/carriers)

**CoTuLenh Needs:**

```typescript
class CoTuLenhBoard {
  // Same structure as chessops
  red: SquareSet
  blue: SquareSet

  commander: SquareSet
  infantry: SquareSet
  tank: SquareSet
  // ... other piece types

  occupied: SquareSet
  heroic: SquareSet // CoTuLenh-specific

  // ⚠️ REQUIRED for stacks (chessops doesn't have this)
  stackInfo: Map<Square, StackComposition>
}

interface StackComposition {
  carrier: PieceSymbol
  carried: PieceSymbol[]
}
```

---

### 3. Position: Immutable Game State

```typescript
abstract class Position {
  board: Board
  turn: Color
  castles: Castles
  epSquare: Square | undefined
  halfmoves: number
  fullmoves: number

  // Clone for undo/redo
  clone(): Position {
    const pos = new this.constructor()
    pos.board = this.board.clone()
    pos.turn = this.turn
    pos.castles = this.castles.clone()
    pos.epSquare = this.epSquare
    pos.halfmoves = this.halfmoves
    pos.fullmoves = this.fullmoves
    return pos
  }

  // Apply move (mutates this position)
  play(move: Move): void {
    // ... update board, turn, counters
  }
}
```

**Key Design: Snapshot-Based Undo**

```typescript
// Client usage pattern
const history: Position[] = []

function makeMove(move: Move) {
  history.push(position.clone()) // ~200 bytes
  position.play(move)
}

function undo() {
  position = history.pop()!
}
```

**Memory Cost:**

- Each position snapshot: ~200 bytes (8 bitboards + metadata)
- 100-move game: ~20KB
- **Acceptable for modern systems!**

**Comparison to Command Pattern:**

```typescript
// CoTuLenh current approach
interface CTLMoveCommand {
  execute(): void
  undo(): void // Reverse operations
}

// Memory: ~100 bytes per command
// Complexity: Higher (must implement undo logic)
// Correctness: Easy to get wrong (state inconsistencies)
```

**Recommendation:** Switch to snapshot-based undo!

---

### 4. Attack Calculation: Hyperbola Quintessence

```typescript
/**
 * Implementation notes: Sliding attacks are computed using
 * Hyperbola Quintessence. Magic Bitboards would deliver slightly
 * faster lookups, but also require initializing considerably larger
 * attack tables. On the web, initialization time is important,
 * so the chosen method may strike a better balance.
 */

const hyperbola = (
  bit: SquareSet,
  range: SquareSet,
  occupied: SquareSet,
): SquareSet => {
  let forward = occupied.intersect(range)
  let reverse = forward.bswap64()
  forward = forward.minus64(bit)
  reverse = reverse.minus64(bit.bswap64())
  return forward.xor(reverse.bswap64()).intersect(range)
}

const fileAttacks = (square: Square, occupied: SquareSet): SquareSet =>
  hyperbola(SquareSet.fromSquare(square), FILE_RANGE[square], occupied)

const bishopAttacks = (square: Square, occupied: SquareSet): SquareSet => {
  const bit = SquareSet.fromSquare(square)
  return hyperbola(bit, DIAG_RANGE[square], occupied).xor(
    hyperbola(bit, ANTI_DIAG_RANGE[square], occupied),
  )
}
```

**Why NOT Magic Bitboards?**

- ✅ **Instant initialization** (no pre-computation needed)
- ✅ **Smaller memory footprint** (~10KB vs ~1MB)
- ✅ **Fast enough** for web deployment
- ⚠️ **Slightly slower lookups** (~2-3x slower than magic)

**Trade-off Analysis:** | Method | Init Time | Memory | Runtime Speed | Best For
| |--------|-----------|--------|---------------|----------| | **Hyperbola
Quintessence** | <1ms | ~10KB | Good | Web, mobile | | **Magic Bitboards** |
~100ms | ~1MB | Excellent | Native engines | | **Pre-computed Magic** | 0ms |
~1MB | Excellent | Production web |

**Recommendation for CoTuLenh:**

1. **Phase 1:** Hyperbola Quintessence (fast development)
2. **Phase 2:** Pre-compute magic tables offline, ship as constants
3. **Production:** Magic bitboards with instant initialization

---

### 5. Pre-computed Attack Tables

```typescript
// Computed once at module load
const KING_ATTACKS = tabulate((sq) =>
  computeRange(sq, [-9, -8, -7, -1, 1, 7, 8, 9]),
)
const KNIGHT_ATTACKS = tabulate((sq) =>
  computeRange(sq, [-17, -15, -10, -6, 6, 10, 15, 17]),
)
const PAWN_ATTACKS = {
  white: tabulate((sq) => computeRange(sq, [7, 9])),
  black: tabulate((sq) => computeRange(sq, [-7, -9])),
}

// Usage: O(1) lookup
const attacks = kingAttacks(square) // Instant!
```

**For CoTuLenh:**

```typescript
// Pre-compute for all piece types
const INFANTRY_ATTACKS = tabulate(computeInfantryRange) // All 8 directions, range 1
const TANK_ATTACKS = tabulate(computeTankRange) // H/V only, range 2
const ARTILLERY_ATTACKS = tabulate(computeArtilleryRange) // H/V only, range 3

// With heroic versions
const HEROIC_TANK_ATTACKS = tabulate(computeHeroicTankRange) // Range 3
```

---

### 6. Context-Based Legal Move Validation

See `legal-move-validation-strategies.md` for detailed analysis.

**Key Points:**

- ✅ Compute context once per position
- ✅ Filter moves using bitboard operations
- ✅ No make/undo for most moves
- ⚠️ King moves still need special handling

---

## What Chessops DOESN'T Have

### 1. Position Hashing (Zobrist)

**Observation:** Chessops has **no position hashing** at all!

**Why?**

- Chessops is a **library**, not an engine
- Threefold repetition tracked by **client code** (lichess)
- Clients can implement their own hashing if needed

**Implication for CoTuLenh:**

```typescript
// Option 1: No hashing (like chessops)
private _positionCount: Map<string, number> = new Map();  // FEN keys

// Option 2: Add Zobrist later if needed
private _positionHash: bigint = 0n;
private _positionCount: Map<bigint, number> = new Map();  // Hash keys
```

**Recommendation:** Start without Zobrist, add only if profiling shows FEN
generation is slow.

---

### 2. Complex State Management

Chessops keeps it simple:

- No virtual boards
- No deploy sessions (no stacks in standard chess)
- No command pattern

**For CoTuLenh:**

- ✅ Keep deploy session state simple
- ✅ Use snapshots instead of virtual boards
- ✅ Avoid over-engineering

---

### 3. Move Validation During Generation

Chessops separates concerns:

```typescript
// Generate pseudo-legal moves
const pseudo = attacks(piece, square, occupied)

// Filter to legal (separate step)
const legal = this.dests(square, ctx)
```

**Not this:**

```typescript
// DON'T: Generate only legal moves
for (const move of generateAllMoves()) {
  if (isLegal(move)) yield move // Testing during generation
}
```

**Why separation is better:**

- Easier to test
- Cleaner code
- Can generate pseudo-legal for perft/analysis

---

## Key Architectural Principles

### 1. Immutability

```typescript
// All SquareSet operations return NEW instances
const newSet = oldSet.with(square) // oldSet unchanged
```

**Benefits:**

- No mutation bugs
- Easy snapshots
- Thread-safe
- Functional programming style

---

### 2. Separation of Concerns

```typescript
// Board: Pure piece positions (bitboards)
// Position: Game rules + state
// Chess: Concrete implementation

class Board {} // Just bitboards
abstract class Position {} // Rules + validation
class Chess extends Position {} // Standard chess rules
```

**Benefits:**

- Testable in isolation
- Reusable for variants
- Clear responsibilities

---

### 3. Lazy Evaluation

```typescript
// Context computed on demand
dests(square: Square, ctx?: Context): SquareSet {
  ctx = ctx || this.ctx();  // Compute if not provided
  // ...
}

// Client can pre-compute for all pieces
const ctx = position.ctx();
for (const square of pieces) {
  const moves = position.dests(square, ctx);  // Reuse context
}
```

**Benefits:**

- Pay only for what you use
- Optimization opportunities
- Flexible API

---

### 4. Type Safety

```typescript
// Strong typing throughout
type Square = number;           // 0-63
type SquareName = `${FileName}${RankName}`;  // "e4"
type Color = 'white' | 'black';
type Role = 'pawn' | 'knight' | ...;

interface Piece {
  role: Role;
  color: Color;
  promoted?: boolean;
}
```

**Benefits:**

- Catch errors at compile time
- Better IDE support
- Self-documenting code

---

## Memory Layout Analysis

### Per Position:

```typescript
// Board bitboards
white: 8 bytes
black: 8 bytes
pawn: 8 bytes
knight: 8 bytes
bishop: 8 bytes
rook: 8 bytes
queen: 8 bytes
king: 8 bytes
occupied: 8 bytes
promoted: 8 bytes
// = 80 bytes for bitboards

// Metadata
turn: 1 byte
halfmoves: 2 bytes
fullmoves: 2 bytes
epSquare: 1 byte
castles: ~20 bytes
// = ~26 bytes for metadata

// Total: ~106 bytes per position
// With object overhead: ~200 bytes
```

**For 100-move game:**

- History: 100 positions × 200 bytes = **20KB**
- **Totally acceptable!**

---

## CoTuLenh Adaptations Required

### 1. Larger Bitboards

```typescript
// Chessops: 64-bit (8×8)
class SquareSet {
  lo: number // 32 bits
  hi: number // 32 bits
}

// CoTuLenh: 256-bit (12×12 padded to 16×16)
class CoTuLenhSquareSet {
  bits: Uint32Array // 8 × 32 bits = 256 bits
}
```

---

### 2. Stack Composition Tracking

```typescript
// Chessops doesn't need this (no stacks)

// CoTuLenh REQUIRES this
interface CoTuLenhBoard {
  // ... bitboards ...

  stackInfo: Map<
    Square,
    {
      carrier: PieceSymbol
      carried: PieceSymbol[]
    }
  >
}
```

---

### 3. Heroic Status Tracking

```typescript
// Chessops has "promoted" for Crazyhouse

// CoTuLenh needs "heroic"
interface CoTuLenhBoard {
  // ... bitboards ...

  heroic: SquareSet // Bitboard of all heroic pieces
}
```

---

### 4. Terrain System

```typescript
// Chessops: All squares equal

// CoTuLenh: Terrain masks
interface TerrainBitboards {
  water: SquareSet // Pure water (files a-b)
  land: SquareSet // Pure land (files d-k)
  mixed: SquareSet // Mixed terrain (file c)
  bridges: SquareSet // Bridge squares

  // Derived
  navyAccessible: SquareSet // water | mixed
  landAccessible: SquareSet // land | mixed | bridges
}
```

---

### 5. Air Defense Zones

```typescript
// Chessops: N/A

// CoTuLenh: Dynamic air defense
interface AirDefenseState {
  redZones: SquareSet // Red air defense coverage
  blueZones: SquareSet // Blue air defense coverage
}
```

---

### 6. Deploy Sessions

```typescript
// Chessops: N/A

// CoTuLenh: Deploy state
interface DeployState {
  originSquare: Square
  remainingPieces: PieceSymbol[]
  deployedPieces: Array<{
    piece: PieceSymbol
    destination: Square
  }>
}
```

---

## Performance Expectations

Based on chessops + CoTuLenh complexity:

| Operation               | Chessops    | CoTuLenh Expected | Reason               |
| ----------------------- | ----------- | ----------------- | -------------------- |
| **Context computation** | 10-20μs     | 20-40μs           | Air defense zones    |
| **Pseudo-move gen**     | 2μs/piece   | 3-4μs/piece       | Terrain checks       |
| **Legal move filter**   | 0.5μs/piece | 1-2μs/piece       | Air Force threats    |
| **Position clone**      | 200 bytes   | 400 bytes         | Stack info map       |
| **Overall speedup**     | 50-100x     | 4-5x              | Non-blocking attacks |

**Still a huge win!** 4-5x speedup is excellent for CoTuLenh's complexity.

---

## Recommended Implementation Order

### Phase 1: Foundation

1. ✅ Implement `CoTuLenhSquareSet` (256-bit)
2. ✅ Implement `CoTuLenhBoard` (bitboards + stackInfo)
3. ✅ Add pre-computed attack tables
4. ✅ Implement Hyperbola Quintessence

### Phase 2: Core Logic

5. ✅ Implement terrain bitboards
6. ✅ Implement context computation
7. ✅ Implement pseudo-move generation
8. ✅ Implement legal move filtering

### Phase 3: CoTuLenh-Specific

9. ✅ Add air defense zone calculation
10. ✅ Add Air Force special handling
11. ✅ Add stay-capture detection
12. ✅ Add deploy session support

### Phase 4: Optimization

13. ⚠️ Profile and optimize hot paths
14. ⚠️ Consider magic bitboards
15. ⚠️ Add Zobrist hashing if needed
16. ⚠️ Optimize memory layout

---

## Conclusion

**Chessops demonstrates:**

- ✅ Bitboards work great in TypeScript
- ✅ Immutability simplifies architecture
- ✅ Snapshot-based undo is practical
- ✅ Context-based validation is fast
- ✅ No need for Zobrist initially
- ✅ Hyperbola Quintessence is good enough

**For CoTuLenh:**

- ⚠️ Core principles apply
- ⚠️ Need adaptations for complexity
- ⚠️ Can't eliminate all simulation
- ⚠️ But still expect 4-5x speedup

**The path forward is clear!** We have a proven architecture to build upon, with
clear understanding of where adaptations are needed for CoTuLenh's unique
mechanics. 🚀
