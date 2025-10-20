# Critical Undo Bug Fix - Virtual State Context Staleness

**Date**: October 20, 2025, 11:16 PM  
**Bug**: Board state corruption after undoing deploy moves during move testing
**Status**: ✅ FIXED

---

## 🐛 The Bug

When creating Move objects with verbose information, the Move constructor
executes moves to generate "after" FEN, then undos them. For deploy moves, this
was leaving ghost pieces on the board:

```typescript
// Test generates moves
const moves = game.moves({ verbose: true, square: 'c1' })

// After this line, board is corrupted:
// c2 has Infantry (should be empty)
// d1 has Infantry (should be empty)

// Later move execution fails
game.move({ from: 'c1', to: 'c2', piece: TANK, deploy: true })
// Error: No matching legal move found (because c2 appears occupied!)
```

---

## 🔍 Root Cause

The problem was in how atomic actions determined whether to use virtual state or
real board during undo:

### Original (Broken) Logic

```typescript
class PlacePieceAction {
  constructor(..., private context?: MoveContext) {}

  undo(): void {
    // ❌ WRONG: Checks stale context
    if (this.context?.isDeployMode && this.context.deploySession) {
      // Use virtual state restoration
      this.context.deploySession.virtualChanges.delete(square)
    } else {
      // Use real board restoration
      this.game.remove(square)
    }
  }
}
```

### The Problem

1. Move constructor executes a deploy move with `isTesting=true`
2. A deploy session is created: `context.deploySession = {...}`
3. Actions are constructed with this context
4. Actions execute, modifying virtual state
5. **Move is pushed to history** with the command and its actions
6. Move constructor calls `_undoMove()`
7. **`_undoMove()` restores `game._deploySession = null`**
8. **But actions' `context.deploySession` still points to old session!**
9. Actions check `this.context.deploySession` → still truthy!
10. Actions use virtual state restoration (wrong!)
11. Virtual changes persist, corrupting board reads

---

## ✅ The Fix

Actions must check the GAME's CURRENT deploy session, not their stale context:

### Fixed Logic

```typescript
class PlacePieceAction {
  undo(): void {
    // ✅ CORRECT: Check game's current state
    const currentDeploySession = this.game.getDeployState()
    const shouldUseVirtualState =
      this.context?.isDeployMode && currentDeploySession

    if (shouldUseVirtualState) {
      // Use virtual state restoration
      currentDeploySession!.virtualChanges.delete(square)
    } else {
      // Use real board restoration
      this.game.remove(square)
    }
  }
}
```

### Why This Works

1. Move constructor executes deploy move
2. Deploy session created
3. Actions execute with context
4. Move pushed to history
5. `_undoMove()` called
6. **`_undoMove()` first restores `game._deploySession = null`**
7. **Then calls `command.undo()`**
8. Actions call `this.game.getDeployState()` → returns `null`!
9. Actions use real board restoration ✅
10. Board correctly restored ✅

---

## 🔧 Files Modified

### 1. `src/move-apply.ts` - PlacePieceAction

**Before:**

```typescript
undo(): void {
  if (this.context?.isDeployMode && this.context.deploySession) {
    // Virtual state
    if (this.existingPiece) {
      this.context.deploySession.virtualChanges.set(square, this.existingPiece)
    } else {
      this.context.deploySession.virtualChanges.delete(square)
    }
  } else {
    // Real board
    if (this.existingPiece) {
      this.game.put(this.existingPiece, square)
    } else {
      this.game.remove(square)
    }
  }
}
```

**After:**

```typescript
undo(): void {
  const currentDeploySession = this.game.getDeployState()
  const shouldUseVirtualState = this.context?.isDeployMode && currentDeploySession

  if (shouldUseVirtualState) {
    // Virtual state
    if (this.existingPiece) {
      currentDeploySession!.virtualChanges.set(square, this.existingPiece)
    } else {
      currentDeploySession!.virtualChanges.delete(square)
    }
  } else {
    // Real board
    if (this.existingPiece) {
      this.game.put(this.existingPiece, square)
    } else {
      this.game.remove(square)
    }
  }
}
```

