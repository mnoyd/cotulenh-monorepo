# Recombine Moves: Complete Guide

## ✅ Status: FULLY WORKING (7/7 tests passing)

## 📖 What is Recombine?

**Recombine** is a special type of deploy move that allows pieces to **rejoin**
other pieces from the same stack during an active deploy session.

### Example Scenario

```typescript
// Setup: Navy at c3 carrying AirForce, Tank, Infantry
game.put(
  {
    type: NAVY,
    color: RED,
    carrying: [AIR_FORCE, TANK, INFANTRY],
  },
  'c3',
)

// Step 1: Deploy Navy to c5
game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })
// Result: c5 = N, c3 = F(TI) (AirForce becomes carrier)

// Step 2: RECOMBINE AirForce with Navy 🎯
game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })
// Result: c5 = N(F), c3 = T(I) (Tank becomes carrier)

// Step 3: RECOMBINE Tank with Navy
game.move({ from: 'c3', to: 'c5', piece: TANK, deploy: true })
// Result: c5 = N(FT), c3 = I (Infantry alone)
```

---

## 🔧 How It Works

### 1. Move Generation (in `move-generation.ts`)

Recombine moves are generated automatically during deploy sessions:

```typescript
// Lines 672-714
function generateRecombineMoves(
  gameInstance: CoTuLenh,
  session: DeploySession,
  stackSquare: number,
  remainingPieces: Piece[],
  normalMoves: InternalMove[],
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const moves: InternalMove[] = []
  const deployedSquares = session.getDeployedSquares() // Get deployed squares

  for (const piece of remainingPieces) {
    for (const targetSquare of deployedSquares) {
      const targetPiece = gameInstance.get(targetSquare)

      // Check if pieces can combine
      if (targetPiece && targetPiece.color === piece.color) {
        const combined = combinePieces([piece, targetPiece])
        if (combined) {
          moves.push({
            from: stackSquare,
            to: targetSquare,
            piece: piece,
            color: piece.color,
            flags: BITS.DEPLOY | BITS.COMBINATION, // 🔑 Both flags!
            combined: targetPiece,
          })
        }
      }
    }
  }
  return moves
}
```

**Key Features:**

- ✅ Only generates to **deployed squares in this session**
- ✅ Validates with `combinePieces()` to ensure valid combination
- ✅ Has both `DEPLOY` and `COMBINATION` flags
- ✅ Carrier is **excluded** from recombine (lines 650-652)
- ✅ Skips if normal move already exists to that square

### 2. Move Execution (in `move-apply.ts`)

```typescript
// Lines 360-380 in SingleDeployMoveCommand
if (this.move.flags & BITS.COMBINATION) {
  const targetPiece = this.game.get(destSq)
  if (targetPiece) {
    // Combine the moving piece with the target piece
    const combinedPiece = combinePieces([this.move.piece, targetPiece])
    this.actions.push(new PlacePieceAction(this.game, destSq, combinedPiece))
  }
}
```

**Execution Flow:**

1. `RemoveFromStackAction` - Remove piece from source stack
2. `PlacePieceAction` - Combine with target and place result
3. `SetDeployStateAction` - Update deploy session

---

## 🐛 The Bug We Fixed

### Problem

When deploying the **carrier** piece (e.g., Navy from N(FTI)), the **entire
stack disappeared**!

```typescript
// BEFORE FIX:
c3: N(FTI)  →  Deploy Navy  →  c3: undefined ❌

// EXPECTED:
c3: N(FTI)  →  Deploy Navy  →  c3: F(TI) ✅ (AirForce promoted to carrier)
```

### Root Cause

In `PieceStacker.remove()`, when the carrier was removed, `stackEngine.lookup()`
returned `null` because the remaining pieces `[AIR_FORCE, TANK, INFANTRY]`
couldn't form a valid stack without a carrier.

### The Fix

Modified `PieceStacker.remove()` to **automatically promote** the first
remaining piece to carrier:

```typescript
// In packages/cotulenh-combine-piece/src/index.ts
remove(stackPiece: T, pieceToRemove: T): T | null {
  // ... filter remaining pieces ...

  if (remainingPieces.length === 0) return null
  if (remainingPieces.length === 1) return remainingPieces[0]

  // Try stackEngine lookup first
  const newStackState = stackEngine.lookup(remainingRoles)

  if (!newStackState) {
    // 🔑 FALLBACK: Manually promote first piece to carrier
    const [newCarrier, ...newCarried] = remainingPieces
    return {
      ...newCarrier,
      carrying: newCarried.length > 0 ? newCarried : undefined
    } as T
  }

  return this.makePieceFromCoreStack(newStackState, remainingPieces)
}
```

**Result:** ✅ All 7/7 tests pass!

---

## 🎮 How to Use Recombine from the Board UI

### Detecting Recombine Moves

Recombine moves have specific characteristics you can detect:

```typescript
const moves = game.moves({ verbose: true, square: 'c3' })

for (const move of moves) {
  const isRecombine =
    move.flags?.includes('d') && move.flags?.includes('b') // DEPLOY flag // COMBINATION flag

  if (isRecombine) {
    console.log(`Recombine: ${move.piece.type} → ${move.to}`)
    console.log(`Will combine with: ${game.get(move.to)?.type}`)
  }
}
```

