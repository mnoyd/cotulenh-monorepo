# CoTuLenh Deploy Move System Documentation

## Overview

Deploy moves are a unique and sophisticated feature of the CoTuLenh chess
variant that allows players to split a stack of pieces and coordinate multiple
piece movements in a single turn. This system enables complex tactical maneuvers
where pieces can move to different destinations, capture multiple targets, and
leave some pieces behind on the original square.

## Core Concepts

### What is a Deploy Move?

A deploy move allows you to:

- **Split a stack** of pieces (e.g., Tank + Infantry + Infantry)
- **Move pieces individually** to different destination squares
- **Execute multiple captures** in a single turn
- **Leave some pieces** on the original square (optional)
- **Coordinate complex tactical operations** in one move

### Key Characteristics

- Multi-piece movement in a single turn
- Stack manipulation and splitting
- Individual piece targeting
- Optional piece retention on source square
- Maintains turn-based gameplay (turn switches after complete deploy)

## Data Structures

### DeployMoveRequest (User Input Interface)

```typescript
interface DeployMoveRequest {
  from: Square // Source square containing the stack
  moves: { piece: Piece; to: Square }[] // Individual piece movements
  stay?: Piece // Optional pieces that remain on source
}
```

**Example:**

```typescript
const deployRequest = {
  from: 'c2', // Stack location
  moves: [
    { piece: { type: 't', color: 'r' }, to: 'c4' }, // Tank to c4
    { piece: { type: 'i', color: 'r' }, to: 'd3' }, // Infantry to d3
  ],
  stay: { type: 'i', color: 'r' }, // One infantry stays at c2
}
```

### InternalDeployMove (Internal Representation)

```typescript
interface InternalDeployMove {
  from: number // Source square in 0x88 format
  moves: InternalMove[] // Array of individual internal moves
  stay?: Piece // Pieces staying on original square
  captured?: Piece[] // All pieces captured during the deploy sequence
}
```

### DeployState (Game State Tracking)

```typescript
type DeployState = {
  stackSquare: number // Original stack location (0x88 format)
  turn: Color // Player executing the deploy
  originalPiece: Piece // Complete original stack composition
  movedPieces: Piece[] // Pieces that have already been deployed
  stay?: Piece[] // Pieces designated to remain on source square
}
```

## Deploy Move Creation Process

### Step 1: Input Validation and Processing

The system performs comprehensive validation:

```typescript
// Validate that all pieces are accounted for
const allPieces = [
  ...cleanedAllMovingPiece,
  ...(deployMove.stay ? flattenPiece(deployMove.stay) : []),
]

if (allPieces.length !== flattenPiece(originalPiece).length) {
  throw new Error(
    'Deploy move error: ambiguous deploy move. Some pieces are not clear whether moved or stay',
  )
}
```

**Validation Checks:**

- All pieces in the request exist in the original stack
- No pieces are duplicated between moves and stay
- All pieces in the stack are accounted for
- Stay pieces can legally remain on the square

### Step 2: Destination Grouping and Combination

Multiple pieces moving to the same destination are combined:

```typescript
// Group pieces by destination
const dests = new Map<Square, Piece[]>()
for (const move of deployMove.moves) {
  if (dests.has(move.to)) {
    dests.get(move.to)?.push(move.piece)
  } else {
    dests.set(move.to, [move.piece])
  }
}

// Combine pieces for each destination
const combinedDests = cleanedDupDests.map((dest) => {
  const { combined, uncombined } = createCombineStackFromPieces(dest.pieces)
  if (!combined || (uncombined?.length ?? 0) > 0) return null
  return { from: dest.from, to: dest.to, piece: combined }
})
```

### Step 3: Legal Move Validation

Each individual piece movement is validated against the game's legal moves:

```typescript
const foundMove: InternalMove[] = []
for (const move of validMoves) {
  const destIndex = toSquareNumDests.findIndex(
    (dest) =>
      dest.from === move.from &&
      dest.to === move.to &&
      dest.piece.type === move.piece.type,
  )
  if (destIndex !== -1) {
    foundMove.push({ ...move, piece: toSquareNumDests[destIndex].piece })
  }
}

if (foundMove.length !== toSquareNumDests.length) {
  throw new Error('Deploy move error: move not found')
}
```

### Step 4: Move Ordering by Distance

Deploy moves are executed in order of distance (longest moves first):

```typescript
foundMove.sort((a, b) => {
  const aSteps = getStepsBetweenSquares(a.from, a.to)
  const bSteps = getStepsBetweenSquares(b.from, b.to)
  if (aSteps === -1 || bSteps === -1)
    throw new Error('Deploy move error: invalid move')
  return aSteps > bSteps ? -1 : 1 // Longest distance first
})
```

**Rationale:** Longer moves are executed first to ensure proper piece
interaction and capture resolution.

