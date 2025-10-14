# Board Presentation API: Complete Interface for UI Libraries

## Overview

This document specifies the complete API that CoTuLenh core provides to board
presentation libraries (UI/rendering layer) for displaying the game state,
handling user interactions, and managing deploy sessions.

---

## Core Question: What Does the UI Need?

### 1. **Board State** (What to draw)

- All pieces and their positions
- Stack composition (what pieces are in each stack)
- Heroic status of pieces

### 2. **Interaction State** (What to highlight)

- Legal moves for selected piece
- Last move made (for highlighting)
- Check status (highlight commander)
- Selected square

### 3. **Deploy Session State** (Deploy mode UI)

- Is deploy active?
- Which square is being deployed from?
- Which pieces already moved?
- Which pieces remaining?
- Legal moves for remaining pieces

### 4. **Game Status** (Game over detection)

- Is check?
- Is checkmate?
- Is game over?
- Winner (if game over)

---

## Complete API Specification

### 1. Board State Methods

```typescript
/**
 * Get comprehensive board state for rendering.
 * Returns all pieces with their positions, colors, types, and stack info.
 */
interface BoardSquare {
  square: string           // Algebraic notation (e.g., 'e5')
  type: PieceSymbol       // Piece type
  color: Color            // 'r' or 'b'
  heroic?: boolean        // Heroic status
  carrying?: Piece[]      // Stack contents (if stack)
}

game.board(): BoardSquare[]

// Example return:
[
  { square: 'e5', type: 't', color: 'r', heroic: false, carrying: [
    { type: 'i', color: 'r' },
    { type: 'm', color: 'r' }
  ]},
  { square: 'd7', type: 'n', color: 'b', heroic: true },
  // ... all other pieces
]
```

**What UI does with this:**

```javascript
// Render each piece
for (const piece of game.board()) {
  drawPiece(piece.square, piece.type, piece.color, piece.heroic)

  // Show stack badge if stack
  if (piece.carrying && piece.carrying.length > 0) {
    drawStackBadge(piece.square, piece.carrying.length + 1)
  }
}
```

### 2. Legal Moves Methods

```typescript
/**
 * Get all legal moves (for current player).
 * Used to show "where can I move?" when piece selected.
 */
game.moves(): string[]
// Returns: ['Tc3', 'Td5', 'e5:Nd7,Td5,Ie6', ...]

/**
 * Get legal moves for specific piece.
 * Used when user clicks/selects a piece.
 */
game.moves({ square: 'e5' }): string[]
// Returns: ['Te4', 'Te6', 'Tf5', 'Td5', ...]

/**
 * Get legal moves with full details (verbose mode).
 * Includes from/to squares for easy highlighting.
 */
interface MoveDetails {
  from: string
  to: string
  san: string
  piece: PieceSymbol
  captured?: Piece
  flags: string
}

game.moves({ verbose: true }): MoveDetails[]
```

**What UI does with this:**

```javascript
// User clicks e5
const legalMoves = game.moves({ square: 'e5', verbose: true })

// Highlight destination squares
for (const move of legalMoves) {
  highlightSquare(move.to, 'legal-move')

  // Show capture indicator if capture
  if (move.captured) {
    highlightSquare(move.to, 'capture-available')
  }
}
```

### 3. Game State Queries

```typescript
/**
 * Get current turn.
 */
game.turn(): 'r' | 'b'

/**
 * Check if current player is in check.
 */
game.isCheck(): boolean

/**
 * Check if current player is in checkmate.
 */
game.isCheckmate(): boolean

/**
 * Check if game is over (checkmate or draw).
 */
game.isGameOver(): boolean

/**
 * Get FEN string (for saving/loading positions).
 */
game.fen(): string

/**
 * Get move number.
 */
game.moveNumber(): number
```

**What UI does with this:**

```javascript
// Show turn indicator
showTurnIndicator(game.turn())

// Highlight commander if in check
if (game.isCheck()) {
  const cmdSquare = game.getCommanderSquare(game.turn())
  highlightSquare(cmdSquare, 'check')
}

// Show game over dialog
if (game.isGameOver()) {
  if (game.isCheckmate()) {
    showGameOverDialog(
      `${game.turn() === 'r' ? 'Blue' : 'Red'} wins by checkmate!`,
    )
  }
}
```

