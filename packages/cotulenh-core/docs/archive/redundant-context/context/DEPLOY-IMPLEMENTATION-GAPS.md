# Deploy Move Implementation Gaps Analysis

**Last Updated**: October 21, 2025  
**Status**: Research Complete - Implementation Needed  
**Priority**: HIGH - Critical features missing

---

## Executive Summary

This document identifies critical gaps between the **current deploy move
implementation** and the **desired behavior** as documented in:

- `deployment-mechanics.md`
- `deploy-session-state-management.md` (legacy approaches)
- `deploy-session-ui-engine-api.md` (legacy approaches)
- `virtual-deploy-state-architecture.md` (legacy approaches)

**Key Finding**: Current implementation handles basic deploy functionality but
lacks **critical features** and **architectural improvements** that are
documented in specifications.

---

## 🔴 Critical Gap 1: Recombine Moves (MISSING FEATURE)

### Desired Behavior

When pieces are deployed from a stack, remaining pieces should be able to
**rejoin already-deployed pieces** if they are within movement range.

**From `deploy-session-ui-engine-api.md` lines 62-119:**

```typescript
// Engine should auto-generate recombine moves
{
  type: 'deploy-recombine',
  piece: 'tank',
  from: 'e5',  // Original stack square
  to: 'b5'     // Square where piece already deployed
}
```

**Example Scenario:**

```
Initial: Stack at e5: Navy(N) + [Air Force(F), Tank(T)]

Step 1: Navy deploys to e7 (2 squares away)
  e5: [F, T] remaining
  e7: N deployed

Step 2: Tank should be able to move to e7 (recombine with Navy)
  - Tank range: 2 squares
  - Distance e5→e7: 2 squares
  - ✅ Within range! Should generate recombine move
```

### Current Implementation

**Location**: `move-generation.ts:585-649`

```typescript
export function generateDeployMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
  filterPiece?: PieceSymbol,
): InternalMove[] {
  // Only generates moves to NEW squares
  for (const deployMoveCandidate of deployMoveCandidates) {
    const deployMoves = generateMovesForPiece(
      gameInstance,
      stackSquare,
      deployMoveCandidate,
      true,
    )
    deployMoves.forEach((m) => {
      m.flags |= BITS.DEPLOY
      moves.push(m)
    })
  }

  // ❌ NO recombine logic - pieces cannot rejoin deployed stacks
  return moves
}
```

### Impact

- **Major tactical limitation**: Pieces cannot regroup during deployment
- **UI cannot show recombine options** to players
- **Breaks expected game behavior** documented in specs
- **Reduces strategic depth** of deployment system

### Fix Required

Add recombine move generation in `generateDeployMoves()`:

```typescript
// After generating normal deploy moves, add recombine options
if (deployState) {
  for (const deployed of deployState.movedPieces) {
    // Check if remaining pieces can reach deployed squares
    const canReach = canPieceReach(piece, stackSquare, deployed.to)
    if (canReach) {
      moves.push({
        type: 'deploy-recombine',
        piece,
        from: stackSquare,
        to: deployed.to,
        flags: BITS.DEPLOY | BITS.COMBINATION,
      })
    }
  }
}
```

---

## 🔴 Critical Gap 2: Intermediate State Validation (MISSING)

### Desired Behavior

After each piece deploys from a stack, validate that **remaining pieces can
legally exist on the stack square's terrain**.

**From `deploy-session-state-management.md` lines 106-168:**

```typescript
makeDeployStep(move: DeployStepMove): UndoInfo {
  // Calculate what remains after this move
  const remaining = this.deploySession!.remaining.filter(
    (p) => p !== move.piece,
  )

  // CRITICAL: Validate remaining stack is legal for terrain
  if (remaining.length > 0) {
    const isValid = this.validateStackForTerrain(stackSquare, remaining)

    if (!isValid) {
      throw new Error(
        `Invalid deploy: Remaining pieces cannot stay at ${stackSquare}`
      )
    }
  }
}
```

**Validation Matrix:**

| Terrain Type           | Can Stay             |
| ---------------------- | -------------------- |
| Pure Water (a-b files) | Navy, Air Force ONLY |
| Mixed (c-file, river)  | All pieces           |
| Pure Land (d-k files)  | All except Navy      |

### Current Implementation

**Location**: `move-apply.ts:310-383`

```typescript
export class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    // Removes piece from stack
    this.actions.push(
      new RemoveFromStackAction(this.game, this.move.from, this.move.piece),
    )

    // Places at destination
    this.actions.push(new PlacePieceAction(this.game, destSq, this.move.piece))

    // ❌ NO validation of remaining stack terrain compatibility!
  }
}
```

### Impact - GAME BREAKING BUG

**Critical Bug Example:**

```typescript
// Stack at b3 (WATER): Navy + [Air Force, Tank]
// User deploys Navy to b5
// Remaining at b3: [Air Force, Tank]
// ❌ ILLEGAL! Tank cannot exist on water!
// ✅ Current code ALLOWS this invalid state!
```

