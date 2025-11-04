# Recombine System Integration Guide

**Target:** `apps/cotulenh-app` and `packages/cotulenh-board`  
**Date:** November 5, 2025

---

## 🎯 **Integration Overview**

The new recombine instruction system adds these APIs to `cotulenh-core`:

- ✅ `game.recombine(from, to, piece)` - Queue recombine instruction
- ✅ `game.getRecombineOptions(square)` - Get available recombine options
- ✅ `game.undoRecombineInstruction()` - Undo last recombine
- ✅ `game.canCommitDeploy()` - Preview commit status
- ✅ `game.resetDeploySession()` - Reset entire session
- ✅ `game.commitDeploySession()` - Now returns `CommitResult` (not boolean)

---

## 📦 **Current Integration State**

### **Board Package (`cotulenh-board`)**

**Already Has:**

- ✅ Deploy session state tracking in `state.deploySession`
- ✅ Visual highlighting for origin/destination squares
- ✅ FEN parsing with deploy state (`readWithDeployState()`)
- ✅ Rendering logic for deploy visualization

**State Structure:**

```typescript
// src/state.ts (lines 86-94)
deploySession?: {
  originSquare: cg.Key;
  deployedMoves: Array<{
    piece: string;
    to: cg.Key;
    capture: boolean;
  }>;
  isComplete: boolean;
}
```

**Needs Update:**

- 🔄 Add recombine instructions to state
- 🔄 Visual feedback for recombine options
- 🔄 Handle recombine in drag/drop logic

### **App Package (`cotulenh-app`)**

**Already Has:**

- ✅ `DeployControls.svelte` - UI for commit/cancel
- ✅ Deploy session awareness
- ✅ Commit/cancel handlers

**Needs Update:**

- 🔄 Add `RecombinePanel.svelte` component
- 🔄 Update commit logic to handle `CommitResult`
- 🔄 Add visual feedback for recombine options

---

## 🔧 **Step-by-Step Integration**

### **Phase 1: Update Board Package** (`cotulenh-board`)

#### **1.1 Enhance State Interface**

**File:** `packages/cotulenh-board/src/state.ts`

```typescript
deploySession?: {
  originSquare: cg.Key;
  deployedMoves: Array<{
    piece: string;
    to: cg.Key;
    capture: boolean;
  }>;
  isComplete: boolean;

  // 🆕 ADD THIS:
  recombineInstructions?: Array<{
    piece: string;
    target: cg.Key;
  }>;
  recombineOptions?: Array<{
    piece: string;
    targetSquare: cg.Key;
    isSafe: boolean;
  }>;
}
```

#### **1.2 Update FEN Parsing** (Optional)

If you want recombine state persisted in FEN:

**File:** `packages/cotulenh-board/src/fen.ts`

```typescript
// Parse extended FEN format: "base-fen DEPLOY c3:Nc5,Fd4... RECOMBINE F->c5,T->d4"
function readWithDeployState(fen: string): ParsedFEN {
  // Existing deploy parsing...

  // 🆕 ADD: Parse recombine instructions
  const recombineMatch = fen.match(/RECOMBINE\s+([^\s]+)/)
  if (recombineMatch) {
    const recombines = recombineMatch[1].split(',').map((r) => {
      const [piece, target] = r.split('->')
      return { piece, target }
    })
    deployState.recombineInstructions = recombines
  }

  return { pieces, deployState }
}
```

#### **1.3 Add Recombine Visual Classes**

**File:** `packages/cotulenh-board/src/render.ts`

```typescript
// Add to computeSquareClasses()
if (s.deploySession?.recombineOptions) {
  for (const option of s.deploySession.recombineOptions) {
    if (option.isSafe) {
      addSquare(squares, option.targetSquare, 'recombine-available')
    } else {
      addSquare(squares, option.targetSquare, 'recombine-unsafe')
    }
  }
}
```

**File:** `packages/cotulenh-board/assets/commander-chess.base.css`

```css
/* 🆕 ADD: Recombine option highlights */
.cg-wrap square.recombine-available {
  background-image: radial-gradient(
    circle,
    rgba(255, 215, 0, 0.5) 25%,
    transparent 50%
  );
  animation: recombine-pulse 2s ease-in-out infinite;
}

.cg-wrap square.recombine-unsafe {
  background-image: radial-gradient(
    circle,
    rgba(255, 100, 100, 0.4) 25%,
    transparent 50%
  );
}

@keyframes recombine-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
```

---

### **Phase 2: Update App Package** (`cotulenh-app`)

#### **2.1 Create Recombine Panel Component**

**File:** `apps/cotulenh-app/src/lib/components/RecombinePanel.svelte`