### 4. Move Execution

```typescript
/**
 * Execute a move.
 * Returns the executed move object or null if invalid.
 */
game.move(san: string): Move | null
game.move({ from: 'e5', to: 'e6' }): Move | null

// Example:
const result = game.move('Tc3')
if (result) {
  // Move successful
  updateBoard()
  checkGameStatus()
} else {
  // Move failed
  showError('Illegal move')
}
```

### 5. Undo/Redo

```typescript
/**
 * Undo last move.
 */
game.undo(): void

/**
 * Get move history.
 */
game.history(): string[]
game.history({ verbose: true }): Move[]

// Example:
// Move history: ['1. Tc3', '1... td8', '2. Te5', ...]
```

**What UI does with this:**

```javascript
// Undo button
function handleUndo() {
  game.undo()
  updateBoard()
  updateHistory()
}

// Move history panel
function renderHistory() {
  const moves = game.history()
  for (const move of moves) {
    addMoveToHistoryPanel(move)
  }
}
```

---

## Deploy Session API

### Current State (What Exists)

```typescript
/**
 * Get deploy state.
 * Returns null if no deploy active.
 */
interface DeployState {
  stackSquare: number        // Original square (internal format)
  turn: Color               // Which player's turn
  originalPiece: Piece      // Original stack
  movedPieces: Piece[]      // Pieces already moved
  stay?: Piece[]            // Pieces marked as staying
}

game.getDeployState(): DeployState | null

/**
 * Execute a deploy move.
 * This is the "make one move in deploy sequence" method.
 */
interface DeployMoveRequest {
  from: string              // Origin square (e.g., 'e5')
  moves: Array<{
    piece: PieceSymbol
    to: string
    stay?: boolean
  }>
}

game.deployMove(request: DeployMoveRequest): DeployMove
```

### What's MISSING (Needs Implementation)

```typescript
/**
 * START a deploy session.
 * Select a stack to deploy.
 */
game.startDeploy(square: string): DeploySessionInfo

interface DeploySessionInfo {
  active: boolean
  from: string                    // Origin square
  pieces: Piece[]                 // All pieces in stack
  remaining: Piece[]              // Pieces not yet moved
  moved: Array<{                  // Pieces already moved
    piece: Piece
    to: string
  }>
  stayed: Piece[]                 // Pieces staying
  legalMoves: string[]            // Legal moves for remaining pieces
}

// Example:
const session = game.startDeploy('e5')
// {
//   active: true,
//   from: 'e5',
//   pieces: [Navy, Tank, Infantry],
//   remaining: [Navy, Tank, Infantry],
//   moved: [],
//   stayed: [],
//   legalMoves: ['Nd7', 'Nd8', 'Td5', 'Td6', 'Ie4', 'Ie6', ...]
// }
```

```typescript
/**
 * COMPLETE/COMMIT a deploy session.
 * Apply all virtual changes to real board.
 * Remaining pieces automatically stay.
 */
game.completeDeploy(): DeployResult

interface DeployResult {
  success: boolean
  from: string
  moves: Array<{
    piece: PieceSymbol
    to: string
  }>
  stayed: PieceSymbol[]
  san: string                     // Full deploy notation (e.g., 'e5:Nd7,Td5,Ie6')
}

// Example:
// After moving Navy→d7, Tank→d5
const result = game.completeDeploy()
// {
//   success: true,
//   from: 'e5',
//   moves: [
//     { piece: 'n', to: 'd7' },
//     { piece: 't', to: 'd5' }
//   ],
//   stayed: ['i'],  // Infantry stayed
//   san: 'e5:Nd7,Td5,I-'
// }
```

```typescript
/**
 * CANCEL a deploy session.
 * Discard all virtual changes, restore original state.
 */
game.cancelDeploy(): void

// Example:
game.startDeploy('e5')
game.move('Nd7')  // Deploy step
game.cancelDeploy()  // Revert - Navy back at e5
```

```typescript
/**
 * MARK piece as staying.
 * Piece won't be required to move.
 */
game.markStaying(pieceType: PieceSymbol): boolean

// Example:
game.startDeploy('e5')  // [Navy, Tank, Infantry]
game.markStaying('i')   // Infantry will stay
// Now only need to move Navy and Tank
```

