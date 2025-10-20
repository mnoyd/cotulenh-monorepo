# CRITICAL: Context Staleness Bug - October 20, 2025

**Status**: ✅ FIXED  
**Severity**: 🔴 CRITICAL - Caused ghost pieces and board corruption  
**Impact**: 26/29 tests now passing (was causing cascading failures)  
**Date Fixed**: October 20, 2025, 11:55 PM

---

## 🐛 The Bug: Stale Context References

### Problem Statement

Atomic actions were checking `this.context.deploySession` (captured at
construction time) instead of `this.game.getDeployState()` (current game state).
This caused actions to use **stale references** during undo, leading to ghost
pieces persisting on the board.

### Critical Difference

```typescript
// ❌ WRONG: Uses stale context captured at construction time
class PlacePieceAction {
  constructor(..., private context?: MoveContext) {}

  undo(): void {
    if (this.context?.deploySession) {  // ← Stale reference!
      // This checks the session that existed during execute()
      // But by undo time, game._deploySession might be null
      this.context.deploySession.virtualChanges.delete(square)
    }
  }
}

// ✅ CORRECT: Checks game's current state
class PlacePieceAction {
  undo(): void {
    const currentDeploySession = this.game.getDeployState()  // ← Fresh state!
    if (this.context?.isDeployMode && currentDeploySession) {
      // This checks the CURRENT game state
      currentDeploySession.virtualChanges.delete(square)
    }
  }
}
```

---

## 🔍 How It Manifested

### Test Scenario

```typescript
// Test: "Generate deploy moves for (NFT) stack"
const moves = game.moves({ verbose: true, square: 'c1' })
// This creates Move objects with verbose info
// Move constructor calls _makeMove() then _undoMove() for FEN generation

// Expected after move generation:
// c1: Tank carrying Infantry ✅
// c2: empty ✅
// d1: empty ✅

// Actual after move generation (BEFORE FIX):
// c1: Tank carrying Infantry ✅
// c2: Infantry 💀 GHOST PIECE!
// d1: Infantry 💀 GHOST PIECE!

// Next move fails:
game.move({ from: 'c1', to: 'c2', piece: TANK, deploy: true })
// Error: No matching legal move found (c2 appears occupied!)
```

### The Sequence of Events

1. **Move Generation**: `game.moves({ verbose: true })` called
2. **Move Constructor Executes**: For each move, creates `Move` object
3. **Testing Context Created**:
   ```typescript
   const testingContext = {
     isDeployMode: true,
     deploySession: <active session>,  // ← Captured in context
     isTesting: true
   }
   ```
4. **Execute Phase**: Actions capture `this.context.deploySession` reference
5. **Undo Phase**: `_undoMove()` restores `game._deploySession = null` FIRST
6. **Action Undo**: Actions check `this.context.deploySession` → still points to
   old session!
7. **Bug Triggers**: Actions think they should use virtual state, but game state
   is different
8. **Result**: Ghost pieces left on board, virtual state not properly cleared

---

## ✅ The Fix

### Actions Updated

All atomic actions now check `this.game.getDeployState()` instead of
`this.context.deploySession`:

#### 1. PlacePieceAction

```typescript
undo(): void {
  // ✅ Get CURRENT game state
  const currentDeploySession = this.game.getDeployState()
  const shouldUseVirtualState = this.context?.isDeployMode && currentDeploySession

  if (shouldUseVirtualState) {
    // Use virtual state restoration
    if (this.existingPiece) {
      currentDeploySession!.virtualChanges.set(algebraic(this.square), this.existingPiece)
    } else {
      currentDeploySession!.virtualChanges.delete(algebraic(this.square))
    }
  } else {
    // Use real board restoration
    if (this.existingPiece) {
      this.game.put(this.existingPiece, algebraic(this.square))
    } else {
      this.game.remove(algebraic(this.square))
    }
  }
}
```

#### 2. RemovePieceAction

