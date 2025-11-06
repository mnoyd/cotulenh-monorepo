# Deploy Session: UI ↔ Engine API Interaction

## The Core API Pattern

### Normal Game Flow (Without Deploy)

```typescript
// 1. UI detects piece position change (drag-and-drop)
// User drags Infantry from e5 to e6

// 2. UI sends move to engine
const result = engine.move({ from: 'e5', to: 'e6' })

// 3. Engine validates and responds
if (result.success) {
  return {
    success: true,
    fen: 'new_fen_after_move',
    legalMoves: [
      { from: 'd4', to: 'd5', piece: 'tank' },
      { from: 'd4', to: 'd6', piece: 'tank' },
      // ... all legal moves for opponent
    ],
    turn: 'b', // Blue's turn now
    gameState: {
      isCheck: false,
      isCheckmate: false,
      isDraw: false,
    },
  }
} else {
  return {
    success: false,
    error: 'Invalid move',
    reason: 'Piece cannot move there',
  }
}

// 4. UI updates board and shows legal moves
// When user selects a piece, UI filters legalMoves by piece
// Shows dots on squares where piece can move
```

**Key insight:** Engine generates ALL legal moves. UI just filters and displays.

---

## Deploy Session: The Challenge

### Scenario

```
Stack at e5: Navy + [Air Force, Tank]

User deploys Navy to b5:
- Remaining at e5: [Air Force, Tank]
- Navy at b5

Now what can Tank do?
1. Move 1-2 steps from e5 (normal range)
2. Move to b5 (combine with Navy again!)  ← THIS IS THE KEY
```

### The Question

**Should engine include "Tank can move to b5" in legal moves?**

**Answer: YES! Engine should generate ALL legal moves, including re-combining.**

---

## Solution: Engine Generates All Deploy Move Possibilities

### Extended Move Generation During Deploy

```typescript
class GameState {
  generateLegalMoves(): Move[] {
    if (this.deploySession) {
      return this.generateDeployMoves()
    }
    return this.generateNormalMoves()
  }

  private generateDeployMoves(): Move[] {
    const moves: Move[] = []
    const stackSquare = this.deploySession.originalSquare

    // For each remaining piece
    for (const piece of this.deploySession.remaining) {
      // 1. Normal moves from original stack square
      const normalMoves = this.generatePieceMoves(stackSquare, piece)
      moves.push(
        ...normalMoves.map((m) => ({
          type: 'deploy-step',
          piece,
          from: stackSquare,
          to: m.to,
          capturedPiece: m.capturedPiece,
        })),
      )

      // 2. Re-combine with already deployed pieces
      for (const deployed of this.deploySession.deployed) {
        // Can this piece reach deployed square?
        const canReach = this.canPieceReach(
          piece,
          stackSquare,
          deployed.destination,
        )

        if (canReach) {
          moves.push({
            type: 'deploy-recombine',
            piece,
            from: stackSquare,
            to: deployed.destination,
            combineWith: deployed.piece,
          })
        }
      }

      // 3. Stay on stack option
      moves.push({
        type: 'deploy-stay',
        piece,
        square: stackSquare,
      })
    }

    return this.filterLegalMoves(moves)
  }

  private canPieceReach(piece: Piece, from: Square, to: Square): boolean {
    const distance = this.getDistance(from, to)
    const maxRange = this.getMaxRange(piece)

    // Check if within range
    if (distance > maxRange) {
      return false
    }

    // Check if path is valid (no blockers, terrain, etc.)
    return this.isPathValid(piece, from, to)
  }
}
```

---

## Complete API Response During Deploy

### Response Structure

```typescript
interface MoveResult {
  success: boolean

  // If successful
  fen?: string
  legalMoves?: Move[]
  turn?: Color

  // Deploy session info
  deploySession?: {
    active: boolean
    originalSquare: Square
    remaining: Piece[]
    deployed: Array<{
      piece: Piece
      destination: Square
    }>
    canRecombine: boolean // If remaining pieces can rejoin deployed
  }

  // Game state
  gameState?: {
    isCheck: boolean
    isCheckmate: boolean
    isDraw: boolean
  }

  // If failed
  error?: string
  reason?: string
}
```

---

## Example: Complete Deploy Session Flow

### Initial Position

