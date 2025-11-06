# FEN Handling in Action-Based Deploy

**Question**: How should FEN represent game state during active deployment?

---

## 🎯 The Problem

During deployment, the board is in an **intermediate state**:

- Some pieces have moved from original stack
- Some pieces remain at stack square
- Deploy session is active (turn hasn't switched)

**Example**:

```
Initial:  c3 has (NFT) stack
After N→c5: c3 has (FT), c5 has N
After F→d4: c3 has T, c5 has N, d4 has F
Final: All pieces moved, turn switches
```

**Question**: What should `game.fen()` return at each step?

---

## 📋 Options Analysis

### Option A: Intermediate State FEN (Current Board As-Is)

**Implementation**:

```typescript
fen(): string {
  // Return FEN of current board state
  return generateFENFromBoard(this._board)
  // "...T.../...N.../...F..."
}
```

**Example Flow**:

```typescript
// Initial
fen() // "...(NFT)... r - - 0 1"

// After Navy deploys to c5
fen() // "...(FT)...N... r - - 0 1"
//       ^^^^       ^
//       Stack changed, Navy placed

// After Air Force deploys to d4
fen() // "...T...N...F... r - - 0 1"
```

**Pros**:

- ✅ Simple implementation
- ✅ Accurate to current board state
- ✅ No special logic needed

**Cons**:

- ❌ Original stack information lost
- ❌ Cannot reconstruct deploy session from FEN
- ❌ Confusing for external observers (incomplete deploy)
- ❌ Cannot save/load mid-deployment

**Verdict**: ⚠️ Too simple, loses critical information

---

### Option B: Extended FEN with Deploy Marker

**Implementation**:

```typescript
fen(): string {
  const baseFEN = generateFENFromBoard(this._board)

  if (!this._deploySession) {
    return baseFEN  // Standard FEN
  }

  // Add deploy session marker
  const remaining = this.getRemainingPieces()
  const pieceStr = remaining.map(p => p.type.toUpperCase()).join('')
  const movedCount = this._deploySession.actions.length / 2  // pairs of remove+place

  return `${baseFEN} DEPLOY ${this._deploySession.stackSquare}:${pieceStr} ${movedCount}`
}
```

**Example Flow**:

```typescript
// Initial
fen() // "...(NFT)... r - - 0 1"

// After Navy deploys to c5
fen() // "...(FT)...N... r - - 0 1 DEPLOY c3:FT 1"
//                                    ^^^^^^^^^^^^
//                                    Deploy session active

// After Air Force deploys to d4
fen() // "...T...N...F... r - - 0 1 DEPLOY c3:T 2"
//                                    ^^^^^^^^^^^
//                                    2 pieces moved, Tank remains

// After Tank deploys (completion)
fen() // "...N...F...T... b - - 0 2"  // No DEPLOY marker, turn switched
```

**Pros**:

- ✅ Complete information preserved
- ✅ Can reconstruct deploy session
- ✅ Can save/load mid-deployment
- ✅ Clear indication of active deploy
- ✅ Shows remaining pieces explicitly

**Cons**:

- ⚠️ Non-standard FEN format (needs parsing)
- ⚠️ Need to update FEN parser
- ⚠️ More complex implementation

**Verdict**: ✅ **RECOMMENDED** - Best balance of completeness and clarity

---

### Option C: Virtual FEN (Reconstruct Original)

**Implementation**:

```typescript
fen(): string {
  if (!this._deploySession) {
    return generateFENFromBoard(this._board)
  }

  // Rollback actions to show original state
  const originalBoard = this.reconstructOriginalBoard()
  return generateFENFromBoard(originalBoard)
  // "...(NFT)... r - - 0 1"  // Always shows original
}
```

**Example Flow**:

```typescript
// All steps return same FEN
fen() // "...(NFT)... r - - 0 1"  // Original
fen() // "...(NFT)... r - - 0 1"  // Still shows original
fen() // "...(NFT)... r - - 0 1"  // Still shows original
```

**Pros**:

- ✅ Clean, shows original position
- ✅ Standard FEN format

**Cons**:

- ❌ Misleading - doesn't match actual board
- ❌ Complex reconstruction logic
- ❌ Confusing for queries (board ≠ FEN)
- ❌ Loses intermediate state info

**Verdict**: ❌ Too confusing, not recommended

---

## ✅ Recommended Approach: Extended FEN (Option B)

### FEN Format Specification

**Standard FEN**:

```
<board> <turn> <castling> <en-passant> <halfmoves> <fullmoves>
```

**Extended FEN (During Deploy)**:

```
<board> <turn> <castling> <en-passant> <halfmoves> <fullmoves> DEPLOY <square>:<pieces> <moved-count>
```

**Components**:

- `<board>`: Current board state (after deploy moves applied)
- `<turn>`: Deploy initiator's color (doesn't switch during deploy)
- `DEPLOY`: Marker indicating active deploy session
- `<square>`: Original stack square (e.g., "c3")
- `<pieces>`: Remaining pieces at stack (e.g., "FT", "T", "")
- `<moved-count>`: Number of pieces that have moved (e.g., "1", "2")

