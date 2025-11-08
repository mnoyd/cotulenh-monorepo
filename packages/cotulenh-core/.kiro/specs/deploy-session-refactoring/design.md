# Design Document

## Overview

This design refactors the deploy move handling system to consolidate all deploy
session logic into `deploy-session.ts` and simplify the main move processing
flow in `cotulenh.ts`. The key insight is that incremental deploy moves (with
DEPLOY flag) should not be added to history until the entire deployment sequence
is complete. The deploy session will manage the incremental state and return a
result indicating when to commit the full sequence.

## Architecture

### Current Architecture Issues

1. **Split Responsibility**: Deploy session logic is split between
   `DeploySession.handleDeployMove()` in `deploy-session.ts` and `_makeMove()`
   in `cotulenh.ts`
2. **Complex Conditionals**: `_makeMove()` has special-case logic for DEPLOY
   flag moves
3. **Unclear Flow**: It's not obvious when moves are added to history vs. when
   they're just session state
4. **Tight Coupling**: The game class needs to know about deploy session
   internals

### New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CoTuLenh.move()                        │
│  - Validates move                                           │
│  - Detects DEPLOY flag                                      │
│  - Routes to appropriate handler                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ├─── DEPLOY flag? ───┐
                          │                     │
                          NO                   YES
                          │                     │
                          ▼                     ▼
┌──────────────────────────────────┐  ┌─────────────────────────────────┐
│    _makeMove(InternalMove)       │  │  DeploySession.processMove()    │
│  - Execute command                │  │  - Initialize session if needed │
│  - Add to history                 │  │  - Execute command              │
│  - Switch turn                    │  │  - Add to session (not history) │
│  - Increment move count           │  │  - Check if complete            │
│  - Update position counts         │  │  - Auto-commit if complete      │
└──────────────────────────────────┘  └─────────────────────────────────┘
                                                    │
                                                    ▼
                                      ┌─────────────────────────────┐
                                      │  DeploySessionResult        │
                                      │  - isComplete: boolean      │
                                      │  - deployMove?: Internal... │
                                      │  - session?: DeploySession  │
                                      └─────────────────────────────┘
                                                    │
                                      ┌─────────────┴──────────────┐
                                      │                            │
                                  Complete                    Incomplete
                                      │                            │
                                      ▼                            ▼
                        ┌──────────────────────────┐    ┌──────────────────┐
                        │ _makeMove(Internal...    │    │ Return to caller │
                        │   DeployMove)            │    │ (no history add) │
                        │ - Execute batch command  │    └──────────────────┘
                        │ - Add to history         │
                        │ - Switch turn            │
                        │ - Increment move count   │
                        └──────────────────────────┘
```

## Components and Interfaces

### 1. DeploySessionResult Interface

New interface to communicate the result of processing a deploy move:

```typescript
export interface DeploySessionResult {
  isComplete: boolean // Is the deployment sequence finished?
  deployMove?: InternalDeployMove // The complete batch move (if complete)
  session?: DeploySession // The active session (if incomplete)
}
```

### 2. DeploySession.processMove() Method

New static method that handles all deploy move logic:

```typescript
static processMove(
  game: CoTuLenh,
  move: InternalMove,
  moveCommand: CTLMoveCommandInteface
): DeploySessionResult
```

**Responsibilities:**

- Initialize session if this is the first deploy move
- Execute the move command
- Add command to session (not to history)
- Check if all pieces are deployed
- If complete:
  - Apply recombine instructions
  - Create InternalDeployMove from session
  - Clear session state
  - Return result with `isComplete: true` and the InternalDeployMove
- If incomplete:
  - Return result with `isComplete: false` and the active session

### 3. Simplified CoTuLenh.move() Method

Updated to delegate deploy moves:

```typescript
move(move: string | InternalMove, options?: MoveOptions): Move | null {
  // ... validation ...

  const internalMove = /* ... convert to InternalMove ... */
  const moveCommand = createMoveCommand(this, internalMove)

  // Check if this is an incremental deploy move
  if (internalMove.flags & BITS.DEPLOY) {
    const result = DeploySession.processMove(this, internalMove, moveCommand)

    if (result.isComplete && result.deployMove) {
      // Session complete - process the full batch move
      this._makeMove(result.deployMove)
      return new Move(this, result.deployMove)
    } else {
      // Session incomplete - return partial move representation
      return new Move(this, internalMove)
    }
  }

  // Normal move path
  this._makeMove(internalMove)
  return new Move(this, internalMove)
}
```

### 4. Simplified CoTuLenh.\_makeMove() Method

Simplified to only handle complete moves:

```typescript
private _makeMove(move: InternalMove | InternalDeployMove) {
  const us = this.turn()
  const them = swapColor(us)

  // Create and execute command
  const moveCommand = isInternalDeployMove(move)
    ? new DeployMoveCommand(this, move)
    : createMoveCommand(this, move)

  moveCommand.execute()

  // Add to history
  this._history.push({
    move: moveCommand,
    commanders: { ...this._commanders },
    turn: us,
    moveNumber: this._moveNumber,
    positionCounts: new Map(this._positionCounts),
  })

  // Switch turn and increment move count
  this._turn = them
  if (us === BLUE) {
    this._moveNumber++
  }

  // Clear moves cache
  this._movesCache.clear()

  // Update position counts
  this._updatePositionCounts()
}
```

### 5. DeploySession Auto-Commit Logic

Internal method to check if session should auto-commit:

```typescript
private shouldAutoCommit(): boolean {
  const remainingPieces = this.getRemainingPieces()
  return remainingPieces === null // All pieces deployed
}

