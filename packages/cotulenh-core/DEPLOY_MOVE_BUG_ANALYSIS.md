# Deploy Move Bug Analysis - "No matching legal move found"

**Date**: October 20, 2025, 10:20 PM  
**Bug**: `game.move({from: 'c1', to: 'c2', piece: TANK, deploy: true})` fails
with "No matching legal move found"

---

## 🎯 Root Cause Found

**Board state corruption during move generation!**

### The Smoking Gun

When `generateDeployMoves()` is called for Tank during `game.move()` execution:

```
[DEBUG] generateMovesInDirection[array=49]: iteration 1, targetPiece at 162 (c2):
  { type: 'i', color: 'r', heroic: false, carrying: undefined }

[DEBUG] generateMovesInDirection[array=49]: iteration 1, targetPiece at 179 (d1):
  { type: 'i', color: 'r', heroic: false, carrying: undefined }
```

**Squares c2 and d1 have Infantry pieces on them!**

But the test setup only places:

- Tank+Infantry stack at c1
- Red commander at g1
- Blue commander at h12

**The Infantry pieces at c2 and d1 are ghosts from previous move testing!**

---

## 🔍 Investigation Timeline

### Step 1: Move Matching Failed

```
game.move({from: 'c1', to: 'c2', piece: TANK, deploy: true})
→ Error: No matching legal move found
```

### Step 2: Zero Legal Moves Generated

```
[DEBUG] move() Generated 0 legal moves from square c1
```

But the test at line 49 successfully generated 10 moves including Tank deploy
moves!

### Step 3: Deploy Flag Missing

Initial theory: `game.move()` wasn't passing `deploy: true` to `_moves()`.

**Fixed**: Added `...(move.deploy && { deploy: true })` to line 2108.

### Step 4: Still Zero Moves

Even with `deploy: true`, still got 0 moves.

### Step 5: generateDeployMoves Returns Empty

```
[DEBUG] generateDeployMoves: Generated 0 moves for t
[DEBUG] generateDeployMoves: deployMoves array: []
```

### Step 6: addMove() IS Being Called!

```
[DEBUG] generateMovesInDirection: All checks passed! About to add move
[DEBUG] generateMovesInDirection: Calling addMove for t
```

But for different arrays (0, 1, 3) - not array 49 which is the one
`generateDeployMoves` uses!

### Step 7: Array 49 Sees Occupied Squares

When we traced array 49 (the actual array used by `game.move()`):

```
targetPiece at 162 (c2): Infantry  ← SHOULD BE EMPTY!
targetPiece at 179 (d1): Infantry  ← SHOULD BE EMPTY!
```

---

## 🐛 The Bug

### Execution Flow

1. Test line 49: `game.moves({ verbose: true, square: 'c1' })`
2. `_moves()` generates candidate moves
3. `_filterLegalMoves()` tests each move for legality
4. For each move:
   - `_applyMoveWithContext(move, {isTesting: true})`
   - Check if commander is attacked
   - `_undoMove()`
5. **BUG**: After testing Infantry deploy to c2, the undo doesn't properly
   restore the board!
6. Infantry piece left at c2
7. Test line 49 completes, returns Move objects with "after" FEN
8. **Move constructor also executes moves** (lines 123-127) for FEN generation
9. More Infantry pieces scattered around
10. Test line 67: `game.move({deploy: true})` tries to find moves
11. `generateDeployMoves()` sees Infantry at c2, d1 → can't generate normal
    moves
12. Returns 0 moves
13. **Error**: No matching legal move found

---

## 🔧 Previous Fix (Incomplete)

We previously fixed the virtual state undo bug in
`RemoveFromStackAction.undo()`:

```typescript
// OLD BUG
if (this.context?.isDeployMode && this.context.deploySession) {
  // Always tries virtual restoration
  this.context.deploySession.virtualChanges.delete(square)
}

// FIX
const hasActiveVirtualChanges =
  this.context?.deploySession &&
  this.context.deploySession.virtualChanges.has(square)

if (hasActiveVirtualChanges) {
  // Virtual state active
  this.context.deploySession.virtualChanges.delete(square)
} else {
  // Restore real board
  this.game.put(combinedPiece, square)
}
```