## Deploy Move Execution

### DeployMoveCommand Architecture

```typescript
export class DeployMoveCommand extends SequenceMoveCommand {
  protected buildActions(): void {
    this.commands = [
      // 1. Initialize deploy state
      new SetDeployStateAction(this.game, {
        stackSquare: this.moveData.from,
        turn: this.game['_turn'],
        originalPiece: this.game.get(this.moveData.from) || undefined,
        movedPieces: [],
        stay: this.moveData.stay ? flattenPiece(this.moveData.stay) : [],
      }),

      // 2. Execute each individual move as a separate command
      ...this.moveData.moves.map((move) => createMoveCommand(this.game, move)),
    ]
  }
}
```

### Execution Sequence

1. **Set Initial Deploy State**

   - Establishes deploy context
   - Records original stack composition
   - Initializes tracking for moved pieces

2. **Execute Individual Moves**

   - Each piece movement runs as a separate command
   - Uses existing move commands (Normal, Capture, etc.)
   - Maintains atomic action pattern

3. **Update Deploy State After Each Move**

   - Tracks which pieces have been deployed
   - Updates remaining pieces count
   - Checks for deploy completion

4. **Complete Deploy Sequence**
   - When all pieces are processed, clear deploy state
   - Switch turn to opponent
   - Update game counters

## Individual Deploy Move Types

### Normal Deploy Move (SingleDeployMoveCommand)

```typescript
export class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    // Origin square action: Remove piece from stack
    this.actions.push(
      new RemoveFromStackAction(this.game, this.move.from, this.move.piece),
    )

    // Destination square action: Place piece at target
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, this.move.piece),
    )

    // State management: Update deploy tracking
    this.actions.push(
      new SetDeployStateAction(this.game, {
        movedPieces: flattenPiece(this.move.piece),
      }),
    )
  }
}
```

### Deploy with Capture

```typescript
// Handle capture during deploy move
if (this.move.flags & (BITS.CAPTURE | BITS.SUICIDE_CAPTURE)) {
  const capturedPieceData = this.game.get(destSq)

  if (!capturedPieceData || capturedPieceData.color !== them) {
    throw new Error(`Deploy capture target invalid ${algebraic(destSq)}`)
  }

  this.move.captured = capturedPieceData
  this.actions.push(new RemovePieceAction(this.game, destSq))
}

// Place the deployed piece (unless suicide capture)
if ((this.move.flags & BITS.SUICIDE_CAPTURE) === 0) {
  this.actions.push(new PlacePieceAction(this.game, destSq, this.move.piece))
}
```

### Stay Capture (Special Deploy Type)

Stay capture allows a piece to attack without moving from the stack:

```typescript
// Stay capture - piece attacks from original position
if (this.move.flags & BITS.STAY_CAPTURE) {
  const capturedPieceData = this.game.get(destSq)

  this.move.captured = capturedPieceData
  this.actions.push(new RemovePieceAction(this.game, destSq))

  // No PlacePieceAction - piece remains on original square
  // Update deploy state to track the "stay capture"
}
```

## Deploy State Management

### Deploy State Lifecycle

```typescript
class SetDeployStateAction implements CTLAtomicMoveAction {
  execute(): void {
    this.oldDeployState = this.game.getDeployState()

    if (this.oldDeployState) {
      // Update existing deploy state
      const updatedMovedPiece = [
        ...this.oldDeployState.movedPieces,
        ...(this.newDeployState.movedPieces ?? []),
      ]

      const originalLen = flattenPiece(this.oldDeployState.originalPiece).length

      // Check if deploy is complete
      if (
        updatedMovedPiece.length + (this.oldDeployState.stay?.length ?? 0) ===
        originalLen
      ) {
        this.game.setDeployState(null) // Clear deploy state
        this.game['_turn'] = swapColor(this.oldDeployState.turn) // Switch turn
        return
      }

      // Continue deploy sequence
      this.game.setDeployState({
        stackSquare: this.oldDeployState.stackSquare,
        turn: this.oldDeployState.turn,
        originalPiece: this.oldDeployState.originalPiece,
        movedPieces: updatedMovedPiece,
        stay: this.oldDeployState.stay,
      })
    } else {
      // Initialize new deploy state
      this.game.setDeployState(this.newDeployState as DeployState)
    }
  }
}
```

### Deploy Completion Logic

Deploy sequence completes when:

```typescript
const totalMovedPieces = movedPieces.length
const totalStayPieces = stay?.length ?? 0
const originalStackSize = flattenPiece(originalPiece).length

if (totalMovedPieces + totalStayPieces === originalStackSize) {
  // All pieces accounted for - deploy complete
  // Clear deploy state and switch turn
}
```

## Deploy Move Generation

### Automatic Deploy Move Generation