```typescript
execute(): void {
  const piece = this.game.get(this.square)
  if (piece) {
    this.removedPiece = {
      ...piece,
      carrying: piece.carrying?.map(p => ({...p}))  // Deep copy!
    }
  }

  // ✅ Check game's current deploy session
  const currentDeploySession = this.game.getDeployState()
  if (this.context?.isDeployMode && currentDeploySession) {
    currentDeploySession.virtualChanges.set(algebraic(this.square), null)
  } else {
    this.game.remove(algebraic(this.square))
  }
}

undo(): void {
  // ✅ Check game's current deploy session
  const currentDeploySession = this.game.getDeployState()
  if (this.context?.isDeployMode && currentDeploySession) {
    if (this.removedPiece) {
      currentDeploySession.virtualChanges.set(algebraic(this.square), this.removedPiece)
    } else {
      currentDeploySession.virtualChanges.delete(algebraic(this.square))
    }
  } else {
    if (this.removedPiece) {
      this.game.put(this.removedPiece, algebraic(this.square))
    }
  }
}
```

#### 3. RemoveFromStackAction

```typescript
constructor(...) {
  // ✅ Deep copy original state to prevent reference mutations
  const original = this.game.get(this.carrierSquare)
  if (original) {
    this.originalState = {
      ...original,
      carrying: original.carrying?.map(p => ({...p}))
    }
  } else {
    this.originalState = undefined
  }
}

execute(): void {
  // ... piece removal logic ...

  // ✅ Check game's current deploy session
  const currentDeploySession = this.game.getDeployState()
  if (this.context?.isDeployMode && currentDeploySession) {
    // Update virtual state
    if (remainingPiece.length === 0) {
      currentDeploySession.virtualChanges.set(algebraic(this.carrierSquare), null)
    } else {
      const { combined } = createCombineStackFromPieces(remainingPiece)
      currentDeploySession.virtualChanges.set(algebraic(this.carrierSquare), combined)
    }
  } else {
    // Update real board
    // ...
  }
}

undo(): void {
  // ✅ Check game's current deploy session
  const currentDeploySession = this.game.getDeployState()
  const hasActiveVirtualChanges =
    this.context?.isDeployMode &&
    currentDeploySession &&
    currentDeploySession.virtualChanges.has(algebraic(this.carrierSquare))

  if (hasActiveVirtualChanges) {
    // Virtual state restoration
    currentDeploySession!.virtualChanges.delete(algebraic(this.carrierSquare))
  } else {
    // ✅ Real board restoration using saved original state
    if (this.originalState) {
      this.game.put(this.originalState, algebraic(this.carrierSquare))
    } else {
      this.game.remove(algebraic(this.carrierSquare))
    }
  }
}
```

#### 4. UpdateDeploySessionAction

```typescript
execute(): void {
  // ✅ Check game's current deploy session
  const currentDeploySession = this.game.getDeployState()
  if (currentDeploySession) {
    this.previousMoveCount = currentDeploySession.movedPieces.length
    currentDeploySession.movedPieces.push({
      piece: this.movedPiece,
      from: this.fromSquare,
      to: this.toSquare,
      captured: this.captured,
    })
  }
}

undo(): void {
  // ✅ Check game's current deploy session
  const currentDeploySession = this.game.getDeployState()
  if (currentDeploySession) {
    currentDeploySession.movedPieces.splice(this.previousMoveCount)
  }
}
```

#### 5. SingleDeployMoveCommand.buildActions()

```typescript
buildActions(): void {
  // ... get carrier piece ...

  // ✅ Check game's current deploy session
  const currentDeploySession = this.game.getDeployState()
  if (!carrierPiece && this.context?.isDeployMode && currentDeploySession) {
    if (algebraic(currentDeploySession.stackSquare) === algebraic(this.move.from)) {
      carrierPiece = currentDeploySession.originalPiece
    }
  }

  // ...
}
```

---

## 📊 Test Results

### Before Fix

