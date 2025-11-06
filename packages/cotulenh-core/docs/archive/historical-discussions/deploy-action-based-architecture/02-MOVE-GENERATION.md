# Move Generation in Action-Based Deploy

**Question**: How do we generate legal moves during an active deploy session?

---

## 🎯 The Problem

During deployment:

- Stack square is being modified incrementally
- We need to know which pieces remain
- Must only generate moves for remaining pieces
- Need to support recombine moves

**Challenge**: Board shows current state, but we need to know what's left to
deploy.

---

## 📋 Approach: Calculate from Actions

**Core Idea**: Derive remaining pieces by subtracting moved pieces from
original.

```typescript
function getRemainingPieces(session: DeploySession): Piece[] {
  const original = flattenPiece(session.originalPiece)
  const movedPieces = extractMovedPiecesFromActions(session.actions)

  return original.filter((p) => {
    const wasMoved = movedPieces.some(
      (mp) => mp.type === p.type && mp.color === p.color,
    )
    return !wasMoved
  })
}
```

---

## 🔧 Implementation Details

### Step 1: Extract Moved Pieces from Actions

```typescript
function extractMovedPiecesFromActions(
  actions: DeployAction[],
): { type: PieceSymbol; color: Color }[] {
  const moved: { type: PieceSymbol; color: Color }[] = []

  for (const action of actions) {
    // Look for "remove from stack" actions
    if (action.type === 'remove-from-stack') {
      moved.push({
        type: action.piece.type,
        color: action.piece.color,
      })
    }
  }

  return moved
}
```

**Key Insight**: We track "remove-from-stack" actions specifically, not all
removals (e.g., captures are different).

---

### Step 2: Calculate Remaining Pieces

```typescript
function calculateRemainingPieces(session: DeploySession): Piece[] {
  if (!session) return []

  const original = flattenPiece(session.originalPiece)
  const moved = extractMovedPiecesFromActions(session.actions)

  // Filter out moved pieces
  const remaining: Piece[] = []
  const movedCopy = [...moved]

  for (const piece of original) {
    const movedIndex = movedCopy.findIndex(
      (m) => m.type === piece.type && m.color === piece.color,
    )

    if (movedIndex === -1) {
      // Not moved yet
      remaining.push(piece)
    } else {
      // Already moved, skip
      movedCopy.splice(movedIndex, 1)
    }
  }

  return remaining
}
```

---

### Step 3: Generate Moves for Remaining Pieces

```typescript
function generateDeployMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  const moves: InternalMove[] = []
  const remaining = calculateRemainingPieces(session)

  if (remaining.length === 0) {
    // All pieces deployed
    return []
  }

  // Generate moves for each remaining piece
  for (const piece of remaining) {
    const pieceMoves = generateMovesForPiece(
      game,
      session.stackSquare,
      piece,
      true, // isDeploy = true
    )

    pieceMoves.forEach((m) => {
      m.flags |= BITS.DEPLOY
      moves.push(m)
    })
  }

  return moves
}
```

---

## 🔄 Recombine Moves

**Key Feature**: Pieces should be able to rejoin already-deployed pieces.

### Track Deployed Squares

```typescript
function getDeployedSquares(session: DeploySession): Set<Square> {
  const deployedSquares = new Set<Square>()

  for (const action of session.actions) {
    if (action.type === 'place') {
      deployedSquares.add(action.square)
    }
  }

  return deployedSquares
}
```

---

### Generate Recombine Moves

```typescript
function generateRecombineMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  const moves: InternalMove[] = []
  const remaining = calculateRemainingPieces(session)
  const deployedSquares = getDeployedSquares(session)

  for (const piece of remaining) {
    for (const targetSquare of deployedSquares) {
      // Check if piece can reach this square
      const canReach = isPieceInRange(
        game,
        session.stackSquare,
        targetSquare,
        piece,
      )

      if (canReach) {
        moves.push({
          from: session.stackSquare,
          to: targetSquare,
          piece: piece,
          color: piece.color,
          flags: BITS.DEPLOY | BITS.COMBINATION,
        })
      }
    }
  }

  return moves
}
```

---

### Complete Move Generation

```typescript
function generateDeployMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  // 1. Generate moves to new squares
  const newSquareMoves = generateMovesToNewSquares(game, session)

  // 2. Generate recombine moves
  const recombineMoves = generateRecombineMoves(game, session)

  // 3. Combine and return
  return [...newSquareMoves, ...recombineMoves]
}
```

---

## 🎮 Integration with Main Move Generation

