# Action-Based Deploy Architecture - Overview

**Created**: October 21, 2025  
**Status**: Design Discussion Phase  
**Purpose**: Simplified deploy architecture using action tracking instead of
virtual state

---

## 🎯 Core Philosophy

**"Store Actions, Not State"**

Instead of maintaining dual state (virtual + real board), we:

1. Modify the **real board directly** during deployment
2. Track **actions taken** during deploy session
3. Use **action rollback** for undo/validation
4. Adapt **FEN and queries** to handle active deployment

---

## 🔄 Paradigm Shift

### Current Approach (Virtual State)

```typescript
// Virtual state overlay
class DeploySession {
  virtualChanges: Map<Square, Piece | null> // Temporary overlay

  commit() {
    // Apply all virtual changes to real board
    for (const [square, piece] of virtualChanges) {
      board.set(square, piece)
    }
  }
}
```

**Problems**:

- Dual state management complexity
- Need to sync virtual and real
- Commit logic fragile
- Queries need virtual board wrapper

---

### New Approach (Action-Based)

```typescript
// Action tracking
class DeploySession {
  actions: DeployAction[] // Record of what happened

  rollback() {
    // Undo actions in reverse order
    for (const action of actions.reverse()) {
      action.undo()
    }
  }
}
```

**Benefits**:

- ✅ Single source of truth (real board)
- ✅ Simple undo = reverse actions
- ✅ No sync issues
- ✅ Direct state queries

---

## 🏗️ Architecture Components

### 1. Deploy Session Tracker

```typescript
interface DeploySession {
  stackSquare: Square // Where deployment started
  turn: Color // Who is deploying
  originalPiece: Piece // Original stack (for reference)
  actions: DeployAction[] // ← KEY: Actions taken
  startFEN: string // FEN before deploy started
}
```

### 2. Deploy Actions

```typescript
interface DeployAction {
  type: 'remove' | 'place' | 'move' | 'capture'
  square: Square
  piece?: Piece
  previousPiece?: Piece // For undo

  execute(): void
  undo(): void
}
```

### 3. Direct Board Mutation

```typescript
// Each deploy move modifies board immediately
game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })
// → Board at c3 updated (piece removed from stack)
// → Board at c5 updated (Navy placed)
// → Actions recorded in session
```

---

## 📊 Key Design Decisions

### Decision 1: Real Board as Single Source of Truth

- **Rationale**: Simplicity, no sync issues
- **Trade-off**: Need to handle FEN during active deploy carefully
- **Impact**: Queries work directly on real board

### Decision 2: Action Recording

- **Rationale**: Enables rollback without storing duplicate state
- **Trade-off**: Must record enough info for undo
- **Impact**: Memory efficient, clear audit trail

### Decision 3: FEN Adaptation

- **Rationale**: FEN must represent active deploy state somehow
- **Options**:
  - Extended FEN with DEPLOY marker
  - Base FEN + separate deploy session info
  - Intermediate state FEN (current board as-is)
- **To Discuss**: Which approach?

### Decision 4: Move Validation During Deploy

- **Rationale**: Need to validate remaining pieces can stay
- **Approach**: Check after each action, before recording
- **Impact**: Fail fast, prevent invalid states

---

## 🎮 User Experience Flow

```typescript
// Initial: Stack at c3: (NFT)
game.board['c3'] = { type: 'n', carrying: [f, t] }

// ━━━ DEPLOY STEP 1 ━━━
game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })

// Real board modified:
game.board['c3'] = { type: 'f', carrying: [t] } // Navy removed
game.board['c5'] = { type: 'n' } // Navy placed

// Deploy session created:
session = {
  stackSquare: 'c3',
  turn: 'r',
  originalPiece: NFT,
  actions: [
    { type: 'remove', square: 'c3', piece: Navy },
    { type: 'place', square: 'c5', piece: Navy },
  ],
  startFEN: '...',
}

// ━━━ DEPLOY STEP 2 ━━━
game.move({ from: 'c3', to: 'd4', piece: 'f', deploy: true })

// Real board modified again:
game.board['c3'] = { type: 't' } // Air Force removed
game.board['d4'] = { type: 'f' } // Air Force placed

// Actions accumulated:
session.actions.push(
  { type: 'remove', square: 'c3', piece: AirForce },
  { type: 'place', square: 'd4', piece: AirForce },
)

// ━━━ ROLLBACK (if needed) ━━━
game.undoDeployStep()
// → Reverses last 2 actions
// → Board restored to previous state
```

---

## 🔍 Critical Questions to Answer

### Q1: FEN Representation During Deploy

**Options**:

1. **Intermediate State FEN**: Return current board as-is
   - Pro: Simple, accurate to current state
   - Con: Doesn't show original stack, loses context
2. **Extended FEN with Marker**: Add `DEPLOY c3:FT 1` suffix
   - Pro: Complete information, can reconstruct session
   - Con: Non-standard, need parsing logic
