# Deploy System Refactoring Analysis

## Current Architecture Issues

### 1. **Dual Command System**

The current system has two parallel command structures:

- `SingleDeployMoveCommand` - handles individual deploy moves
- `DeployMoveCommand` - wraps multiple SingleDeployMoveCommands

This creates complexity:

- `DeployMoveCommand.buildActions()` calls `buildDeployMoveCommands()` which
  executes moves through `handleDeployMove()`, then undoes them, just to capture
  commands
- Commands are executed, then undone, then stored to be executed again later
- This "execute-undo-capture-execute" pattern is confusing and error-prone

### 2. **Session State Management**

`DeploySession` tracks:

- Original piece composition
- Commands executed
- Remaining pieces (calculated dynamically)

But the board state is modified incrementally during the session, creating a
hybrid state:

- Board reflects partial deployment
- Session tracks what's left
- History doesn't know about the session until commit

### 3. **Complex Commit Logic**

`commitDeploySession()` has to:

- Validate commander safety (delayed validation)
- Create a `DeployMoveCommand` from session commands
- Wrap already-executed commands for undo
- Switch turns and update game state
- Add to history

The logic is split between:

- `deploy-session.ts` (session management)
- `cotulenh.ts` (commit logic)
- `move-apply.ts` (command execution)

### 4. **Confusing Undo Behavior**

- During session: `undo()` undoes from session
- After commit: `undo()` undoes from history
- The transition point is unclear
- `DeployMoveCommand.undo()` has to undo multiple sub-commands in reverse

## Proposed Simplified Architecture

### Core Principle: **Session as Transaction**

Treat deploy sessions as database-style transactions:

1. **Begin**: Create session, snapshot board state
2. **Execute**: Apply moves incrementally (board is modified)
3. **Commit**: Validate and finalize (add to history)
4. **Rollback**: Restore snapshot (cancel)

### New Structure

```typescript
class DeploySession {
  private readonly stackSquare: number
  private readonly turn: Color
  private readonly originalPiece: Piece
  private readonly boardSnapshot: Piece[] // Snapshot of entire board
  private readonly moves: InternalMove[] = []

  // Add a move to the session
  addMove(move: InternalMove): void {
    // Validate move is legal
    // Apply move to board directly
    // Track move in session
  }

  // Undo last move in session
  undoLastMove(): void {
    // Pop last move
    // Revert board change
  }

  // Cancel entire session
  cancel(): void {
    // Restore board from snapshot
    // Clear session
  }

  // Commit session to history
  commit(): DeployHistoryEntry {
    // Validate commander safety
    // Create history entry
    // Return entry (caller adds to history)
  }
}
```

### Simplified Command Structure

**Remove `DeployMoveCommand` entirely**. Instead:

```typescript
// History entry for deploy moves
interface DeployHistoryEntry {
  type: 'deploy'
  from: number
  moves: InternalMove[]
  stay?: Piece
  captured?: Piece[]
  boardSnapshot: Piece[] // For undo

  // Undo by restoring snapshot
  undo(): void {
    restoreBoardFromSnapshot(this.boardSnapshot)
  }
}

// History entry for normal moves
interface NormalHistoryEntry {
  type: 'normal'
  move: InternalMove
  command: CTLMoveCommand // Existing command system

  undo(): void {
    this.command.undo()
  }
}

type HistoryEntry = DeployHistoryEntry | NormalHistoryEntry
```

### Benefits

1. **No Double Execution**: Moves are executed once during session, not
   executed-undone-executed
2. **Clear State**: Board is always in a valid state (either mid-session or
   committed)
3. **Simple Undo**: Deploy undo = restore snapshot, Normal undo = command.undo()
4. **No Command Wrapping**: Deploy moves don't need command objects during
   session
5. **Cleaner Separation**: Session logic stays in session, history logic stays
   in history

## Migration Path

### Phase 1: Simplify Session

- Remove command tracking from `DeploySession`
- Add board snapshot on session creation
- Make `addMove()` apply moves directly without commands
- Implement snapshot-based undo

### Phase 2: Simplify History

- Change history to use union type `HistoryEntry`
- Remove `DeployMoveCommand` class
- Update `undo()` to handle both entry types

### Phase 3: Clean Up

- Remove `buildDeployMoveCommands()` function
- Remove `SingleDeployMoveCommand` (or keep for batch operations)
- Simplify `commitDeploySession()`

## Key Questions

1. **Do we need `SingleDeployMoveCommand` at all?**

   - Currently used for: individual move execution during session
   - Could be replaced with: direct board manipulation in session
   - Keep if: we want to support batch deploy moves (execute all at once)

2. **Should deploy moves be in history as single entries or multiple?**

   - Current: Single entry (DeployMoveCommand wrapping multiple moves)
   - Proposed: Single entry (DeployHistoryEntry with snapshot)
   - Benefit: Simpler undo, clearer history

3. **How to handle FEN generation during session?**

   - Current: Session generates extended FEN with "DEPLOY c3:Ac4,Tb5..."
   - Proposed: Keep this, it's clean and useful

4. **Should we keep command pattern for normal moves?**
   - Yes! The command pattern works well for normal moves
   - Only deploy moves need special handling due to multi-step nature

## Recommendation

**Start with Phase 1**: Refactor `DeploySession` to use snapshot-based undo.
This is the biggest win with lowest risk:

1. Add `boardSnapshot` to session constructor
2. Change `addMove()` to apply moves directly (no commands)
3. Change `undoLastMove()` to revert board changes directly
4. Change `cancel()` to restore from snapshot
5. Keep `commit()` mostly the same (returns data for history)

This eliminates the "execute-undo-capture-execute" pattern and makes the session
logic much clearer.

**Then Phase 2**: Once session is stable, refactor history to use union types
and remove `DeployMoveCommand`.

**Skip Phase 3 initially**: Keep `SingleDeployMoveCommand` for now in case we
need it for batch operations or other use cases.