This violates fundamental game rules documented in `terrain-zones-masks.md`.

### Fix Required

Add validation in `SingleDeployMoveCommand.buildActions()`:

```typescript
protected buildActions(): void {
  // Before removing piece, validate remaining stack
  const remaining = this.getRemainingPieces(this.move.from, this.move.piece)

  if (remaining.length > 0) {
    const terrain = getTerrainType(this.move.from)
    for (const piece of remaining) {
      if (!canAccessTerrain(piece.type, terrain)) {
        throw new Error(
          `Invalid deploy: ${piece.type} cannot stay on ${terrain} terrain at ${algebraic(this.move.from)}`
        )
      }
    }
  }

  // Now safe to remove piece
  this.actions.push(
    new RemoveFromStackAction(this.game, this.move.from, this.move.piece)
  )
  // ... rest of actions
}
```

---

## 🟡 High Priority Gap 3: Virtual State Architecture

### Desired Behavior

Deploy session should use **virtual state overlay** where changes are stored in
memory without mutating the real board until deployment completes.

**From `virtual-deploy-state-architecture.md` lines 30-68:**

```typescript
class DeploySession {
  // Virtual board changes (not committed to real board)
  virtualChanges: Map<Square, Piece | null>

  getEffectivePiece(board: Board, square: Square): Piece | null {
    if (this.virtualChanges.has(square)) {
      return this.virtualChanges.get(square)! // Virtual overlay
    }
    return board.get(square) // Real board
  }
}
```

**Benefits:**

- Real board unchanged during deploy
- Atomic commit only when complete
- Easy rollback on errors
- Unified code path for normal and deploy moves

### Current Implementation

**Location**: `move-apply.ts:310-383`

```typescript
export class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    // Directly mutates board during deploy
    this.actions.push(new RemovePieceAction(this.game, this.move.from))
    this.actions.push(new PlacePieceAction(this.game, this.move.to, piece))
  }
}
```

Board is **mutated incrementally** during deployment, not stored in virtual
overlay.

### Impact

- Higher undo complexity
- Harder to validate intermediate states
- More fragile state management
- Cannot easily rollback partial deployments
- Duplicate code paths for normal vs deploy moves

### Fix Required (Major Refactor)

1. Add `virtualChanges: Map<Square, Piece | null>` to `DeployState`
2. Modify atomic actions to check deploy mode:

```typescript
execute(): void {
  if (context.isDeployMode && currentSession) {
    // Store in virtual state
    currentSession.virtualChanges.set(square, piece)
  } else {
    // Mutate real board
    this.game.put(piece, square)
  }
}
```

3. Commit virtual changes atomically when deploy completes

---

## 🟡 Medium Priority Gap 4: Extended FEN Format

### Desired Behavior

FEN should serialize deploy state with `DEPLOY` marker to enable save/load
mid-deployment.

**From `deploy-session-state-management.md` lines 61-96:**

```
Normal FEN:
"...base_fen... r - - 0 1"

During deploy session:
"...base_fen... r - - 0 1 DEPLOY e5:NT 2"
                             ^^^^^^^^
                             square:remaining_pieces moves_made
```

### Current Implementation

**Location**: `cotulenh.ts:306-350`

```typescript
fen(): string {
  // ... generates base FEN ...

  return [
    fen,
    this._turn,
    castling,
    epSquare,
    this._halfMoves,
    this._moveNumber,
  ].join(' ')

  // ❌ Deploy state NOT serialized
}
```

### Impact

- Cannot save game during active deployment
- Cannot share positions with partial deployments
- Round-trip serialization broken for deploy states
- FEN export incomplete

### Fix Required

```typescript
fen(): string {
  const baseFEN = this.generateBaseFEN()

  if (!this._deployState) {
    return baseFEN
  }

  // Serialize deploy session
  const remaining = this.getRemainingPieces(this._deployState)
  const deployMarker = `DEPLOY ${algebraic(this._deployState.stackSquare)}:${serializePieces(remaining)} ${this._deployState.movedPieces.length}`

  return `${baseFEN} ${deployMarker}`
}
```

---

## 🟡 Medium Priority Gap 5: Transaction History

### Desired Behavior

Complete deployment should be stored as **single history entry**, not multiple
individual moves.

**From `deploy-session-state-management.md` lines 370-503:**

```typescript
// Main history structure
;[
  { move: 'Ie5', fen: '...' }, // Normal move
  { move: 'Nd4', fen: '...' }, // Normal move
  {
    // Deploy move (COMPLETE)
    move: {
      type: 'deploy-complete',
      transaction: {
        startFEN: '...',
        deployMoves: [
          { move: 'Fe5->d7' },
          { move: 'Ne5->b5' },
          { move: 'Te5->d5' },
        ],
        isComplete: true,
      },
    },
  },
]
```

### Current Implementation

**Location**: `cotulenh.ts:691-699`

