# Deploy Session Implementation Roadmap

**Estimated Time**: 15-22 hours (2-3 working days)  
**Difficulty**: Medium  
**Risk**: Low (fully backward compatible)

---

## 📁 Files to Create/Modify

### New Files (1)

- `src/deploy-session.ts` - New DeploySession class

### Modified Files (4)

- `src/type.ts` - Deprecate DeployState type
- `src/move-apply.ts` - Update actions and commands
- `src/cotulenh.ts` - Replace \_deployState with \_deploySession
- `src/move-generation.ts` - Add recombine move generation

### Test Files (2)

- `__tests__/deploy-session.test.ts` - New unit tests
- `__tests__/deploy-integration.test.ts` - Update integration tests

---

## 🚀 Phase 1: Core DeploySession Class (4-6 hours)

### Task 1.1: Create DeploySession class

**File**: `src/deploy-session.ts` **Time**: 2-3 hours

```typescript
// Implementation checklist:
✓ Basic class structure with constructor
✓ getRemainingPieces() method
✓ getDeployedSquares() method
✓ addMove() / undoLastMove() methods
✓ canCommit() / isComplete() methods
✓ toLegacyDeployState() for compatibility
✓ cancel() method
```

**Testing**:

```bash
npm test -- deploy-session.test.ts
```

### Task 1.2: Add unit tests

**File**: `__tests__/deploy-session.test.ts` **Time**: 1-2 hours

```typescript
// Test coverage:
✓ Constructor creates valid session
✓ getRemainingPieces() calculates correctly
✓ getDeployedSquares() tracks squares
✓ addMove() updates actions array
✓ undoLastMove() removes last move
✓ canCommit() returns correct values
✓ isComplete() detects completion
✓ toLegacyDeployState() converts correctly
```

### Task 1.3: Verify no breaking changes

**Time**: 15-30 minutes

```bash
npm test  # All existing tests should still pass
```

---

## 🔧 Phase 2: Update Actions (2-3 hours)

### Task 2.1: Rename and simplify SetDeployStateAction

**File**: `src/move-apply.ts` **Time**: 1 hour

```typescript
// Changes:
1. Rename: SetDeployStateAction → SetDeploySessionAction
2. Simplify execute() logic (remove complex counting)
3. Update constructor to accept DeploySession
4. Update undo() to restore session

// Before: ~30 lines of complex logic
// After: ~10 lines of simple logic
```

### Task 2.2: Update SingleDeployMoveCommand

**File**: `src/move-apply.ts` **Time**: 30 minutes

```typescript
// Changes:
1. Get current session from game
2. Create or update DeploySession
3. Call SetDeploySessionAction with updated session

// New logic:
const session = this.game.getDeploySession()
if (session) {
  session.addMove(this.move)
} else {
  session = new DeploySession({...})
}
this.actions.push(new SetDeploySessionAction(this.game, session))
```

### Task 2.3: Update DeployMoveCommand

**File**: `src/move-apply.ts` **Time**: 30 minutes

```typescript
// Changes:
1. Create DeploySession with all moves
2. Pass to SetDeploySessionAction

// Simplified logic using session
```

### Task 2.4: Test action changes

**Time**: 30 minutes

```bash
npm test -- move-apply.test.ts
npm test -- action-system.test.ts
```

---

## 🎮 Phase 3: CoTuLenh Integration (2-3 hours)

### Task 3.1: Replace \_deployState with \_deploySession

**File**: `src/cotulenh.ts` **Time**: 30 minutes

```typescript
// Simple find/replace with updates:
- private _deployState: DeployState | null = null
+ private _deploySession: DeploySession | null = null
```

### Task 3.2: Update accessor methods

**File**: `src/cotulenh.ts` **Time**: 30 minutes

```typescript
// New methods:
+ getDeploySession(): DeploySession | null
+ setDeploySession(session: DeploySession | null): void

// Compatibility methods (keep existing):
getDeployState(): DeployState | null {
  return this._deploySession?.toLegacyDeployState() || null
}

setDeployState(state: DeployState | null): void {
  // Convert legacy state to session
}
```

### Task 3.3: Update History interface