```svelte
<script lang="ts">
  import type { CoTuLenh } from '@repo/cotulenh-core';
  import type { RecombineOption } from '@repo/cotulenh-core/src/deploy-session';

  export let game: CoTuLenh | null;
  export let onRecombine: (piece: string, target: string) => void;

  $: deploySession = game?.getDeploySession();
  $: remainingPieces = deploySession?.getRemainingPieces();

  // Get recombine options for the stack square
  $: recombineOptions = deploySession && remainingPieces
    ? game?.getRecombineOptions(deploySession.stackSquare) || []
    : [];

  function handleRecombine(option: RecombineOption) {
    const from = deploySession?.stackSquare;
    if (!from) return;

    onRecombine(option.piece.type, option.targetSquare);
  }
</script>

{#if recombineOptions.length > 0}
  <div class="recombine-panel">
    <div class="panel-header">
      <h3>🔄 Recombine Options</h3>
      <p class="hint">Rejoin pieces that were deployed</p>
    </div>

    <div class="options-list">
      {#each recombineOptions as option}
        <button
          class="recombine-option"
          class:safe={option.isSafe}
          class:unsafe={!option.isSafe}
          on:click={() => handleRecombine(option)}
          title={option.isSafe ? 'Safe recombine' : 'Commander would be exposed'}
        >
          <span class="piece-type">{option.piece.type.toUpperCase()}</span>
          <span class="arrow">→</span>
          <span class="target">{algebraic(option.targetSquare)}</span>
          {#if !option.isSafe}
            <span class="warning">⚠️</span>
          {/if}
        </button>
      {/each}
    </div>

    <button
      class="undo-recombine"
      on:click={() => game?.undoRecombineInstruction()}
      title="Undo last recombine"
    >
      ↩️ Undo Last Recombine
    </button>
  </div>
{/if}

<style>
  .recombine-panel {
    padding: 1rem;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 180, 0, 0.1));
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 0.75rem;
    margin: 1rem 0;
  }

  .panel-header h3 {
    margin: 0 0 0.5rem 0;
    color: #ffa500;
    font-size: 1.2rem;
  }

  .hint {
    margin: 0;
    font-size: 0.9rem;
    color: #888;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .recombine-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 2px solid #ddd;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .recombine-option.safe {
    border-color: #4caf50;
  }

  .recombine-option.unsafe {
    border-color: #ff9800;
    opacity: 0.7;
  }

  .recombine-option:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .piece-type {
    font-weight: bold;
    font-size: 1.1rem;
    color: #333;
  }

  .arrow {
    color: #999;
  }

  .target {
    font-weight: 600;
    color: #4a9eff;
  }

  .warning {
    margin-left: auto;
  }

  .undo-recombine {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    background: #f5f5f5;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .undo-recombine:hover {
    background: #e5e5e5;
  }
</style>
```

#### **2.2 Update Commit Handler**

**File:** `apps/cotulenh-app/src/routes/+page.svelte` (or wherever commit is
handled)

```typescript
// 🔄 UPDATE: Handle new CommitResult type
function handleCommitDeploy() {
  if (!game) return

  // 🆕 Preview commit status
  const preview = game.canCommitDeploy()
  if (!preview.canCommit) {
    // Show warning to user
    alert(`Cannot commit: ${preview.reason}\n${preview.suggestion || ''}`)
    return
  }

  // 🆕 Commit returns CommitResult now (not boolean)
  const result = game.commitDeploySession()

  if (result.success) {
    // Success - update board
    updateBoard()
  } else {
    // Failed - show feedback
    alert(`Commit failed: ${result.reason}\n${result.suggestion || ''}`)
  }
}

// 🆕 ADD: Handle recombine
function handleRecombine(piece: string, target: string) {
  if (!game) return

  try {
    const success = game.recombine(stackSquare, target, piece)
    if (success) {
      // Update board to show queued recombines
      updateBoard()

      // Update recombine options display
      refreshRecombineOptions()
    }
  } catch (error) {
    alert(`Recombine failed: ${error.message}`)
  }
}

// 🆕 ADD: Refresh recombine options after each move
function onPieceMoved() {
  // Existing logic...

  // Update recombine options
  refreshRecombineOptions()
}

function refreshRecombineOptions() {
  const session = game?.getDeploySession()
  if (!session) return

  const options = game.getRecombineOptions(session.stackSquare)

  // Update board state with options (for visual highlights)
  boardApi.set({
    deploySession: {
      ...existingDeploySession,
      recombineOptions: options.map((opt) => ({
        piece: opt.piece.type,
        targetSquare: algebraic(opt.targetSquare),
        isSafe: opt.isSafe,
      })),
    },
  })
}
```

#### **2.3 Update DeployControls**

**File:** `apps/cotulenh-app/src/lib/components/DeployControls.svelte`

