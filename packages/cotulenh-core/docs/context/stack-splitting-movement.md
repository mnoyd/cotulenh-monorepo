# Stack Splitting and Movement

## Overview

CoTuLenh's stack splitting system allows complex multi-piece stacks to be
decomposed into various combinations and deployed strategically. This system
provides tactical flexibility through algorithmic generation of all possible
piece arrangements and movement options.

## Stack Splitting Algorithms

### Core Splitting Function

```typescript
function createAllPieceSplits(piece: Piece): Piece[][] {
  // Returns all valid ways to split a stack into combinations of subsets
  // Example: (N|FT) → [(N|FT)], [(N|F),T], [(N|T),F], [N,(F|T)], [N,F,T]
}
```

### Algorithm Overview

1. **Flatten Stack**: Extract all individual pieces from nested structure
2. **Generate Subsets**: Create all possible piece combinations using bit
   manipulation
3. **Validate Combinations**: Check if subsets can form valid stacks
4. **Create Partitions**: Generate all ways to partition pieces into valid
   groups

### Bit Manipulation Approach

```typescript
// Generate all possible combinations using bit manipulation
const n = flattenedPieces.length
const totalCombinations = 1 << n // 2^n combinations

for (let i = 1; i < totalCombinations; i++) {
  const currentCombination: Piece[] = []

  // Check each bit position
  for (let j = 0; j < n; j++) {
    if ((i & (1 << j)) !== 0) {
      currentCombination.push(flattenedPieces[j])
    }
  }

  // Validate and create stack from combination
  const { combined, uncombined } =
    createCombineStackFromPieces(currentCombination)
  if (combined && (!uncombined || uncombined.length === 0)) {
    subsets.push(combined)
  }
}
```

## Split Generation Examples

### Two-Piece Stack: (T|I)

```typescript
const tank = { type: TANK, color: RED }
const infantry = { type: INFANTRY, color: RED }
const stack = { type: TANK, color: RED, carrying: [infantry] }

const splits = createAllPieceSplits(stack)
// Result: [
//   [(T|I)],           // Original stack
//   [(T), (I)]         // Separate pieces
// ]
```

### Three-Piece Stack: (N|FT)

```typescript
const navy = { type: NAVY, color: RED }
const airForce = { type: AIR_FORCE, color: RED }
const tank = { type: TANK, color: RED }
const stack = { type: NAVY, color: RED, carrying: [airForce, tank] }

const splits = createAllPieceSplits(stack)
// Result: [
//   [(N|FT)],          // Original stack
//   [(N|F), (T)],      // Navy+AirForce, Tank separate
//   [(N|T), (F)],      // Navy+Tank, AirForce separate
//   [(N), (F|T)],      // Navy separate, AirForce+Tank
//   [(N), (F), (T)]    // All pieces separate
// ]
```

### Complex Stack with Invalid Combinations

```typescript
const airForce = { type: AIR_FORCE, color: RED }
const infantry = { type: INFANTRY, color: RED }
const militia = { type: MILITIA, color: RED }
const stack = { type: AIR_FORCE, color: RED, carrying: [infantry, militia] }

// If Infantry and Militia cannot combine:
const splits = createAllPieceSplits(stack)
// Result: [
//   [(F|IM)],          // Original stack
//   [(F|I), (M)],      // AirForce+Infantry, Militia separate
//   [(F|M), (I)],      // AirForce+Militia, Infantry separate
//   [(F), (I), (M)]    // All pieces separate
//   // Note: [(I|M)] not included if Infantry+Militia cannot combine
// ]
```

## Deployment Move Generation

### Stack Split Move Generation

```typescript
function generateStackSplitMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
): InternalDeployMove[] {
  const pieceAtSquare = gameInstance.get(stackSquare)
  const splittedPieces = createAllPieceSplits(pieceAtSquare)
  const moveCandidates = generateMoveCandidateForSinglePieceInStack(
    gameInstance,
    stackSquare,
  )

  // Generate deployment moves for each possible split
  const allInternalStackMoves: InternalDeployMove[] = []
  for (const splittedPiece of splittedPieces) {
    const internalStackMove = makeStackMoveFromCombination(
      stackSquare,
      [],
      splittedPiece,
      moveCandidates,
    )
    allInternalStackMoves.push(...internalStackMove)
  }

  return cleanedInternalStackMoves
}
```

### Move Candidate Generation

