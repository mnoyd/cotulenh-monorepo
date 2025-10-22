# Resolved Implementation Gaps

**Created**: October 22, 2025  
**Status**: Resolved  
**Purpose**: Document resolution of critical gaps identified in GAP-ANALYSIS.md

---

## ✅ Critical Issues - RESOLVED

### Gap 1: Action Type Inconsistency - RESOLVED

**Problem**: Documentation showed both `DeployAction` objects and
`InternalMove[]` for session actions.

**Resolution**: Use `InternalMove[]` for `DeploySession.actions`. The
`DeployAction` interface from `00-OVERVIEW.md` is deprecated.

**Final Implementation**:

```typescript
class DeploySession {
  stackSquare: Square
  turn: Color
  originalPiece: Piece
  actions: InternalMove[] // ✅ Use InternalMove[], not DeployAction[]
  startFEN: string

  getRemainingPieces(): Piece | null {
    let remaining = this.originalPiece

    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        remaining = removePieceFromStack(remaining, move.piece.role) || null
      }
    }

    return remaining
  }
}
```

### Gap 2: Duplicate Piece Handling - NOT POSSIBLE

**Problem**: How to handle stacks like `Navy(Tank, Tank)` with duplicate pieces.

**Resolution**: This is **not a valid scenario**. Based on
`stack-combination-rules.md`, the combination system prevents duplicate pieces
in stacks.

**Evidence**:

- Blueprint rules: "No duplicates allowed in same stack"
- `StackEngine.lookup()` validates: `new Set(pieces).size !== pieces.length`
- `PieceStacker.combine()` rejects duplicate combinations
- **This gap is a non-issue** for our deploy system

### Gap 3 & 4: Commander Attack Rules - RESOLVED

**Problem**: Unclear when commander attack validation occurs during deploy.

**Resolution**: Use existing `_filterLegalMoves()` validation for all deploy
moves.

**Current Implementation** (in `src/cotulenh.ts:610-625`):

```typescript
private _filterLegalMoves(
  moves: (InternalMove | InternalDeployMove)[],
  us: Color,
): (InternalMove | InternalDeployMove)[] {
  const legalMoves: (InternalMove | InternalDeployMove)[] = []
  for (const move of moves) {
    this._makeMove(move)
    // Move is legal if it doesn't leave commander attacked AND doesn't expose commander
    if (!this._isCommanderAttacked(us) && !this._isCommanderExposed(us)) {
      legalMoves.push(move)
    }
    this._undoMove()
  }
  return legalMoves
}
```

**Deploy Integration**:

```typescript
// In generateDeployMoves()
function generateDeployMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  // Generate all possible deploy moves
  const allDeployMoves = generateAllDeployMoves(game, session)

  // Filter through existing action-based validation (NO CLONING!)
  return game._filterLegalMoves(allDeployMoves, session.turn)
  //     ^^^^^^^^^^^^^^^^^ Uses _makeMove() + _undoMove() pattern
}
```

**Rules Clarified**:

- ✅ Cannot start deploy if commander in check (filtered out in move generation)
- ✅ Cannot make deploy step that leaves commander in check (filtered by
  `_filterLegalMoves`)
- ✅ Cannot make deploy step that exposes commander (filtered by
  `_isCommanderExposed`)
- ✅ All existing commander protection rules apply to deploy moves

---

## 🟡 Implementation Details - CLARIFIED

### Gap 5: Extended FEN "Stay" Syntax - DEFINED

**Problem**: `T<Nc5,Fd4...` syntax not formally specified.

**Resolution**: Define clear grammar for extended FEN deploy section.

**Format**:

```
DEPLOY <square>:<stay-pieces><moves>...

Where:
- <square>: Original stack square (e.g., "c3")
- <stay-pieces>: Pieces remaining at origin with "<" suffix (e.g., "T<")
- <moves>: SAN notation of moves made (e.g., "Nc5,Fd4")
- "...": Indicates unfinished deploy session
```

**Examples**:

```typescript
// Navy deploys to c5, Tank stays at c3
'...base-fen... DEPLOY c3:T<Nc5...'

// Navy+Infantry deploy to c5, Tank stays at c3
'...base-fen... DEPLOY c3:T<N(I)c5...'

// All pieces deployed, no staying pieces
'...base-fen... DEPLOY c3:Nc5,Fd4,Te5...'
```

### Gap 6: Terrain Validation Timing - CLARIFIED

**Problem**: Multiple validation layers mentioned without clear sequence.

**Resolution**: Single validation pipeline using try/catch approach.

**Implementation**:

```typescript
// 1. Move generation creates candidate moves
const candidateMoves = generateAllDeployMoves(game, session)

// 2. Legal move filtering applies all validations
const legalMoves = game._filterLegalMoves(candidateMoves, session.turn)

// 3. Inside _filterLegalMoves, terrain validation happens via try/catch
function _filterLegalMoves(moves: InternalMove[]): InternalMove[] {
  const legalMoves: InternalMove[] = []

  for (const move of moves) {
    try {
      this._makeMove(move) // This will throw if terrain invalid

      if (!this._isCommanderAttacked(us) && !this._isCommanderExposed(us)) {
        legalMoves.push(move)
      }
    } catch (error) {
      // Move invalid (terrain, rules, etc.) - skip it
    } finally {
      this._undoMove()
    }
  }

  return legalMoves
}
```

### Gap 7: Partial Deploy Commit Rules - DEFINED

**Problem**: `DeployConfig.allowPartialCommit` semantics unclear.

