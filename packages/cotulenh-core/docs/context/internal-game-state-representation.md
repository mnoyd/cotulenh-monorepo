# Internal Game State Representation

## Overview

CoTuLenh maintains comprehensive internal state to track all aspects of the
game, including board position, move history, game metadata, and special game
states like deploy phases and air defense zones.

## Core State Components

### Board Array Structure

#### 0x88 Board Representation

```typescript
private _board = new Array<Piece | undefined>(256)
```

**Key Characteristics**:

- **Size**: 256-element array (16x16 grid)
- **Active Area**: 11x12 board mapped within the 16x16 grid
- **Indexing**: 0x88 system for efficient boundary checking
- **Storage**: Each element contains a `Piece` object or `undefined`

#### Square Indexing System

```typescript
// Square calculation: rank * 16 + file
// Example: a12 = 0 * 16 + 0 = 0
//          k1 = 11 * 16 + 10 = 186

export function algebraic(square: number): Square {
  const f = file(square) // square & 15
  const r = rank(square) // square >> 4
  return `${String.fromCharCode(97 + f)}${12 - r}` as Square
}

export function isSquareOnBoard(square: number): boolean {
  return (square & 0x88) === 0 && file(square) < 11 && rank(square) < 12
}
```

#### Piece Object Structure

```typescript
interface Piece {
  type: PieceSymbol // Piece type (c, i, t, m, e, a, b, s, f, n, h)
  color: Color // RED ('r') or BLUE ('b')
  heroic?: boolean // Heroic status (enhanced abilities)
  carrying?: Piece[] // Carried pieces in stack
}
```

### Game State Variables

#### Turn and Move Tracking

```typescript
private _turn: Color = RED           // Current player to move
private _halfMoves = 0               // Half-moves since last capture
private _moveNumber = 1              // Full move number
```

**Turn Management**:

- `_turn` switches after each non-deploy move
- Remains same during deploy sequences
- Used for legal move generation and game flow

**Move Counting**:

- `_halfMoves` increments each half-move, resets on capture
- `_moveNumber` increments after Blue's move
- Used for 50-move rule and game notation

#### Commander Position Tracking

```typescript
private _commanders: Record<Color, number> = { r: -1, b: -1 }
```

**Commander Tracking**:

- Maps each color to commander's square index
- `-1` indicates captured commander (game over)
- Updated automatically on commander moves
- Used for check detection and game ending

#### Position Counting for Repetition

```typescript
private _positionCount: Record<string, number> = {}
```

**Repetition Detection**:

- Maps FEN strings to occurrence counts
- Updated after each move via `_updatePositionCounts()`
- Used for threefold repetition rule
- Key includes full game state (position + turn)

### Move History System

#### History Structure

```typescript
interface History {
  move: CTLMoveCommandInteface        // Command object for undo
  commanders: Record<Color, number>   // Commander positions before move
  turn: Color                         // Turn before move
  halfMoves: number                   // Half-move clock before move
  moveNumber: number                  // Move number before move
  deployState: DeployState | null     // Deploy state before move
}

private _history: History[] = []
```

**History Management**:

- Each entry stores complete pre-move state
- Command pattern enables precise undo operations
- Supports both regular moves and deploy moves
- Maintains game state consistency across undo/redo

#### Command Pattern Implementation

```typescript
interface CTLMoveCommandInteface {
  move: InternalMove | InternalDeployMove
  execute(): void
  undo(): void
}
```

**Command Types**:

- `CTLMoveCommand`: Regular piece moves
- `DeployMoveCommand`: Stack deployment moves
- Each command encapsulates all state changes
- Atomic execution ensures consistency

### Deploy State Management

#### Deploy State Structure

```typescript
interface DeployState {
  stackSquare: number    // Square containing the stack being deployed
  turn: Color           // Color of the deploying player
}

private _deployState: DeployState | null = null
```

**Deploy Phase Tracking**:

- `null` during normal play
- Set when stack deployment begins
- Maintains deploy context across multiple moves
- Cleared when deploy sequence completes

#### Deploy Move Representation

```typescript
interface InternalDeployMove {
  from: number // Stack's original square
  moves: InternalMove[] // Individual piece movements
  stay?: Piece // Pieces remaining at origin
  captured?: Piece[] // Pieces captured during deployment
}
```

### Air Defense System State

#### Air Defense Mapping

