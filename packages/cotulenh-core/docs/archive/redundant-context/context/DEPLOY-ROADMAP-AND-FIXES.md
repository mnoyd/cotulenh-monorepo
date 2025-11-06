# Deploy Move Implementation Roadmap

**Created**: October 21, 2025  
**Purpose**: Actionable implementation plan for closing deploy move gaps  
**Reference**: See `DEPLOY-IMPLEMENTATION-GAPS.md` for detailed gap analysis

---

## 📋 Quick Reference

**Total Gaps Identified**: 5 major gaps  
**Critical Severity**: 2 gaps (recombine, validation)  
**High Priority**: 1 gap (virtual state)  
**Medium Priority**: 2 gaps (FEN, history)  
**Estimated Total Work**: 4-5 weeks

---

## 🚀 Phase 1: Critical Bug Fixes (Week 1-2)

### Fix 1.1: Intermediate State Validation ⚠️ CRITICAL

**Problem**: Navy can move first, leaving land pieces on water (game-breaking
bug).

**Files to Modify**:

- `move-apply.ts` - `SingleDeployMoveCommand.buildActions()`
- Add new file: `terrain-validation.ts` (helper functions)

**Implementation Steps**:

1. **Create terrain validation helpers** (`terrain-validation.ts`):

```typescript
export function getTerrainType(square: number): 'water' | 'mixed' | 'land' {
  const file = square & 0x0f
  if (file <= 1) return 'water' // a-b files
  if (file === 2) return 'mixed' // c file
  if (LAND_MASK[square] && NAVY_MASK[square]) return 'mixed' // river
  if (LAND_MASK[square]) return 'land'
  return 'water'
}

export function canAccessTerrain(
  pieceType: PieceSymbol,
  terrain: string,
): boolean {
  if (terrain === 'water') {
    return pieceType === NAVY || pieceType === AIR_FORCE
  }
  if (terrain === 'land') {
    return pieceType !== NAVY
  }
  // Mixed terrain - all pieces allowed
  return true
}

export function validateStackForTerrain(
  square: number,
  pieces: Piece[],
): { valid: boolean; error?: string } {
  const terrain = getTerrainType(square)

  for (const piece of pieces) {
    if (!canAccessTerrain(piece.type, terrain)) {
      return {
        valid: false,
        error: `${piece.type} cannot exist on ${terrain} terrain at ${algebraic(square)}`,
      }
    }
  }

  return { valid: true }
}
```

2. **Add validation to `SingleDeployMoveCommand`**:

```typescript
export class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const carrierPiece = this.game.get(this.move.from)
    const flattendMovingPieces = flattenPiece(this.move.piece)

    // NEW: Validate remaining stack can stay on terrain
    const allPieces = flattenPiece(carrierPiece)
    const remaining = allPieces.filter(
      (p) => !flattendMovingPieces.some((mp) => mp.type === p.type),
    )

    if (remaining.length > 0) {
      const validation = validateStackForTerrain(this.move.from, remaining)
      if (!validation.valid) {
        throw new Error(`Deploy validation failed: ${validation.error}`)
      }
    }

    // Continue with existing logic...
    if (this.move.flags & BITS.STAY_CAPTURE) {
      // ... existing code
    } else {
      this.actions.push(
        new RemoveFromStackAction(this.game, this.move.from, this.move.piece),
      )
      // ... rest of actions
    }
  }
}
```

3. **Add tests** (`deploy-validation.test.ts`):

```typescript
describe('Deploy Intermediate State Validation', () => {
  test('should reject Navy moving first from water stack', () => {
    // Stack at b3 (water): Navy + [Air Force, Tank]
    const game = new CoTuLenh(
      '11/11/11/11/11/11/11/11/(NFT)10/11/11/11 r - - 0 1',
    )

    expect(() => {
      game.move({ from: 'a3', to: 'a5', piece: 'n', deploy: true })
    }).toThrow('Tank cannot exist on water terrain')
  })

  test('should allow Air Force moving first from water stack', () => {
    const game = new CoTuLenh(
      '11/11/11/11/11/11/11/11/(NFT)10/11/11/11 r - - 0 1',
    )

    // Air Force moves - leaves Navy + Tank on water (valid)
    expect(() => {
      game.move({ from: 'a3', to: 'c4', piece: 'f', deploy: true })
    }).not.toThrow()
  })

  test('should allow any order on mixed terrain', () => {
    // Stack at c3 (mixed): Navy + [Tank, Infantry]
    const game = new CoTuLenh(
      '11/11/11/11/11/11/11/11/2(NTI)8/11/11/11 r - - 0 1',
    )

    // Navy can move first - Tank+Infantry can stay on mixed
    expect(() => {
      game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })
    }).not.toThrow()
  })
})
```

**Estimated Time**: 2-3 days  
**Risk**: Low - well-defined problem  
**Dependencies**: None

---

### Fix 1.2: Recombine Move Generation ⚠️ CRITICAL