```
e5: Navy + [Air Force, Tank]
```

### Step 1: User Drags Navy to b5

```typescript
// UI sends
const result = engine.move({ from: 'e5', to: 'b5' })

// Engine detects this starts a deploy (moving from stack)
// Engine responds
{
  success: true,
  fen: '...board_fen... r - - 0 1 DEPLOY e5:FT 1',
  turn: 'r',  // ✅ Still red's turn! Deploy not complete

  deploySession: {
    active: true,
    originalSquare: 'e5',
    remaining: [
      { type: 'air_force', color: 'r' },
      { type: 'tank', color: 'r' }
    ],
    deployed: [
      {
        piece: { type: 'navy', color: 'r' },
        destination: 'b5'
      }
    ],
    canRecombine: true
  },

  legalMoves: [
    // Air Force moves (range 4 from e5)
    { type: 'deploy-step', piece: 'air_force', from: 'e5', to: 'd7' },
    { type: 'deploy-step', piece: 'air_force', from: 'e5', to: 'e9' },
    { type: 'deploy-step', piece: 'air_force', from: 'e5', to: 'h5' },
    // ... all Air Force destinations

    // ✅ Air Force can recombine with Navy at b5
    { type: 'deploy-recombine', piece: 'air_force', from: 'e5', to: 'b5' },

    // Tank moves (range 2 from e5)
    { type: 'deploy-step', piece: 'tank', from: 'e5', to: 'd5' },
    { type: 'deploy-step', piece: 'tank', from: 'e5', to: 'f5' },
    // ... all Tank destinations

    // ✅ Tank can recombine with Navy at b5 (within range!)
    { type: 'deploy-recombine', piece: 'tank', from: 'e5', to: 'b5' },

    // Stay options
    { type: 'deploy-stay', piece: 'air_force', square: 'e5' },
    { type: 'deploy-stay', piece: 'tank', square: 'e5' }
  ],

  gameState: {
    isCheck: false,
    isCheckmate: false,
    isDraw: false
  }
}
```

### Step 2: User Drags Tank to b5 (Recombine)

```typescript
// UI sends
const result = engine.move({ from: 'e5', to: 'b5' })

// Engine detects this is a recombine move
// Engine responds
{
  success: true,
  fen: '...board_fen... r - - 0 1 DEPLOY e5:F 2',  // Only Air Force left
  turn: 'r',  // ✅ Still red's turn

  deploySession: {
    active: true,
    originalSquare: 'e5',
    remaining: [
      { type: 'air_force', color: 'r' }
    ],
    deployed: [
      {
        piece: { type: 'navy', color: 'r', carrying: [tank] },  // ✅ Stack reformed!
        destination: 'b5'
      }
    ],
    canRecombine: true
  },

  legalMoves: [
    // Air Force moves (range 4 from e5)
    { type: 'deploy-step', piece: 'air_force', from: 'e5', to: 'd7' },
    // ...

    // ✅ Air Force can STILL recombine with Navy+Tank stack at b5
    { type: 'deploy-recombine', piece: 'air_force', from: 'e5', to: 'b5' },

    // Stay option
    { type: 'deploy-stay', piece: 'air_force', square: 'e5' }
  ],

  gameState: {
    isCheck: false,
    isCheckmate: false,
    isDraw: false
  }
}
```

### Step 3: User Drags Air Force to d7 (Deploy Complete)

```typescript
// UI sends
const result = engine.move({ from: 'e5', to: 'd7' })

// Engine detects deploy is complete (all pieces accounted for)
// Engine responds
{
  success: true,
  fen: '...board_fen... b - - 0 2',  // ✅ No more DEPLOY marker
  turn: 'b',  // ✅ Turn switches to blue!

  deploySession: {
    active: false  // ✅ Deploy complete
  },

  legalMoves: [
    // ✅ Now blue's legal moves
    { from: 'd4', to: 'd5', piece: 'tank' },
    { from: 'd4', to: 'd6', piece: 'tank' },
    // ... all blue's moves
  ],

  gameState: {
    isCheck: false,
    isCheckmate: false,
    isDraw: false
  }
}
```

---

## UI Implementation Guide

### How UI Should Handle Deploy Sessions

