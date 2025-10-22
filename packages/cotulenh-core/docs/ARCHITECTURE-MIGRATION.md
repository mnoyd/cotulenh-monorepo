# CoTuLenh Deploy Architecture: Migration to Action-Based System

**Created**: October 22, 2025  
**Status**: 🎯 CURRENT ARCHITECTURE - Authoritative Reference  
**Supersedes**: All previous deploy architecture documents

---

## 🎯 Purpose

This document consolidates ALL previous deploy architecture discussions and
provides the **definitive architecture** for CoTuLenh's deployment system going
forward.

**What This Replaces**:

- `docs/legacy-square-by-square-approaches/virtual-deploy-state-architecture.md`
  → Legacy
- `docs/legacy-square-by-square-approaches/deploy-session-state-management.md` →
  Legacy
- `docs/context/DEPLOY-CRITICAL-LEARNINGS.md` → Historical (virtual state bugs)
- All virtual state overlay approaches → Replaced by action-based

**New Architecture**: `docs/deploy-action-based-architecture/` - Complete
specification

---

## 📖 Table of Contents

1. [Architecture Evolution](#architecture-evolution)
2. [Why Action-Based Architecture](#why-action-based-architecture)
3. [Complete Specification](#complete-specification)
4. [Migration from Virtual State](#migration-from-virtual-state)
5. [Critical Gaps Identified & Resolved](#critical-gaps-identified--resolved)
6. [Implementation Readiness](#implementation-readiness)

---

## Architecture Evolution

### Timeline of Approaches

#### Phase 1: Square-by-Square Mutations (Original)

**Location**: `docs/legacy-square-by-square-approaches/`  
**Approach**: Direct board mutations with separate deploy logic  
**Problems**:

- Code duplication (deploy vs normal moves)
- Complex undo logic
- Hard to maintain
- State corruption bugs

#### Phase 2: Virtual State Overlay (Implemented)

**Location**: `docs/context/DEPLOY-CRITICAL-LEARNINGS.md`  
**Approach**: Virtual changes map that overlays real board  
**Structure**:

```typescript
interface DeploySession {
  virtualChanges: Map<Square, Piece | null> // Temporary overlay
  movedPieces: Array<{ piece; from; to }>
  // Commit all changes atomically at end
}
```

**Problems Discovered**:

- **Context staleness bug**: Actions captured stale `deploySession` references
- **Virtual state undo bug**: After commit, `virtualChanges` cleared but undo
  expected it
- Complex reasoning about "real" vs "virtual" state
- Dual state management complexity
- Need `isTesting` flag to prevent mutations during validation
- Air defense zone recalculation issues with virtual state

**Critical Bugs Fixed** (October 20, 2025):

1. Ghost pieces from stale context references
2. Virtual state undo after commit failures
3. Testing flag requirements for move simulation

See `docs/context/DEPLOY-CRITICAL-LEARNINGS.md` for complete bug analysis.

#### Phase 3: Action-Based Architecture (CURRENT) ✅

**Location**: `docs/deploy-action-based-architecture/`  
**Approach**: **"Store Actions, Not State"**

**Core Philosophy**:

- Modify **real board directly** during deployment
- Track **actions taken** in session
- Use **command pattern undo** for rollback
- **Single source of truth** - real board state
- NO virtual overlay, NO dual state

**Why This Works**:

```typescript
// Existing codebase ALREADY uses this pattern!
private _filterLegalMoves(moves: InternalMove[]): InternalMove[] {
  for (const move of moves) {
    this._makeMove(move)    // ✅ Apply with action tracking
    // ... validate ...
    this._undoMove()        // ✅ Perfect reversal via commands
  }
}
```

The action-based architecture leverages the **existing command pattern** that
already works perfectly throughout the codebase.

---

## Why Action-Based Architecture

### Problems with Virtual State Overlay

From `DEPLOY-CRITICAL-LEARNINGS.md` and implementation experience:

#### 1. Context Staleness (Ghost Pieces Bug)

```typescript
// VIRTUAL STATE PROBLEM:
class PlacePieceAction {
  constructor(private context?: MoveContext) {} // ← Captured at construction

  execute(): void {
    if (this.context?.deploySession) {
      // ← STALE REFERENCE!
      this.context.deploySession.virtualChanges.set(sq, piece)
    }
  }
}

// When Move constructor tests moves:
// 1. Creates context with deploySession reference
// 2. Applies move → captures stale context
// 3. Undoes → game._deploySession = null
// 4. Actions still reference old session → corruption!
```

**Result**: Ghost pieces appear on board, state corrupted.

#### 2. Virtual State Undo After Commit

```typescript
// VIRTUAL STATE PROBLEM:
function commitDeploySession() {
  for (const [sq, piece] of session.virtualChanges) {
    board[sq] = piece // Apply to real board
  }
  session.virtualChanges.clear() // Clear virtual state
}

// Later, user undoes:
function undo() {
  command.undo() // Tries to restore from virtualChanges
  // ❌ virtualChanges is empty! State lost!
}
```

**Result**: Undo broken after deploy commit.

#### 3. Dual State Reasoning Complexity

```typescript
// Which state is "real"?
function get(square: Square): Piece | null {
  if (deploySession) {
    // Check virtual first?
    if (deploySession.virtualChanges.has(square)) {
      return deploySession.virtualChanges.get(square)
    }
  }
  // Then check real board?
  return board[square]
}

// Every query needs this logic!
```

#### 4. Testing Flag Requirements

```typescript
// Virtual state requires special testing mode
if (context.isTesting) {
  return // Don't create deploy sessions during testing
}

if (!context.isTesting) {
  commitDeploySession() // Only commit if not testing
}

// Forget testing flag → state corruption during move generation
```

### Action-Based Solution

**Single Source of Truth**:

```typescript
// NO virtual state - board IS the state
class DeploySession {
  stackSquare: Square
  turn: Color
  originalPiece: Piece
  actions: InternalMove[] // ← Just record what happened
  startFEN: string

  getRemainingPieces(): Piece | null {
    let remaining = this.originalPiece
    for (const move of this.actions) {
      remaining = removePieceFromStack(remaining, move.piece) || null
    }
    return remaining
  }
}
```

**Benefits**:

- ✅ No ghost pieces - board state is always correct
- ✅ No stale references - always query current game state
- ✅ Undo works - command pattern stores complete reversal info
- ✅ No testing flags - validation uses same path as execution
- ✅ Simple reasoning - one board, one truth

**Leverages Existing Infrastructure**:

- Command pattern already implemented
- `_makeMove()` + `_undoMove()` already works
- `_filterLegalMoves` already validates correctly
- No new patterns needed

---

## Complete Specification

### Architecture Location

**Primary Documentation**: `docs/deploy-action-based-architecture/`

**Read in This Order**:

1. **FINAL-STATUS.md** - Current status, all issues resolved
2. **COMPLETE-IMPLEMENTATION-GUIDE.md** - Core specification
3. **SAN-PARSER-SPEC.md** - Parser for extended FEN
4. **RESOLVED-GAPS.md** - How design decisions were made

### Core Components

#### 1. Deploy Session (Action-Based)

```typescript
class DeploySession {
  stackSquare: Square // Where deployment started
  turn: Color // Who is deploying
  originalPiece: Piece // Original stack (for reference)
  actions: InternalMove[] // ← KEY: Moves made, not state changes
  startFEN: string // FEN before deploy started

  // Calculate remaining on-demand
  getRemainingPieces(): Piece | null {
    let remaining = this.originalPiece

    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        remaining = removePieceFromStack(remaining, move.piece.role) || null
      }
    }

    return remaining
  }

  // Cancellation is trivial
  cancel(): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo() // Command pattern handles everything
    }
    this.actions = []
  }
}
```

#### 2. Move Validation (Reuse Existing)

```typescript
// ALREADY IMPLEMENTED in src/cotulenh.ts:610-625
private _filterLegalMoves(
  moves: InternalMove[],
  us: Color
): InternalMove[] {
  const legalMoves: InternalMove[] = []

  for (const move of moves) {
    this._makeMove(move)      // Apply with action tracking

    if (!this._isCommanderAttacked(us) && !this._isCommanderExposed(us)) {
      legalMoves.push(move)
    }

    this._undoMove()          // Perfect reversal
  }

  return legalMoves
}

// Deploy moves use SAME validation - no special cases!
```

#### 3. Extended FEN Format

```typescript
// Normal FEN:
'base-fen r - - 0 1'

// During deploy session:
'base-fen r - - 0 1 DEPLOY c3:(FT)<Nc5...'
//                    ^^^^^^^^^^^^^^^^^^^^^^^
//                    Deploy session marker

// Format: DEPLOY <square>:<stay-pieces><moves>...
// - c3: original stack square
// - (FT)<: AirForce+Tank stay at origin
// - Nc5: Navy deployed to c5
// - ...: session incomplete
```

**Complete specification**:
`docs/deploy-action-based-architecture/01-FEN-HANDLING.md`

#### 4. SAN Parser

```typescript
// Deploy SAN format (from existing deployMoveToSanLan):
'(NT)>a3,F>c4' // Navy+Tank to a3, AirForce to c4
'(FT)<N>a3' // AirForce+Tank stay, Navy to a3
'c3:(NT)>a3,F>c4' // LAN format with origin square

class DeploySANParser {
  parseDeploySAN(san: string): ParsedDeployMove
  parseSingleMove(moveStr: string): ParsedMove
  parseExtendedFEN(fen: string): DeploySessionData
}
```

**Complete specification**:
`docs/deploy-action-based-architecture/SAN-PARSER-SPEC.md`

#### 5. Recombine Moves

```typescript
// Allow pieces to rejoin previously deployed pieces
function generateRecombineMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  const moves: InternalMove[] = []
  const deployedSquares = getDeployedSquares(session)
  const remaining = session.getRemainingPieces()

  for (const piece of remaining.carrying) {
    for (const square of deployedSquares) {
      // Only if piece can reach and terrain is valid
      if (canReach(session.stackSquare, square, piece)) {
        moves.push({
          from: session.stackSquare,
          to: square,
          piece: piece,
          flags: BITS.DEPLOY | BITS.RECOMBINE,
        })
      }
    }
  }

  // Validation automatic via _filterLegalMoves
  return game._filterLegalMoves(moves, session.turn)
}
```

**Complete specification**:
`docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`

---

## Migration from Virtual State

### Code Changes Required

#### 1. Replace DeploySession Structure

```typescript
// OLD (Virtual State):
interface DeploySession {
  virtualChanges: Map<Square, Piece | null> // ❌ Remove
  movedPieces: Array<{ piece; from; to }> // ❌ Remove
  // ... complex virtual state management
}

// NEW (Action-Based):
interface DeploySession {
  stackSquare: Square
  turn: Color
  originalPiece: Piece
  actions: InternalMove[] // ✅ Simple action log
  startFEN: string
}
```

#### 2. Remove Virtual State Lookups

```typescript
// OLD (Virtual State):
function get(square: Square): Piece | null {
  if (deploySession?.virtualChanges.has(square)) {
    return deploySession.virtualChanges.get(square)
  }
  return board[square]
}

// NEW (Action-Based):
function get(square: Square): Piece | null {
  return board[square] // ✅ Board IS the truth!
}
```

#### 3. Remove Context Capturing

```typescript
// OLD (Virtual State):
class PlacePieceAction {
  constructor(private context?: MoveContext) {} // ❌ Stale!

  execute(): void {
    if (this.context?.deploySession) {
      this.context.deploySession.virtualChanges.set(sq, piece)
    }
  }
}

// NEW (Action-Based):
class PlacePieceAction {
  execute(): void {
    this.board[this.square] = this.piece // ✅ Direct mutation
    // Command pattern stores undo info automatically
  }
}
```

#### 4. Remove Testing Flags

```typescript
// OLD (Virtual State):
if (context.isTesting) {
  return // Don't create deploy sessions
}

// NEW (Action-Based):
// NO SPECIAL FLAGS NEEDED!
// Validation and execution use same path
```

#### 5. Simplify Commit Logic

```typescript
// OLD (Virtual State):
function commitDeploySession() {
  // Apply all virtual changes to real board
  for (const [square, piece] of session.virtualChanges) {
    board[square] = piece
  }
  session.virtualChanges.clear()
  // Complex state synchronization...
}

// NEW (Action-Based):
function commitDeploySession() {
  // Board already updated! Just create history entry
  const deployCommand = session.toDeployCommand()
  history.push(deployCommand)
  session = null
  turn = switchTurn()
}
```

### Bugs Fixed by Migration

✅ **Context Staleness**: No context capturing, query current state  
✅ **Virtual State Undo**: Command pattern handles all undo  
✅ **Ghost Pieces**: Board is always correct, no stale overlays  
✅ **Testing Flag Complexity**: Same code path for testing and execution  
✅ **Air Defense Recalc**: Real board state, no virtual overlay confusion

---

## Critical Gaps Identified & Resolved

From comprehensive analysis in `docs/deploy-action-based-architecture/`:

### Gap Analysis Process

**Phase 1**: Initial gap identification → `GAP-ANALYSIS.md`

- Identified 20+ potential issues across documentation

**Phase 2**: Risk assessment → `CRITICAL-RISKS.md`

- Classified 2 CRITICAL, 3 HIGH-RISK issues

**Phase 3**: Resolution & discovery → `RESOLVED-GAPS.md`

- All issues resolved or found to be non-issues

**Phase 4**: Final status → `FINAL-STATUS.md`

- 0 blockers, ready for implementation

### Critical Resolutions

#### 1. Move Reversal for Recombine ✅

**Initial Concern**: No specification for reversing moves  
**Resolution**: Existing `_undoMove()` command pattern already works  
**Status**: Non-issue - already implemented

#### 2. SAN Parser for Extended FEN ✅

**Initial Concern**: Cannot load extended FEN  
**Resolution**: Complete specification created in `SAN-PARSER-SPEC.md`  
**Status**: Ready to implement (6-10 hours)

#### 3. Deploy Session Cancellation ✅

**Initial Concern**: No way to cancel mid-deploy  
**Resolution**: Command pattern makes it trivial (`session.cancel()`)  
**Status**: Simple implementation

#### 4. Recombine Move Validation ✅

**Initial Concern**: Need new validation  
**Resolution**: Use existing `PieceStacker.combine()` + `_filterLegalMoves`  
**Status**: No new code needed

#### 5. Clone Failure During Validation ✅

**Initial Concern**: Cloning could fail  
**Resolution**: NO CLONING USED - action-based validation throughout  
**Status**: Non-issue - misconception

### Documentation Gaps Filled

✅ Extended FEN grammar formally specified  
✅ SAN parser algorithm and implementation plan  
✅ Recombine move generation and validation  
✅ Deploy session lifecycle  
✅ History management (transaction model)  
✅ Error handling and edge cases

---

## Implementation Readiness

### Status: ✅ READY TO IMPLEMENT

**Blockers**: 0  
**Estimated Time**: 17-26 hours (2-3 working days)  
**Risk Level**: 🟢 Low  
**Confidence**: 95%

### Implementation Phases

**Phase 1: Core Deploy Session** (4-6 hours)

```typescript
class DeploySession {
  stackSquare: Square
  turn: Color
  originalPiece: Piece
  actions: InternalMove[]
  startFEN: string

  getRemainingPieces(): Piece | null
  cancel(): void
  canCommit(): boolean
}
```

**Phase 2: Move Generation** (3-4 hours)

```typescript
function generateDeployMoves(game, session): InternalMove[]
function generateRecombineMoves(game, session): InternalMove[]
// Integration with _filterLegalMoves
```

**Phase 3: Extended FEN** (2-3 hours)

```typescript
function fen(): string // Add DEPLOY marker when session active
// Integration with existing FEN system
```

**Phase 4: SAN Parser** (6-10 hours)

```typescript
class DeploySANParser {
  parseDeploySAN(san: string): ParsedDeployMove
}
class ExtendedFENParser {
  parseExtendedFEN(fen: string): DeploySessionData
}
```

**Phase 5: History & Commands** (2-3 hours)

```typescript
interface DeployCommand {
  type: 'DEPLOY'
  from: Square
  originalStack: Piece
  deployments: Deployment[]
}
// Session to command transformation
```

### Testing Strategy

**Unit Tests**:

- Deploy session creation and lifecycle
- Remaining piece calculation
- Recombine move generation
- Extended FEN round-trip
- SAN parser edge cases

**Integration Tests**:

- Full deploy sequence
- Undo/redo during deploy
- Cancel mid-deploy
- Complex recombine scenarios
- Extended FEN save/load

**Regression Tests**:

- All existing tests must pass
- No behavior changes for non-deploy moves
- Performance benchmarks

---

## Key Learnings & Best Practices

### From Virtual State Implementation

**Don't**:

- ❌ Create dual state systems (real + virtual)
- ❌ Capture context at construction time
- ❌ Require special testing flags
- ❌ Clear state on commit (breaks undo)
- ❌ Use different code paths for validation vs execution

**Do**:

- ✅ Use single source of truth (board is the state)
- ✅ Query current game state, not captured context
- ✅ Leverage existing command pattern for undo
- ✅ Use same validation for all moves
- ✅ Store actions, not state changes

### From Architecture Research

**Successful Patterns**:

- Command pattern for undo/redo
- Action-based validation (\_makeMove + \_undoMove)
- Extended FEN for session persistence
- Existing PieceStacker for validation
- Atomic transaction model for history

**Avoid**:

- Virtual overlays (complexity, bugs)
- Square-by-square mutations (code duplication)
- Custom validation paths (maintenance burden)
- State capture (staleness issues)

---

## References

### Current Architecture (Action-Based)

- **Primary**: `docs/deploy-action-based-architecture/`
  - `FINAL-STATUS.md` - Current status
  - `COMPLETE-IMPLEMENTATION-GUIDE.md` - Specification
  - `SAN-PARSER-SPEC.md` - Parser spec
  - `RESOLVED-GAPS.md` - Design decisions

### Legacy Approaches (Historical)

- **Virtual State**: `docs/context/DEPLOY-CRITICAL-LEARNINGS.md` (bugs fixed)
- **Square-by-Square**: `docs/legacy-square-by-square-approaches/` (deprecated)

### Game Mechanics (Unchanged)

- **Game Rules**: `docs/context/complete-game-mechanics-reference.md`
- **Deploy Mechanics**: `docs/context/deployment-mechanics.md` (needs update)
- **Stack Rules**: `docs/context/stack-combination-rules.md`

---

## Migration Checklist

For teams migrating from virtual state implementation:

### Code Changes

- [ ] Replace `DeploySession` structure (remove `virtualChanges`)
- [ ] Remove virtual state lookups from `get()` methods
- [ ] Remove context capturing in actions
- [ ] Remove `isTesting` flag logic
- [ ] Simplify commit logic (board already updated)
- [ ] Update FEN generation (add DEPLOY marker)

### New Implementations

- [ ] Implement `DeploySession.getRemainingPieces()`
- [ ] Implement `DeploySession.cancel()`
- [ ] Implement `generateRecombineMoves()`
- [ ] Implement `DeploySANParser`
- [ ] Implement `ExtendedFENParser`
- [ ] Implement deploy command history

### Testing

- [ ] All existing tests pass
- [ ] New deploy session tests
- [ ] Extended FEN round-trip tests
- [ ] SAN parser tests
- [ ] Recombine move tests
- [ ] Performance benchmarks

### Documentation

- [ ] Update `deployment-mechanics.md`
- [ ] Mark legacy docs as deprecated
- [ ] Update API documentation
- [ ] Create migration guide for users
- [ ] Update FEN format docs

---

## Conclusion

The action-based deploy architecture is the **definitive solution** for
CoTuLenh's deployment system, resolving all issues encountered with previous
approaches:

**Simpler**: Single source of truth, no dual state  
**Correct**: Leverages proven command pattern  
**Maintainable**: Reuses existing validation code  
**Complete**: All edge cases specified  
**Ready**: 0 blockers, ready to implement

This architecture represents the culmination of extensive research, bug fixes,
and design iteration. It is production-ready and recommended for all future
CoTuLenh implementations.

---

**Status**: ✅ Authoritative Architecture - Ready for Implementation  
**Last Updated**: October 22, 2025  
**Maintained By**: CoTuLenh Core Team
