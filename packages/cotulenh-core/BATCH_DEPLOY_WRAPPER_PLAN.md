# Batch Deploy Wrapper Implementation Plan

## 🎯 Objective

Rewrite the old batch deployment system to wrap around the new virtual state
implementation, maintaining backward compatibility while leveraging the robust
new infrastructure.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Legacy API Layer                         │
│  deployMove(request) → DeployMove                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 Batch Deploy Wrapper                       │
│  • BatchDeploySession management                           │
│  • Controlled turn switching                               │
│  • Atomic batch commits                                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              New Virtual State System                      │
│  • Individual deploy moves                                 │
│  • Virtual state management                                │
│  • Atomic commits per session                              │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Implementation Steps

### Step 1: Create BatchDeploySession Class

```typescript
interface BatchDeploySession extends DeploySession {
  // Batch-specific properties
  batchId: string
  totalMovesPlanned: number
  movesExecuted: number
  preventTurnSwitch: boolean
  batchStartTurn: Color

  // Batch move tracking
  batchMoves: Array<{
    piece: Piece
    from: Square
    to: Square
    captured?: Piece
  }>
}

class BatchDeployManager {
  private activeBatchSession: BatchDeploySession | null = null

  startBatchSession(
    from: Square,
    originalPiece: Piece,
    plannedMoves: number,
  ): BatchDeploySession
  executeBatchMove(
    moveRequest: DeployMoveRequest,
    session: BatchDeploySession,
  ): void
  commitBatchSession(session: BatchDeploySession): void
  rollbackBatchSession(session: BatchDeploySession): void
}
```

### Step 2: Rewrite deployMove() Method

```typescript
// NEW deployMove implementation
deployMove(deployMoveRequest: DeployMoveRequest): DeployMove {
  const originalPiece = this.get(deployMoveRequest.from)
  if (!originalPiece) {
    throw new Error('Deploy move error: original piece not found')
  }

  // Calculate total moves for batch tracking
  const totalMoves = deployMoveRequest.moves.length

  // Start batch deploy session
  const batchSession = this.batchDeployManager.startBatchSession(
    deployMoveRequest.from,
    originalPiece,
    totalMoves
  )

  try {
    // Execute each individual move within the batch context
    for (const moveRequest of deployMoveRequest.moves) {
      this.executeSingleDeployMoveInBatch(moveRequest, batchSession)
    }

    // Handle staying pieces if specified
    if (deployMoveRequest.stay) {
      this.handleStayingPiecesInBatch(deployMoveRequest.stay, batchSession)
    }

    // Commit the entire batch atomically
    this.batchDeployManager.commitBatchSession(batchSession)

    // Create result object for return
    const deployMove = new DeployMove(this, this.createBatchResult(batchSession))

    return deployMove

  } catch (error) {
    // Rollback entire batch on any error
    this.batchDeployManager.rollbackBatchSession(batchSession)
    throw error
  }
}
```

### Step 3: Update Individual Move Execution

```typescript
private executeSingleDeployMoveInBatch(
  moveRequest: { piece: Piece; to: Square; capture?: boolean },
  batchSession: BatchDeploySession
): void {
  // Create individual deploy move
  const internalMove: InternalMove = {
    color: this._turn,
    from: SQUARE_MAP[batchSession.stackSquare],
    to: SQUARE_MAP[moveRequest.to],
    piece: moveRequest.piece,
    flags: BITS.DEPLOY | (moveRequest.capture ? BITS.CAPTURE : 0)
  }

  // Create batch-aware context
  const batchContext: MoveContext = {
    isDeployMode: true,
    deploySession: batchSession,
    isBatchMode: true,        // NEW FLAG
    preventTurnSwitch: true,  // NEW FLAG
    isTesting: false
  }

  // Execute using existing virtual state system
  this._applyMoveWithContext(internalMove, batchContext)

  // Track in batch session
  batchSession.batchMoves.push({
    piece: moveRequest.piece,
    from: algebraic(batchSession.stackSquare),
    to: moveRequest.to,
    captured: internalMove.captured
  })

  batchSession.movesExecuted++
}
```

### Step 4: Prevent Automatic Turn Switching

```typescript
// Update MoveContext interface
export interface MoveContext {
  isDeployMode: boolean
  deploySession?: DeploySession
  isCompleteDeployment?: boolean
  isTesting?: boolean
  isBatchMode?: boolean        // NEW
  preventTurnSwitch?: boolean  // NEW
}

// Update _checkAndCommitDeploySession
private _checkAndCommitDeploySession(context: MoveContext): boolean {
  // ... existing logic ...

  if (isComplete && !context.isTesting && !context.preventTurnSwitch) {
    // Only commit and switch turns if not in batch mode
    this.commitDeploySession(context.deploySession)
    return true
  }

  return false
}
```

