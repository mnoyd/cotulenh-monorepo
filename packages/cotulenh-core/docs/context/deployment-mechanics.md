# Deployment Mechanics

> ## 🎯 ARCHITECTURE UPDATE (October 22, 2025)
>
> **Current Architecture**: Action-Based Deploy System  
> **Location**: `docs/deploy-action-based-architecture/`
>
> **Read First**:
>
> - `docs/ARCHITECTURE-MIGRATION.md` - Complete architecture evolution
> - `docs/deploy-action-based-architecture/FINAL-STATUS.md` - Current status
> - `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md` -
>   Specification
>
> **Historical Context Below**: This document describes the virtual state
> implementation. See ARCHITECTURE-MIGRATION.md for why we moved to action-based
> approach.

> ⚠️ **HISTORICAL**: Read
> [DEPLOY-CRITICAL-LEARNINGS.md](./DEPLOY-CRITICAL-LEARNINGS.md) for virtual
> state bugs fixed during Phase 3 implementation (now superseded).

---

## Overview (Game Rules - Unchanged)

CoTuLenh's deployment system allows stacked pieces to be separated and deployed
to different squares in a multi-phase process. This creates strategic depth by
enabling complex piece positioning and tactical flexibility.

**Current Architecture (Action-Based)**:

- Single API: `move()` with `deploy` flag
- Deploy session created lazily on first deploy move
- Actions tracked, not virtual state
- Commit when all pieces deployed or manual commit

**Historical APIs** (Virtual State Implementation):

1. **Incremental API**: `startDeploy()` → `move()` → `move()` →
   `completeDeploy()`
2. **Batch API**: `deployMove(request)` - atomic execution

See `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md` for
current API.

## Deploy State Management

### Current Architecture: Action-Based Deploy Session

```typescript
class DeploySession {
  stackSquare: Square // Where deployment started
  turn: Color // Who is deploying
  originalPiece: Piece // Original stack (for reference)
  actions: InternalMove[] // ← KEY: Actions taken, not state
  startFEN: string // FEN before deploy started

  // Calculate remaining on-demand
  getRemainingPieces(): Piece | null {
    let remaining = this.originalPiece
    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        remaining = removePieceFromStack(remaining, move.piece) || null
      }
    }
    return remaining
  }
}
```

**Key Principles**:

- **Board IS the state** - no virtual overlay
- **Actions tracked** - for remaining piece calculation
- **Command pattern** - for perfect undo/redo
- **Single source of truth** - real board, always correct

### Historical: Virtual State Structure (Deprecated)

<details>
<summary>Click to see legacy virtual state implementation</summary>

```typescript
// DEPRECATED - Virtual State Approach
interface DeploySession {
  virtualChanges: Map<Square, Piece | null> // ❌ No longer used
  movedPieces: Array<{ piece: Piece; from: Square; to: Square }>
  // ... complex dual-state management
}
```

**Why Deprecated**: Context staleness, undo bugs, complexity.  
See `docs/ARCHITECTURE-MIGRATION.md` for complete analysis.

</details>

### Deploy Session Lifecycle

1. **Lazy Creation**: Session created on first deploy move from stack
2. **Active Phase**: Moves accumulate in `actions` array, board updates directly
3. **Completion**: Auto-commit when all pieces moved, or manual commit
4. **Turn Switch**: Occurs only when session commits
5. **Cancellation**: Undo all actions via command pattern

**Detailed Specification**:
`docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`

## MoveContext Flags (Critical for Correctness)