```typescript
class ChessBoardUI {
  private currentLegalMoves: Move[] = []
  private deploySession: DeploySessionInfo | null = null

  async onPieceDragStart(square: Square) {
    // Check if we're in deploy session
    if (this.deploySession?.active) {
      // Filter legal moves for pieces at original stack square
      const movesForSquare = this.currentLegalMoves.filter(
        (m) => m.from === square || m.square === square,
      )

      this.showPossibleDestinations(movesForSquare)
      return
    }

    // Normal flow
    const movesForPiece = this.currentLegalMoves.filter(
      (m) => m.from === square,
    )
    this.showPossibleDestinations(movesForPiece)
  }

  private showPossibleDestinations(moves: Move[]) {
    // Get all unique destination squares
    const destinations = new Set<Square>()

    for (const move of moves) {
      if (move.type === 'deploy-step' || move.type === 'deploy-recombine') {
        destinations.add(move.to)
      } else if (move.type === 'deploy-stay') {
        // Show "stay" indicator on original square
        this.showStayIndicator(move.square)
      } else {
        destinations.add(move.to)
      }
    }

    // Show dots/highlights
    for (const dest of destinations) {
      this.showMoveIndicator(dest)
    }

    // Special: If deploy session, highlight deployed piece squares
    if (this.deploySession?.canRecombine) {
      for (const deployed of this.deploySession.deployed) {
        // Show special "recombine" indicator
        this.showRecombineIndicator(deployed.destination)
      }
    }
  }

  async onPieceDrop(from: Square, to: Square) {
    // Send move to engine
    const result = await this.engine.move({ from, to })

    if (!result.success) {
      // Show error, revert UI
      this.showError(result.error)
      this.revertDrag()
      return
    }

    // Update board from FEN
    this.loadPosition(result.fen)

    // Update legal moves
    this.currentLegalMoves = result.legalMoves

    // Update deploy session state
    this.deploySession = result.deploySession

    // If deploy still active, show which pieces can still move
    if (this.deploySession?.active) {
      this.highlightRemainingPieces(
        this.deploySession.originalSquare,
        this.deploySession.remaining,
      )
    }

    // Update turn indicator
    this.setTurn(result.turn)
  }

  private highlightRemainingPieces(square: Square, pieces: Piece[]) {
    // Show visual indicator that these pieces must be moved
    this.showDeployIndicator(square, pieces)

    // Optionally: Auto-select first remaining piece
    if (pieces.length > 0) {
      this.selectPiece(square)
      this.onPieceDragStart(square) // Show legal moves immediately
    }
  }
}
```

---

## Engine Implementation: Recombine Logic

### Complete Implementation

