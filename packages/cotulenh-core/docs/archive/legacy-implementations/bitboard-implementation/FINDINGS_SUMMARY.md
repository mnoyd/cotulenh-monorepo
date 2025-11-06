# CoTuLenh Bitboard Implementation: Key Findings Summary

**Date:** October 21, 2025  
**Source:** Analysis of chessops (https://github.com/niklasf/chessops)  
**Context:** Production TypeScript bitboard library powering lichess.org

---

## 🎯 The Big Question

**How do you validate legal moves without making/undoing each move?**

### Traditional Approach (Current CoTuLenh):

```typescript
for (const move of allMoves) {
  this._makeMove(move) // Mutate everything
  if (!this._isCommanderAttacked()) {
    legalMoves.push(move)
  }
  this._undoMove() // Restore everything
}
// Cost: ~50μs per move × 50 moves = 2.5ms
```

### Chessops Approach:

```typescript
const ctx = this.computeContext() // Once! ~20μs

for (const square of pieces) {
  let moves = this.attacks(square, occupied)

  // Filter using pre-computed context
  if (ctx.blockers.has(square)) {
    moves = moves.intersect(pinRay) // Bitboard AND
  }

  if (ctx.checkers.nonEmpty()) {
    moves = moves.intersect(blockSquares) // Bitboard AND
  }
}
// Cost: ~20μs context + 2μs × 16 pieces = 50μs total
// Speedup: 50x faster!
```

---

## 🔑 Key Discovery: Context-Based Filtering

### The Context Object:

```typescript
interface Context {
  king: Square // King position
  blockers: SquareSet // Pinned pieces (bitboard!)
  checkers: SquareSet // Pieces giving check
}
```

**Magic:** By finding **all pinned pieces** in one pass, you can filter **every
piece's moves** using simple bitboard operations!

### How Pin Detection Works:

```typescript
// Find "snipers" (enemy pieces that could pin our pieces)
const snipers = enemyRooksAndQueens.union(enemyBishopsAndQueens)

for (const sniper of snipers) {
  const between = between(king, sniper).intersect(occupied)

  if (between.size() === 1) {
    // Exactly one piece between king and sniper
    blockers = blockers.union(between) // This piece is pinned!
  }
}

// Now for ANY piece:
if (blockers.has(pieceSquare)) {
  legalMoves = pseudoMoves.intersect(pinRay) // Can only move on ray!
}
```

**No make/undo needed!** Just bitboard operations.

---

## ⚠️ CoTuLenh's Challenge: Non-Blocking Attacks

### The Problem:

```
Standard Chess:
  King at e5
  Rook at e6 (blocks)
  Enemy Rook at e8
  → Rook at e6 is PINNED (blocks attack)

CoTuLenh:
  Commander at e5
  Infantry at e6 (appears to block)
  Enemy Air Force at e8
  → Infantry is NOT PINNED! (Air Force ignores blocking!)
```

**Air Force and Artillery break standard pin detection!**

---

## 🎯 CoTuLenh Solution: Hybrid Approach

### Fast Path (~80% of moves):

```typescript
if (canUseFastValidation(move)) {
  // Use context + bitboard filtering
  return validateWithBitboards(move, ctx) // 2-3μs
}
```

**When fast path works:**

- ✅ Standard piece moves (Tank, Infantry, etc.)
- ✅ No Air Force threats nearby
- ✅ Not a stay-capture
- ✅ Not a deploy move
- ✅ Single check (not double check)

### Slow Path (~20% of moves):

```typescript
else {
  // Still need simulation
  const snapshot = position.clone();
  snapshot.applyMove(move);
  return !snapshot.isCommanderAttacked();  // 50μs
}
```

**When simulation needed:**

- ⚠️ Air Force exposure checks
- ⚠️ Complex multi-threat scenarios
- ⚠️ Deploy moves (multi-step)
- ⚠️ Commander moves
- ⚠️ Stay-captures

---

## 📊 Performance Reality Check

### Initial Expectations:

- **Hoped for:** 50-100x speedup (like standard chess)

### Actual Expectations (after analysis):

- **Realistic:** 4-5x overall speedup

**Why less dramatic?**

```
Average = 80% × 20x (fast) + 20% × 1x (slow) = 16x + 0.2x = 4.2x overall
```

**But 4-5x is still HUGE!** 🎉

---

## 🏗️ Architecture Decisions

### 1. Immutable Bitboards ✅

```typescript
class SquareSet {
  union(other): SquareSet {
    return new SquareSet(this.bits | other.bits) // New instance
  }
}
```

**Benefit:** No mutation bugs, easy snapshots

---

### 2. Snapshot-Based Undo ✅

```typescript
// Instead of command pattern
makeMove(move) {
  history.push(this.clone());  // ~400 bytes
  this.applyMove(move);
}

undo() {
  this = history.pop();
}
```

**Benefit:** Simpler than command pattern, guaranteed correct

**Memory:** 100 moves × 400 bytes = 40KB (totally fine!)

---

### 3. No Zobrist Hashing (Initially) ✅

Chessops doesn't use it! Only add if profiling shows FEN generation is slow.

---

### 4. Hyperbola Quintessence (Not Magic Bitboards) ✅

**Why:** Faster initialization, smaller memory, good enough

**Trade-off:**

- Magic: ~100ms init, ~1MB memory, fastest runtime
- Hyperbola: <1ms init, ~10KB memory, slightly slower runtime

**For Web:** Hyperbola wins!

---

### 5. Stack Info Map Required ✅

```typescript
interface CoTuLenhBoard {
  // Bitboards for piece positions
  red: SquareSet
  blue: SquareSet
  tank: SquareSet
  // ...

  // REQUIRED: Can't encode in bitboards alone!
  stackInfo: Map<
    Square,
    {
      carrier: PieceSymbol
      carried: PieceSymbol[]
    }
  >
}
```

**Why:** Bitboards show "Tank + Navy at e5" but not "which one is carrying the
other"

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation

1. Implement 256-bit SquareSet (12×12 board)
2. Implement Board with bitboards + stackInfo
3. Add pre-computed attack tables
4. Implement Hyperbola Quintessence

### Phase 2: Context-Based Validation

5. Implement standard pin detection
6. Implement Air Force threat detection (ignores blocking!)
7. Implement context computation
8. Implement fast path validation

### Phase 3: Hybrid System

9. Implement decision tree (fast vs slow path)
10. Keep simulation for complex cases
11. Optimize for maximum fast path coverage

### Phase 4: CoTuLenh-Specific

12. Add air defense zone calculation
13. Add stay-capture detection
14. Add deploy session support
15. Add terrain masks

---

## 💡 Critical Learnings

### ✅ What We Learned:

1. **Context-based filtering works!** - Can eliminate make/undo for most moves
2. **Immutability simplifies architecture** - Snapshots > Command pattern
3. **Don't over-optimize early** - No Zobrist hashing, no Magic bitboards
   initially
4. **Production code is practical** - Chessops proves bitboards work in
   TypeScript/web

### ⚠️ What's Different for CoTuLenh:

1. **Air Force breaks standard assumptions** - Need special threat detection
2. **Stay-captures need special handling** - Separate attack/move ranges
3. **Can't eliminate simulation entirely** - Complex mechanics require it
4. **Stack hierarchy needs Map** - Bitboards alone insufficient

### 🎯 Bottom Line:

**Bitboards give CoTuLenh a 4-5x performance boost, not 50-100x.**

**But that's still amazing!** Going from 50μs to 10μs per move means:

- Faster game responsiveness
- More positions evaluated in analysis
- Better user experience
- Room for future features

---

## 📚 Documentation Created

1. **`chessops-architecture-analysis.md`** - Complete analysis of production
   bitboard implementation
2. **`legal-move-validation-strategies.md`** - Detailed explanation of
   context-based filtering + CoTuLenh adaptations
3. **`FINDINGS_SUMMARY.md`** - This document (TL;DR)

---

## 🎓 References

- **Chessops:** https://github.com/niklasf/chessops
- **Lichess:** https://lichess.org (uses chessops)
- **Hyperbola Quintessence:**
  https://www.chessprogramming.org/Hyperbola_Quintessence
- **Magic Bitboards:** https://www.chessprogramming.org/Magic_Bitboards

---

**Next Steps:**

1. ✅ Review and validate findings with team
2. ⏭️ Start Phase 1 implementation (SquareSet + Board)
3. ⏭️ Build prototype with context-based validation
4. ⏭️ Benchmark against current system
5. ⏭️ Iterate and optimize

---

**Created:** October 21, 2025  
**Status:** Research Complete, Ready for Implementation  
**Expected Impact:** 4-5x performance improvement ✨