The system can generate all possible deploy moves for a stack:

```typescript
export function generateStackSplitMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
): InternalDeployMove[] {
  const pieceAtSquare = gameInstance.get(stackSquare)
  if (!pieceAtSquare) return []

  // Generate all possible ways to split the stack
  const splittedPieces = createAllPieceSplits(pieceAtSquare)

  // Generate move candidates for each piece type in the stack
  const moveCandidates = generateMoveCandidateForSinglePieceInStack(
    gameInstance,
    stackSquare,
  )

  const allInternalStackMoves: InternalDeployMove[] = []

  // Create deploy moves for each possible split
  for (const splittedPiece of splittedPieces) {
    const internalStackMove = makeStackMoveFromCombination(
      stackSquare,
      [],
      splittedPiece,
      moveCandidates,
    )
    allInternalStackMoves.push(...internalStackMove)
  }

  // Filter valid deploy moves
  const totalStackPiece = flattenPiece(pieceAtSquare).length
  const cleanedInternalStackMoves = allInternalStackMoves.filter((move) => {
    const haveMove = move.moves.length > 0
    const totalPiece =
      move.moves.reduce((acc, m) => acc + flattenPiece(m.piece).length, 0) +
      (move.stay ? flattenPiece(move.stay).length : 0)
    const deployCountedForAllPiece = totalPiece === totalStackPiece
    return haveMove && deployCountedForAllPiece
  })

  return cleanedInternalStackMoves
}
```

### Recursive Deploy Combination Generation

```typescript
const makeStackMoveFromCombination = (
  fromSquare: number,
  stackMoves: InternalDeployMove[],
  remaining: Piece[],
  moveCandidates: Map<PieceSymbol, InternalMove[]>,
): InternalDeployMove[] => {
  const currentStackPiece = remaining.pop()
  if (!currentStackPiece) return stackMoves

  const moveCandiateForCurrentPiece = moveCandidates.get(currentStackPiece.type)
  if (
    !moveCandiateForCurrentPiece ||
    moveCandiateForCurrentPiece.length === 0
  ) {
    // Skip this piece if no moves available
    return makeStackMoveFromCombination(
      fromSquare,
      stackMoves,
      remaining,
      moveCandidates,
    )
  }

  const newStackMoves: InternalDeployMove[] = []

  if (stackMoves.length === 0) {
    // First piece - create initial deploy moves
    for (const move of moveCandiateForCurrentPiece) {
      newStackMoves.push({
        from: fromSquare,
        moves: [
          {
            from: fromSquare,
            to: move.to,
            piece: currentStackPiece,
            color: move.color,
            flags: move.flags,
          },
        ],
      })
    }

    // Option for piece to stay
    if (canStayOnSquare(fromSquare, currentStackPiece.type)) {
      newStackMoves.push({
        from: fromSquare,
        moves: [],
        stay: currentStackPiece,
      })
    }
  } else {
    // Subsequent pieces - extend existing deploy moves
    for (const stackMove of stackMoves) {
      for (const move of moveCandiateForCurrentPiece) {
        const newSquares = stackMove.moves.map((m) => m.to)
        if (newSquares.includes(move.to)) continue // Can't move to occupied destination

        const newStackMove = cloneInternalDeployMove(stackMove)
        newStackMove.moves.push({
          from: fromSquare,
          to: move.to,
          piece: currentStackPiece,
          color: move.color,
          flags: move.flags,
        })
        newStackMoves.push(newStackMove)
      }

      // Option for piece to stay (if no other piece is staying)
      if (
        !stackMove.stay &&
        canStayOnSquare(fromSquare, currentStackPiece.type)
      ) {
        const newStackMove = cloneInternalDeployMove(stackMove)
        newStackMove.stay = currentStackPiece
        newStackMoves.push(newStackMove)
      }
    }
  }

  stackMoves.push(...newStackMoves)

  // Recursively process remaining pieces
  return makeStackMoveFromCombination(
    fromSquare,
    stackMoves,
    remaining,
    moveCandidates,
  )
}
```

## Deploy Move Notation

### Standard Algebraic Notation (SAN)

```typescript
// Deploy move SAN examples
'T>c4,I>d3' // Tank to c4, Infantry to d3
'I<,T>c4,I>d3' // Infantry stays, Tank to c4, Infantry to d3
'T>xd4,I>e3' // Tank captures at d4, Infantry to e3
'(T|I)c2>c4,d3' // Explicit stack notation
```

### Long Algebraic Notation (LAN)

```typescript
// Deploy move LAN examples
'c2:T>c4,I>d3' // From c2: Tank to c4, Infantry to d3
'c2:I<,T>c4,I>d3' // From c2: Infantry stays, Tank to c4, Infantry to d3
```

### Notation Generation

