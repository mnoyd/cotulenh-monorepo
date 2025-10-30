# App State Management Issues - FEN-Based Deploy State

## ❌ Critical Issues Found

The app's state management is **NOT ready** for FEN-based deploy state. It has multiple anti-patterns that conflict with the new architecture.

---

## Issues in `routes/+page.svelte`

### 1. **Manual Deploy Session Manipulation** ❌

**Lines: 222, 293-296, 344-346**

```typescript
// ❌ WRONG: Directly mutating board state
boardApi.state.deploySession = undefined;
```

**Problem:** The app manually clears `deploySession` from the board state. This breaks the FEN-based approach where deploy state is derived from FEN, not managed locally.

**Solution:** Remove all direct manipulation. The board should derive `deploySession` from FEN automatically when `boardApi.set({ fen: ... })` is called.

---

### 2. **Checking Board Deploy State Instead of Core** ❌

**Line: 209**

```typescript
if (hasNonDeployMoves && boardApi?.state.deploySession) {
  // ...
}
```

**Problem:** Checking `boardApi.state.deploySession` to determine if deployment is active. The board's deploy state should be read-only, derived from FEN.

**Solution:** Check `game.getDeploySession()` instead:

```typescript
if (hasNonDeployMoves && game.getDeploySession()) {
  // ...
}
```

---

### 3. **Not Relying on FEN Updates** ⚠️

**Lines: 156-260 (handleDeployStep)**

The function manually manages turn switching and board state instead of trusting the FEN from core.

**Current flow:**

```
Deploy step → Core updates → Manual board manipulation
```

**Should be:**

```
Deploy step → Core updates → FEN changes → Reactive update triggers → Board auto-updates
```

---

### 4. **Reactive Update Should Work** ✅ (but needs cleanup)

**Lines: 416-423**

```typescript
$: if (boardApi && $gameStore.fen) {
  isUpdatingBoard = true;
  reSetupBoard(); // This passes FEN to board
  setTimeout(() => {
    isUpdatingBoard = false;
  }, 0);
}
```

This reactive statement is **correct** - it will automatically update the board when `$gameStore.fen` changes. However:

- The manual deploy session clearing in other functions conflicts with this
- The `handleDeployStep` function does too much manual work

---

## Issues in `lib/stores/game.ts`

### 5. **Using Legacy Deploy State** ❌

**Lines: 47, 66, 79**

```typescript
deployState: game['_deployState'];
```

**Problem:** Accessing private `_deployState` (legacy) instead of the new `DeploySession`.

**Solution:** Use the public API:

```typescript
deployState: game.getDeploySession()?.toLegacyDeployState() ?? null;
```

Or better, remove `deployState` from the store entirely since it's now in the FEN.

---

## Required Changes

### **1. Remove Manual Deploy Session Manipulation**

**File:** `routes/+page.svelte`

**Delete all lines that manually set `boardApi.state.deploySession`:**

- Line 222
- Lines 293-296
- Lines 344-346

The board will automatically derive deploy state from FEN.

---

### **2. Simplify `handleDeployStep`**

**File:** `routes/+page.svelte`, lines 156-260

**Current code does too much:**

- Manually checks if deployment is complete
- Manually clears board state
- Manually switches turns

**Simplified version:**

```typescript
function handleDeployStep(move: SingleDeployMove, metadata: DeployStepMetadata) {
  if (!game) return;

  try {
    // Convert board piece type to core piece type
    const coreType = roleToType(move.piece.role);

    // Send move to core
    const result = game.move({
      from: move.from,
      to: move.to,
      piece: coreType,
      deploy: true
    });

    if (!result) {
      console.error('Deploy move rejected by core');
      return;
    }

    // Update game store with new FEN
    // The reactive statement will update the board automatically
    gameStore.applyMove(game, result);
  } catch (error) {
    console.error('Deploy step failed:', error);
    reSetupBoard();
  }
}
```

**Why this works:**

1. Core updates its `DeploySession`
2. Core's `fen()` returns extended FEN with DEPLOY marker
3. `gameStore.applyMove()` updates `$gameStore.fen`
4. Reactive statement (line 416) triggers
5. `reSetupBoard()` passes new FEN to board
6. Board's `config.ts` parses deploy state from FEN
7. Board renders highlights automatically

---

### **3. Simplify `commitDeploy`**

**File:** `routes/+page.svelte`, lines 265-327

**Remove manual board state manipulation:**

```typescript
function commitDeploy() {
  if (!game) return;

  try {
    game.commitDeploySession();

    // Update store with new FEN (without DEPLOY marker)
    gameStore.initialize(game);

    // Reactive update will handle the rest
  } catch (error) {
    console.error('Failed to commit deploy session:', error);
    alert(`Cannot finish deployment: ${error.message}`);
  }
}
```

---

### **4. Simplify `cancelDeploy`**

**File:** `routes/+page.svelte`, lines 332-365

**Remove manual board state manipulation:**

```typescript
function cancelDeploy() {
  if (!game) return;

  try {
    game.cancelDeploySession();

    // Update store with restored FEN
    gameStore.initialize(game);

    // Reactive update will handle the rest
  } catch (error) {
    console.error('Failed to cancel deploy:', error);
    alert(`Error cancelling deployment: ${error.message}`);
  }
}
```

---

### **5. Update Game Store**

**File:** `lib/stores/game.ts`

**Option A: Keep `deployState` but use public API**

```typescript
// Line 47, 66, 79
deployState: game.getDeploySession()?.toLegacyDeployState() ?? null;
```

**Option B: Remove `deployState` entirely** (Recommended)

```typescript
// Remove deployState from GameState interface
// Remove it from initialize() and applyMove() functions
// Components that need it should call game.getDeploySession() directly
```

---

## Correct Data Flow

### **Before (Current - Broken)**

```
Deploy step → Core updates
                  ↓
          Manual board.state.deploySession = undefined
                  ↓
          Manual turn switching
                  ↓
          Manual board.set()
```

### **After (FEN-Based - Correct)**

```
Deploy step → Core updates DeploySession
                  ↓
          Core.fen() returns extended FEN with DEPLOY marker
                  ↓
          gameStore updates with new FEN
                  ↓
          Reactive statement triggers
                  ↓
          reSetupBoard() passes FEN to board
                  ↓
          Board.config parses deploy state from FEN
                  ↓
          Board renders highlights automatically
```

---

## Testing Checklist

After making changes, verify:

1. **Start deployment**

   - Move a piece from a stack
   - Check FEN contains `DEPLOY c3:Nc5...`
   - Origin square shows gold highlight
   - Destination square shows green highlight

2. **Continue deployment**

   - Move another piece
   - Check FEN updates to `DEPLOY c3:Nc5,Fd4...`
   - Both destinations highlighted

3. **Commit deployment**

   - Click "Finish Deployment"
   - FEN should NOT contain `DEPLOY`
   - Turn should switch
   - No highlights for old deploy session

4. **Cancel deployment**

   - Start a deploy
   - Click "Cancel"
   - FEN should revert
   - Board should restore

5. **Undo/Redo** (if implemented)
   - Deploy moves should be in history
   - Undoing should restore previous FEN with DEPLOY marker

---

## Summary

**Current State:** ❌ NOT READY

- Manual state manipulation
- Conflicting state sources
- Bypassing FEN-based updates

**Required Work:** ~4 hours

- Remove all `boardApi.state.deploySession` mutations
- Simplify event handlers to trust FEN updates
- Update game store to use public API
- Test all deploy scenarios

**Complexity:** Medium

- Changes are straightforward deletions
- Reactive system already in place
- Main risk is ensuring reactive updates trigger correctly