```svelte
<script lang="ts">
  import type { CoTuLenh } from '@repo/cotulenh-core';

  export let game: CoTuLenh | null;
  export let onCommit: () => void;
  export let onCancel: () => void;

  $: deploySession = game?.getDeploySession();
  $: hasSession = deploySession !== null;

  // 🆕 UPDATE: Use canCommitDeploy() instead of canCommit()
  $: commitStatus = game?.canCommitDeploy() ?? { canCommit: false };
  $: canCommit = commitStatus.canCommit;
  $: commitMessage = canCommit
    ? 'Finish deployment'
    : commitStatus.reason || 'Deploy at least one piece first';
</script>

{#if hasSession}
  <div class="deploy-controls">
    <div class="deploy-info">
      <h3>🚀 Deploying Pieces</h3>
      <p class="hint">Move remaining pieces or finish deployment</p>

      <!-- 🆕 ADD: Show warnings -->
      {#if !canCommit && commitStatus.suggestion}
        <p class="warning">💡 {commitStatus.suggestion}</p>
      {/if}
    </div>

    <div class="deploy-buttons">
      <button
        class="btn-finish"
        on:click={onCommit}
        disabled={!canCommit}
        title={commitMessage}
      >
        ✓ Finish Deployment
      </button>

      <button
        class="btn-cancel"
        on:click={onCancel}
        title="Cancel and restore board"
      >
        ✕ Cancel
      </button>
    </div>
  </div>
{/if}

<style>
  /* Existing styles... */

  /* 🆕 ADD: Warning style */
  .warning {
    margin: 0.5rem 0 0 0;
    padding: 0.5rem;
    background: rgba(255, 152, 0, 0.1);
    border-left: 3px solid #ff9800;
    font-size: 0.85rem;
    color: #666;
    border-radius: 0.25rem;
  }
</style>
```

#### **2.4 Add to Main Page**

**File:** `apps/cotulenh-app/src/routes/+page.svelte`

```svelte
<script lang="ts">
  import DeployControls from '$lib/components/DeployControls.svelte';
  import RecombinePanel from '$lib/components/RecombinePanel.svelte'; // 🆕 ADD

  // ... existing code ...
</script>

<!-- ... existing UI ... -->

{#if game}
  <DeployControls
    {game}
    onCommit={handleCommitDeploy}
    onCancel={handleCancelDeploy}
  />

  <!-- 🆕 ADD: Recombine panel -->
  <RecombinePanel
    {game}
    onRecombine={handleRecombine}
  />
{/if}
```

---

## 🎨 **Visual Design Recommendations**

### **Recombine Options Highlighting**

1. **Gold pulse** on squares where pieces can recombine (safe)
2. **Orange pulse** on squares with Commander safety warnings
3. **Badge/icon** on deployed pieces showing they can be recombined with
4. **Tooltip** on hover showing: "Click to recombine [piece] here"

### **UI Flow**

```
1. User starts deploy session (stack click)
   ↓
2. Deploy pieces one by one
   ↓
3. After each deploy, recombine options appear
   ↓
4. User can click recombine options OR deploy more
   ↓
5. Commit button shows status (green = ready, gray = not ready)
   ↓
6. User clicks commit → Success or feedback message
```

---

## 📝 **Testing Integration**

### **Manual Testing Checklist**

- [ ] Deploy a piece, see recombine options appear
- [ ] Click recombine option, see instruction queued
- [ ] Undo recombine, see option reappear
- [ ] Try to commit with pieces unaccounted for, see error
- [ ] Recombine all pieces, commit succeeds
- [ ] Commander safety: Can't recombine to attacked square
- [ ] Visual feedback: Gold highlights on recombine squares
- [ ] Cancel deploy, all recombines cleared

---

## 🚀 **Quick Start Summary**

**Minimum Integration (5 steps):**

1. **Add `RecombinePanel.svelte`** component
2. **Update commit handler** to use `CommitResult`
3. **Add recombine handler** that calls `game.recombine()`
4. **Update board state** with recombine options
5. **Add CSS** for recombine highlights

**That's it!** The rest is optional enhancements.

---

## 📚 **API Reference**

### **Core APIs**

```typescript
// Queue recombine instruction
game.recombine(from: string, to: string, piece: string): boolean

// Get available options (filtered for safety)
game.getRecombineOptions(square: string): RecombineOption[]

// Preview commit (without committing)
game.canCommitDeploy(): { canCommit: boolean, reason?: string, suggestion?: string }

// Commit session (now returns result object)
game.commitDeploySession(): { success: boolean, reason?: string, suggestion?: string }

// Undo last recombine instruction
game.undoRecombineInstruction(): void

// Reset entire deploy session
game.resetDeploySession(): void
```

### **Types**

```typescript
interface RecombineOption {
  piece: Piece
  targetSquare: number
  targetPiece: Piece
  resultPiece: Piece
  isSafe: boolean
}

interface CommitResult {
  success: boolean
  reason?: string
  suggestion?: string
}

interface CommitValidation {
  canCommit: boolean
  reason?: string
  suggestion?: string
}
```

---

## 🎯 **Next Steps**

1. ✅ **Read this guide**
2. 🔄 **Implement Phase 1** (Board package updates)
3. 🔄 **Implement Phase 2** (App package updates)
4. ✅ **Test thoroughly**
5. ✅ **Enjoy the new recombine system!**

---

**Questions?** Refer to:

- `docs/RECOMBINE-REDESIGN.md` - Complete design
- `docs/RECOMBINE-SUMMARY.md` - Quick reference
- `docs/RECOMBINE-IMPLEMENTATION-STATUS.md` - Current status
- `__tests__/recombine-instruction.test.ts` - Usage examples

**Last Updated:** November 5, 2025  
**Status:** Ready for Integration 🚀