3. **Virtual FEN**: Reconstruct as if no deploy happened
   - Pro: Clean, shows original position
   - Con: Misleading, doesn't match real board

**Recommendation**: Option 2 (Extended FEN) - See `01-FEN-HANDLING.md`

---

### Q2: Move Generation During Deploy

**Current**: Only generate moves from deploying stack

**With Action-Based**:

- Stack is being modified incrementally
- How do we know what pieces remain?
- Need to track remaining pieces separately?

**Options**:

1. Calculate from actions: `original - moved = remaining`
2. Track explicitly in session: `remainingPieces: Piece[]`
3. Read from current board at stack square

**Recommendation**: Option 1 (calculate) - See `02-MOVE-GENERATION.md`

---

### Q3: Validation During Deploy

**Critical**: Ensure remaining pieces can legally stay on terrain

**Approach**:

```typescript
function validateDeployStep(session: DeploySession, action: DeployAction) {
  // Calculate what will remain after this action
  const remaining = calculateRemaining(session, action)

  // Check terrain compatibility
  if (remaining.length > 0) {
    const canStay = validateTerrainForPieces(session.stackSquare, remaining)
    if (!canStay) {
      throw new Error('Invalid deploy: remaining pieces cannot stay')
    }
  }
}
```

**Details**: See `03-VALIDATION.md`

---

### Q4: History Management

**Current**: Each deploy step is separate history entry

**With Action-Based**:

- Option A: Keep separate entries (simple undo)
- Option B: Group into transaction (cleaner history)
- Option C: Deploy session IS the history entry

**Recommendation**: Option A initially, migrate to C later - See `04-HISTORY.md`

---

### Q5: Recombine Moves

**Gap**: Pieces cannot rejoin deployed stacks

**With Action-Based**:

- Track deployed squares in session
- Generate moves to deployed squares (if in range)
- Action: Move + Combine

**Details**: See `05-RECOMBINE.md`

---

## 📁 Document Structure

This folder contains:

### Current Files (Ready for Implementation)

1. **00-OVERVIEW.md** (this file) - Architecture overview
2. **01-FEN-HANDLING.md** - FEN representation during deploy
3. **02-MOVE-GENERATION.md** - Generating moves during active deploy
4. **COMPLETE-IMPLEMENTATION-GUIDE.md** - Complete specification and
   implementation details
5. **SAN-PARSER-SPEC.md** - Parser specification for extended FEN and PGN
6. **✅ FINAL-STATUS.md** - **READ THIS FIRST** - Complete resolution status
7. **RESOLVED-GAPS.md** - Documentation of resolved design decisions

### Historical Reference (Superseded)

8. **GAP-ANALYSIS.md** - Original gap identification (now resolved)
9. **CRITICAL-RISKS.md** - Risk analysis (OUTDATED - issues resolved)

### Not Needed (Information in Existing Docs)

10. **03-VALIDATION.md** - Covered in COMPLETE-IMPLEMENTATION-GUIDE.md
11. **04-HISTORY.md** - Covered in COMPLETE-IMPLEMENTATION-GUIDE.md
12. **05-RECOMBINE.md** - Covered in COMPLETE-IMPLEMENTATION-GUIDE.md
13. **06-IMPLEMENTATION-PLAN.md** - Covered in FINAL-STATUS.md
14. **07-COMPARISON.md** - Not needed for implementation

---

## 🎯 Success Criteria

This architecture should achieve:

- [ ] **Simplicity**: Less code, easier to understand
- [ ] **Correctness**: All game rules enforced
- [ ] **Performance**: No virtual board overhead
- [ ] **Completeness**: Recombine moves, validation, etc.
- [ ] **Maintainability**: Clear action audit trail
- [ ] **Testability**: Easy to test action sequences

---

## 🚀 Next Steps

1. **✅ READ `FINAL-STATUS.md` FIRST** - Complete resolution status and
   implementation plan
2. Review implementation guide documents:
   - `COMPLETE-IMPLEMENTATION-GUIDE.md` - Core specification
   - `SAN-PARSER-SPEC.md` - Parser implementation details
   - `RESOLVED-GAPS.md` - Design decisions made
3. Begin implementation following phased approach in `FINAL-STATUS.md`
4. Set up test framework for deploy session
5. Implement Phase 1: Core deploy session (4-6 hours)
6. Iterate through remaining phases with testing
7. Update main documentation in `/docs/context/` after completion

---

**Status**: ✅ **READY FOR IMPLEMENTATION** - All critical issues resolved, 0
blockers  
**Estimated Time**: 17-26 hours (2-3 working days)  
**Required Reading**: `FINAL-STATUS.md` → `COMPLETE-IMPLEMENTATION-GUIDE.md` →
`SAN-PARSER-SPEC.md`                                                    