**Resolution**: Define clear rules for partial commits.

**Rules**:

```typescript
interface DeployConfig {
  autoCommit: boolean // Auto-commit when all pieces moved
  allowPartialCommit: boolean // Allow manual commit with pieces remaining
  validateStaying: boolean // Validate remaining pieces can stay on terrain
}

// Partial commit validation
function canCommitPartially(session: DeploySession): boolean {
  const remaining = session.getRemainingPieces()

  if (!remaining || !remaining.carrying?.length) {
    return true // All pieces deployed
  }

  if (!config.allowPartialCommit) {
    return false // Partial commits disabled
  }

  if (config.validateStaying) {
    // Check if remaining pieces can stay on terrain
    const terrain = game.getTerrainAt(session.stackSquare)
    return remaining.carrying.every((piece) =>
      canPieceStayOnTerrain(piece.type, terrain),
    )
  }

  return true // Partial commit allowed without validation
}
```

---

## 🟢 Documentation Issues - RESOLVED

### Missing File References

**Problem**: `00-OVERVIEW.md` referenced missing files (`03-VALIDATION.md`,
etc.).

**Resolution**: All critical information consolidated into
`COMPLETE-IMPLEMENTATION-GUIDE.md`. Remove dangling references or create minimal
placeholder files.

### Action Order Dependencies

**Problem**: Recombine order preservation needed more examples.

**Resolution**: Documented in `COMPLETE-IMPLEMENTATION-GUIDE.md` with detailed
examples showing why chronological order matters for move legality.

---

## 📋 Updated Implementation Checklist

### Core Components - Ready

- [x] `DeploySession` class using `InternalMove[]` actions
- [x] Commander attack validation via existing `_filterLegalMoves`
- [x] No duplicate piece handling needed (prevented by combination rules)
- [x] Extended FEN format with defined grammar
- [x] Terrain validation via try/catch in move application

### Remaining Work

- [ ] Implement `DeploySession` class
- [ ] Integrate deploy move generation with `_filterLegalMoves`
- [ ] Add extended FEN generation and parsing
- [ ] Implement recombine move logic with order preservation
- [ ] Add deploy session lifecycle management
- [ ] Create deploy command structure for history

---

## 🎯 Key Decisions Made

1. **Action Storage**: `InternalMove[]` (not custom `DeployAction` objects)
2. **Duplicate Pieces**: Not possible due to combination rules (non-issue)
3. **Commander Validation**: Reuse existing `_filterLegalMoves` pipeline
4. **Extended FEN**: Defined grammar with stay syntax and "..." indicator
5. **Terrain Validation**: Try/catch approach during move application
6. **Partial Commits**: Configurable with terrain validation option

These decisions resolve all critical gaps and provide clear implementation
guidance. The action-based deploy architecture is now **ready for
implementation** with no blocking ambiguities.

---

## 🟡 High-Risk Issues - RESOLVED

### High Risk #1: Deploy Session Cancellation - TRIVIAL ✅

**Problem**: Users need way to cancel deploy sessions.

**Resolution**: Use existing command pattern - cancellation is just undoing all
commands.

```typescript
class DeploySession {
  commands: CTLMoveCommand[]

  cancel(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo()  // Perfect state restoration
    }
    this.commands = []
  }
}

// Public API
game.cancelDeploySession(): boolean {
  if (!this._deploySession) return false
  this._deploySession.cancel()
  this._deploySession = null
  return true
}
```

### High Risk #2: Recombine Move Validation - USE EXISTING PATTERNS ✅

**Problem**: Recombine moves need validation for stack limits, terrain,
commander safety.

**Resolution**: Leverage existing validation systems.

**Stack Size & Compatibility**: Use `PieceStacker.combine()` during move
generation

```typescript
const canCombine = PieceStacker.combine([existingPiece, movingPiece])
if (!canCombine) continue // Skip invalid combinations
```

**Terrain & Commander Validation**: Use existing `_filterLegalMoves()` pipeline

```typescript
const candidateMoves = generateRecombineMoves(game, session)
return game._filterLegalMoves(candidateMoves, session.turn)
// ↑ Uses _makeMove() + _undoMove() (action-based, NO CLONING!)
// ↑ Handles terrain validation and commander attack validation
```

**Implementation**: No new validation needed - reuse existing robust systems.

---

**Status**: All critical and high-risk gaps resolved  
**Next Step**: Begin Phase 1 implementation of core `DeploySession` class

### Gap 2:

SAN Parser Implementation - SPECIFIED ✅ **Problem**: Need parser for extended
FEN loading and PGN support with deploy moves.

**Resolution**: Complete parser specification created in `SAN-PARSER-SPEC.md`.

**Current Deploy SAN Format** (from existing `deployMoveToSanLan`):

```typescript
// Examples from tests:
'(NT)>a3,F>c4' // Navy+Tank to a3, AirForce to c4
'(FT)<N>a3' // AirForce+Tank stay, Navy to a3
'c3:(NT)>a3,F>c4' // LAN format with origin square
```

**Implementation Plan**:

- Phase 1: Core `DeploySANParser` class (2-3 hours)
- Phase 2: Extended FEN integration (2-3 hours)
- Phase 3: CoTuLenh `_moveFromSan` integration (1-2 hours)
- Phase 4: Testing and edge cases (1-2 hours)
- **Total**: 6-10 hours, ready to implement

**Grammar Defined**: Complete EBNF grammar and parsing algorithm specified.