### Step 5: Update Move Generation to Avoid Conflicts

```typescript
// Update createInternalDeployMove to avoid triggering virtual state
export function createInternalDeployMove(
  originalPiece: Piece,
  deployMove: DeployMoveRequest,
  validMoves: InternalMove[],
): InternalDeployMove {
  // Remove the call to game._moves() that triggers virtual state
  // Use pre-computed validMoves instead

  // ... rest of the logic remains the same ...
}

// Update deployMove to pass pre-computed moves
deployMove(deployMoveRequest: DeployMoveRequest): DeployMove {
  // Get valid moves WITHOUT triggering virtual state
  const validMoves = this._generateMovesForValidation(deployMoveRequest.from)

  // ... rest of batch deploy logic ...
}

private _generateMovesForValidation(square: Square): InternalMove[] {
  // Generate moves in read-only mode without triggering deploy sessions
  const readOnlyContext: MoveContext = {
    isDeployMode: false,
    isTesting: true,
    isReadOnly: true  // NEW FLAG
  }

  return this._moves({ square, legal: false, context: readOnlyContext })
}
```

### Step 6: Fix Move Constructor

```typescript
// Update Move constructor to handle batch deploys
constructor(game: CoTuLenh, internal: InternalMove) {
  // ... existing setup ...

  // Check if this is part of a batch deploy
  const isBatchDeploy = game.isInBatchDeployMode()

  // Generate the FEN for the 'after' key using appropriate context
  const testingContext = game['_createMoveContext'](internal)
  testingContext.isTesting = true
  testingContext.preventTurnSwitch = isBatchDeploy

  game['_applyMoveWithContext'](internal, testingContext)
  this.after = game.fen()
  game['_undoMove']()

  // ... rest of constructor ...
}
```

## 🧪 Testing Strategy

### Phase 1: Unit Tests for Batch Wrapper

```typescript
describe('Batch Deploy Wrapper', () => {
  it('should execute batch deploy without intermediate turn switches', () => {
    // Test that turn only switches at the end
  })

  it('should rollback entire batch on error', () => {
    // Test error handling and rollback
  })

  it('should maintain virtual state isolation during batch', () => {
    // Test that real board is not affected until commit
  })
})
```

### Phase 2: Legacy Test Compatibility

```typescript
describe('Legacy Batch Deploy Tests', () => {
  it('should pass all existing deployMove tests', () => {
    // Run existing test suite against new implementation
  })

  it('should maintain same API and behavior', () => {
    // Verify backward compatibility
  })
})
```

### Phase 3: Integration Tests

```typescript
describe('Batch + Individual Deploy Integration', () => {
  it('should work alongside individual deploy moves', () => {
    // Test mixed usage scenarios
  })

  it('should handle nested deploy scenarios', () => {
    // Test complex deployment patterns
  })
})
```

## 📊 Migration Timeline

### Week 1: Foundation

- [ ] Create `BatchDeploySession` interface
- [ ] Implement `BatchDeployManager` class
- [ ] Add batch-specific flags to `MoveContext`

### Week 2: Core Implementation

- [ ] Rewrite `deployMove()` method
- [ ] Implement `executeSingleDeployMoveInBatch()`
- [ ] Update turn switching logic

### Week 3: Move Generation Fixes

- [ ] Fix `createInternalDeployMove()` conflicts
- [ ] Update `Move` constructor for batch compatibility
- [ ] Implement read-only move generation

### Week 4: Testing & Integration

- [ ] Create comprehensive test suite
- [ ] Fix failing legacy tests
- [ ] Performance testing and optimization

## ✅ Success Criteria

1. **All legacy tests pass** - No breaking changes to existing API
2. **New virtual state tests continue to pass** - Core system remains intact
3. **Performance maintained** - No significant slowdown in batch operations
4. **Clean separation** - Batch wrapper doesn't interfere with individual
   deploys
5. **Error handling** - Robust rollback on failures

## 🎯 Expected Outcome

After implementation:

- ✅ Legacy batch deploy API works unchanged
- ✅ New virtual state system remains robust
- ✅ All tests pass (legacy + new)
- ✅ Clean architecture with clear separation
- ✅ Foundation for future enhancements

This approach provides the best of both worlds: the reliability of the new
virtual state system with the familiar batch deploy interface that existing code
expects.