```typescript
const historyEntry: History = {
  move: moveCommand, // Each deploy step is separate entry
  commanders: preCommanderState,
  turn: preTurn,
  halfMoves: preHalfMoves,
  moveNumber: preMoveNumber,
  deployState: preDeployState,
}
this._history.push(historyEntry) // ❌ Individual entries
```

### Impact

- History clutter (3 moves instead of 1 for deploy)
- Undo complexity (must undo 3 times vs once)
- SAN representation fragmented
- Game history harder to analyze

### Fix Required

Store deploy moves in temporary transaction, add to main history only on
completion.

---

## 📊 Gap Summary Matrix

| Feature                 | Desired                    | Current Status     | Severity    | Lines of Code Impact |
| ----------------------- | -------------------------- | ------------------ | ----------- | -------------------- |
| Recombine Moves         | Auto-generated by engine   | Not implemented    | 🔴 CRITICAL | ~100 lines           |
| Intermediate Validation | Terrain check each step    | No validation      | 🔴 CRITICAL | ~50 lines            |
| Virtual State           | Atomic commit after deploy | Real board mutated | 🟡 HIGH     | ~300 lines           |
| Extended FEN            | DEPLOY marker              | Base FEN only      | 🟡 MEDIUM   | ~100 lines           |
| Transaction History     | Single deploy entry        | Multiple entries   | 🟡 MEDIUM   | ~150 lines           |
| Stay Move Type          | Explicit move type         | Implicit via field | 🟢 LOW      | ~50 lines            |

**Total Estimated Work**: ~750 lines of code changes + tests

---

## 🎯 Implementation Priority

### Tier 1: Critical (Fix Immediately)

1. **Intermediate State Validation** (Gap 2)

   - Prevents game-breaking terrain violations
   - Estimated: 2-3 days
   - Files: `move-apply.ts`, add validation helpers

2. **Recombine Move Generation** (Gap 1)
   - Core missing feature affecting gameplay
   - Estimated: 3-4 days
   - Files: `move-generation.ts`, `deploy-move.ts`

### Tier 2: High Priority (Next Sprint)

3. **Virtual State Architecture** (Gap 3)

   - Architectural improvement for robustness
   - Estimated: 1 week
   - Files: Major refactor of `move-apply.ts`, `cotulenh.ts`

4. **Extended FEN Format** (Gap 4)
   - Enable save/load mid-deployment
   - Estimated: 3-4 days
   - Files: `cotulenh.ts` FEN generation/parsing

### Tier 3: Medium Priority (Future Enhancement)

5. **Transaction History** (Gap 5)
   - UX improvement for history management
   - Estimated: 4-5 days
   - Files: `cotulenh.ts` history methods

---

## 🧪 Test Cases to Verify Gaps

### Test 1: Navy Moves First (Currently Fails)

```typescript
game.load('11/11/11/11/11/11/11/11/(NFT)10/11/11/11 r - - 0 1')
game.move({ from: 'a3', to: 'a5', piece: 'n', deploy: true })
// ❌ Current: Succeeds (WRONG!)
// ✅ Should: Throw "Tank+AirForce cannot stay on water"
```

### Test 2: Recombine Move (Currently Missing)

```typescript
game.load('11/11/11/11/11/11/11/11/(NFT)10/11/11/11 r - - 0 1')
game.move({ from: 'a3', to: 'a5', piece: 'f', deploy: true })
const moves = game.moves({ square: 'a3' })
// ❌ Current: No recombine move to 'a5'
// ✅ Should: Include deploy-recombine move for Tank to a5 (if in range)
```

### Test 3: FEN Serialization (Currently Incomplete)

```typescript
game.load('11/11/11/11/11/11/11/11/(NFT)10/11/11/11 r - - 0 1')
game.move({ from: 'a3', to: 'c4', piece: 'f', deploy: true })
const fen = game.fen()
// ❌ Current: "... r - - 0 1" (no deploy marker)
// ✅ Should: "... r - - 0 1 DEPLOY a3:NT 1"
```

---

## 📚 Related Documentation

**Implementation Specs:**

- `deployment-mechanics.md` - Current deploy specification
- `DEPLOY-CRITICAL-LEARNINGS.md` - Bug fixes and production insights

**Legacy Design Docs (Desired Behavior):**

- `deploy-session-state-management.md` - Complete solution architecture
- `deploy-session-ui-engine-api.md` - UI integration patterns
- `virtual-deploy-state-architecture.md` - Virtual state approach

**Reference:**

- `stack-splitting-movement.md` - Stack split algorithms
- `move-generation.ts` - Current move generation code
- `move-apply.ts` - Current move execution code

---

## Next Steps

1. **Review this document** with team to prioritize gaps
2. **Create implementation tasks** for Tier 1 critical fixes
3. **Write comprehensive tests** for each gap before fixing
4. **Refactor incrementally** - fix critical bugs first, then architecture
5. **Update documentation** as gaps are closed

**Status**: Ready for implementation planning