private createInternalDeployMove(): InternalDeployMove {
  // Apply recombine instructions first
  this.applyRecombines(game)

  // Extract all moves from commands
  const moves = this.getActions()

  // Get remaining pieces (if any)
  const remaining = this.getRemainingPieces()

  return {
    from: this.stackSquare,
    moves: moves,
    stay: remaining || undefined,
  }
}
```

## Data Models

### DeploySessionResult

```typescript
interface DeploySessionResult {
  isComplete: boolean
  deployMove?: InternalDeployMove
  session?: DeploySession
}
```

**Fields:**

- `isComplete`: Boolean indicating if the deployment sequence is finished
- `deployMove`: The complete InternalDeployMove (only present if complete)
- `session`: The active DeploySession (only present if incomplete)

### InternalDeployMove (Existing)

```typescript
type InternalDeployMove = {
  from: number
  moves: InternalMove[]
  stay?: Piece
}
```

No changes to this existing type.

## Error Handling

### Deploy Session Errors

1. **Invalid Source Square**: Throw error if deploy move is not from the stack
   square
2. **No Pieces Remaining**: Throw error if trying to deploy when no pieces
   remain
3. **Recombine Validation**: Throw error if recombine instruction is invalid
4. **Commander Safety**: Throw error if recombine would expose Commander

### Auto-Commit Errors

If auto-commit fails during `processMove()`:

1. Log the error
2. Clear the deploy session
3. Force turn switch to prevent stuck state
4. Return incomplete result to allow manual recovery

```typescript
if (this.shouldAutoCommit()) {
  try {
    const deployMove = this.createInternalDeployMove(game)
    game['_deploySession'] = null
    game['_deployState'] = null
    return {
      isComplete: true,
      deployMove: deployMove,
    }
  } catch (error) {
    console.error('Failed to auto-commit deploy session:', error)
    game['_deploySession'] = null
    game['_deployState'] = null
    game['_turn'] = swapColor(game.turn())
    return {
      isComplete: false,
      session: null,
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. **DeploySession.processMove() Tests**

   - Test session initialization on first deploy move
   - Test command execution and session state updates
   - Test incomplete session returns
   - Test auto-commit detection
   - Test InternalDeployMove creation
   - Test recombine instruction application

2. **CoTuLenh.move() Tests**

   - Test normal move flow (unchanged)
   - Test deploy move delegation
   - Test incomplete deploy move handling
   - Test complete deploy move handling
   - Test that incomplete deploys don't add to history
   - Test that complete deploys add to history once

3. **CoTuLenh.\_makeMove() Tests**
   - Test normal move processing
   - Test InternalDeployMove processing
   - Test history addition
   - Test turn switching
   - Test move count increment

### Integration Tests

1. **Full Deploy Sequence**

   - Deploy multiple pieces incrementally
   - Verify no history entries until complete
   - Verify single history entry after completion
   - Verify turn switches only after completion

2. **Deploy with Recombine**

   - Deploy pieces to multiple squares
   - Add recombine instructions
   - Verify recombines applied at commit time
   - Verify final board state is correct

3. **Deploy Undo**

   - Deploy pieces incrementally
   - Undo individual deploy moves
   - Verify session state updates correctly
   - Complete deployment after undo
   - Verify history is correct

4. **Auto-Commit**
   - Deploy all pieces from a stack
   - Verify auto-commit triggers
   - Verify InternalDeployMove created correctly
   - Verify turn switches automatically

### Backward Compatibility Tests

1. **Existing Test Suite**

   - Run all existing deploy-related tests
   - Verify they pass without modification
   - Update tests that rely on internal implementation details

2. **API Compatibility**
   - Verify `game.move()` API unchanged
   - Verify `game.undo()` works with deploy moves
   - Verify `game.fen()` works during deployment
   - Verify `game.getDeploySession()` still works

## Migration Strategy

### Phase 1: Add New Interfaces (No Breaking Changes)

1. Add `DeploySessionResult` interface to `deploy-session.ts`
2. Add `DeploySession.processMove()` static method
3. Add internal helper methods to `DeploySession`
4. Run existing tests to ensure no breakage

### Phase 2: Update CoTuLenh.move() (Minimal Changes)

1. Update `move()` to detect DEPLOY flag and delegate to
   `DeploySession.processMove()`
2. Handle `DeploySessionResult` and route to `_makeMove()` if complete
3. Run tests to verify behavior unchanged

### Phase 3: Simplify \_makeMove() (Remove Deploy Logic)

1. Remove DEPLOY flag handling from `_makeMove()`
2. Remove `DeploySession.handleDeployMove()` static method (now replaced by
   `processMove()`)
3. Simplify `_makeMove()` to only handle complete moves
4. Run tests to verify behavior unchanged

### Phase 4: Update Tests

1. Update tests that rely on internal implementation details
2. Remove redundant tests
3. Add new tests for `DeploySession.processMove()`
4. Verify full test coverage

### Phase 5: Documentation

1. Update code comments
2. Update API documentation
3. Add migration guide for external users (if any)

## Performance Considerations

### Memory

- **Session State**: Deploy session holds commands in memory during deployment
- **Recombine Instructions**: Small array of instructions, minimal overhead
- **Result Objects**: Temporary objects created per deploy move, garbage
  collected quickly

### CPU

- **No Additional Overhead**: Same number of command executions as before
- **Simplified Conditionals**: Fewer branches in `_makeMove()` improves
  performance
- **Auto-Commit Check**: Simple null check on remaining pieces, O(1) operation

### Optimization Opportunities

1. **Command Pooling**: Reuse command objects if profiling shows allocation
   overhead
2. **Result Caching**: Cache `DeploySessionResult` if same move processed
   multiple times
3. **Lazy Recombine**: Only apply recombines when actually needed (already
   implemented)

## Security Considerations

### Input Validation

- Validate that DEPLOY flag moves come from valid stack squares
- Validate that recombine instructions reference valid pieces and squares
- Validate that auto-commit only triggers when all pieces accounted for

### State Integrity

- Ensure session state cannot be corrupted by invalid moves
- Ensure history is never modified during incomplete deployment
- Ensure turn switching only happens after complete deployment

### Error Recovery

- Graceful handling of auto-commit failures
- Clear session state on errors to prevent stuck states
- Log errors for debugging without exposing internal state

## Open Questions

1. **Should we support manual commit during auto-commit?**

   - Current design: Auto-commit happens automatically when last piece deployed
   - Alternative: Allow manual commit even when pieces remain (mark as staying)
   - Decision: Keep auto-commit automatic, manual commit still available via
     `commitDeploySession()`

2. **Should incomplete deploy moves be added to move history?**

   - Current design: No, only complete InternalDeployMove added to history
   - Alternative: Add each incremental move to history
   - Decision: Keep current design, cleaner history and easier undo

3. **Should we support canceling deployment mid-sequence?**
   - Current design: Yes, via `cancelDeploySession()`
   - Alternative: Force completion of all deployments
   - Decision: Keep cancel support, important for UX

## Future Enhancements

1. **Deploy Move Validation**: Add validation to prevent invalid deploy
   sequences
2. **Deploy Move Suggestions**: Suggest optimal deployment patterns
3. **Deploy Move Notation**: Improve SAN notation for partial deployments
4. **Deploy Move Animation**: Support for animating incremental deployments in
   UI
5. **Deploy Move Undo Granularity**: Support undoing individual pieces within a
   deployment