**File**: `src/cotulenh.ts` **Time**: 15 minutes

```typescript
interface History {
  move: CTLMoveCommandInteface
  commanders: Record<Color, number>
  turn: Color
  halfMoves: number
  moveNumber: number
- deployState: DeployState | null
+ deploySession: DeploySession | null
}
```

### Task 3.4: Update \_makeMove and \_undoMove

**File**: `src/cotulenh.ts` **Time**: 30 minutes

```typescript
// Update snapshot capture:
- const preDeployState = this._deployState
+ const preDeploySession = this._deploySession

// Update history storage:
this._history.push({
  ...,
- deployState: preDeployState,
+ deploySession: preDeploySession,
})

// Update restoration:
- this._deployState = old.deployState
+ this._deploySession = old.deploySession
```

### Task 3.5: Update move generation call

**File**: `src/cotulenh.ts` **Time**: 15 minutes

```typescript
// Update condition check:
- if (this._deployState && this._deployState.turn === us)
+ if (this._deploySession && this._deploySession.turn === us)

// Pass session to generator:
- allMoves = generateDeployMoves(this, this._deployState.stackSquare, ...)
+ allMoves = generateDeploySessionMoves(this, this._deploySession)
```

### Task 3.6: Test CoTuLenh changes

**Time**: 30 minutes

```bash
npm test -- cotulenh.test.ts
npm test -- fen.test.ts
npm test -- history.test.ts
```

---

## 📝 Phase 4: Extended FEN (3-4 hours)

### Task 4.1: Add toExtendedFEN method

**File**: `src/deploy-session.ts` **Time**: 1-2 hours

```typescript
toExtendedFEN(baseFEN: string, game: CoTuLenh): string {
  // Reuse deployMoveToSanLan for SAN generation
  // Format: "base-fen DEPLOY c3:Nc5,Fxd4..."
}
```

### Task 4.2: Update game.fen() method

**File**: `src/cotulenh.ts` **Time**: 30 minutes

```typescript
fen(): string {
  const baseFEN = this.generateBaseFEN()

  if (this._deploySession) {
    return this._deploySession.toExtendedFEN(baseFEN, this)
  }

  return baseFEN
}
```

### Task 4.3: Implement FEN parser (optional for MVP)

**File**: `src/deploy-session.ts` **Time**: 2-3 hours (can be deferred)

```typescript
static fromExtendedFEN(extendedFEN: string, game: CoTuLenh): DeploySession | null {
  // Parse "DEPLOY c3:Nc5,Fxd4..." format
  // Reconstruct session from SAN moves
}
```

### Task 4.4: Test extended FEN

**Time**: 30 minutes

```bash
npm test -- fen.test.ts
```

---

## 🔄 Phase 5: Recombine Moves (2-3 hours)

### Task 5.1: Add generateRecombineMoves function

**File**: `src/move-generation.ts` **Time**: 1-2 hours

```typescript
function generateRecombineMoves(
  game: CoTuLenh,
  session: DeploySession,
  remaining: Piece,
  normalMoves: InternalMove[],
): InternalMove[] {
  const deployedSquares = session.getDeployedSquares()

  // For each remaining piece
  // For each deployed square
  // Check if can combine (not normal move)
  // Generate DEPLOY | COMBINATION move
}
```

### Task 5.2: Update generateDeployMoves

**File**: `src/move-generation.ts` **Time**: 30 minutes

```typescript
function generateDeploySessionMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  const remaining = session.getRemainingPieces()
  const normalMoves = generateNormalDeployMoves(game, session, remaining)
  const recombineMoves = generateRecombineMoves(
    game,
    session,
    remaining,
    normalMoves,
  )

  return [...normalMoves, ...recombineMoves]
}
```

### Task 5.3: Test recombine generation

**Time**: 30 minutes

```bash
npm test -- move-generation.test.ts
npm test -- recombine.test.ts
```

---

## ✅ Phase 6: Testing & Validation (2-3 hours)

### Task 6.1: Run full test suite

**Time**: 30 minutes

```bash
npm test
```

**Expected**: All tests pass (or known issues documented)

### Task 6.2: Integration testing