```typescript
/**
 * GET deploy session info.
 * Returns current state of active deploy.
 */
game.getDeploySessionInfo(): DeploySessionInfo | null

// Example:
const info = game.getDeploySessionInfo()
if (info) {
  showDeployUI(info.from, info.remaining, info.legalMoves)
}
```

---

## Complete UI Flow Examples

### Example 1: Normal Move Flow

```javascript
// 1. User clicks piece at e5
function handleSquareClick(square) {
  // Get legal moves
  const moves = game.moves({ square, verbose: true })

  if (moves.length === 0) {
    return // Not our piece or no legal moves
  }

  // Highlight legal destinations
  selectedSquare = square
  highlightSquare(square, 'selected')

  for (const move of moves) {
    highlightSquare(move.to, 'legal')
  }
}

// 2. User clicks destination
function handleDestinationClick(to) {
  if (!selectedSquare) return

  // Try to make move
  const result = game.move({ from: selectedSquare, to })

  if (result) {
    // Move successful
    clearHighlights()
    updateBoard()

    // Check game status
    if (game.isCheck()) {
      showCheckIndicator()
    }
    if (game.isGameOver()) {
      showGameOverDialog()
    }
  } else {
    showError('Illegal move')
  }
}
```

### Example 2: Deploy Flow (Full Cycle)

```javascript
// 1. User clicks stack at e5 and chooses "Deploy"
function handleDeployStart(square) {
  const session = game.startDeploy(square)

  if (!session.active) {
    showError('Cannot deploy from this square')
    return
  }

  // Enter deploy mode
  deployMode = true

  // Show deploy UI
  showDeployPanel({
    from: session.from,
    pieces: session.pieces,
    remaining: session.remaining,
  })

  // Highlight legal moves for first piece
  highlightLegalMoves(session.legalMoves)
}

// 2. User moves pieces one by one
function handleDeployMove(to) {
  // Make deploy step
  const result = game.move({ from: deployOrigin, to })

  if (!result) {
    showError('Illegal deploy move')
    return
  }

  // Update deploy UI
  const session = game.getDeploySessionInfo()
  updateDeployPanel(session)

  // Highlight legal moves for remaining pieces
  highlightLegalMoves(session.legalMoves)

  // Check if all pieces moved
  if (session.remaining.length === 0) {
    // Auto-complete
    handleDeployComplete()
  }
}

// 3. User clicks "Stay" button for a piece
function handleStayClick(pieceType) {
  game.markStaying(pieceType)

  // Update UI
  const session = game.getDeploySessionInfo()
  updateDeployPanel(session)
}

// 4. User clicks "Complete Deploy"
function handleDeployComplete() {
  const result = game.completeDeploy()

  // Exit deploy mode
  deployMode = false
  hideDeployPanel()
  clearHighlights()

  // Update board
  updateBoard()

  // Show completed deploy in history
  addMoveToHistory(result.san)

  // Check game status
  checkGameStatus()
}

// 5. User clicks "Cancel Deploy"
function handleDeployCancel() {
  game.cancelDeploy()

  // Exit deploy mode
  deployMode = false
  hideDeployPanel()
  clearHighlights()

  // Restore board
  updateBoard()
}
```

### Example 3: Complete Board Update Function

```javascript
function updateBoard() {
  // Clear board
  clearBoard()

  // Get all pieces
  const pieces = game.board()

  // Draw each piece
  for (const piece of pieces) {
    // Draw piece sprite
    drawPiece(piece.square, piece.type, piece.color, piece.heroic)

    // Draw stack indicator
    if (piece.carrying && piece.carrying.length > 0) {
      const stackSize = piece.carrying.length + 1
      drawStackBadge(piece.square, stackSize)
    }
  }

  // Highlight last move
  const history = game.history({ verbose: true })
  if (history.length > 0) {
    const lastMove = history[history.length - 1]
    highlightSquare(lastMove.from, 'last-move-from')
    highlightSquare(lastMove.to, 'last-move-to')
  }

  // Highlight check
  if (game.isCheck()) {
    const cmdSquare = getCommanderSquare(game.turn())
    highlightSquare(cmdSquare, 'check')
  }

  // Update status bar
  updateStatusBar({
    turn: game.turn(),
    moveNumber: game.moveNumber(),
    fen: game.fen(),
    isCheck: game.isCheck(),
    isGameOver: game.isGameOver(),
  })
}
```

