# Deploy Session Comprehensive Analysis: How Active Deploy Sessions Alter Game Function Behavior

## Executive Summary

Deploy sessions represent the most complex aspect of CoTuLenh, fundamentally
altering the behavior of nearly every game function. When a deploy session is
active, the game operates in a special state where:

1. **Turn management is suspended** - the same player continues moving until
   deployment completes
2. **Move generation is restricted** - only pieces from the original stack can
   move
3. **State representation changes** - FEN includes deploy markers, history
   tracking differs
4. **Validation logic adapts** - legal move filtering accounts for virtual board
   state
5. **Game flow is modified** - normal game progression is paused during
   deployment

This analysis examines how each major game function behaves differently during
active deploy sessions.

---

## 1. Legal Move Generation (`generateLegalMoves()`)

### Normal Behavior (No Deploy Session)

```typescript
generateLegalMoves(): Move[] {
  // Generate moves for all pieces of current player
  return this.generateNormalMoves()
}
```

### Deploy Session Behavior

```typescript
generateLegalMoves(): Move[] {
  if (this.deploySession) {
    // ONLY generate moves for remaining pieces in the stack
    return this.generateDeployMoves()
  }
  return this.generateNormalMoves()
}

private generateDeployMoves(): Move[] {
  const moves: Move[] = []
  const stackSquare = this.deploySession.originalSquare

  // Only pieces still in the original stack can move
  for (const piece of this.deploySession.remaining) {
    // 1. Normal deploy moves from stack square
    const normalMoves = this.generatePieceMoves(stackSquare, piece)
    moves.push(...normalMoves.map(m => ({
      type: 'deploy-step',
      piece,
      from: stackSquare,
      to: m.to
    })))

    // 2. Recombine with already deployed pieces
    for (const deployed of this.deploySession.deployed) {
      if (this.canPieceReach(piece, stackSquare, deployed.destination)) {
        moves.push({
          type: 'deploy-recombine',
          piece,
          from: stackSquare,
          to: deployed.destination
        })
      }
    }

    // 3. Stay on stack option
    moves.push({
      type: 'deploy-stay',
      piece,
      square: stackSquare
    })
  }

  return this.filterLegalMoves(moves)
}
```

**Key Changes:**

- **Scope Restriction**: Only generates moves for `deploySession.remaining`
  pieces
- **Source Limitation**: All moves must originate from
  `deploySession.originalSquare`
- **New Move Types**: Introduces `deploy-step`, `deploy-recombine`,
  `deploy-stay`
- **Recombination Logic**: Pieces can rejoin already deployed pieces if within
  range

---

## 2. Commander Attack Detection (`isCommanderAttacked()`)

### Normal Behavior

```typescript
isCommanderAttacked(color: Color): boolean {
  const board = this.board
  const commanderSquare = this.commanders[color === 'r' ? 0 : 1]

  // Check all enemy pieces on real board
  for (const [square, piece] of board.pieces(enemyColor)) {
    if (this.canAttack(board, square, piece, commanderSquare)) {
      return true
    }
  }
  return false
}
```

### Deploy Session Behavior

```typescript
isCommanderAttacked(color: Color): boolean {
  // Use VIRTUAL board that includes deploy session changes
  const board = this.getEffectiveBoard()  // Virtual + real
  const commanderSquare = this.commanders[color === 'r' ? 0 : 1]

  // Check all enemy pieces using virtual board state
  for (const [square, piece] of board.pieces(enemyColor)) {
    if (this.canAttack(board, square, piece, commanderSquare)) {
      return true
    }
  }
  return false
}

private getEffectiveBoard(): Board {
  if (!this.deploySession) {
    return this.board // No virtual changes
  }

  // Create virtual board view with deploy session changes
  return new VirtualBoard(this.board, this.deploySession)
}
```

**Key Changes:**

- **Virtual Board Usage**: Uses `VirtualBoard` that overlays deploy session
  changes
- **Accurate Threat Assessment**: Considers pieces in their deployed positions,
  not original stack
- **Real-time Updates**: Reflects current deploy session state for accurate
  commander safety

---

## 3. Commander Exposure Check (`isCommanderExposed()`)

### Normal Behavior

