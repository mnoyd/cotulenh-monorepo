# Recombine Logic: Complete Analysis

## 🎯 What is Recombine?

**Recombine** is a special deploy move that allows a deployed piece to
**rejoin** another piece from the same original stack that was deployed earlier
in the same deploy session.

### Example Scenario

```
Initial: c3 has N(FTI) - Navy carrying AirForce, Tank, Infantry

Step 1: Deploy Navy to c5
  - c3 should have: (FTI) - AirForce, Tank, Infantry remain
  - c5 has: N - Navy alone

Step 2: Recombine AirForce with Navy
  - AirForce moves from c3 to c5
  - c5 now has: N(F) - Navy carrying AirForce
  - c3 has: (TI) - Tank, Infantry remain

Step 3: Recombine Tank with Navy
  - Tank moves from c3 to c5
  - c5 now has: N(FT) - Navy carrying AirForce and Tank
  - c3 has: I - Infantry alone
```

---

## 🐛 Current Bug: Carrier Deployment Issue

### The Problem

**When deploying the carrier itself (Navy), the entire stack disappears!**

**Debug Output Shows:**

```
=== Step 1: Deploy Navy to c5 ===
c3 after Navy deploy: undefined  ❌ WRONG!
c5 after Navy deploy: { "type": "n", "color": "r", "heroic": false }

=== Available moves from c3 ===
Total moves: 0  ❌ NO MOVES BECAUSE c3 IS EMPTY!
```

**Expected:**

```
c3 after Navy deploy: { "type": "f", carrying: [{ "type": "t" }, { "type": "i" }] }
  OR: { "type": "t", carrying: [{ "type": "f" }, { "type": "i" }] }
  (One of the carried pieces becomes the new carrier)
```

### Root Cause Analysis

When `RemoveFromStackAction` executes for deploying the **carrier** (Navy):

```typescript
// In RemoveFromStackAction.execute()
const carrier = this.game.get(this.carrierSquare) // N(FTI)
const remainingCarrier = removePieceFromStack(carrier, this.move.piece) // Remove Navy

// remainingCarrier = null because Navy was the carrier!
// So the entire stack at c3 is removed
if (!remainingCarrier) {
  this.game.remove(algebraic(this.carrierSquare)) // ❌ c3 becomes undefined
}
```

**The issue**: `removePieceFromStack()` returns `null` when you remove the
carrier from a stack, because the carried pieces have no carrier left!

---

## 🔧 Design Questions

### Q1: What should happen when the carrier deploys?

**Option A: Promote a carried piece to be the new carrier**

```typescript
// Before: N(FTI) at c3
// Deploy Navy → c5
// After: F(TI) at c3  (AirForce becomes carrier)
//        N at c5
```

**Option B: Carrier cannot deploy first**

```typescript
// Validation: Carrier must deploy LAST
// Must deploy F, T, I first, then Navy can deploy
```

**Option C: All pieces must deploy together**

```typescript
// If carrier deploys, all carried pieces must deploy simultaneously
// This contradicts the incremental deploy design
```

### Q2: How does recombine generation work?

**Current Implementation** (`generateRecombineMoves`):

```typescript
function generateRecombineMoves(
  gameInstance: CoTuLenh,
  session: any,
  stackSquare: number,
  remainingPieces: Piece[],
  normalMoves: InternalMove[],
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const moves: InternalMove[] = []
  const deployedSquares = session.getDeployedSquares() // [c5]

  for (const piece of remainingPieces) {
    // [AirForce, Tank, Infantry]
    for (const targetSquare of deployedSquares) {
      // [c5]
      // Skip if there's already a normal move to this square
      const hasNormalMove = normalMoves.some(
        (m) => m.piece.type === piece.type && m.to === targetSquare,
      )

      if (!hasNormalMove) {
        const targetPiece = gameInstance.get(targetSquare) // Navy at c5

        // Check if pieces can combine
        if (targetPiece && targetPiece.color === piece.color) {
          const combined = combinePieces([piece, targetPiece])
          if (combined) {
            moves.push({
              from: stackSquare,
              to: targetSquare,
              piece: piece,
              color: piece.color,
              flags: BITS.DEPLOY | BITS.COMBINATION,
              combined: targetPiece,
            })
          }
        }
      }
    }
  }

  return moves
}
```

**Key Points:**

- ✅ Only generates recombines to squares where pieces were deployed in this
  session
- ✅ Checks if pieces can combine using `combinePieces()`
- ✅ Skips if there's already a normal move to that square
- ✅ Only combines friendly pieces
- ❌ **Requires pieces to still exist at stackSquare** (fails when c3 is
  undefined!)

### Q3: Should the carrier be excluded from recombine?

**Current Code** (line 650-652 in move-generation.ts):

```typescript
const carriedPiecesOnly = deployMoveCandidates.filter(
  (p) => p.type !== carrierPiece.type,
)
```

**This filters out the carrier from recombine moves**, which makes sense
because:

- The carrier already deployed
- Only carried pieces should recombine back to it

**Test Expectation** (line 88-95 in recombine-moves.test.ts):

```typescript
// Navy moves should all be normal deploy moves, not recombines
for (const move of navyMoves) {
  if (move.to === 'c4' || move.to === 'd3') {
    expect(move.flags).not.toContain('b') // Should NOT have COMBINATION flag
  }
}
```