**Time**: 1 hour

Test scenarios:

- ✓ Basic deploy sequence (Navy, AirForce, Tank)
- ✓ Deploy with captures
- ✓ Deploy with stay pieces
- ✓ Recombine moves during deploy
- ✓ Undo during deploy session
- ✓ Undo after deploy complete
- ✓ Extended FEN save/load

### Task 6.3: Performance testing

**Time**: 30 minutes

```bash
# Benchmark key operations:
- getRemainingPieces() - should be < 1ms
- generateDeploySessionMoves() - should be < 10ms
- toExtendedFEN() - should be < 5ms
```

### Task 6.4: Documentation updates

**Time**: 30 minutes

Files to update:

- API documentation
- Migration guide
- Changelog
- README examples

---

## 📊 Progress Tracking

### Phase 1: Core Session

- [ ] Create DeploySession class
- [ ] Add unit tests
- [ ] Verify no breaking changes

### Phase 2: Actions

- [ ] Rename/simplify SetDeployStateAction
- [ ] Update SingleDeployMoveCommand
- [ ] Update DeployMoveCommand
- [ ] Test action changes

### Phase 3: Integration

- [ ] Replace \_deployState field
- [ ] Update accessor methods
- [ ] Update History interface
- [ ] Update \_makeMove/\_undoMove
- [ ] Update move generation
- [ ] Test integration

### Phase 4: Extended FEN

- [ ] Add toExtendedFEN method
- [ ] Update game.fen() method
- [ ] Implement FEN parser (optional)
- [ ] Test FEN generation

### Phase 5: Recombine

- [ ] Add generateRecombineMoves
- [ ] Update generateDeployMoves
- [ ] Test recombine generation

### Phase 6: Testing

- [ ] Run full test suite
- [ ] Integration testing
- [ ] Performance testing
- [ ] Documentation updates

---

## 🎯 Success Metrics

### Code Quality

- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Code coverage ≥ 80%
- ✅ No performance regressions

### Feature Completeness

- ✅ DeploySession tracks full history
- ✅ Extended FEN generation works
- ✅ Recombine moves generated correctly
- ✅ Backward compatibility maintained

### Documentation

- ✅ API docs updated
- ✅ Migration guide complete
- ✅ Examples updated
- ✅ Changelog updated

---

## 🚨 Risk Management

### Low Risk Items

- DeploySession class creation (new code)
- Unit test addition
- Extended FEN generation (additive)

### Medium Risk Items

- SetDeployStateAction refactoring (complex logic)
- CoTuLenh integration (many touch points)
- Move generation updates (affects validation)

### Mitigation Strategies

1. **Incremental commits**: Commit after each task
2. **Test-driven**: Write tests before refactoring
3. **Feature flags**: Can disable extended FEN if issues
4. **Rollback plan**: Git history allows easy rollback

---

## 📞 Support Resources

### Documentation

- `ACTION-BASED-DEPLOY-REFACTORING-SPEC.md` - Complete spec
- `DEPLOY-SESSION-COMPARISON.md` - Before/after comparison
- `docs/deploy-action-based-architecture/` - Architecture docs

### Code References

- Current implementation: `src/move-apply.ts:180-227`
- Deploy moves: `src/deploy-move.ts`
- Move generation: `src/move-generation.ts`

### Testing

- Unit tests: `__tests__/deploy-session.test.ts`
- Integration: `__tests__/deploy-integration.test.ts`
- E2E: `__tests__/cotulenh.test.ts`

---

## 🎉 Quick Start

Ready to begin? Start with Phase 1:

```bash
# 1. Create new file
touch src/deploy-session.ts

# 2. Copy skeleton from ACTION-BASED-DEPLOY-REFACTORING-SPEC.md

# 3. Implement methods one by one

# 4. Add tests as you go
touch __tests__/deploy-session.test.ts

# 5. Run tests frequently
npm test -- deploy-session.test.ts
```

**First milestone**: Get DeploySession class working with all tests passing.

Then proceed through phases 2-6 systematically.

---

**Ready to implement**: All specifications complete, no blockers identified.  
**Next step**: Begin Phase 1 - Create DeploySession class.