```typescript
isCommanderExposed(): boolean {
  const [redCmd, blueCmd] = this.commanders

  if (file(redCmd) !== file(blueCmd)) {
    return false // Not on same file
  }

  const between = getSquaresBetween(redCmd, blueCmd)

  for (const sq of between) {
    if (this.board.get(sq) !== null) {  // Real board
      return false // Piece blocks the line
    }
  }

  return true // Commanders face each other
}
```

### Deploy Session Behavior

```typescript
isCommanderExposed(): boolean {
  const [redCmd, blueCmd] = this.commanders

  if (file(redCmd) !== file(blueCmd)) {
    return false
  }

  const between = getSquaresBetween(redCmd, blueCmd)
  const board = this.getEffectiveBoard()  // Virtual board!

  for (const sq of between) {
    if (board.get(sq) !== null) {  // Virtual board check
      return false
    }
  }

  return true
}
```

**Key Changes:**

- **Virtual Board Checking**: Uses effective board state including deploy
  session changes
- **Accurate Blocking**: Considers deployed pieces as potential blockers
- **Dynamic Assessment**: Updates as pieces are deployed during the session

---

## 4. FEN Generation (`generateFEN()`)

### Normal Behavior

```typescript
generateFEN(): string {
  const baseFEN = this.generateBaseFEN()

  return [
    baseFEN,
    this.turn,
    '-',  // castling
    '-',  // en passant
    this.halfMoves,
    this.moveNumber
  ].join(' ')
}
```

### Deploy Session Behavior

```typescript
generateFEN(): string {
  const baseFEN = this.generateBaseFEN()

  if (!this.deploySession) {
    return this.standardFEN(baseFEN)
  }

  // Extended FEN with deploy session marker
  const deployInfo = this.serializeDeploySession(this.deploySession)

  return [
    baseFEN,
    this.turn,
    '-',
    '-',
    this.halfMoves,
    this.moveNumber,
    'DEPLOY',
    deployInfo
  ].join(' ')
}

private serializeDeploySession(session: DeploySession): string {
  const remaining = session.getRemainingPieces()
  const deployInfo = [
    `${session.originalSquare}:${serializePieces(remaining)}`,
    session.movedPieces.length.toString()
  ]

  return deployInfo.join(' ')
}
```

**Key Changes:**

- **Extended Format**: Adds `DEPLOY` marker and session information
- **Session State**: Includes original square, remaining pieces, and move count
- **Reconstruction**: Allows full game state restoration from FEN

**Example FENs:**

```
Normal: "...base_fen... r - - 0 1"
Deploy: "...base_fen... r - - 0 1 DEPLOY e5:NT 2"
```

---

## 5. SAN Notation Generation (`moveToSAN()`)

### Normal Behavior

```typescript
moveToSAN(move: Move): string {
  const piece = makeSanPiece(move.piece)
  const disambiguator = getDisambiguator(move, this.legalMoves)
  const destination = algebraic(move.to)
  const capture = move.captured ? 'x' : ''

  return `${piece}${disambiguator}${capture}${destination}`
}
```

### Deploy Session Behavior

```typescript
moveToSAN(move: Move): string {
  if (move.type === 'deploy-step') {
    return this.generateDeploySAN(move)
  }

  // Normal SAN generation with deploy context
  return this.generateNormalSAN(move)
}

private generateDeploySAN(move: DeployMove): string {
  const piece = makeSanPiece(move.piece)
  const destination = algebraic(move.to)
  const capture = move.captured ? 'x' : ''

  // Deploy moves use '>' separator
  return `${piece}>${capture}${destination}`
}
```

**Key Changes:**

- **Deploy Notation**: Uses `>` separator for deploy moves
- **Context Awareness**: Different notation rules during deploy sessions
- **Recombine Notation**: Special notation for pieces rejoining deployed stacks

**Example SAN:**

```
Normal: "Tc3", "Txd4"
Deploy: "T>c3", "T>xd4", "T<" (stay)
```

---

## 6. Turn Management (`switchTurn()`)

### Normal Behavior

```typescript
makeMove(move: Move): void {
  this.applyMove(move)
  this.switchTurn()  // Always switch after move
}

private switchTurn(): void {
  this.turn = this.turn === 'r' ? 'b' : 'r'
}
```

### Deploy Session Behavior

```typescript
makeMove(move: Move): void {
  this.applyMove(move)

  // Turn switching depends on deploy session state
  if (this.shouldSwitchTurn(move)) {
    this.switchTurn()
  }
}

private shouldSwitchTurn(move: Move): boolean {
  if (!this.deploySession) {
    return true // Normal moves always switch
  }

  // Deploy session active - only switch when complete
  return this.deploySession.remaining.length === 0
}
```