```typescript
type AirDefenseForSide = Map<number, number[]>
type AirDefense = {
  [RED]: AirDefenseForSide
  [BLUE]: AirDefenseForSide
}

private _airDefense: AirDefense = {
  [RED]: new Map<number, number[]>(),
  [BLUE]: new Map<number, number[]>(),
}
```

**Air Defense Tracking**:

- Maps defender squares to influenced squares
- Updated when air defense pieces move
- Used for air force movement restrictions
- Calculated dynamically based on piece positions

### Caching System

#### Move Generation Cache

```typescript
private _movesCache = new QuickLRU<string, InternalMove[]>({ maxSize: 1000 })
```

**Cache Management**:

- LRU cache for expensive move generation
- Key includes FEN, deploy state, and filter parameters
- Invalidated on board state changes
- Significantly improves performance

#### Cache Key Generation

```typescript
private _getMovesCacheKey(args: {
  legal?: boolean
  pieceType?: PieceSymbol
  square?: Square
  deploy?: boolean
}): string {
  const fen = this.fen()

  let deployState = 'none'
  if (args.deploy) {
    deployState = `${args.square}:${this.turn()}`
  } else if (this._deployState) {
    deployState = `${this._deployState.stackSquare}:${this._deployState.turn}`
  }

  const { legal = true, pieceType, square } = args
  return `${fen}|deploy:${deployState}|legal:${legal}|pieceType:${pieceType ?? ''}|square:${square ?? ''}`
}
```

## State Update Operations

### Move Execution Process

```typescript
private _makeMove(move: InternalMove | InternalDeployMove) {
  const us = this.turn()
  const them = swapColor(us)

  // 1. Create command object
  let moveCommand: CTLMoveCommandInteface
  if (isInternalDeployMove(move)) {
    moveCommand = new DeployMoveCommand(this, move)
  } else {
    moveCommand = createMoveCommand(this, move)
  }

  // 2. Store pre-move state
  const preCommanderState = { ...this._commanders }
  const preTurn = us
  const preHalfMoves = this._halfMoves
  const preMoveNumber = this._moveNumber
  const preDeployState = this._deployState

  // 3. Execute command
  moveCommand.execute()

  // 4. Store history entry
  const historyEntry: History = {
    move: moveCommand,
    commanders: preCommanderState,
    turn: preTurn,
    halfMoves: preHalfMoves,
    moveNumber: preMoveNumber,
    deployState: preDeployState,
  }
  this._history.push(historyEntry)

  // 5. Update game state
  if (moveCommand.move.captured) {
    this._halfMoves = 0
  } else {
    this._halfMoves++
  }

  if (!isInternalDeployMove(move) && us === BLUE && !(move.flags & BITS.DEPLOY)) {
    this._moveNumber++
  }

  if (!isInternalDeployMove(move) && !(move.flags & BITS.DEPLOY)) {
    this._turn = them
  }

  this._updatePositionCounts()
}
```

### Undo Operation Process

```typescript
private _undoMove(): InternalMove | InternalDeployMove | null {
  const old = this._history.pop()
  if (!old) return null

  const command = old.move

  // Restore pre-move state
  this._commanders = old.commanders
  this._turn = old.turn
  this._halfMoves = old.halfMoves
  this._moveNumber = old.moveNumber
  this._deployState = old.deployState

  // Undo board changes
  command.undo()

  return command.move
}
```

### Position Count Updates

```typescript
private _updatePositionCounts(): void {
  const fen = this.fen()

  // Update position count for threefold repetition detection
  if (!(fen in this._positionCount)) {
    this._positionCount[fen] = 0
  }
  this._positionCount[fen]++

  // Update setup flags
  this._header['SetUp'] = '1'
  this._header['FEN'] = fen
}
```

## State Queries and Access

### Board State Queries

```typescript
// Get piece at square
get(square: Square | number, pieceType?: PieceSymbol): Piece | undefined {
  const sq = typeof square === 'number' ? square : SQUARE_MAP[square]
  if (sq === undefined) return undefined

  const pieceAtSquare = this._board[sq]
  if (!pieceAtSquare) return undefined

  // Handle piece type filtering for stacks
  if (!pieceType || pieceAtSquare.type === pieceType) {
    return pieceAtSquare
  }

  // Check carried pieces
  if (pieceAtSquare.carrying && pieceAtSquare.carrying.length > 0) {
    return pieceAtSquare.carrying.find((p) => p.type === pieceType)
  }

  return undefined
}

// Get commander position
getCommanderSquare(color: Color): number {
  return this._commanders[color]
}

// Get current turn
turn(): Color {
  return this._turn
}
```