```typescript
function generateMoveCandidateForSinglePieceInStack(
  gameInstance: CoTuLenh,
  stackSquare: number,
): Map<PieceSymbol, InternalMove[]> {
  const moveMap = new Map<PieceSymbol, InternalMove[]>()
  const pieceStack = gameInstance.get(stackSquare)
  const flattenedPieces = flattenPiece(pieceStack)

  // Generate moves for each individual piece in the stack
  for (const piece of flattenedPieces) {
    // Set temporary deploy state
    gameInstance.setDeployState({
      stackSquare,
      originalPiece: pieceStack,
      turn: gameInstance.turn(),
      movedPieces: [],
    })

    // Generate moves for this piece
    const pieceMoves = generateMovesForPiece(
      gameInstance,
      stackSquare,
      piece,
      true,
    )
    moveMap.set(piece.type, pieceMoves)

    // Restore original deploy state
    gameInstance.setDeployState(originalDeployState)
  }

  return moveMap
}
```

## Stay vs Move Piece Logic

### Stay Piece Validation

```typescript
function canStayOnSquare(square: number, pieceType: PieceSymbol): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}
```

### Stay Piece Rules

- **Terrain Compatibility**: Piece must be able to exist on current terrain
- **Navy Restriction**: Navy pieces can only stay on water/mixed terrain
- **Land Pieces**: All non-navy pieces can only stay on land/mixed terrain
- **Air Force Exception**: Air Force can stay on any terrain type

### Move vs Stay Decision Matrix

```typescript
// During stack move generation
if (canStayOnSquare(fromSquare, currentStackPiece.type)) {
  newStackMoves.push({
    from: fromSquare,
    moves: [],
    stay: currentStackPiece, // Piece stays at original square
  })
}

// Generate movement options
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
```

## Deployment Sequence Validation