**Key Changes:**

- **Conditional Switching**: Turn only switches when deploy session completes
- **Session Completion**: Determined by `remaining.length === 0`
- **Turn Preservation**: Same player continues until all pieces deployed

**Turn Flow Example:**

```
Normal: RED → BLUE → RED → BLUE
Deploy: RED → RED → RED → BLUE (after deploy complete)
```

---

## 7. Move History Management (`addToHistory()`)

### Normal Behavior

```typescript
makeMove(move: Move): void {
  const undo = this.applyMove(move)

  // Add each move to history immediately
  this.history.push({
    move,
    undo,
    fen: this.fen(),
    timestamp: Date.now()
  })
}
```

### Deploy Session Behavior

```typescript
makeMove(move: Move): void {
  const undo = this.applyMove(move)

  if (this.deploySession) {
    // Store in deploy transaction, not main history
    this.deploySession.moveHistory.push({
      move,
      undo,
      fen: this.fen(),
      timestamp: Date.now()
    })

    // Only add to main history when deploy completes
    if (this.deploySession.remaining.length === 0) {
      this.commitDeployToHistory()
    }
  } else {
    // Normal history management
    this.history.push({ move, undo, fen: this.fen() })
  }
}

private commitDeployToHistory(): void {
  // Add entire deploy session as single history entry
  this.history.push({
    type: 'deploy-complete',
    deployMoves: this.deploySession.moveHistory,
    startFEN: this.deploySession.startFEN,
    endFEN: this.fen(),
    undo: this.createDeploySessionUndo()
  })
}
```

**Key Changes:**

- **Nested History**: Deploy moves stored in session, not main history
- **Atomic Commits**: Entire deploy session becomes one history entry
- **Undo Granularity**: Can undo individual deploy steps or entire session

---

## 8. Game State Queries

### `isCheck()` / `isCheckmate()` / `isDraw()`

**Normal Behavior**: Check current board state directly

**Deploy Session Behavior**:

- Use virtual board state for accurate assessment
- Consider deployed pieces in their new positions
- Account for pieces still in original stack

### `getAttackers(square)`

**Normal Behavior**: Find all pieces attacking a square on real board

**Deploy Session Behavior**:

- Use virtual board to find attackers
- Include deployed pieces in their new positions
- Exclude pieces that have moved from original stack

### `canMoveTo(from, to)`

**Normal Behavior**: Check if any piece can move between squares

**Deploy Session Behavior**:

- Only allow moves from deploy session's original square
- Restrict to remaining pieces in the stack
- Include recombination possibilities

---

## 9. Virtual State Architecture

### The Core Innovation

Deploy sessions use a **virtual state overlay** that doesn't mutate the real
board until completion:

```typescript
class DeploySession {
  originalSquare: Square
  originalStack: Piece[]

  // Virtual changes (not committed to real board)
  virtualChanges: Map<Square, Piece | null>

  // Track what happened
  movedPieces: Array<{
    piece: Piece
    from: Square
    to: Square
  }>

  // Get effective piece at square (virtual + real)
  getEffectivePiece(board: Board, square: Square): Piece | null {
    if (this.virtualChanges.has(square)) {
      return this.virtualChanges.get(square)!
    }
    return board.get(square)
  }
}
```

### Virtual Board Implementation

```typescript
class VirtualBoard {
  constructor(
    private realBoard: Board,
    private deploySession: DeploySession,
  ) {}

  get(square: Square): Piece | null {
    // Check virtual changes first
    if (this.deploySession.virtualChanges.has(square)) {
      return this.deploySession.virtualChanges.get(square)!
    }

    // Fall back to real board
    return this.realBoard.get(square)
  }

  // All game functions use this virtual view during deploy
}
```

---

## 10. State Transition Flow

### Deploy Session Lifecycle

```
1. INACTIVE (Normal game state)
   ↓ User moves piece from stack

2. DEPLOY_STARTED
   - Create DeploySession
   - Initialize virtual state
   - Restrict move generation

3. DEPLOY_ACTIVE
   - Process deploy moves
   - Update virtual state
   - Maintain same turn

4. DEPLOY_COMPLETE
   - Commit virtual changes to real board
   - Clear deploy session
   - Switch turn
   - Add to history

5. INACTIVE (Return to normal state)
```

