# Bitboard Implementation for CoTuLenh

## The Revolutionary Insight

CoTuLenh is **perfectly designed** for bitboard representation! This isn't just
an optimization - it's a fundamental architectural match that makes bitboards
the **obvious choice** for implementation.

## Why CoTuLenh + Bitboards = Perfect Match

### 1. All Pieces Are Sliding Pieces ✨

Every piece in CoTuLenh moves in **rays** (horizontal, vertical, or diagonal):

- **Tank:** Horizontal/vertical rays, range 1-2
- **Artillery:** Horizontal/vertical rays, range 1-3
- **Navy:** Horizontal/vertical rays, range 1-3
- **Air Force:** All 8 directions, range 1-4
- **Infantry/Militia:** All 8 directions, range 1
- **Commander:** All 8 directions, range 1
- **HEADQUARTER:** No movement (base), all 8 directions range 1 (heroic)

**This is exactly what bitboards excel at!**

### 2. Terrain as Bitboards 🗺️

CoTuLenh's terrain system maps perfectly to bitboards:

```typescript
interface TerrainBitboards {
  waterSquares: Bitboard // Files a-b (pure water)
  landSquares: Bitboard // Files d-k (pure land)
  mixedSquares: Bitboard // File c + rivers (mixed terrain)
  bridgeSquares: Bitboard // Bridge squares

  // Derived masks for fast lookups
  navyAccessible: Bitboard // water | mixed
  landAccessible: Bitboard // land | mixed | bridges
  allAccessible: Bitboard // All squares (for Air Force)
}
```

### 3. Stay-Capture Logic Becomes Trivial 🎯

The complex stay-capture rules become simple bitwise operations:

```typescript
// Artillery attacking Navy at sea
const canAttack = attackRay & targetSquare // Can attack anywhere
const canMoveTo = movementRay & landTerrain // Can only move on land

const isStayCapture = canAttack && !canMoveTo // Simple boolean logic!
```

### 4. Different Move vs Attack Patterns 🏹

Many pieces have different movement and attack capabilities:

- **Artillery:** Moves on land only, attacks anywhere (including sea)
- **Navy:** Moves on water+mixed, attacks anywhere (including pure land)
- **Air Force:** Moves anywhere, attacks anywhere, ignores blocking

Bitboards handle this elegantly with separate ray calculations.

---

## Performance Revolution

### Expected Performance Gains

| Operation                  | Traditional | Bitboard | Speedup           |
| -------------------------- | ----------- | -------- | ----------------- |
| **Move Generation**        | 10-15ms     | 2-5ms    | **3-5x faster**   |
| **Attack Detection**       | 50-100μs    | 1-2μs    | **50x faster**    |
| **Legal Move Filtering**   | 8-12ms      | 1-3ms    | **4-8x faster**   |
| **Heroic Promotion Check** | 20-50μs     | 1-5μs    | **10-20x faster** |
| **Memory per Position**    | 2-4KB       | 0.5-1KB  | **2-4x less**     |

### Why So Much Faster?

1. **Parallel Processing:** Process all pieces of same type simultaneously
2. **Cache Efficiency:** Bitboards fit in CPU cache, arrays don't
3. **CPU Optimization:** Modern CPUs have specialized bit manipulation
   instructions
4. **Reduced Branching:** Bitwise operations vs conditional loops

---

## Architecture Overview

### Core Bitboard Structure

```typescript
// 12x12 board mapped to 256-bit space for alignment
type Bitboard = bigint

interface GameStateBitboards {
  // Piece positions by type and color
  pieces: {
    red: PieceTypeBitboards
    blue: PieceTypeBitboards
    all: Bitboard // All pieces (occupied squares)
    heroic: Bitboard // All heroic pieces
  }

  // Terrain (static, computed once)
  terrain: TerrainBitboards

  // Pre-computed attack/movement tables
  rays: RayTables
  magics: MagicBitboards // For ultra-fast sliding piece attacks
}
```

### Ray-Based Move Generation