**This fixed undoing after `commitDeploySession()`**, but there's another path!

---

## 🎯 The Missing Case

### Scenario: Testing Deploy Moves WITHOUT a Session

When `_filterLegalMoves()` tests deploy moves:

```typescript
const testingContext = {
  isDeployMode: true, // ← Set because it's a deploy move
  deploySession: undefined, // ← NOT set because isTesting: true skips initialization
  isTesting: true,
}

this._applyMoveWithContext(move, testingContext)
```

Then in `RemoveFromStackAction.execute()`:

- `isDeployMode` = true
- `deploySession` = undefined
- Falls to `else` block → **Modifies REAL board!**

Then in `RemoveFromStackAction.undo()`:

- Checks `hasActiveVirtualChanges` = false (no session)
- Should restore real board
- **BUT**: What if the undo doesn't have the correct original state saved?

---

## 💡 The Real Issue

When testing deploy moves, the pieces are being **physically moved on the real
board** instead of using virtual state, and the undo isn't properly restoring
them!

The issue is likely in how `RemoveFromStackAction` saves the original state. Let
me check the constructor:

```typescript
class RemoveFromStackAction {
  private removedPiece: Piece[] | null = null

  execute(): void {
    const carrierAtSquare = this.context?.isDeployMode && this.context.deploySession
      ? this.context.deploySession.virtualChanges.get(square) || this.game.get(square)
      : this.game.get(square)

    // Extract piece to remove
    this.removedPiece = [pieceToRemove]

    // Remove from carrier
    if (deploy mode with session) {
      // Update virtualChanges
    } else {
      // Update real board ← Modifies board!
      this.game.put(newStack, square) or this.game.remove(square)
    }
  }

  undo(): void {
    // Put removedPiece back
    const current = this.game.get(square)  // ← Gets current state
    const restored = [...flattenPiece(current), ...this.removedPiece]
    this.game.put(combined(restored), square)
  }
}
```

**The bug**: When undoing, it gets the CURRENT state (which might already be
wrong) and adds the removed piece back. But if something else modified that
square in between, the restoration is wrong!

---

## ✅ The Fix

We need to save the ORIGINAL complete state in `RemoveFromStackAction`
constructor, not just the removed piece:

```typescript
class RemoveFromStackAction {
  private removedPiece: Piece[] | null = null
  private originalState: Piece | null  // ← NEW!

  constructor(...) {
    // Save original state BEFORE any modifications
    this.originalState = this.game.get(this.carrierSquare)
  }

  undo(): void {
    if (hasActiveVirtualChanges) {
      // Virtual restoration
      this.context.deploySession.virtualChanges.delete(square)
    } else {
      // Real board restoration
      // ✅ Restore ORIGINAL state, not current + removed
      this.game.put(this.originalState, square)
      // or this.game.remove(square) if originalState was null
    }
  }
}
```

---

## 📝 Testing the Fix

After fix, the sequence should be:

1. Test deploys Infantry to c2
2. Board modified: c1 has Tank only, c2 has Infantry
3. Undo called
4. **Restores original**: c1 has Tank+Infantry, c2 is empty ✅
5. Next test starts with clean board ✅
6. `game.move()` sees empty board ✅
7. Generates moves correctly ✅
8. Match found ✅

---

## 🎓 Lessons

1. **State Management**: Actions must save complete original state, not diffs
2. **Testing Side Effects**: Test infrastructure must be completely side-effect
   free
3. **Move Constructor**: Creating Move objects has side effects (executes moves
   for FEN)
4. **Multiple Undo Paths**: Fixed one path (after commit) but missed another
   (during testing)
5. **Board Inspection**: Adding logging to check actual board state revealed the
   corruption

---

**Next Step**: Implement the fix in `RemoveFromStackAction` to save and restore
complete original state.