### Sequence Generation Algorithm

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
  const newStackMoves: InternalDeployMove[] = []

  if (stackMoves.length === 0) {
    // First piece - create initial moves
    for (const move of moveCandiateForCurrentPiece) {
      newStackMoves.push({
        from: fromSquare,
        moves: [createMoveFromCandidate(move, currentStackPiece)],
      })
    }

    // Add stay option if valid
    if (canStayOnSquare(fromSquare, currentStackPiece.type)) {
      newStackMoves.push({
        from: fromSquare,
        moves: [],
        stay: currentStackPiece,
      })
    }
  } else {
    // Subsequent pieces - combine with existing moves
    for (const stackMove of stackMoves) {
      for (const move of moveCandiateForCurrentPiece) {
        const newSquares = stackMove.moves.map((m) => m.to)
        if (newSquares.includes(move.to)) continue // Avoid destination conflicts

        const newStackMove = cloneInternalDeployMove(stackMove)
        newStackMove.moves.push(
          createMoveFromCandidate(move, currentStackPiece),
        )
        newStackMoves.push(newStackMove)
      }

      // Add stay option if no piece is already staying
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
  return makeStackMoveFromCombination(
    fromSquare,
    stackMoves,
    remaining,
    moveCandidates,
  )
}
```

### Validation Rules

1. **Destination Uniqueness**: No two pieces can move to the same square
2. **Stay Limitation**: Only one piece (or piece group) can stay at original
   square
3. **Complete Coverage**: All pieces must be accounted for (moved or staying)
4. **Terrain Compatibility**: All destinations must be valid for piece types

### Sequence Examples

```typescript
// Original stack: (N|FT) at c3
// Possible deployment sequences:

// Sequence 1: All pieces move
{
  from: c3,
  moves: [
    { piece: NAVY, to: a3 },
    { piece: AIR_FORCE, to: c6 },
    { piece: TANK, to: d3 }
  ]
}

// Sequence 2: Navy moves, others stay as combined
{
  from: c3,
  moves: [
    { piece: NAVY, to: a3 }
  ],
  stay: { type: AIR_FORCE, carrying: [TANK] }  // (F|T) stays
}

// Sequence 3: Air Force moves, others stay as combined
{
  from: c3,
  moves: [
    { piece: AIR_FORCE, to: c6 }
  ],
  stay: { type: NAVY, carrying: [TANK] }  // (N|T) stays
}
```

## Deployment Execution and Validation

### Move Validation Process

```typescript
function createInternalDeployMove(
  originalPiece: Piece,
  deployMove: DeployMoveRequest,
  validMoves: InternalMove[],
): InternalDeployMove {
  // 1. Validate stay piece can form valid stack
  if (deployMove.stay) {
    const { combined, uncombined } = createCombineStackFromPieces(
      flattenPiece(deployMove.stay),
    )
    if (!combined || (uncombined?.length ?? 0) > 0) {
      throw new Error('Deploy move error: stay piece not valid')
    }
  }

  // 2. Group pieces by destination
  const dests = new Map<Square, Piece[]>()
  for (const move of deployMove.moves) {
    if (dests.has(move.to)) {
      dests.get(move.to)?.push(move.piece)
    } else {
      dests.set(move.to, [move.piece])
    }
  }

  // 3. Validate piece combinations at each destination
  const combinedDests = cleanedDupDests
    .map((dest) => {
      const { combined, uncombined } = createCombineStackFromPieces(dest.pieces)
      if (!combined || (uncombined?.length ?? 0) > 0) return null
      return { from: dest.from, to: dest.to, piece: combined }
    })
    .filter((dest) => dest !== null)

  // 4. Verify all pieces are accounted for
  const allPieces = [
    ...cleanedAllMovingPiece,
    ...(deployMove.stay ? flattenPiece(deployMove.stay) : []),
  ]
  if (allPieces.length !== flattenPiece(originalPiece).length) {
    throw new Error('Deploy move error: ambiguous deploy move')
  }

  // 5. Match with legal moves
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

  return {
    from: SQUARE_MAP[deployMove.from],
    moves: foundMove,
    stay: deployMove.stay,
    captured: extractCapturedPieces(foundMove),
  }
}
```

### Error Conditions

1. **Invalid Stay Combination**: Stay pieces cannot form valid stack
2. **Destination Conflicts**: Multiple pieces assigned to same square
3. **Incomplete Deployment**: Not all pieces accounted for
4. **Illegal Moves**: Requested moves not in legal move list
5. **Terrain Violations**: Pieces cannot exist on target terrain

## Performance Optimization

### Algorithmic Complexity

- **Split Generation**: O(2^n) where n is number of pieces in stack
- **Move Generation**: O(n × m) where m is average moves per piece
- **Validation**: O(n) for most checks
- **Combination Validation**: Delegated to external library

### Optimization Strategies

```typescript
// 1. Early Termination
const cleanedInternalStackMoves = allInternalStackMoves.filter((move) => {
  const haveMove = move.moves.length > 0
  const totalPiece =
    move.moves.reduce((acc, m) => acc + flattenPiece(m.piece).length, 0) +
    (move.stay ? flattenPiece(move.stay).length : 0)
  const deployCountedForAllPiece = totalPiece === totalStackPiece
  return haveMove && deployCountedForAllPiece
})

// 2. Caching Move Candidates
const moveCandidates = generateMoveCandidateForSinglePieceInStack(
  gameInstance,
  stackSquare,
)
// Reuse candidates across all split combinations

// 3. Lazy Evaluation
// Generate splits only when deployment is initiated
// Cache results for repeated access
```

### Memory Management

- **Deep Cloning**: Required for undo operations
- **Reference Management**: Avoid circular references in nested structures
- **Garbage Collection**: Clean up temporary objects after move generation

## Integration with Game Systems

### Legal Move Filtering

```typescript
// Stack split moves must pass legal move validation
const legal = game['_filterLegalMoves'](stackSplitMoves, currentPlayer)

// Filters out moves that:
// - Leave commander in check
// - Violate game rules
// - Create invalid board states
```

### FEN Impact

```typescript
// Stack splitting changes board representation
// Before: "5c5/11/11/11/11/11/4(NFT)6/11/11/11/11/5C5 r - - 0 1"
// After:  "5c5/11/11/11/11/4F6/4N6/4T6/11/11/11/5C5 b - - 0 2"
```

### SAN Notation

```typescript
// Complex deployment notation
'N>a3,F>c6,T>d3' // All pieces move
'(FT)<N>a3' // Navy moves, Air Force+Tank stay
'F>c6,(NT)<' // Air Force moves, Navy+Tank stay
```

## Strategic Implications

### Tactical Flexibility

- **Positional Control**: Spread pieces across multiple squares
- **Terrain Utilization**: Deploy pieces to optimal terrain
- **Defensive Positioning**: Create defensive formations
- **Offensive Coordination**: Position pieces for coordinated attacks

### Resource Management

- **Piece Efficiency**: Maximize piece utility through optimal deployment
- **Terrain Access**: Use carriers to transport pieces to inaccessible terrain
- **Stack Preservation**: Maintain valuable piece combinations when beneficial

### Timing Considerations

- **Deploy Phase Duration**: Multiple moves without turn change
- **Opponent Response**: Opponent cannot interrupt deployment sequence
- **Commitment Level**: Deployment decisions are final once executed