### State Validation During Deploy

Every game function must handle the virtual state correctly:

```typescript
// Example: Legal move validation during deploy
filterLegalMoves(moves: Move[]): Move[] {
  const legal: Move[] = []

  for (const move of moves) {
    // Apply move to virtual state
    const undo = this.makeMove(move)

    // Check legality using virtual board
    const board = this.getEffectiveBoard()  // Virtual + real
    const isLegal =
      !this.isCommanderAttacked(this.turn, board) &&
      !this.isCommanderExposed(board)

    // Undo virtual change
    this.unmakeMove(undo)

    if (isLegal) {
      legal.push(move)
    }
  }

  return legal
}
```

---

## 11. API Response Changes

### Normal Game Response

```json
{
  "success": true,
  "fen": "...standard_fen...",
  "turn": "b",
  "legalMoves": [...],
  "gameState": {
    "isCheck": false,
    "isCheckmate": false
  }
}
```

### Deploy Session Response

```json
{
  "success": true,
  "fen": "...fen... DEPLOY e5:NT 2",
  "turn": "r", // Same turn continues
  "legalMoves": [
    { "type": "deploy-step", "piece": "navy", "to": "b5" },
    { "type": "deploy-recombine", "piece": "tank", "to": "b5" },
    { "type": "deploy-stay", "piece": "navy" }
  ],
  "deploySession": {
    "active": true,
    "originalSquare": "e5",
    "remaining": ["navy", "tank"],
    "deployed": [{ "piece": "airforce", "destination": "d7" }]
  },
  "gameState": {
    "isCheck": false,
    "isCheckmate": false
  }
}
```

---

## 12. Critical Implementation Points

### 1. Validation Order

```typescript
// WRONG: Check real board first
if (this.board.get(square) && this.deploySession) { ... }

// CORRECT: Always use effective board
const board = this.getEffectiveBoard()
if (board.get(square)) { ... }
```

### 2. Move Generation Scope

```typescript
// WRONG: Generate all moves during deploy
if (this.deploySession) {
  return this.generateAllMoves() // Too broad
}

// CORRECT: Only remaining pieces from stack
if (this.deploySession) {
  return this.generateDeployMoves(this.deploySession.remaining)
}
```

### 3. Turn Management

```typescript
// WRONG: Always switch turns
this.makeMove(move)
this.switchTurn() // Breaks deploy sessions

// CORRECT: Conditional turn switching
this.makeMove(move)
if (this.shouldSwitchTurn(move)) {
  this.switchTurn()
}
```

### 4. History Granularity

```typescript
// WRONG: Add each deploy step to main history
this.history.push(deployStep) // Creates fragmented history

// CORRECT: Batch deploy session
this.deploySession.steps.push(deployStep)
if (complete) {
  this.history.push(entireDeploySession)
}
```

---

## 13. Testing Implications

Deploy sessions require comprehensive testing of:

### State Consistency

- Virtual board matches expected state after each deploy step
- Real board unchanged until deploy completion
- Commander positions accurate in virtual state

### Move Generation

- Only remaining pieces generate moves during deploy
- Recombination moves calculated correctly
- Stay options available for all remaining pieces

### Validation Logic

- Legal move filtering uses virtual board
- Commander safety checks use effective state
- Terrain restrictions apply to virtual positions

### Turn Management

- Turn preserved during deploy session
- Turn switches only on completion
- Multiple deploy sessions in sequence work correctly

### History and Undo

- Individual deploy steps can be undone
- Entire deploy session can be undone as unit
- History reconstruction works from FEN with deploy markers

---

## Conclusion

Deploy sessions represent a fundamental shift in game state management,
requiring every major game function to operate in a dual mode:

1. **Normal Mode**: Direct board manipulation, immediate turn switching,
   standard move generation
2. **Deploy Mode**: Virtual state overlay, turn preservation, restricted move
   generation, batch history management

The key insight is that deploy sessions create a **temporary parallel reality**
where moves are staged virtually before being committed atomically. This ensures
game state consistency while allowing complex multi-step deployments within a
single turn.

Understanding this virtual state architecture is crucial for:

- Implementing correct game logic
- Maintaining state consistency
- Providing accurate API responses
- Ensuring proper validation during deploy phases

The deploy session system is the most complex aspect of CoTuLenh, but this
virtual state approach makes it manageable and maintainable.