### Game State Queries

```typescript
// Check game ending conditions
isCheck(): boolean {
  return this._isCommanderAttacked(this._turn)
}

isCheckmate(): boolean {
  return this.isCheck() && this._moves({ legal: true }).length === 0
}

isDraw(): boolean {
  return this.isDrawByFiftyMoves() || this.isThreefoldRepetition()
}

isGameOver(): boolean {
  return this.isCheckmate() || this.isDraw() ||
         this._commanders[RED] === -1 || this._commanders[BLUE] === -1
}
```

### History Access

```typescript
history({ verbose = false }: { verbose?: boolean } = {}) {
  const reversedHistory = []
  const moveHistory = []

  // Undo all moves to collect them
  while (this._history.length > 0) {
    reversedHistory.push(this._undoMove())
  }

  // Replay moves and build history
  while (true) {
    const move = reversedHistory.pop()
    if (!move) break

    if (verbose) {
      if (isInternalDeployMove(move)) {
        moveHistory.push(new DeployMove(this, move))
      } else {
        moveHistory.push(new Move(this, move))
      }
    } else {
      if (isInternalDeployMove(move)) {
        const [san] = deployMoveToSanLan(this, move)
        moveHistory.push(san)
      } else {
        moveHistory.push(this._moveToSanLan(move, this._moves())[0])
      }
    }

    this._makeMove(move)
  }

  return moveHistory
}
```

## State Consistency and Validation

### Invariant Maintenance

The system maintains several critical invariants:

1. **Commander Tracking**: `_commanders` always reflects actual board positions
2. **Turn Consistency**: `_turn` matches the player who should move next
3. **History Integrity**: Each history entry enables perfect state restoration
4. **Cache Validity**: Move cache is invalidated when board state changes
5. **Position Counting**: `_positionCount` accurately tracks position
   repetitions

### State Validation

```typescript
// Validate commander positions match board state
private _validateCommanderPositions(): boolean {
  for (const color of [RED, BLUE] as Color[]) {
    const commanderSq = this._commanders[color]
    if (commanderSq === -1) continue // Captured commander

    const piece = this._board[commanderSq]
    if (!piece || !haveCommander(piece) || piece.color !== color) {
      return false
    }
  }
  return true
}

// Validate move history consistency
private _validateHistoryConsistency(): boolean {
  // Each history entry should enable perfect undo
  // This is validated through the command pattern implementation
  return this._history.every(entry => entry.move !== null)
}
```

## Memory Management

### State Cleanup

```typescript
clear({ preserveHeaders = false } = {}) {
  this._movesCache.clear()
  this._board = new Array<Piece | undefined>(256)
  this._commanders = { r: -1, b: -1 }
  this._turn = RED
  this._halfMoves = 0
  this._moveNumber = 1
  this._history = []
  this._comments = {}
  this._header = preserveHeaders ? this._header : {}
  this._positionCount = {}
  this._airDefense = {
    [RED]: new Map<number, number[]>(),
    [BLUE]: new Map<number, number[]>(),
  }
}
```

### Cache Management

- **LRU Policy**: Automatic eviction of least recently used entries
- **Size Limits**: Maximum 1000 cached move generation results
- **Invalidation**: Cache cleared on state-changing operations
- **Key Optimization**: Efficient cache key generation for fast lookups

## Performance Considerations

### Efficient Operations

- **0x88 Board**: Fast boundary checking with bitwise operations
- **Commander Tracking**: O(1) commander position lookup
- **Move Caching**: Expensive move generation cached with LRU policy
- **Incremental Updates**: State changes applied incrementally rather than full
  recalculation

### Memory Usage

- **Sparse Board**: Only occupied squares store piece objects
- **History Compression**: Command pattern minimizes history storage
- **Cache Limits**: Bounded cache prevents memory leaks
- **Object Reuse**: Piece objects reused where possible

### Optimization Strategies

- **Lazy Evaluation**: Air defense zones calculated on demand
- **Batch Operations**: Multiple state changes applied atomically
- **Copy-on-Write**: State snapshots created only when needed
- **Index Optimization**: Efficient square indexing with 0x88 system