---

## 🔧 Implementation Details

### Generating Extended FEN

```typescript
class CoTuLenh {
  fen(): string {
    // 1. Generate base FEN from current board
    const boardFEN = this.generateBoardFEN()
    const turn = this._turn
    const castling = this.generateCastlingString()
    const epSquare = this.generateEPSquare()
    const halfMoves = this._halfMoves
    const fullMoves = this._moveNumber

    const baseFEN = [
      boardFEN,
      turn,
      castling,
      epSquare,
      halfMoves,
      fullMoves,
    ].join(' ')

    // 2. If no active deploy, return standard FEN
    if (!this._deploySession) {
      return baseFEN
    }

    // 3. Add deploy marker
    const stackSquare = algebraic(this._deploySession.stackSquare)
    const remaining = this.calculateRemainingPieces()
    const pieceStr =
      remaining.length > 0
        ? remaining.map((p) => p.type.toUpperCase()).join('')
        : 'EMPTY'
    const movedCount = this.calculateMovedPiecesCount()

    return `${baseFEN} DEPLOY ${stackSquare}:${pieceStr} ${movedCount}`
  }

  private calculateRemainingPieces(): Piece[] {
    const original = flattenPiece(this._deploySession.originalPiece)
    const movedTypes = this.extractMovedPieceTypes()

    return original.filter((p) => {
      const alreadyMoved = movedTypes.find(
        (mt) => mt.type === p.type && mt.color === p.color,
      )
      return !alreadyMoved
    })
  }

  private extractMovedPieceTypes(): { type: PieceSymbol; color: Color }[] {
    // Extract from actions
    const moved: { type: PieceSymbol; color: Color }[] = []

    for (const action of this._deploySession.actions) {
      if (
        action.type === 'remove' &&
        action.square === this._deploySession.stackSquare
      ) {
        moved.push({ type: action.piece.type, color: action.piece.color })
      }
    }

    return moved
  }
}
```

---

### Parsing Extended FEN