```typescript
// Generate all Tank moves in ~1μs instead of ~50μs
function generateTankMoves(square: number, occupancy: Bitboard): Bitboard {
  // Get pre-computed rays for this square
  const horizontalRays = TANK_RAYS[square].horizontal
  const verticalRays = TANK_RAYS[square].vertical

  // Apply range limit (Tank max range 2)
  const rangedRays = horizontalRays | verticalRays
  const rangeLimited = rangedRays & RANGE_2_MASKS[square]

  // Apply terrain restrictions (Tank needs land-accessible terrain)
  const terrainFiltered = rangeLimited & TERRAIN.landAccessible

  // Remove blocking pieces and friendly pieces
  const blocked = calculateBlocking(terrainFiltered, occupancy, square)
  const friendlyPieces = getCurrentPlayerPieces()

  return blocked & ~friendlyPieces
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Basic bitboard structure and utilities
- [ ] Square ↔ bitboard conversion functions
- [ ] Terrain bitboard initialization
- [ ] Ray table pre-computation

### Phase 2: Move Generation (Week 2)

- [ ] Ray-based move generation for each piece type
- [ ] Terrain-aware movement restrictions
- [ ] Stay-capture detection with bitboards
- [ ] Basic legal move filtering

### Phase 3: Advanced Features (Week 3)

- [ ] Heroic promotion with bitboard attack detection
- [ ] Deploy session integration
- [ ] Magic bitboards for sliding pieces
- [ ] Performance optimizations

### Phase 4: Polish & Integration (Week 4)

- [ ] Complete game state management
- [ ] FEN serialization/deserialization
- [ ] Comprehensive testing
- [ ] Performance benchmarking

---

## 🎯 Key Learnings from Production Analysis (Oct 2025)

### Chessops Study: How Lichess Does It

We analyzed **chessops** (https://github.com/niklasf/chessops), the TypeScript
chess library powering **millions of games on lichess.org**. Critical findings:

#### ✅ What Works (Adopt for CoTuLenh):

1. **Context-Based Legal Move Validation** - Compute "context" (pinned pieces,
   checkers) once, then filter all moves using bitboard operations. **NO
   make/undo needed for 80% of moves!**

2. **Immutable Bitboards** - All operations return new instances. Simpler
   reasoning, no mutation bugs, easy snapshots.

3. **Snapshot-Based Undo** - Clone position (~400 bytes) instead of command
   pattern. Memory cost acceptable (~40KB per 100 moves).

4. **Hyperbola Quintessence > Magic Bitboards** - Faster initialization, smaller
   memory, good enough performance for web deployment.

5. **No Zobrist Hashing Initially** - Chessops doesn't use it! Only needed if
   FEN generation becomes bottleneck.

#### ⚠️ CoTuLenh-Specific Challenges:

1. **Air Force Ignores Blocking** - Standard pin detection breaks. Need special
   Air Force threat calculation that ignores all pieces.

2. **Stay-Captures** - Artillery/Navy can attack where they can't move. Need
   separate attack/movement range calculation.

3. **Non-Blocking Attacks** - Can't eliminate make/undo entirely. Still need
   simulation for:

   - Air Force exposure checks
   - Complex multi-threat scenarios
   - Deploy move validation
   - Commander move validation

4. **Stack Hierarchy** - Bitboards alone can't encode carrier/carried
   relationship. **MUST use supplemental Map<square, StackInfo>**.

#### 📊 Realistic Performance Expectations:

| Scenario               | Traditional | With Bitboards | Speedup                           |
| ---------------------- | ----------- | -------------- | --------------------------------- |
| **Simple piece moves** | 50μs        | 2-3μs          | **~20x**                          |
| **Pinned pieces**      | 50μs        | 2-3μs          | **~20x**                          |
| **Air Force threats**  | 50μs        | 10-20μs        | **~3x**                           |
| **Deploy moves**       | 50μs        | 40-50μs        | **~1x** (still need simulation)   |
| **Commander moves**    | 50μs        | 30-40μs        | **~1.5x** (still need validation) |
| **Overall average**    | 50μs        | 10-15μs        | **4-5x faster** ✅                |

**Conclusion:** Expect **4-5x overall speedup**, not 50-100x. Still excellent
for CoTuLenh's complexity!

---

## Files in This Folder

### 🆕 Latest Research & Analysis

- **`chessops-architecture-analysis.md`** - Deep dive into production bitboard
  implementation (lichess)
- **`legal-move-validation-strategies.md`** - How to validate moves without
  make/undo (context-based filtering)

### Core Implementation Docs

- `README.md` - This overview document
- `bitboard-basics.md` - Core bitboard concepts and utilities
- `terrain-encoding.md` - How to encode CoTuLenh's terrain as bitboards
- `ray-generation.md` - Pre-computing movement and attack rays
- `advanced-movement-rules.md` - Complex movement mechanics
- `magic-bitboards-advanced.md` - Ultra-fast sliding piece attacks
- `heroic-promotion-magic-detailed.md` - Bitboard-based heroic promotion
- `air-defense-zones.md` - Air defense calculation with bitboards
- `deploy-sessions-simplified.md` - Handling deploy sessions
- `runtime-state-and-logic.md` - Runtime state management
- `advanced-considerations.md` - Critical implementation challenges
- `project-structure.md` - Complete project organization

---

## The Bottom Line

**This isn't just an optimization - it's the RIGHT way to implement CoTuLenh.**

The game's design (sliding pieces + terrain + stay-capture) maps so perfectly to
bitboards that any other approach is essentially fighting against the natural
structure of the problem.

**Expected results:**

- ✅ **5-10x faster** than any square-by-square approach
- ✅ **2-4x less memory** usage
- ✅ **Cleaner code** - complex rules become simple bitwise operations
- ✅ **Better scalability** - performance scales linearly with board complexity
- ✅ **Future-proof** - easy to add new pieces or rules

Let's build the fastest CoTuLenh engine possible! 🚀