### 2. `src/move-apply.ts` - RemoveFromStackAction

**Before:**

```typescript
undo(): void {
  const hasActiveVirtualChanges =
    this.context?.isDeployMode &&
    this.context.deploySession &&
    this.context.deploySession.virtualChanges.has(square)

  if (hasActiveVirtualChanges) {
    this.context!.deploySession!.virtualChanges.delete(square)
  } else {
    this.game.put(this.originalState, square)
  }
}
```

**After:**

```typescript
undo(): void {
  const currentDeploySession = this.game.getDeployState()
  const hasActiveVirtualChanges =
    this.context?.isDeployMode &&
    currentDeploySession &&
    currentDeploySession.virtualChanges.has(square)

  if (hasActiveVirtualChanges) {
    currentDeploySession!.virtualChanges.delete(square)
  } else {
    this.game.put(this.originalState, square)
  }
}
```

### 3. `src/move-apply.ts` - RemoveFromStackAction Constructor (Bonus Fix)

Also added deep copy to prevent reference mutations:

```typescript
constructor(...) {
  const original = this.game.get(this.carrierSquare)
  if (original) {
    // Deep copy to avoid mutations
    this.originalState = {
      ...original,
      carrying: original.carrying?.map(p => ({...p}))
    }
  } else {
    this.originalState = undefined
  }
}
```

---

## 🎓 Key Lessons

1. **State Timing Matters**: Actions executing in reverse order (undo) must
   respect the game's state AT UNDO TIME, not at construction time.

2. **Context vs. Current State**: Context captures state at one moment; current
   state reflects reality now. Always use current state for decision-making.

3. **Undo Order Matters**: `_undoMove()` must restore game state BEFORE calling
   `command.undo()` so actions see the correct state.

4. **Deep Copy for State Snapshots**: When saving state for undo, use deep
   copies to prevent reference mutations.

5. **Virtual State Overlay**: Virtual state acts as an overlay on the real
   board. If not properly cleared, it corrupts all board reads.

---

## 🧪 Test Case

```typescript
it('Generate deploy moves for (NFT) stack', () => {
  game.load('7c3/11/11/11/11/11/11/11/11/11/11/2(TI)3C4 r - - 0 1')

  // Generate moves creates Move objects with verbose info
  const moves = game.moves({ verbose: true, square: 'c1' })

  // Board should be clean here - only Tank+Infantry at c1
  expect(game.get('c1')?.type).toBe(TANK)
  expect(game.get('c1')?.carrying).toHaveLength(1)
  expect(game.get('c2')).toBeUndefined() // ✅ Now passes!
  expect(game.get('d1')).toBeUndefined() // ✅ Now passes!

  // Should be able to execute deploy move
  const moveResult = game.move({
    from: 'c1',
    to: 'c2',
    piece: TANK,
    deploy: true,
  })

  expect(moveResult).not.toBeNull() // ✅ Now passes!
})
```

---

## 📊 Impact

- **Fixed**: Deploy move execution after verbose move generation
- **Fixed**: Board state corruption from stale virtual state
- **Fixed**: "No matching legal move found" errors for valid deploy moves
- **Impact**: All Move constructor testing now properly cleans up state

---

## ⚠️ Other Actions to Check

The same pattern should be applied to ALL actions that check
`context.deploySession`:

- ✅ PlacePieceAction
- ✅ RemoveFromStackAction
- ⚠️ RemovePieceAction (check needed)
- ⚠️ UpdateDeploySessionAction (check needed)
- ⚠️ SetDeployStateAction (check needed)
- ⚠️ Other actions with deploy session logic

---

## 🔄 Related Issues

- Original deploy session state management (fixed earlier)
- Virtual state undo after `commitDeploySession()` (fixed earlier)
- This fix: Virtual state undo during testing/simulation

All three were variations of the same core issue: managing virtual state
lifecycle correctly.