```typescript
class GameState {
  private generateDeployMoves(): Move[] {
    const moves: Move[] = []
    const stackSquare = this.deploySession!.originalSquare

    for (const piece of this.deploySession!.remaining) {
      // 1. Normal deploy moves
      const normalMoves = this.generatePieceMoves(stackSquare, piece)
      for (const move of normalMoves) {
        moves.push({
          type: 'deploy-step',
          piece,
          from: stackSquare,
          to: move.to,
          capturedPiece: move.capturedPiece,
          flags: move.flags,
        })
      }

      // 2. Recombine moves
      for (const deployed of this.deploySession!.deployed) {
        const canReach = this.canPieceReach(
          piece,
          stackSquare,
          deployed.destination,
        )

        if (canReach) {
          moves.push({
            type: 'deploy-recombine',
            piece,
            from: stackSquare,
            to: deployed.destination,
          })
        }
      }

      // 3. Stay on stack
      moves.push({
        type: 'deploy-stay',
        piece,
        square: stackSquare,
      })
    }

    return this.filterLegalMoves(moves)
  }

  private canPieceReach(piece: Piece, from: Square, to: Square): boolean {
    // Get distance
    const distance = this.getDistance(from, to)

    // Get max range for this piece
    const maxRange = this.getMaxRange(piece)

    if (distance > maxRange) {
      return false
    }

    // Check movement pattern (orthogonal, diagonal, etc.)
    if (!this.matchesMovementPattern(piece, from, to)) {
      return false
    }

    // Check terrain compatibility
    if (!this.canAccessTerrain(piece, to)) {
      return false
    }

    // Check if path is blocked
    if (this.isPathBlocked(piece, from, to)) {
      return false
    }

    // Check air defense for Air Force
    if (piece.type === AIR_FORCE) {
      if (this.isUnderAirDefense(to, piece.color)) {
        return false
      }
    }

    return true
  }

  makeMove(move: Move): MoveResult {
    // Handle recombine move
    if (move.type === 'deploy-recombine') {
      return this.applyRecombineMove(move)
    }

    // ... other move types
  }

  private applyRecombineMove(move: DeployRecombineMove): MoveResult {
    const undo = this.createUndoInfo()

    // Remove piece from original stack
    this.board.removeFromStack(this.deploySession!.originalSquare, move.piece)

    // Add piece to deployed stack
    const deployedSquare = move.to
    const existingStack = this.board.get(deployedSquare)!

    // Create new combined stack
    const newStack = this.combineStacks(existingStack, move.piece)
    this.board.placePiece(deployedSquare, newStack)

    // Update deploy session
    this.deploySession!.remaining = this.deploySession!.remaining.filter(
      (p) => p !== move.piece,
    )

    // Find and update deployed entry
    const deployedEntry = this.deploySession!.deployed.find(
      (d) => d.destination === deployedSquare,
    )
    deployedEntry!.piece = newStack // Update to new stack

    // Check if deploy complete
    const isComplete = this.deploySession!.remaining.length === 0

    if (isComplete) {
      this.completeDeploy()
    }

    return {
      success: true,
      fen: this.toFEN(),
      legalMoves: this.generateLegalMoves(),
      turn: this.turn,
      deploySession: this.getDeploySessionInfo(),
      gameState: this.getGameStateInfo(),
      undo,
    }
  }
}
```

---

## Visual Examples

### Example 1: Tank Can Recombine

```
Initial:
e5: Navy(N) + [Air Force(F), Tank(T)]

Step 1: Navy → b5
e5: [F, T]
b5: N

Legal moves for Tank:
- d5, f5, e6, e4 (range 2 from e5)
- ✅ b5 (recombine with Navy, 3 squares away but within Tank's range 2!)
  Wait... b5 is 3 squares from e5 (e→d→c→b = 3 steps)
  If Tank range is 2, it CAN'T reach b5!

Let me recalculate:
e5 to b5:
- Horizontal: e→d→c→b = 3 files
- Vertical: 5→5 = 0 ranks
- Distance: 3 squares

Tank range: 2 squares
Result: Tank CANNOT reach b5

So the move list should NOT include recombine to b5 for Tank!

Let me fix the example:
```

### Example 1 (Corrected): Navy Moves Close

```
Initial position:
e5: Navy(N) + [Air Force(F), Tank(T)]

Step 1: Navy → e7 (2 squares away)
e5: [F, T]
e7: N

Legal moves for Tank (range 2):
- d5, f5, e6, e4 (normal moves)
- ✅ e7 (recombine, 2 squares away, within range!)
- Stay at e5

Legal moves for Air Force (range 4):
- d7, f7, e9, e1, etc. (normal moves)
- ✅ e7 (recombine, 2 squares away, within range!)
- Stay at e5
```

### Example 2: Long-Range Recombine

```
Initial position:
e5: Navy(N) + [Air Force(F), Infantry(I)]

Step 1: Navy → a5 (4 squares west)
e5: [F, I]
a5: N

Legal moves for Infantry (range 1):
- d5, f5, e6, e4 (normal moves)
- ❌ NO recombine to a5 (4 squares, out of range)
- Stay at e5

Legal moves for Air Force (range 4):
- Many squares within 4 range
- ✅ a5 (recombine, 4 squares away, exactly at max range!)
- Stay at e5
```

---

## API Endpoint Specification

### Move Endpoint