```typescript
class CoTuLenh {
  private _moves(options?: MoveOptions): InternalMove[] {
    const us = this.turn()

    // Check if deploy session is active
    if (this._deploySession && this._deploySession.turn === us) {
      // DEPLOY MODE: Only generate deploy moves
      return this.generateDeployMoves(this._deploySession)
    }

    // NORMAL MODE: Generate all moves
    return generateNormalMoves(this, us, options)
  }

  private generateDeployMoves(session: DeploySession): InternalMove[] {
    const remaining = calculateRemainingPieces(session)

    if (remaining.length === 0) {
      // All pieces deployed, but session not closed yet
      // This shouldn't happen, but handle gracefully
      return []
    }

    const moves: InternalMove[] = []

    // Generate moves to new squares
    for (const piece of remaining) {
      const pieceMoves = generateMovesForPiece(
        this,
        session.stackSquare,
        piece,
        true,
      )
      pieceMoves.forEach((m) => {
        m.flags |= BITS.DEPLOY
        moves.push(m)
      })
    }

    // Generate recombine moves
    const deployedSquares = getDeployedSquares(session)
    for (const piece of remaining) {
      for (const targetSq of deployedSquares) {
        if (this.canPieceReach(session.stackSquare, targetSq, piece)) {
          moves.push({
            from: session.stackSquare,
            to: targetSq,
            piece: piece,
            color: piece.color,
            flags: BITS.DEPLOY | BITS.COMBINATION,
          })
        }
      }
    }

    // Filter legal moves (check not in check after move)
    return this._filterLegalMoves(moves, us)
  }
}
```

---

## 📊 Example Flow

```typescript
// Initial: Stack at c3: (NFT)
const game = new CoTuLenh()
game.put({ type: 'n', carrying: [f, t] }, 'c3')

// ━━━ STEP 1: Deploy Navy ━━━
game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })

// Calculate remaining
session.originalPiece // (NFT)
session.actions // [remove Navy from c3, place Navy at c5]
remaining = calculateRemainingPieces(session) // [F, T]

// Generate moves
moves = game.moves()
// → Moves for Air Force from c3
// → Moves for Tank from c3
// → NO recombine to c5 (Navy alone, cannot combine with F or T)

// ━━━ STEP 2: Deploy Air Force ━━━
game.move({ from: 'c3', to: 'd4', piece: 'f', deploy: true })

// Calculate remaining
session.actions // [remove N, place N, remove F, place F]
remaining = calculateRemainingPieces(session) // [T]

// Generate moves
moves = game.moves()
// → Moves for Tank from c3
// → Recombine move: Tank to c5 (if in range, combine with Navy)
// → Recombine move: Tank to d4 (if in range, combine with Air Force)

// ━━━ STEP 3: Tank Recombines ━━━
game.move({ from: 'c3', to: 'c5', piece: 't', deploy: true })

// Session completes
remaining = calculateRemainingPieces(session) // []
// → Auto-close session, switch turn
```

---

## 🧪 Testing

```typescript
describe('Deploy Move Generation', () => {
  test('should generate moves for remaining pieces only', () => {
    const game = new CoTuLenh()
    game.put({ type: 'n', carrying: [f, t] }, 'c3')

    // Deploy Navy
    game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })

    const moves = game.moves({ verbose: true })

    // Should only have moves for F and T
    const navyMoves = moves.filter((m) => m.piece.type === 'n')
    const airForceMoves = moves.filter((m) => m.piece.type === 'f')
    const tankMoves = moves.filter((m) => m.piece.type === 't')

    expect(navyMoves.length).toBe(0) // Navy already moved
    expect(airForceMoves.length).toBeGreaterThan(0)
    expect(tankMoves.length).toBeGreaterThan(0)
  })

  test('should generate recombine moves when in range', () => {
    const game = new CoTuLenh()
    game.put({ type: 'n', carrying: [t] }, 'c3')

    // Navy moves to c4 (1 square away)
    game.move({ from: 'c3', to: 'c4', piece: 'n', deploy: true })

    const moves = game.moves({ verbose: true })

    // Tank should have recombine option to c4 (2 square range)
    const recombine = moves.find(
      (m) => m.to === 'c4' && m.piece.type === 't' && m.flags.includes('c'),
    )

    expect(recombine).toBeDefined()
  })

  test('should not generate recombine if out of range', () => {
    const game = new CoTuLenh()
    game.put({ type: 'n', carrying: [i] }, 'c3')

    // Navy moves far away (4 squares)
    game.move({ from: 'c3', to: 'c7', piece: 'n', deploy: true })

    const moves = game.moves({ verbose: true })

    // Infantry range = 1, cannot reach c7 from c3
    const recombine = moves.find((m) => m.to === 'c7' && m.piece.type === 'i')

    expect(recombine).toBeUndefined()
  })
})
```

---

## 🎯 Key Advantages

1. **No State Duplication**: Calculate remaining on-demand
2. **Action Audit Trail**: Clear record of what moved
3. **Recombine Support**: Natural extension of move generation
4. **Simple Logic**: Original - Moved = Remaining

---

## 🚨 Edge Cases

### Empty Stack After Moves

```typescript
// All pieces deployed but session still active
remaining = [] // Empty array
moves = generateDeployMoves(session) // Returns []
// Session should auto-close after this
```

### Duplicate Piece Types

```typescript
// Stack: (T|T|I) - Two tanks!
original = [Tank1, Tank2, Infantry]
moved = [Tank] // Which tank?

// Solution: Match by index, not just type
// OR: Use unique IDs for pieces
```

**Recommendation**: Track pieces by array index in original stack.

---

## ✅ Decision Summary

- **Calculate remaining pieces** from actions (don't store)
- **Generate moves** for remaining pieces only
- **Support recombine moves** automatically
- **Use action audit trail** as source of truth

---

**Status**: Design finalized  
**Next Document**: `03-VALIDATION.md`