```typescript
export function deployMoveToSanLan(
  game: CoTuLenh,
  move: InternalDeployMove,
): [string, string] {
  const legalMoves = game['_moves']({ legal: true })

  // Generate SAN for each individual move
  const allMoveSan = move.moves.map((m: InternalMove) => {
    return game['_moveToSanLan'](m, legalMoves)[0]
  })

  const movesSan = allMoveSan.join(',')
  const stay = move.stay ? `${makeSanPiece(move.stay)}<` : ''

  const san = `${stay}${movesSan}`
  const lan = `${algebraic(move.from)}:${san}`

  return [san, lan]
}
```

## API Usage Examples

### Basic Deploy Move

```typescript
const game = new CoTuLenh()
// Assume stack (T|I|I) at c2

const deployMove = game.deployMove({
  from: 'c2',
  moves: [
    { piece: { type: 't', color: 'r' }, to: 'c4' }, // Tank advances
    { piece: { type: 'i', color: 'r' }, to: 'd3' }, // Infantry flanks
  ],
  stay: { type: 'i', color: 'r' }, // Infantry guards
})

console.log(deployMove.san) // "I<,T>c4,I>d3"
```

### Deploy with Multiple Captures

```typescript
const deployMove = game.deployMove({
  from: 'e5',
  moves: [
    { piece: { type: 't', color: 'r' }, to: 'e6' }, // Tank captures forward
    { piece: { type: 'i', color: 'r' }, to: 'f6' }, // Infantry captures diagonally
    { piece: { type: 'a', color: 'r' }, to: 'd6' }, // Artillery captures left
  ],
  // No stay - entire stack deploys
})

console.log(deployMove.captured) // Array of captured pieces
```

### Checking Deploy State

```typescript
// During a deploy sequence
const deployState = game.getDeployState()
if (deployState) {
  console.log(`Deploy from ${algebraic(deployState.stackSquare)}`)
  console.log(`Moved pieces: ${deployState.movedPieces.length}`)
  console.log(
    `Original stack: ${flattenPiece(deployState.originalPiece).length}`,
  )
}
```

## Error Handling

### Common Deploy Move Errors

```typescript
// Invalid piece in deploy request
throw new Error('Deploy move error: original piece not found')

// Piece not in stack
throw new Error(
  'Deploy move error: ambiguous deploy move. Some pieces are not clear whether moved or stay',
)

// Invalid stay piece combination
throw new Error('Deploy move error: stay piece not valid')

// Illegal individual move
throw new Error('Deploy move error: move not found')

// Invalid move distance
throw new Error('Deploy move error: invalid move')
```

### Validation Checks

1. **Stack Composition Validation**

   - All requested pieces exist in the original stack
   - No piece duplication between moves and stay
   - All pieces accounted for

2. **Move Legality Validation**

   - Each individual move must be legal
   - Destination squares must be valid
   - Capture targets must be enemy pieces

3. **Stay Piece Validation**
   - Stay pieces must be able to remain on the square
   - Stay piece combination must be valid

## Performance Considerations

### Deploy Move Caching

```typescript
// Deploy moves are cached like regular moves
private _getMovesCacheKey(args): string {
  const fen = this.fen()
  let deployState = 'none'
  if (args.deploy) {
    deployState = `${args.square}:${this.turn()}`
  } else if (this._deployState) {
    deployState = `${this._deployState.stackSquare}:${this._deployState.turn}`
  }
  return `${fen}|deploy:${deployState}|legal:${args.legal}|...`
}
```

### Memory Management

- Deploy moves store complete command sequences
- Each individual move maintains its own undo capability
- Deploy state is cleared after completion to prevent memory leaks

## Integration with Two-Function Pattern

Deploy moves already implement the desired two-function approach:

### Origin Square Functions

- `RemoveFromStackAction`: Handles stack manipulation and piece removal
- Manages complex stack splitting logic
- Maintains stack integrity during partial deployment

### Destination Square Functions

- `PlacePieceAction`: Handles piece placement at target squares
- Manages capture resolution
- Handles piece combination at destination

### State Management Functions

- `SetDeployStateAction`: Tracks deploy sequence progress
- Manages turn switching logic
- Coordinates multi-move completion

This architecture demonstrates how complex multi-piece operations can be
decomposed into atomic, reversible actions that align perfectly with the
two-function refactoring pattern.

## Conclusion

The deploy move system in CoTuLenh represents a sophisticated implementation of
multi-piece coordination within a turn-based strategy game. By leveraging the
command pattern and atomic actions, it maintains the reliability and
reversibility required for a robust chess engine while enabling complex tactical
maneuvers that distinguish CoTuLenh from traditional chess variants.

The system's design already embodies the two-function pattern principles, making
it an excellent foundation for the planned refactoring while demonstrating the
power and flexibility of the current architecture.