- **Test**: "Generate deploy moves for (NFT) stack"
- **Status**: ❌ FAILING
- **Error**: "No matching legal move found"
- **Cause**: Ghost Infantry pieces at c2 and d1

### After Fix

- **Test**: "Generate deploy moves for (NFT) stack"
- **Status**: ✅ PASSING
- **Board State**: Clean, no ghost pieces
- **Overall**: 26/29 combined-stack tests passing (89.7%)

---

## 🎓 Critical Lessons

### 1. State Timing Matters

Actions executing in reverse order (undo) must respect the game's state **AT
UNDO TIME**, not at construction time.

```typescript
// Construction time: game._deploySession exists
new PlacePieceAction(game, square, piece, {
  isDeployMode: true,
  deploySession: game._deploySession, // ← Captured here
})

// Undo time: game._deploySession might be null!
// MUST check game.getDeployState(), not context.deploySession
```

### 2. Context vs. Current State

- **Context**: Snapshot of state at one moment in time
- **Current State**: Reality right now
- **Rule**: Always use current state for decision-making

### 3. Undo Order Matters

```typescript
private _undoMove() {
  // 1. Restore game state FIRST
  this._deploySession = old.deploySession  // ← Must happen first!

  // 2. THEN call command undo
  command.undo()  // ← Actions now see correct game state
}
```

### 4. Deep Copy State Snapshots

When saving state for undo, use deep copies to prevent reference mutations:

```typescript
// ❌ WRONG: Shallow copy
this.originalState = original

// ✅ CORRECT: Deep copy
this.originalState = {
  ...original,
  carrying: original.carrying?.map((p) => ({ ...p })),
}
```

### 5. Virtual State Overlay

Virtual state acts as an overlay on the real board. If not properly cleared
during undo, it corrupts all subsequent board reads.

---

## ⚠️ Remaining Issues

### 3 Tests Still Failing

All failures are related to **multi-move deploy sequences**:

1. ❌ "Execute Tank deploy move after Air Force deploy"
2. ❌ "Execute Carrier move after all deployments"
3. ❌ "check deploy state after all deploy moves"

**Root Cause**: Different issue - carrier piece being removed instead of
deploying piece. Not related to context staleness.

---

## 📝 Files Modified

All changes in `/src/move-apply.ts`:

- `RemovePieceAction` (lines 41-81): Added deep copy, check `getDeployState()`
- `PlacePieceAction` (lines 99-159): Added deep copy, check `getDeployState()`
- `RemoveFromStackAction` (lines 181-374): Save original state, check
  `getDeployState()`
- `UpdateDeploySessionAction` (lines 439-466): Check `getDeployState()`
- `SingleDeployMoveCommand.buildActions()` (lines 588-601): Check
  `getDeployState()`

---

## ✅ Success Metrics

- **Tests Fixed**: +1 critical test ("Generate deploy moves for (NFT) stack")
- **Pass Rate**: 89.7% (26/29 tests)
- **Ghost Pieces**: ✅ Eliminated
- **Board Corruption**: ✅ Fixed
- **Undo Reliability**: ✅ Improved

---

## 🔗 Related Documentation

- `/CRITICAL_UNDO_BUG_FIX.md` - Original undo bug investigation
- `/SESSION_STATUS.md` - Current session status and remaining work
- `/docs/context/DEPLOY-CRITICAL-LEARNINGS.md` - All deploy system critical bugs

---

## 🎯 Action Items for Future Developers

**Before modifying atomic actions:**

1. ✅ **ALWAYS** check `this.game.getDeployState()` for current state
2. ❌ **NEVER** rely on `this.context.deploySession` for decision-making
3. ✅ **ALWAYS** use deep copies when saving piece state
4. ✅ **ALWAYS** verify undo restores both virtual AND real board correctly
5. ✅ **ALWAYS** test with Move constructor (verbose mode) to catch undo bugs

---

**This bug fix is CRITICAL for the stability of the deploy system. All future
deploy-related changes must respect the principle of checking current game
state, not stale context references.**