```typescript
function parseFEN(fen: string): GameState {
  const parts = fen.split(' ')

  // Standard FEN components
  const boardFEN = parts[0]
  const turn = parts[1]
  const castling = parts[2]
  const epSquare = parts[3]
  const halfMoves = parts[4]
  const fullMoves = parts[5]

  // Check for DEPLOY marker
  let deploySession: DeploySession | null = null

  if (parts.length > 6 && parts[6] === 'DEPLOY') {
    // Parse deploy session
    const deployInfo = parts[7] // "c3:FT"
    const movedCount = parseInt(parts[8])

    const [squareStr, piecesStr] = deployInfo.split(':')
    const stackSquare = SQUARE_MAP[squareStr]

    // Parse remaining pieces
    const remaining =
      piecesStr === 'EMPTY'
        ? []
        : piecesStr.split('').map((char) => parsePieceFromChar(char, turn))

    deploySession = {
      stackSquare,
      turn,
      originalPiece: null, // Will reconstruct
      actions: [],
      startFEN: [boardFEN, turn, castling, epSquare, halfMoves, fullMoves].join(
        ' ',
      ),
      movedCount,
    }
  }

  return {
    board: parseBoardFEN(boardFEN),
    turn,
    castling,
    epSquare,
    halfMoves: parseInt(halfMoves),
    fullMoves: parseInt(fullMoves),
    deploySession,
  }
}
```

---

## 📊 FEN Examples

### Example 1: Navy Moves First

```
Initial:
"...(NFT)... r - - 0 1"

After N→c5:
"...(FT)...N... r - - 0 1 DEPLOY c3:FT 1"

After F→d4:
"...T...N...F... r - - 0 1 DEPLOY c3:T 2"

After T→d3 (complete):
"...N...F...T... b - - 0 2"
```

### Example 2: Land Piece Deployment

```
Initial:
"...(TI)... r - - 0 1"

After T→d4:
"...I...T... r - - 0 1 DEPLOY c3:I 1"

After I→d3:
"...T...I... b - - 0 2"
```

---

## 🧪 Testing FEN Round-Trip

```typescript
describe('FEN with Deploy Session', () => {
  test('should serialize and parse deploy session', () => {
    const game = new CoTuLenh()
    game.put({ type: 'n', carrying: [{ type: 'f' }, { type: 't' }] }, 'c3')

    // Deploy first piece
    game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })

    const fen = game.fen()
    expect(fen).toContain('DEPLOY c3:FT 1')

    // Load into new game
    const game2 = new CoTuLenh(fen)
    expect(game2.getDeploySession()).toBeDefined()
    expect(game2.getDeploySession().stackSquare).toBe('c3')

    // Should generate same moves
    expect(game2.moves()).toEqual(game.moves())
  })

  test('should not include DEPLOY marker after completion', () => {
    const game = new CoTuLenh()
    game.put({ type: 'n', carrying: [{ type: 'f' }] }, 'c3')

    game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })
    expect(game.fen()).toContain('DEPLOY')

    game.move({ from: 'c3', to: 'c4', piece: 'f', deploy: true })
    expect(game.fen()).not.toContain('DEPLOY')
  })
})
```

---

## 🎯 Impact on Other Systems

### Board Queries

```typescript
// game.get() works on current board (post-deploy-moves)
game.get('c3') // Returns remaining pieces
game.get('c5') // Returns deployed Navy
```

### Move Generation

```typescript
// game.moves() uses deploy session to determine what to generate
if (deploySession) {
  return generateMovesForRemainingPieces(deploySession)
} else {
  return generateNormalMoves()
}
```

### History

```typescript
// Each deploy step stored with current FEN (including DEPLOY marker)
history = [
  { san: 'N>c5', fen: '...(FT)...N... r - - 0 1 DEPLOY c3:FT 1' },
  { san: 'F>d4', fen: '...T...N...F... r - - 0 1 DEPLOY c3:T 2' },
  { san: 'T>d3', fen: '...N...F...T... b - - 0 2' },
]
```

---

## ✅ Decision: Extended FEN

**Rationale**:

- Complete information preservation
- Can save/load mid-deployment
- Clear indication of active deploy
- Action-based architecture aligns well with this

**Trade-offs Accepted**:

- Non-standard FEN format (but clearly marked)
- Parser complexity (but manageable)

**Next Steps**:

- Implement FEN generation with DEPLOY marker
- Update FEN parser to handle extended format
- Test round-trip serialization

---

**Status**: Design finalized  
**Next Document**: `02-MOVE-GENERATION.md`