---

## Implementation Checklist

### ✅ Already Implemented

- [x] `game.board()` - Get all pieces
- [x] `game.moves()` - Get legal moves
- [x] `game.moves({ square })` - Get moves for piece
- [x] `game.move()` - Execute move
- [x] `game.undo()` - Undo move
- [x] `game.history()` - Get move history
- [x] `game.turn()` - Get current turn
- [x] `game.isCheck()` - Check status
- [x] `game.isCheckmate()` - Checkmate status
- [x] `game.isGameOver()` - Game over status
- [x] `game.fen()` - Get FEN string
- [x] `game.getDeployState()` - Get deploy state (internal)
- [x] `game.deployMove()` - Execute deploy move

### ❌ Needs Implementation

- [ ] `game.startDeploy(square)` - Start deploy session
- [ ] `game.completeDeploy()` - Commit deploy session
- [ ] `game.cancelDeploy()` - Cancel deploy session
- [ ] `game.markStaying(pieceType)` - Mark piece as staying
- [ ] `game.getDeploySessionInfo()` - Get user-friendly deploy info
- [ ] `game.getCommanderSquare(color)` - Get commander position (for
      highlighting)
- [ ] `game.getLastMove()` - Get last move (for highlighting)

### 🔧 Recommended Additions

- [ ] `game.getAttackedSquares(color)` - Show threatened squares (for UI hints)
- [ ] `game.isSquareAttacked(square, byColor)` - Check if square under attack
- [ ] `game.validateMove(from, to)` - Pre-validate before executing
- [ ] `game.getAirDefenseZones(color)` - Show air defense coverage (for UI
      hints)

---

## API Summary Table

| Category           | Method                     | Status                | Purpose                |
| ------------------ | -------------------------- | --------------------- | ---------------------- |
| **Board State**    | `board()`                  | ✅                    | Get all pieces         |
|                    | `fen()`                    | ✅                    | Get FEN string         |
|                    | `turn()`                   | ✅                    | Get current turn       |
|                    | `moveNumber()`             | ✅                    | Get move number        |
| **Legal Moves**    | `moves()`                  | ✅                    | Get all legal moves    |
|                    | `moves({ square })`        | ✅                    | Get moves for piece    |
|                    | `moves({ verbose: true })` | ✅                    | Get detailed moves     |
| **Move Execution** | `move(san)`                | ✅                    | Execute move           |
|                    | `undo()`                   | ✅                    | Undo last move         |
|                    | `history()`                | ✅                    | Get move history       |
| **Game Status**    | `isCheck()`                | ✅                    | Check detection        |
|                    | `isCheckmate()`            | ✅                    | Checkmate detection    |
|                    | `isGameOver()`             | ✅                    | Game over detection    |
| **Deploy Session** | `startDeploy()`            | ❌ **NEEDED**         | Start deploy           |
|                    | `completeDeploy()`         | ❌ **NEEDED**         | Commit deploy          |
|                    | `cancelDeploy()`           | ❌ **NEEDED**         | Cancel deploy          |
|                    | `markStaying()`            | ❌ **NEEDED**         | Mark piece staying     |
|                    | `getDeploySessionInfo()`   | ❌ **NEEDED**         | Get deploy info        |
| **UI Helpers**     | `getCommanderSquare()`     | ⚠️ Exists (private)   | Get commander position |
|                    | `getLastMove()`            | ❌ **NEEDED**         | Get last move          |
|                    | `getAttackedSquares()`     | ❌ Optional           | Show threats           |
|                    | `getAirDefenseZones()`     | ⚠️ Exists (different) | Show air defense       |

---

## Conclusion

The UI library needs:

1. **Basic board rendering:** `board()`, `fen()` ✅
2. **Move highlighting:** `moves({ square })` ✅
3. **Move execution:** `move()`, `undo()` ✅
4. **Game status:** `isCheck()`, `isGameOver()` ✅
5. **Deploy session management:** `startDeploy()`, `completeDeploy()`,
   `cancelDeploy()` ❌ **NEEDED**

The missing piece is a clean deploy session API for the UI to interact with
deploy mode properly! 🎯