### Sending Recombine Moves

Recombine moves work **exactly like regular deploy moves**:

```typescript
// Option 1: Using move notation
game.move({
  from: 'c3',
  to: 'c5',
  piece: 'f', // AirForce piece type
  deploy: true,
})

// Option 2: Using SAN notation (if supported)
game.move('Fc3-c5+') // '+' indicates combination

// Option 3: From UI click events
function handleSquareClick(from: string, to: string) {
  const moves = game.moves({ verbose: true, square: from })
  const move = moves.find((m) => m.to === to)

  if (move && move.flags?.includes('b')) {
    console.log('This is a recombine move!')
    game.move({ from, to, piece: move.piece.type, deploy: true })
  }
}
```

### Visual Indicators

You can add visual feedback for recombine moves:

```typescript
// In your board component
function getValidMoves(square: string) {
  const moves = game.moves({ verbose: true, square })

  return moves.map(move => ({
    square: move.to,
    isRecombine: move.flags?.includes('d') && move.flags?.includes('b'),
    isCombination: move.flags?.includes('b'),
    isCapture: move.flags?.includes('c')
  }))
}

// CSS classes
.recombine-dest {
  border: 2px solid gold !important;
  background: rgba(255, 215, 0, 0.3);
}
```

---

## 📊 Move Flags Reference

Recombine moves have specific flag combinations:

| Move Type          | Flags         | Description                      |
| ------------------ | ------------- | -------------------------------- |
| **Normal Deploy**  | `d`           | Deploy a piece to empty square   |
| **Deploy Capture** | `d`, `c`      | Deploy and capture enemy         |
| **Recombine**      | `d`, `b`      | Deploy and combine with friendly |
| **Stay Capture**   | `d`, `s`, `c` | Attack without moving            |

**Detecting Recombine:**

```typescript
const isRecombine = (flags: string) =>
  flags.includes('d') && flags.includes('b')
```

---

## 🔍 Full API Example

```typescript
import { CoTuLenh } from '@repo/cotulenh-core'

const game = new CoTuLenh()
game.clear()
game.put({ type: 'c', color: 'r' }, 'g1')
game.put({ type: 'c', color: 'b' }, 'h12')

// Setup stack
game.put(
  {
    type: 'n',
    color: 'r',
    carrying: [
      { type: 'f', color: 'r' },
      { type: 't', color: 'r' },
    ],
  },
  'c3',
)

// Start deploy session
game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })

// Get available moves (includes recombines)
const moves = game.moves({ verbose: true, square: 'c3' })

// Find recombine moves
const recombines = moves.filter(
  (m) => m.flags?.includes('d') && m.flags?.includes('b'),
)

console.log(
  'Recombine options:',
  recombines.map(
    (m) => `${m.piece.type} → ${m.to} (combines with ${game.get(m.to)?.type})`,
  ),
)

// Execute recombine
game.move({ from: 'c3', to: 'c5', piece: 'f', deploy: true })

// Check result
const combined = game.get('c5')
console.log('Combined piece:', combined.type)
console.log(
  'Carrying:',
  combined.carrying?.map((p) => p.type),
)
// Output: Combined piece: n, Carrying: ['f']
```

---

## ✅ Test Coverage

All recombine functionality is covered:

- ✅ Generate recombine moves to deployed squares
- ✅ Exclude carrier from recombine
- ✅ No duplicate moves (recombine replaces normal)
- ✅ Only combine friendly pieces
- ✅ Execute recombine correctly
- ✅ **Multiple recombines to same square** (FIXED!)
- ✅ Only to squares deployed in this session

---

## 🎯 Best Practices

### 1. Check Deploy Session Active

```typescript
if (game.getDeploySession()) {
  // Deploy session active - recombines available
}
```

### 2. Filter by Piece Type

```typescript
const airForceMoves = game.moves({
  verbose: true,
  square: 'c3',
  pieceType: 'f',
})
```

### 3. Validate Before Move

```typescript
const moves = game.moves({ verbose: true, square: from })
const validMove = moves.find((m) => m.to === to)

if (validMove) {
  game.move({ from, to, piece: validMove.piece.type, deploy: true })
}
```

### 4. Highlight Recombine Destinations

```typescript
const recombineSquares = moves
  .filter((m) => m.flags?.includes('b'))
  .map((m) => m.to)

// Use for visual indicators on board
```

---

## 🚀 Summary

**Recombine moves are fully functional!**

- ✅ **Automatic generation** during deploy sessions
- ✅ **Carrier promotion** when carrier deploys first
- ✅ **Proper execution** with combination logic
- ✅ **Easy to detect** via flags (`d` + `b`)
- ✅ **Same API** as regular deploy moves

**To use in UI:**

1. Detect recombine moves by checking for `DEPLOY` + `COMBINATION` flags
2. Highlight destination squares with special styling
3. Execute like any deploy move: `game.move({ from, to, piece, deploy: true })`
4. Session automatically tracks deployed squares for recombine options

No special handling needed - just filter moves by flags and execute normally!