> ⚠️ **MUST READ**: See
> [MoveContext Flags Reference](./DEPLOY-CRITICAL-LEARNINGS.md#-movecontext-flags-reference)

```typescript
interface MoveContext {
  isDeployMode: boolean // Deploy vs normal move
  deploySession?: DeploySession
  preventCommit?: boolean // Batch: don't commit until all moves done
  isTesting?: boolean // Testing: don't mutate persistent state
}
```

### isTesting Flag (Critical!)

**Purpose**: Prevent state mutations during move simulation/validation

**When to use**:

- Move generation (`_filterLegalMoves`)
- Move constructor (creating verbose Move objects)
- Any move simulation that will be undone

**What it prevents**:

```typescript
// InitializeDeploySessionAction
if (context.isTesting) {
  return // Don't create deploy sessions during testing
}

// _checkAndCommitDeploySession
if (isComplete && !context.isTesting) {
  commitDeploySession() // Only commit if NOT testing
}
```

**❌ Common mistake**:

```typescript
// Missing isTesting flag
game._applyMoveWithContext(move, { isDeployMode: true })
// → Creates sessions, commits changes, corrupts state!

// ✅ Correct
game._applyMoveWithContext(move, { isDeployMode: true, isTesting: true })
// → Simulates without side effects
```

### preventCommit Flag

**Purpose**: Accumulate changes in batch mode without committing

**Used in**: Batch deploy wrapper to execute multiple moves atomically

```typescript
for (const move of deployMoves) {
  const context: MoveContext = {
    isDeployMode: true,
    deploySession: session,
    preventCommit: true, // ← Don't commit yet!
    isTesting: false,
  }
  this._applyMoveWithContext(move, context)
}
// All moves accumulated in virtualChanges
this.commitBatchDeploySession(session) // Now commit all at once
```

## Deploy Phase Initiation

### Triggering Deployment

```typescript
// Deploy move triggers deploy state creation
const deployMove = { from: 'c3', to: 'c4', piece: AIR_FORCE, deploy: true }
game.move(deployMove)
```

### Initial Deploy State Creation

```typescript
new SetDeployStateAction(game, {
  stackSquare: move.from, // c3 in 0x88 format
  turn: currentPlayer, // RED or BLUE
  originalPiece: stackAtC3, // Complete (N|FT) stack
  movedPieces: [deployedPiece], // [AIR_FORCE]
  stay: undefined, // No pieces staying yet
})
```

### Deploy State Conditions

- **Stack Required**: Only pieces with `carrying` array can initiate deployment
- **Turn Preservation**: Turn does not change during deployment phase
- **Move Restriction**: Only moves from stack square are legal during deployment

## Piece Deployment Types

### Individual Piece Deployment

```typescript
// Deploy single piece from stack
game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE, deploy: true })

// Result:
// - Air Force moves to c4
// - Navy + Tank remain at c3 as (N|T)
// - Deploy state tracks Air Force as moved
```

### Combined Piece Deployment

```typescript
// Deploy multiple pieces as combined unit
const deployMove: DeployMoveRequest = {
  from: 'c3',
  moves: [
    { piece: { type: AIR_FORCE, color: RED, carrying: [tank] }, to: 'c4' },
  ],
}

// Result:
// - Air Force + Tank move to c4 as (F|T)
// - Navy remains at c3 as (N)
```

### Carrier Deployment

```typescript
// Deploy the carrier piece (moves entire remaining stack)
game.move({ from: 'c3', to: 'a3', piece: NAVY, deploy: true })

// Result:
// - Navy + remaining pieces move to a3
// - Original square c3 becomes empty
// - Deploy state terminates, turn switches
```

## Deploy Move Generation and Validation

### Move Generation During Deployment

```typescript
function generateDeployMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const deployState = gameInstance.getDeployState()
  const carrierPiece =
    deployState?.originalPiece || gameInstance.get(stackSquare)

  // Generate moves for remaining pieces in stack
  // Exclude already moved pieces
  // Include carrier move options
}
```

### Legal Move Filtering

```typescript
// During deploy phase, only moves from stack square are legal
if (deployState && deployState.turn === us) {
  allMoves = generateDeployMoves(this, deployState.stackSquare, filterPiece)
} else {
  allMoves = generateNormalMoves(this, us, filterPiece, filterSquare)
}
```

### Validation Rules

1. **Stack Square Only**: Moves must originate from deploy state stack square
2. **Remaining Pieces**: Only pieces not yet moved can be deployed
3. **Terrain Compatibility**: Deployed pieces must satisfy terrain requirements
4. **Capture Validation**: Deploy moves can capture enemy pieces

### Terrain Restrictions (Critical!)

> ⚠️ **UNDOCUMENTED BEHAVIOR**: Navy can ONLY be placed on water squares!

**Valid Navy squares** (NAVY_MASK):

- `a1-a11` (a-file) ✅
- `b1-b11` (b-file) ✅
- `c6-c7` (river banks) ✅
- `d6-d7, e6-e7` (river banks) ✅

**Invalid Navy squares**:

- `c1-c5, c8-c11` (land) ❌
- `d-k` files (most of board) ❌

**Critical for testing**:

```typescript
// ❌ WRONG - These return false!
game.put({ type: NAVY, ... }, 'e5') // Land square
game.put({ type: NAVY, ... }, 'd4') // Land square
game.put({ type: NAVY, ... }, 'h1') // Land square

// ✅ CORRECT - These work
game.put({ type: NAVY, ... }, 'a3') // Water square
game.put({ type: NAVY, ... }, 'b5') // Water square
game.put({ type: NAVY, ... }, 'c6') // River

// Always check return value!
const success = game.put(piece, square)
if (!success) {
  throw new Error(`Invalid placement: ${piece.type} at ${square}`)
}
```

See
[Navy Terrain Restrictions](./DEPLOY-CRITICAL-LEARNINGS.md#-navy-terrain-restrictions-undocumented)
for full details.

## Deploy State Transitions

### State Update Logic

```typescript
class SetDeployStateAction {
  execute(): void {
    if (this.oldDeployState) {
      const updatedMovedPiece = [
        ...this.oldDeployState.movedPieces,
        ...(this.newDeployState.movedPieces ?? []),
      ]

      const originalLen = flattenPiece(this.oldDeployState.originalPiece).length

      // Check if all pieces are accounted for
      if (
        updatedMovedPiece.length + (this.oldDeployState.stay?.length ?? 0) ===
        originalLen
      ) {
        this.game.setDeployState(null) // Terminate deployment
        this.game['_turn'] = swapColor(this.oldDeployState.turn) // Switch turn
        return
      }

      // Update deploy state with new moved pieces
      this.game.setDeployState({
        stackSquare: this.oldDeployState.stackSquare,
        turn: this.oldDeployState.turn,
        originalPiece: this.oldDeployState.originalPiece,
        movedPieces: updatedMovedPiece,
        stay: this.oldDeployState.stay,
      })
    }
  }
}
```

### Termination Conditions

1. **All Pieces Moved**: Sum of moved pieces + staying pieces equals original
   stack size
2. **Carrier Moved**: When carrier piece is deployed, deployment ends
   immediately
3. **Manual Termination**: Complete deploy move specifies all piece destinations

## Turn Management During Deployment

### Turn Preservation

- **No Turn Change**: Turn remains with deploying player during active
  deployment
- **Move Restriction**: Only deploying player can make moves during deployment
- **Opponent Waiting**: Opponent cannot move until deployment phase ends

### Turn Switch Triggers

```typescript
// Turn switches when deployment terminates
if (allPiecesAccountedFor) {
  this.game.setDeployState(null)
  this.game['_turn'] = swapColor(deployState.turn)
}
```

### Turn Switch Examples

```typescript
// Example 1: All pieces deployed individually
game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE, deploy: true }) // Turn: RED
game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true }) // Turn: RED
game.move({ from: 'c3', to: 'a3', piece: NAVY, deploy: true }) // Turn: BLUE (switched)

// Example 2: Carrier move ends deployment immediately
game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE, deploy: true }) // Turn: RED
game.move({ from: 'c3', to: 'a3', piece: NAVY, deploy: true }) // Turn: BLUE (switched)
```

## Deploy Move Types and Mechanics

### Normal Deploy Move

```typescript
// Single piece deployment with movement
{ from: 'c3', to: 'c4', piece: AIR_FORCE, deploy: true }

// Mechanics:
// 1. Remove Air Force from stack at c3
// 2. Place Air Force at c4
// 3. Update deploy state with moved piece
// 4. Generate moves for remaining pieces
```

### Deploy Capture Move

```typescript
// Deploy move that captures enemy piece
{ from: 'c3', to: 'c4', piece: TANK, deploy: true }  // Enemy at c4

// Mechanics:
// 1. Remove Tank from stack at c3
// 2. Capture enemy piece at c4
// 3. Place Tank at c4
// 4. Update deploy state and captured pieces
```

### Deploy Stay Capture

```typescript
// Deploy piece captures without moving (stay capture)
{ from: 'c3', to: 'c3', piece: ARTILLERY, deploy: true, stayCapture: true }

// Mechanics:
// 1. Artillery captures target without moving
// 2. Target piece destroyed
// 3. Artillery remains in stack at c3
// 4. Deploy state updated
```

### Deploy Suicide Capture

```typescript
// Air Force performs kamikaze attack during deployment
{ from: 'c3', to: 'b7', piece: AIR_FORCE, deploy: true, suicide: true }

// Mechanics:
// 1. Remove Air Force from stack at c3
// 2. Both Air Force and target destroyed
// 3. No piece placed at b7
// 4. Deploy state updated
```

## Complex Deployment Scenarios

### Multi-Piece Deploy Move

```typescript
const deployMove: DeployMoveRequest = {
  from: 'c3',
  moves: [
    { piece: { type: TANK, color: RED }, to: 'd3' },
    { piece: { type: AIR_FORCE, color: RED }, to: 'c6' },
    { piece: { type: NAVY, color: RED }, to: 'a3' },
  ],
}

// Executes all deployments atomically
// Turn switches after complete deployment
```

### Partial Deployment with Stay

```typescript
const deployMove: DeployMoveRequest = {
  from: 'c3',
  moves: [{ piece: { type: NAVY, color: RED }, to: 'a3' }],
  stay: { type: AIR_FORCE, color: RED, carrying: [{ type: TANK, color: RED }] },
}

// Navy moves to a3
// Air Force + Tank remain at c3 as (F|T)
// Turn switches after deployment
```

### Nested Stack Deployment

```typescript
// Deploy combined pieces maintaining internal structure
const deployMove: DeployMoveRequest = {
  from: 'c3',
  moves: [
    {
      piece: {
        type: AIR_FORCE,
        color: RED,
        carrying: [{ type: TANK, color: RED }],
      },
      to: 'c4',
    },
    { piece: { type: NAVY, color: RED }, to: 'a3' },
  ],
}

// Air Force + Tank move to c4 as (F|T)
// Navy moves to a3 as (N)
```

## Deploy State Validation and Error Handling

### Validation Checks

```typescript
// Ensure all pieces are accounted for
if (allPieces.length !== flattenPiece(originalPiece).length) {
  throw new Error(
    'Deploy move error: ambiguous deploy move. some pieces are not clear whether moved or stay',
  )
}

// Validate piece combinations
const { combined, uncombined } = createCombineStackFromPieces(pieces)
if (!combined || (uncombined?.length ?? 0) > 0) {
  throw new Error('Deploy move error: stay piece not valid')
}

// Validate moves against legal moves
if (foundMove.length !== toSquareNumDests.length) {
  throw new Error('Deploy move error: move not found')
}
```

### Error Conditions

1. **Ambiguous Deployment**: Not all pieces specified as moved or staying
2. **Invalid Combinations**: Pieces cannot form valid stacks
3. **Illegal Moves**: Requested moves not in legal move list
4. **Terrain Violations**: Pieces cannot exist on target terrain

### Recovery and Undo

```typescript
// Deploy state is fully reversible
class SetDeployStateAction {
  undo(): void {
    this.game.setDeployState(this.oldDeployState)
    if (this.oldDeployState) {
      this.game['_turn'] = this.oldDeployState.turn
    }
  }
}
```

## Integration with Game Systems

### Move History

```typescript
// Deploy moves recorded in history
const historyEntry: History = {
  move: deployMove,
  turn: preState.turn,
  commanders: preState.commanders,
  halfMoves: preState.halfMoves,
  moveNumber: preState.moveNumber,
  deployState: preState.deployState, // Previous deploy state preserved
}
```

### FEN Representation

```typescript
// Deploy state not directly encoded in FEN
// Reconstructed from game context during play
// FEN shows current board position during deployment
```

### SAN Notation

```typescript
// Individual deploy moves
'F>c4' // Air Force deploys to c4
'T>xd3' // Tank deploys and captures at d3
'F>@b7' // Air Force suicide capture at b7

// Complex deploy moves
'T>d3,F>c6,N>a3' // Multi-piece deployment
'(FT)<N>a3' // Navy moves, Air Force+Tank stay
```

## Performance and Optimization

### Deploy State Efficiency

- **Minimal State**: Only essential information stored
- **Lazy Evaluation**: Move generation on demand
- **State Caching**: Deploy state preserved across moves

### Move Generation Optimization

- **Filtered Generation**: Only generate moves for remaining pieces
- **Early Termination**: Stop when deployment complete
- **Cache Invalidation**: Clear caches when deploy state changes

### Memory Management

- **State Cloning**: Deep copy for undo operations
- **Garbage Collection**: Clean up completed deploy states
- **Reference Management**: Avoid circular references in piece structures