✅ **This is correct design**: Carrier should NOT recombine.

---

## 📋 Commander Filtering

### Q: Can the Commander recombine?

**From CRITICAL-RISKS.md:**

```typescript
// 4. Commander safety (use existing validation)
// This is handled by _filterLegalMoves
```

**Current Implementation:**

- All moves (including recombines) go through `_filterLegalMoves()`
- This checks `_isCommanderAttacked()` and `_isCommanderExposed()`
- So commander safety is automatically validated

**Special Case: Commander as Carrier**

```typescript
// If Commander is carrying pieces and deploys:
// C(FT) at c3
// Deploy Commander → c5
// What happens to F and T at c3?
```

This is the same carrier deployment issue!

---

## ✅ What Works Currently

### Passing Tests (6/7)

1. ✅ **Generate recombine move to rejoin deployed pieces**

   - Generates recombine moves correctly
   - Flags include both DEPLOY and COMBINATION

2. ✅ **Should not generate recombine for carrier piece**

   - Carrier (Navy) doesn't get recombine moves
   - Only carried pieces can recombine

3. ✅ **Should not duplicate normal moves with recombine**

   - If piece can reach square normally, only recombine is generated
   - No duplicate moves

4. ✅ **Should only combine friendly pieces**

   - No recombine to enemy pieces
   - Color check works

5. ✅ **Should execute recombine move correctly**

   - Recombine execution works
   - Pieces combine properly at destination

6. ✅ **Should not generate recombine to squares not yet deployed to**
   - Only generates recombines to deployed squares from this session
   - Doesn't generate recombines to unrelated friendly pieces

### Failing Test (1/7)

❌ **Should allow multiple recombines to same square**

- **Fails at**: Second recombine (AirForce)
- **Error**:
  `No matching legal move found: {"from":"c3","to":"c5","piece":"f","deploy":true}`
- **Root Cause**: After deploying Navy, c3 becomes `undefined`, so no moves can
  be generated

---

## 🔍 The Core Issue

### The Fundamental Problem

**When a carrier deploys, what happens to the carried pieces?**

The current `RemoveFromStackAction` logic:

```typescript
const remainingCarrier = removePieceFromStack(carrier, this.move.piece)

if (!remainingCarrier) {
  // No pieces remain after removal
  this.game.remove(algebraic(this.carrierSquare)) // ❌ REMOVES ENTIRE STACK
}
```

**This is wrong for carrier deployment!**

When deploying the carrier:

- `carrier` = N(FTI)
- `this.move.piece` = N
- `removePieceFromStack(N(FTI), N)` = null (because Navy was the carrier)
- But F, T, I should still be at c3!

---

## 💡 Proposed Solution

### Option 1: Promote First Carried Piece to Carrier

```typescript
// In RemoveFromStackAction.execute()
const carrier = this.game.get(this.carrierSquare)
const remainingCarrier = removePieceFromStack(carrier, this.move.piece)

if (!remainingCarrier) {
  // Check if we're removing the carrier itself
  if (
    carrier.type === this.move.piece.type &&
    carrier.carrying &&
    carrier.carrying.length > 0
  ) {
    // Promote first carried piece to be the new carrier
    const newCarrier = carrier.carrying[0]
    const remainingCarried = carrier.carrying.slice(1)

    const promotedStack = {
      ...newCarrier,
      carrying: remainingCarried.length > 0 ? remainingCarried : undefined,
    }

    this.game.put(promotedStack, algebraic(this.carrierSquare))
  } else {
    // Truly no pieces remain
    this.game.remove(algebraic(this.carrierSquare))
  }
} else {
  // Normal case: update with remaining carrier
  this.game.put(remainingCarrier, algebraic(this.carrierSquare))
}
```

### Option 2: Fix `removePieceFromStack` to Handle Carrier Removal

Modify the `PieceStacker.remove()` method to automatically promote a carried
piece when the carrier is removed:

```typescript
// In @repo/cotulenh-combine-piece
remove(stackPiece: T, pieceToRemove: T): T | null {
  // ... existing logic ...

  // If removing the carrier and there are carried pieces
  if (isCarrier && remainingPieces.length > 0) {
    // Promote first remaining piece to carrier
    const newCarrier = remainingPieces[0]
    const newCarried = remainingPieces.slice(1)

    return {
      ...newCarrier,
      carrying: newCarried.length > 0 ? newCarried : undefined
    }
  }

  // ... rest of logic ...
}
```

---

## 🎯 Recommendation

**Implement Option 2** - Fix at the `PieceStacker` level:

### Reasons:

1. **Centralized Logic**: All carrier removal logic in one place
2. **Consistent Behavior**: Works for all use cases, not just deploy
3. **Cleaner Code**: `RemoveFromStackAction` doesn't need special cases
4. **Testable**: Can unit test the stacker independently

### Implementation Steps:

1. Update `PieceStacker.remove()` in `@repo/cotulenh-combine-piece`
2. Add tests for carrier removal with carried pieces
3. Verify all recombine tests pass
4. Document the carrier promotion behavior

---

## 📊 Test Status Summary

**Current**: 6/7 passing (85.7%) **After Fix**: Should be 7/7 passing (100%)

**The fix will enable:**

- ✅ Multiple recombines to the same square
- ✅ Carrier deployment with automatic promotion
- ✅ Full incremental deploy functionality
