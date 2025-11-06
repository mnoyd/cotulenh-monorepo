# Move Validation and Execution Cycle

## Overview

The CoTuLenh game engine implements a comprehensive move validation and
execution system that handles multiple input formats, validates moves against
game rules, executes atomic operations, and maintains game state consistency.
This document details the complete request-response cycle for move processing.

## Move Input Processing

### Input Formats

The engine accepts moves in multiple formats:

#### 1. Standard Algebraic Notation (SAN)

```typescript
// Basic moves
game.move('Tc3') // Tank to c3
game.move('Ie4') // Infantry to e4
game.move('Axb5') // Artillery captures on b5

// Special moves
game.move('T_d3') // Tank stay capture on d3
game.move('A@e6') // Artillery suicide capture on e6
game.move('T&f4(TI)') // Tank combines with Tank+Infantry on f4

// Deploy moves
game.move('(T|I)c2>c3') // Deploy Tank or Infantry from c2 to c3
game.move('(T|I)c2>xd3') // Deploy with capture
```

#### 2. Move Object Format

```typescript
// Basic move object
game.move({
  from: 'c2',
  to: 'c3',
  piece: 't', // Optional piece type filter
})

// Stay capture move
game.move({
  from: 'd2',
  to: 'd3',
  stay: true,
})

// Deploy move
game.move({
  from: 'c2',
  to: 'c3',
  deploy: true,
  piece: 't',
})
```

#### 3. Deploy Move Request

```typescript
// Complex deploy move with multiple pieces
game.deployMove({
  from: 'c2',
  moves: [
    { piece: 't', to: 'c3' },
    { piece: 'i', to: 'd3', capture: true },
  ],
  stay: { type: 'e', color: 'r' }, // Engineer stays
})
```

### SAN Parsing Process

The SAN parser follows a multi-stage approach:

#### 1. Strict Parsing

```typescript
private _moveFromSan(move: string, strict = false): InternalMove | null {
  const cleanMove = strippedSan(move)
  let pieceType = inferPieceType(cleanMove)
  let moves = this._moves({ legal: true, pieceType: pieceType })

  // Try exact SAN/LAN matching first
  for (let i = 0, len = moves.length; i < len; i++) {
    const [san, lan] = this._moveToSanLan(moves[i], moves)
    if (cleanMove === strippedSan(san) || cleanMove === strippedSan(lan)) {
      return moves[i]
    }
  }
}
```

#### 2. Permissive Parsing

```typescript
// Regex pattern for flexible parsing
const regex =
  /^(\(.*\))?(\+)?([CITMEAGSFNH])?([a-k]?(?:1[0-2]|[1-9])?)([x<>\+&-]|>x)?([a-k](?:1[0-2]|[1-9]))([#\^]?)?$/

// Extract components
matches = cleanMove.match(regex)
if (matches) {
  heroic = matches[2] // + prefix
  pieceType = matches[3] // Piece symbol
  from = matches[4] // From square (partial)
  flag = matches[5] // Move type flags
  to = matches[6] // Destination square
  check = matches[7] // Check/checkmate suffix
}
```

### Move Object Processing

For move objects, the engine performs direct square and piece validation:

```typescript
if (typeof move === 'object') {
  const fromSq = SQUARE_MAP[move.from as Square]
  const toSq = SQUARE_MAP[move.to as Square]

  // Validate squares
  if (fromSq === undefined || toSq === undefined) {
    throw new Error(`Invalid square in move object: ${JSON.stringify(move)}`)
  }

  // Find matching legal moves
  const legalMoves = this._moves({
    legal: true,
    square: move.from as Square,
    ...(move.piece && { pieceType: move.piece }),
  })

  // Match against criteria
  const foundMoves = legalMoves.filter(
    (m) =>
      m.from === fromSq &&
      m.to === toSq &&
      (move.piece === undefined || m.piece.type === move.piece) &&
      (move.stay !== undefined ? move.stay === isStayMove(m) : true) &&
      (move.deploy !== undefined ? move.deploy === isDeployMove(m) : true),
  )
}
```

## Move Validation Process

### Legal Move Generation

The validation process starts with generating all legal moves:

```typescript
private _moves({
  legal = true,
  pieceType: filterPiece = undefined,
  square: filterSquare = undefined,
  deploy = false,
} = {}): InternalMove[] {

  // Check cache first
  const cacheKey = this._getMovesCacheKey({ legal, pieceType: filterPiece, square: filterSquare, deploy })
  if (this._movesCache.has(cacheKey)) {
    return this._movesCache.get(cacheKey)!
  }

  let allMoves: InternalMove[] = []

  // Generate based on game state
  if ((this._deployState && this._deployState.turn === us) || deploy) {
    // Deploy moves from stack
    allMoves = generateDeployMoves(this, deployFilterSquare, filterPiece)
  } else {
    // Normal moves
    allMoves = generateNormalMoves(this, us, filterPiece, filterSquare)
  }

  // Filter illegal moves if requested
  if (legal) {
    result = this._filterLegalMoves(allMoves, us)
  } else {
    result = allMoves
  }

  // Cache and return
  this._movesCache.set(cacheKey, result)
  return result
}
```

### Legal Move Filtering

Legal moves must not leave the commander in check or exposed:

```typescript
private _filterLegalMoves(
  moves: (InternalMove | InternalDeployMove)[],
  us: Color,
): (InternalMove | InternalDeployMove)[] {
  const legalMoves: (InternalMove | InternalDeployMove)[] = []

  for (const move of moves) {
    // Test move by making and unmaking it
    this._makeMove(move)

    // Check if move leaves commander attacked or exposed
    if (!this._isCommanderAttacked(us) && !this._isCommanderExposed(us)) {
      legalMoves.push(move)
    }

    this._undoMove()
  }

  return legalMoves
}
```

### Commander Exposure Check

The flying general rule prevents commanders from facing each other:

```typescript
private _isCommanderExposed(color: Color): boolean {
  const usCommanderSq = this._commanders[color]
  const them = swapColor(color)
  const themCommanderSq = this._commanders[them]

  // Check orthogonal lines between commanders
  for (const offset of ORTHOGONAL_OFFSETS) {
    let sq = usCommanderSq + offset
    while (isSquareOnBoard(sq)) {
      const piece = this._board[sq]
      if (piece) {
        // If enemy commander found with no pieces between, exposed
        if (sq === themCommanderSq) {
          return true
        }
        // Any other piece blocks the line
        break
      }
      sq += offset
    }
  }

  return false
}
```

## Move Execution System

### Command Pattern Architecture

The engine uses the Command pattern for move execution:

```typescript
interface CTLMoveCommandInteface extends CTLAtomicMoveAction {
  move: InternalMove | InternalDeployMove
  execute(): void
  undo(): void
}
```

### Atomic Actions

All move operations are built from atomic actions:

#### 1. RemovePieceAction

```typescript
class RemovePieceAction implements CTLAtomicMoveAction {
  private removedPiece?: Piece

  execute(): void {
    const piece = this.game.get(this.square)
    if (piece) {
      this.removedPiece = { ...piece }
      this.game.remove(algebraic(this.square))
    }
  }

  undo(): void {
    if (this.removedPiece) {
      this.game.put(this.removedPiece, algebraic(this.square))
    }
  }
}
```

#### 2. PlacePieceAction

```typescript
class PlacePieceAction implements CTLAtomicMoveAction {
  private existingPiece?: Piece

  execute(): void {
    const piece = this.game.get(this.square)
    if (piece) {
      this.existingPiece = { ...piece }
    }
    this.game.put(this.piece, algebraic(this.square))
  }

  undo(): void {
    if (this.existingPiece) {
      this.game.put(this.existingPiece, algebraic(this.square))
    } else {
      this.game.remove(algebraic(this.square))
    }
  }
}
```

#### 3. RemoveFromStackAction

```typescript
class RemoveFromStackAction implements CTLAtomicMoveAction {
  execute(): void {
    const carrier = this.game.get(this.carrierSquare)
    const movingPiece = flattenPiece(this.piece)
    const allPieces = flattenPiece(carrier)

    // Remove moving pieces from stack
    const remainingPiece = allPieces.filter(
      (p) => !movingPiece.some((p2) => p2.type === p.type),
    )

    // Update or remove carrier
    if (remainingPiece.length === 0) {
      this.game.remove(algebraic(this.carrierSquare))
    } else {
      const { combined } = createCombineStackFromPieces(remainingPiece)
      this.game.put(combined, algebraic(this.carrierSquare))
    }
  }
}
```

### Move Command Types

#### 1. Normal Move Command

```typescript
export class NormalMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const pieceThatMoved = getMovingPieceFromInternalMove(this.game, this.move)

    // Remove from origin (if not stack move)
    if (!isStackMove(this.move)) {
      this.actions.push(new RemovePieceAction(this.game, this.move.from))
    }

    // Place on destination
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, pieceThatMoved),
    )
  }
}
```

#### 2. Capture Move Command