**Problem**: Pieces cannot rejoin already-deployed stacks during deployment.

**Files to Modify**:

- `move-generation.ts` - `generateDeployMoves()`
- `deploy-move.ts` - Add recombine handling
- `move-apply.ts` - Add `RecombineMoveCommand`

**Implementation Steps**:

1. **Add recombine move generation** (`move-generation.ts`):

```typescript
export function generateDeployMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const moves: InternalMove[] = []
  const deployState = gameInstance.getDeployState()

  // ... existing code for normal deploy moves ...

  // NEW: Generate recombine moves
  if (deployState && deployState.movedPieces.length > 0) {
    for (const piece of deployMoveCandidates) {
      if (filterPiece && piece.type !== filterPiece) continue

      // Check each already-deployed piece location
      const deployedSquares = new Set(
        deployState.movedPieces.map((mp) => {
          // Find where this piece ended up
          // Need to track destination in movedPieces
          return mp.destination // Assumes we add destination tracking
        }),
      )

      for (const destSq of deployedSquares) {
        // Check if piece can reach deployed square
        const canReach = canPieceReachSquare(
          gameInstance,
          stackSquare,
          destSq,
          piece,
        )

        if (canReach) {
          moves.push({
            from: stackSquare,
            to: destSq,
            piece: piece,
            color: piece.color,
            flags: BITS.DEPLOY | BITS.COMBINATION,
            // Mark as recombine
          })
        }
      }
    }
  }

  return moves
}

function canPieceReachSquare(
  game: CoTuLenh,
  from: number,
  to: number,
  piece: Piece,
): boolean {
  // Check if piece can move from 'from' to 'to'
  const moves = generateMovesForPiece(game, from, piece, true)
  return moves.some((m) => m.to === to)
}
```

2. **Update `DeployState` to track destinations**:

```typescript
// In type.ts
export interface DeployState {
  stackSquare: number
  turn: Color
  originalPiece?: Piece
  movedPieces: Array<{
    type: PieceSymbol
    color: Color
    destination: number // NEW: Track where piece deployed
  }>
  stay?: Piece[]
}
```

3. **Update `SetDeployStateAction` to record destinations**:

```typescript
execute(): void {
  // ... existing code ...

  if (this.oldDeployState) {
    const updatedMovedPiece = [
      ...this.oldDeployState.movedPieces,
      {
        type: this.move.piece.type,
        color: this.move.piece.color,
        destination: this.move.to  // NEW: Record destination
      }
    ]
    // ... rest of logic
  }
}
```

4. **Add tests** (`deploy-recombine.test.ts`):

```typescript
describe('Deploy Recombine Moves', () => {
  test('should generate recombine move for Tank to join Navy', () => {
    const game = new CoTuLenh(
      '11/11/11/11/11/11/11/11/(NFT)10/11/11/11 r - - 0 1',
    )

    // Air Force deploys to c4
    game.move({ from: 'a3', to: 'c4', piece: 'f', deploy: true })

    // Check moves for remaining pieces (Navy, Tank)
    const moves = game.moves({ square: 'a3', verbose: true })

    // Find recombine move
    const recombineMove = moves.find(
      (m) => m.to === 'c4' && m.piece.type === 't',
    )

    expect(recombineMove).toBeDefined()
    expect(recombineMove.flags).toContain('c') // combination flag
  })

  test('should not generate recombine if piece out of range', () => {
    const game = new CoTuLenh(
      '11/11/11/11/11/11/11/11/(NFI)10/11/11/11 r - - 0 1',
    )

    // Navy deploys far away (a3 → a7 = 4 squares)
    game.move({ from: 'a3', to: 'a7', piece: 'n', deploy: true })

    // Infantry range = 1, cannot reach a7 from a3
    const moves = game.moves({ square: 'a3', pieceType: 'i', verbose: true })
    const recombineMove = moves.find((m) => m.to === 'a7')

    expect(recombineMove).toBeUndefined()
  })

  test('should execute recombine correctly', () => {
    const game = new CoTuLenh(
      '11/11/11/11/11/11/11/11/(NTI)10/11/11/11 r - - 0 1',
    )

    // Navy → a5
    game.move({ from: 'a3', to: 'a5', piece: 'n', deploy: true })

    // Tank → a5 (recombine)
    game.move({ from: 'a3', to: 'a5', piece: 't', deploy: true })

    // Check that a5 now has Navy+Tank stack
    const piece = game.get('a5')
    expect(piece.type).toBe('n')
    expect(piece.carrying).toBeDefined()
    expect(piece.carrying.length).toBe(1)
    expect(piece.carrying[0].type).toBe('t')
  })
})
```

**Estimated Time**: 3-4 days  
**Risk**: Medium - requires tracking deploy destinations  
**Dependencies**: DeployState structure change

---

## 🔧 Phase 2: Architecture Improvements (Week 3-4)

### Fix 2.1: Virtual State Architecture

**Problem**: Board mutated during deploy instead of using virtual overlay.

**Benefits**:

- Atomic commits
- Easy rollback
- Unified code paths
- Cleaner validation

**Implementation Approach**: See `virtual-deploy-state-architecture.md` for full
details.

**Key Changes**:

1. Add `virtualChanges: Map<Square, Piece | null>` to `DeployState`
2. Create `VirtualBoard` class for effective board view
3. Modify atomic actions to check deploy mode
4. Commit virtual changes only on completion

**Estimated Time**: 5-7 days  
**Risk**: High - major refactor  
**Dependencies**: Complete Phase 1 first

---

### Fix 2.2: Extended FEN Format

**Problem**: Cannot serialize deploy state in FEN.

**Files to Modify**:

- `cotulenh.ts` - `fen()` method
- `fen.ts` - Add parsing for DEPLOY marker

**Implementation**:

```typescript
fen(): string {
  const baseFEN = this.generateBaseFEN()

  if (!this._deployState) {
    return baseFEN
  }

  // Serialize deploy session
  const remaining = this.getRemainingPieces()
  const pieceStr = remaining.map(p => p.type.toUpperCase()).join('')
  const deployMarker = `DEPLOY ${algebraic(this._deployState.stackSquare)}:${pieceStr} ${this._deployState.movedPieces.length}`

  return `${baseFEN} ${deployMarker}`
}
```

**Estimated Time**: 3-4 days  
**Risk**: Low - well-defined format  
**Dependencies**: None

---

## 📦 Phase 3: UX Enhancements (Week 5)

### Fix 3.1: Transaction History

**Problem**: Deploy stored as multiple entries instead of single transaction.

**Implementation**: Store deploy moves temporarily, add to main history only on
completion.

**Estimated Time**: 4-5 days  
**Risk**: Low  
**Dependencies**: None

---

## 🧪 Testing Strategy

### Unit Tests (Per Fix)

- Terrain validation: 10+ tests
- Recombine moves: 15+ tests
- Virtual state: 20+ tests
- Extended FEN: 10+ tests
- Transaction history: 8+ tests

### Integration Tests

- Complete deploy sequences
- Undo/redo during deploy
- Save/load mid-deploy
- Edge cases (single piece, all pieces move, etc.)

### Regression Tests

- Ensure existing deploy functionality still works
- Verify Phase 3 production fixes remain valid

**Total Test Count**: 80-100 new tests

---

## 📈 Success Metrics

- [ ] All critical tests pass
- [ ] No terrain validation bugs
- [ ] Recombine moves generate correctly
- [ ] FEN round-trip works mid-deploy
- [ ] Performance impact < 5%
- [ ] Code coverage > 90% for deploy system

---

## 🎯 Delivery Timeline

| Phase         | Duration | Deliverables               |
| ------------- | -------- | -------------------------- |
| **Phase 1.1** | 2-3 days | Terrain validation + tests |
| **Phase 1.2** | 3-4 days | Recombine moves + tests    |
| **Phase 2.1** | 5-7 days | Virtual state refactor     |
| **Phase 2.2** | 3-4 days | Extended FEN + parsing     |
| **Phase 3.1** | 4-5 days | Transaction history        |
| **Testing**   | 3-4 days | Integration + regression   |

**Total**: 4-5 weeks (20-27 working days)

---

## 🚧 Implementation Notes

### Code Review Checkpoints

- After Phase 1.1: Review validation logic
- After Phase 1.2: Review recombine implementation
- After Phase 2: Review architecture changes
- After Phase 3: Final code review

### Documentation Updates

- Update `deployment-mechanics.md` with new features
- Update `external-api-usage-guide.md` with recombine examples
- Add recombine moves to `complete-request-response-examples.md`
- Update `DEPLOY-CRITICAL-LEARNINGS.md` with new insights

### Backward Compatibility

- Phase 1 changes are backward compatible
- Phase 2 virtual state may require API updates
- FEN format extended but backward compatible (old FENs still parse)
- Transaction history changes internal only

---

## 🔗 Related Files

**Gap Analysis**: `DEPLOY-IMPLEMENTATION-GAPS.md`  
**Current Spec**: `deployment-mechanics.md`  
**Production Bugs**: `DEPLOY-CRITICAL-LEARNINGS.md`  
**Legacy Designs**: `deploy-session-*.md` files

**Implementation Files**:

- `move-generation.ts` - Move generation
- `move-apply.ts` - Move execution
- `deploy-move.ts` - Deploy data structures
- `cotulenh.ts` - Main game class

---

## ✅ Pre-Implementation Checklist

- [ ] Read `DEPLOY-IMPLEMENTATION-GAPS.md` completely
- [ ] Understand current deploy flow from `DEPLOY-CRITICAL-LEARNINGS.md`
- [ ] Review virtual state architecture from legacy docs
- [ ] Set up test environment
- [ ] Create feature branch for Phase 1
- [ ] Notify team of upcoming changes

---

**Status**: Ready for implementation  
**Next Action**: Begin Phase 1.1 - Terrain validation
