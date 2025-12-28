# Deploy State Visualization Plan

## Current State Analysis

### What Core Returns via FEN

When a deploy session is active, the core returns an **Extended FEN** format:

```
base-fen DEPLOY origin:moves...
```

**Example:**

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1 DEPLOY c3:Nc5,F(EI)xd4,Te5...
```

#### FEN Components:

1. **Base FEN**: Standard board position before deploy started
2. **DEPLOY marker**: Indicates active deployment
3. **Origin square**: Where the stack deployment started (e.g., `c3`)
4. **Move list**: Comma-separated deploy moves already executed
   - Format: `PieceType(Carrying)?Capture?Destination`
   - Examples:
     - `Nc5` - Navy moved to c5
     - `F(EI)xd4` - Air Force carrying Engineer+Infantry captured at d4
     - `Te5` - Tank moved to e5
5. **Completion marker**: `...` at end means deployment incomplete

### What Core Provides via DeploySession

The `DeploySession` class (in `deploy-session.ts`) tracks:

```typescript
{
  stackSquare: number,           // Origin square (0x88 format)
  turn: Color,                   // Which player is deploying
  originalPiece: Piece,          // Original stack before deployment
  commands: CTLMoveCommandInteface[], // Executed move commands
  startFEN: string,              // FEN before deployment started
  stayPieces?: Piece[]          // Pieces marked to stay at origin
}
```

**Key Methods:**

- `getRemainingPieces()`: Returns pieces still at origin
- `getDeployedSquares()`: Returns all destination squares
- `isComplete()`: Check if all pieces accounted for
- `canCommit()`: Check if session can be committed
- `toExtendedFEN()`: Generate the extended FEN format

### What Board Currently Receives

The board's `readWithDeployState()` function (in `fen.ts`) parses extended FEN into:

```typescript
{
  pieces: Map&lt;Key, Piece&gt;,      // Board state
  deployState?: {
    originSquare: Key,          // e.g., "c3"
    moves: Array&lt;{
      piece: string,            // e.g., "N", "F(EI)"
      to: Key,                  // Destination square
      capture: boolean          // Whether it captured
    }&gt;,
    isComplete: boolean         // false if ends with "..."
  }
}
```

This is stored in `state.deploySession` (in `state.ts`).

---

## Visualization Requirements

### 1. Origin Square Highlighting

- **What**: Highlight the square where deployment started
- **Visual**: Distinct border/background color (e.g., yellow glow)
- **Purpose**: Show player where the stack is being deployed from

### 2. Deployed Pieces Trail

- **What**: Show all squares where pieces have been deployed
- **Visual**:
  - Numbered markers (1, 2, 3...) showing deployment order
  - Different color for captures vs normal moves
  - Arrow/line connecting origin to each destination
- **Purpose**: Show the deployment sequence visually

### 3. Remaining Pieces Indicator

- **What**: Show what pieces are still at the origin square
- **Visual**:
  - Badge/overlay on origin square
  - List of remaining piece types
  - Update dynamically as pieces deploy
- **Purpose**: Help player see what's left to deploy

### 4. Valid Deploy Destinations

- **What**: Highlight valid squares for next deploy move
- **Visual**: Standard move destination highlights
- **Purpose**: Guide player on legal moves
- **Note**: Already handled by `state.movable.dests`

### 5. Deploy Progress Indicator

- **What**: Show completion status
- **Visual**:
  - Progress bar or fraction (e.g., "3/5 pieces deployed")
  - "Complete" vs "Incomplete" badge
- **Purpose**: Show player how close they are to finishing

### 6. Deploy Mode Banner

- **What**: Clear indication that deploy mode is active
- **Visual**:
  - Banner at top/bottom: "Deploying from c3"
  - Commit/Cancel buttons (already exists in DeployControls)
- **Purpose**: Prevent confusion about game state

---

## Implementation Plan

### Phase 1: Parse Deploy State from FEN (Already Done)

**Status**: Complete

- `fen.ts` already parses extended FEN
- `config.ts` already updates `state.deploySession`
- Reactive updates in `+page.svelte` already handle FEN changes

### Phase 2: Add Visual Highlighting System

**Files to Modify:**

1. `packages/cotulenh-board/src/render.ts`
2. `packages/cotulenh-board/src/state.ts`
3. `packages/cotulenh-board/src/board.ts`

**New CSS Classes Needed:**

```css
.deploy-origin {
  /* Yellow glow for origin square */
}
.deploy-destination {
  /* Blue highlight for deployed squares */
}
.deploy-destination-capture {
  /* Red highlight for captures */
}
.deploy-trail {
  /* Arrow/line connecting moves */
}
.deploy-sequence-marker {
  /* Numbered badges */
}
```

### Phase 3: Add Deploy Progress UI Component

**New Component:** `apps/cotulenh-app/src/lib/components/DeployProgress.svelte`

### Phase 4: Enhance Game Store with Deploy Info

**File:** `apps/cotulenh-app/src/lib/stores/game.ts`

Add computed properties for deploy visualization.

### Phase 5: Add Configuration Options

**File:** `packages/cotulenh-board/src/api.ts`

Add configuration for deploy visualization.

---

## Summary

The core already provides all necessary data via extended FEN format. The board already parses this data. We need to:

1. Add visual rendering for deploy highlights (origin, trail, sequence)
2. Create UI components to show deploy progress
3. Add configuration options for customization
4. Ensure reactive updates work smoothly

All data flows from core to board via FEN, maintaining clean separation of concerns.