```typescript
export class CaptureMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const pieceThatMoved = getMovingPieceFromInternalMove(this.game, this.move)

    // Validate capture target
    const capturedPieceData = this.game.get(this.move.to)
    if (!capturedPieceData || capturedPieceData.color !== them) {
      throw new Error(`Capture target invalid ${algebraic(this.move.to)}`)
    }

    // Remove from origin and place on destination (captures automatically)
    if (!isStackMove(this.move)) {
      this.actions.push(new RemovePieceAction(this.game, this.move.from))
    }
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, pieceThatMoved),
    )
  }
}
```

#### 3. Deploy Move Command

```typescript
export class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const carrierPiece = this.game.get(this.move.from)

    // Handle stay capture
    if (this.move.flags & BITS.STAY_CAPTURE) {
      this.actions.push(new RemovePieceAction(this.game, this.move.to))
    } else {
      // Remove from stack
      this.actions.push(
        new RemoveFromStackAction(this.game, this.move.from, this.move.piece),
      )

      // Handle capture if needed
      if (this.move.flags & (BITS.CAPTURE | BITS.SUICIDE_CAPTURE)) {
        this.actions.push(new RemovePieceAction(this.game, this.move.to))
      }

      // Place deployed piece (unless suicide)
      if (!(this.move.flags & BITS.SUICIDE_CAPTURE)) {
        this.actions.push(
          new PlacePieceAction(this.game, this.move.to, this.move.piece),
        )
      }
    }

    // Set deploy state for continuation
    this.actions.push(
      new SetDeployStateAction(this.game, {
        stackSquare: this.move.from,
        turn: us,
        originalPiece: carrierPiece,
        movedPieces: flattenPiece(this.move.piece),
      }),
    )
  }
}
```

### Command Factory

The factory creates appropriate commands based on move flags:

```typescript
export function createMoveCommand(
  game: CoTuLenh,
  move: InternalMove,
): CTLMoveCommand {
  if (move.flags & BITS.DEPLOY) {
    return new SingleDeployMoveCommand(game, move)
  } else if (move.flags & BITS.SUICIDE_CAPTURE) {
    return new SuicideCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.STAY_CAPTURE) {
    return new StayCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.COMBINATION) {
    return new CombinationMoveCommand(game, move)
  } else if (move.flags & BITS.CAPTURE) {
    return new CaptureMoveCommand(game, move)
  } else {
    return new NormalMoveCommand(game, move)
  }
}
```

## State Update Process

### Move Execution Flow

```typescript
private _makeMove(move: InternalMove | InternalDeployMove) {
  const us = this.turn()
  const them = swapColor(us)

  // 1. Create command
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

  // 4. Store in history
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
  this._updateGameState(move, us)
}
```

### Game State Updates

After move execution, several state updates occur:

#### 1. Half-Move Clock

```typescript
// Reset on capture or commander move
if (moveCommand.move.captured || haveCommander(moveCommand.move.piece)) {
  this._halfMoves = 0
} else {
  this._halfMoves++
}
```

#### 2. Move Number

```typescript
// Increment after Blue's non-deploy moves
if (!isInternalDeployMove(move) && us === BLUE && !(move.flags & BITS.DEPLOY)) {
  this._moveNumber++
}
```

#### 3. Turn Switching

```typescript
// Switch turn for non-deploy moves
if (!isInternalDeployMove(move) && !(move.flags & BITS.DEPLOY)) {
  this._turn = them
}
```

#### 4. Position Counting

```typescript
// Update for repetition detection
this._updatePositionCounts()
```

### Heroic Promotion

After each move, pieces attacking the enemy commander become heroic:

```typescript
class CheckAndPromoteAttackersAction implements CTLAtomicMoveAction {
  execute(): void {
    const them = swapColor(this.moveColor)
    const themCommanderSq = this.game.getCommanderSquare(them)

    if (themCommanderSq === -1) return

    const attackers = this.game.getAttackers(themCommanderSq, this.moveColor)

    for (const { square, type } of attackers) {
      const isHeroic = this.game.getHeroicStatus(square, type)
      if (!isHeroic) {
        const promoteAction = new SetHeroicAction(this.game, square, type, true)
        this.heroicActions.push(promoteAction)
        promoteAction.execute()
      }
    }
  }
}
```

## Response Generation

### Move Object Creation

After successful execution, a Move object is created:

```typescript
export class Move {
  color: Color
  from: Square
  to: Square
  piece: Piece
  captured?: Piece
  flags: string
  san?: string
  lan?: string
  before: string
  after: string

  constructor(game: CoTuLenh, internal: InternalMove) {
    // Copy move data
    this.color = internal.color
    this.piece = internal.piece
    this.from = algebraic(internal.from)
    this.to = algebraic(internal.to)

    // Generate flag string
    this.flags = ''
    for (const flag in BITS) {
      if (BITS[flag] & internal.flags) {
        this.flags += FLAGS[flag]
      }
    }

    // Store before FEN
    this.before = game.fen()

    // Generate after FEN
    game._makeMove(internal)
    this.after = game.fen()
    game._undoMove()

    // Generate notation
    const [san, lan] = game._moveToSanLan(
      internal,
      game._moves({ legal: true }),
    )
    this.san = san
    this.lan = lan
  }
}
```

### FEN Generation

The new position is encoded in FEN format:

```typescript
fen(): string {
  let empty = 0
  let fen = ''

  // Process each square
  for (let i = SQUARE_MAP.a12; i <= SQUARE_MAP.k1 + 1; i++) {
    if (isSquareOnBoard(i)) {
      if (this._board[i]) {
        if (empty > 0) {
          fen += empty
          empty = 0
        }

        const piece = this._board[i]!
        const san = makeSanPiece(piece, false)
        const toCorrectCase = piece.color === RED ? san : san.toLowerCase()
        fen += toCorrectCase
      } else {
        empty++
      }
    } else if (file(i) === 11) {
      if (empty > 0) {
        fen += empty
      }
      empty = 0
      if (i !== SQUARE_MAP.k1 + 1) {
        fen += '/'
      }
    }
  }

  return [
    fen,
    this._turn,
    '-',  // No castling
    '-',  // No en passant
    this._halfMoves,
    this._moveNumber,
  ].join(' ')
}
```

## Error Handling

### Validation Errors

```typescript
// Invalid move format
throw new Error(`Invalid or illegal move: ${JSON.stringify(move)}`)

// Ambiguous move
throw new Error(`Multiple matching legal moves found: ${JSON.stringify(move)}`)

// No legal move found
throw new Error(`No matching legal move found: ${JSON.stringify(move)}`)

// Invalid square
throw new Error(`Invalid square in move object: ${JSON.stringify(move)}`)
```

### Execution Errors

```typescript
// Missing piece
throw new Error(`No piece to move at ${algebraic(move.from)}`)

// Invalid capture target
throw new Error(`Capture target invalid ${algebraic(move.to)}`)

// Stack operation failure
throw new Error(`Failed to remove piece from stack at ${algebraic(square)}`)

// Piece placement failure
throw new Error(
  `Place piece fail: ${JSON.stringify(piece)} ${algebraic(square)}`,
)
```

## Usage Examples

### Basic Move Execution

```typescript
// Execute move with SAN
const move = game.move('Tc3')
console.log(move.san) // "Tc3"
console.log(move.before) // FEN before move
console.log(move.after) // FEN after move

// Execute move with object
const move = game.move({
  from: 'c2',
  to: 'c3',
  piece: 't',
})
```

### Deploy Move Execution

```typescript
// Simple deploy move
const deployMove = game.deployMove({
  from: 'c2',
  moves: [
    { piece: 't', to: 'c3' },
    { piece: 'i', to: 'd3' },
  ],
})

console.log(deployMove.san) // Deploy move notation
```

### Error Handling

```typescript
try {
  const move = game.move('InvalidMove')
} catch (error) {
  console.error('Move failed:', error.message)
  // Handle invalid move
}
```

### Move Validation

```typescript
// Check if move is legal before executing
const legalMoves = game.moves({ square: 'c2' })
const isLegal = legalMoves.some((move) => move === 'Tc3')

if (isLegal) {
  game.move('Tc3')
} else {
  console.log('Move is not legal')
}
```

## Performance Considerations

### Move Caching

- Legal moves are cached with LRU eviction
- Cache keys include position, deploy state, and filters
- Cache is cleared on position changes

### Atomic Operations

- All move operations are atomic and reversible
- Command pattern enables efficient undo/redo
- State changes are batched for consistency

### Memory Management

- Move history grows with game length
- Position counts track for repetition detection
- Piece objects are cloned to prevent mutation

### Optimization Tips

```typescript
// Use specific filters to reduce move generation
const moves = game.moves({ square: 'c2', pieceType: 't' })

// Batch multiple moves for analysis
const legalMoves = game._moves({ legal: true })
for (const move of candidateMoves) {
  if (legalMoves.includes(move)) {
    // Process legal move
  }
}

// Reuse game instances instead of creating new ones
game.undo() // Instead of creating new game
```