```typescript
POST /api/move

Request:
{
  from: Square,    // e.g., 'e5'
  to: Square,      // e.g., 'b5'
  promotion?: PieceType  // Optional, for pawn promotion
}

Response:
{
  success: boolean,

  // Success fields
  fen?: string,
  turn?: Color,
  legalMoves?: Move[],

  // Deploy session info
  deploySession?: {
    active: boolean,
    originalSquare?: Square,
    remaining?: Piece[],
    deployed?: Array<{
      piece: Piece,
      destination: Square
    }>,
    canRecombine?: boolean
  },

  // Game state
  gameState?: {
    isCheck: boolean,
    isCheckmate: boolean,
    isDraw: boolean,
    isStalemate: boolean
  },

  // Move info
  moveInfo?: {
    san: string,           // e.g., 'Ie5'
    captured?: Piece,
    wasCheck?: boolean,
    wasCheckmate?: boolean
  },

  // Error fields
  error?: string,
  reason?: string,
  validMoves?: Move[]  // Helpful: show what WAS valid
}
```

### Get Legal Moves Endpoint

```typescript
GET /api/moves

Query params:
- fen: string (optional, defaults to current position)
- square: Square (optional, filter by square)

Response:
{
  moves: Move[],
  deploySession?: {
    active: boolean,
    originalSquare?: Square,
    remaining?: Piece[]
  }
}
```

---

## Updated Documentation Sections

### Add to PORTING-GUIDE.md

```markdown
## API Interaction Pattern

The engine follows a request-response pattern with the UI:

1. **UI detects piece movement** (drag-and-drop)
2. **UI sends move to engine** ({ from, to })
3. **Engine validates** (checks against legal moves)
4. **Engine applies if valid** (mutates state)
5. **Engine responds** (new FEN + legal moves)
6. **UI updates board** (loads FEN)
7. **UI caches legal moves** (for highlighting)

### Deploy Session Awareness

During deploy sessions:

- Engine returns `deploySession.active: true`
- Legal moves include:
  - Deploy steps (move to new square)
  - Recombine moves (rejoin deployed pieces)
  - Stay moves (remain on stack)
- UI filters legal moves by remaining pieces
- Turn does NOT switch until deploy complete
```

### Add to IMPLEMENTATION-CHECKLIST.md

```markdown
## API Response Validation

### During Deploy Session

- [ ] Response includes `deploySession.active: true`
- [ ] Response includes `deploySession.remaining` pieces
- [ ] Response includes `deploySession.deployed` locations
- [ ] Legal moves include recombine options for in-range pieces
- [ ] Turn remains same color until deploy complete
- [ ] FEN includes DEPLOY marker

### Recombine Move Validation

- [ ] Check piece range from original to deployed square
- [ ] Check movement pattern compatibility
- [ ] Check terrain access
- [ ] Check path blocking
- [ ] Check air defense zones
- [ ] Update deployed stack correctly
```

---

## Recommendation: Engine Responsibility

**✅ Engine should generate ALL legal moves, including recombine options.**

**Why:**

1. ✅ **Consistent:** Same pattern as normal moves
2. ✅ **UI stays dumb:** Just filters and displays
3. ✅ **Validation in one place:** Engine controls all rules
4. ✅ **Easy to test:** All logic in engine
5. ✅ **Future-proof:** UI doesn't need deploy-specific logic

**Implementation:**

- Add `type: 'deploy-recombine'` to move types
- Generate recombine moves in `generateDeployMoves()`
- Calculate reachability with `canPieceReach()`
- Apply recombine with `applyRecombineMove()`
- Update deployed stack in deploy session

**UI Implementation:**

- Show dots on deployed squares if recombine moves exist
- Optional: Use different indicator (e.g., hollow circle vs filled dot)
- Optional: Show range preview when hovering over remaining pieces

---

## Summary

### API Pattern During Deploy

1. **UI drags piece** → Engine receives `{ from, to }`
2. **Engine validates** → Checks against generated legal moves
3. **Engine responds** → Includes:
   - `deploySession.active: true`
   - `deploySession.remaining` (pieces left)
   - `deploySession.deployed` (pieces already moved)
   - `legalMoves` (including recombine options)
4. **UI displays** → Shows dots for:
   - Normal deploy destinations
   - ✅ Deployed piece squares (recombine)
   - Stay option on original square

### Key Features

✅ **Engine generates recombine moves** automatically ✅ **UI filters by
remaining pieces** for highlighting ✅ **Recombine validated by range** (tank
can't reach 4 squares) ✅ **Deploy session persists** across multiple move calls
✅ **Turn switches only on completion** of deploy ✅ **FEN includes DEPLOY
marker** for serialization

**This keeps UI simple and engine authoritative!** 🎯
