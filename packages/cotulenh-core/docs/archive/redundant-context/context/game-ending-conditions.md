# Game Ending Conditions

## Overview

CoTuLenh games can end through several mechanisms: checkmate, commander capture,
draw conditions, and stalemate. The game implements comprehensive detection
algorithms for all ending conditions to ensure proper game termination and
result determination.

## Checkmate Detection

### Definition

Checkmate occurs when:

1. The current player's commander is under attack (in check)
2. No legal moves exist that can escape the attack

### Implementation

```typescript
isCheckmate(): boolean {
  // Checkmate = Commander is attacked AND no legal moves exist
  return this.isCheck() && this._moves({ legal: true }).length === 0
}
```

### Check Detection Algorithm

```typescript
isCheck(): boolean {
  return this._isCommanderAttacked(this._turn)
}

private _isCommanderAttacked(color: Color): boolean {
  const kingSq = this._commanders[color]
  if (kingSq === -1) return true // Commander captured = considered 'attacked'

  // Use getAttackers to check if any opponent pieces can attack the commander
  const opponent = swapColor(color)
  const attackers = this.getAttackers(kingSq, opponent)

  return attackers.length > 0
}
```

### Attack Detection System

```typescript
getAttackers(square: number, attackerColor: Color): { square: number; type: PieceSymbol }[] {
  const attackers: { square: number; type: PieceSymbol }[] = []
  const isLandPiece = this.get(square)?.type !== NAVY

  // Check in all directions from the target square
  for (const offset of ALL_OFFSETS) {
    let currentSquare = square
    let pieceBlocking = false
    let distance = 0

    // Check up to 5 squares in each direction (maximum range)
    while (distance < 5) {
      currentSquare += offset
      distance++

      if (!isSquareOnBoard(currentSquare)) break

      const piece = this._board[currentSquare]
      if (!piece) continue

      // Check if any piece in the stack can attack the target
      if (piece.color === attackerColor) {
        const allPieces = flattenPiece(piece)

        for (const singlePiece of allPieces) {
          if (singlePiece.color === attackerColor) {
            const config = getPieceMovementConfig(singlePiece.type, singlePiece.heroic ?? false)

            let captureRange = config.captureRange
            if (isLandPiece && config.specialRules?.navyAttackMechanisms) {
              captureRange--
            }

            // Special air force air defense check
            let airForceCanCapture = true
            if (singlePiece.type === AIR_FORCE) {
              const checkAirDefenseZone = getCheckAirDefenseZone(
                this, currentSquare, swapColor(attackerColor), getOppositeOffset(offset)!
              )
              let res = -1
              let i = 0
              while (res < 2 && i < distance) {
                res = checkAirDefenseZone()
                i++
              }
              airForceCanCapture = res < 2
            }

            // Check if piece can reach and attack the target
            if (distance <= captureRange) {
              if ((!pieceBlocking || config.captureIgnoresPieceBlocking) &&
                  (singlePiece.type === AIR_FORCE ? airForceCanCapture : true)) {
                attackers.push({
                  square: currentSquare,
                  type: singlePiece.type,
                })
              }
            }
          }
        }
      }

      pieceBlocking = true
    }
  }

  return attackers
}
```

### Legal Move Filtering

```typescript
private _filterLegalMoves(
  moves: (InternalMove | InternalDeployMove)[],
  us: Color,
): (InternalMove | InternalDeployMove)[] {
  const legalMoves: (InternalMove | InternalDeployMove)[] = []

  for (const move of moves) {
    this._makeMove(move)
    // A move is legal if it doesn't leave the commander attacked AND doesn't expose the commander
    if (!this._isCommanderAttacked(us) && !this._isCommanderExposed(us)) {
      legalMoves.push(move)
    }
    this._undoMove()
  }

  return legalMoves
}
```

## Commander Exposure Rules

### Flying General Rule

Commanders cannot be directly exposed to each other along orthogonal lines
without intervening pieces.

### Implementation

```typescript
private _isCommanderExposed(color: Color): boolean {
  const usCommanderSq = this._commanders[color]
  const them = swapColor(color)
  const themCommanderSq = this._commanders[them]

  // If either commander is off board, they can't be exposed
  if (usCommanderSq === -1 || themCommanderSq === -1) {
    return false
  }

  // Check only orthogonal directions
  for (const offset of ORTHOGONAL_OFFSETS) {
    let sq = usCommanderSq + offset
    while (isSquareOnBoard(sq)) {
      const piece = this._board[sq]
      if (piece) {
        // If the first piece encountered is the enemy commander, we are exposed
        if (sq === themCommanderSq) {
          return true
        }
        // If it's any other piece, the line of sight is blocked
        break
      }
      sq += offset
    }
  }

  return false
}
```

## Commander Capture

### Direct Capture Victory

When a commander is captured, the game ends immediately in favor of the
capturing player.

### Detection

```typescript
// Commander capture is tracked through position updates
updateCommandersPosition(sq: number, color: Color): void {
  if (this._commanders[color] === -1) return // Already captured
  this._commanders[color] = sq
}

// Game over check includes commander capture
isGameOver(): boolean {
  return (
    this.isCheckmate() ||
    this.isDraw() ||
    this._commanders[RED] === -1 ||
    this._commanders[BLUE] === -1
  )
}
```

### Capture Handling

When a commander is captured:

1. Commander position set to `-1`
2. Game immediately ends
3. Capturing player wins
4. No further moves possible

## Draw Conditions

### Fifty-Move Rule

A draw is declared when 50 moves pass without a capture or commander move.

#### Implementation

```typescript
isDrawByFiftyMoves(): boolean {
  return this._halfMoves >= 100 // 50 moves per side
}
```

#### Half-Move Clock Management

```typescript
// Reset half moves counter on capture or commander move
if (
  (Array.isArray(moveCommand.move.captured) &&
    moveCommand.move.captured.length > 0) ||
  moveCommand.move.captured
) {
  this._halfMoves = 0
} else {
  this._halfMoves++
}
```

### Threefold Repetition

A draw is declared when the same position occurs three times with the same
player to move.

#### Implementation

```typescript
isThreefoldRepetition(): boolean {
  return this._positionCount[this.fen()] >= 3
}
```

#### Position Counting

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

### Combined Draw Detection

```typescript
isDraw(): boolean {
  return this.isDrawByFiftyMoves() || this.isThreefoldRepetition()
}
```

## Stalemate Detection

### Definition

Stalemate occurs when:

1. The current player is NOT in check
2. No legal moves are available
3. The game is not already over by other conditions

### Implementation

```typescript
// Stalemate is implicitly detected through the game over logic
// If no legal moves exist and not in check, it's stalemate
private _isStalemate(): boolean {
  return !this.isCheck() &&
         this._moves({ legal: true }).length === 0 &&
         !this.isDraw() &&
         this._commanders[RED] !== -1 &&
         this._commanders[BLUE] !== -1
}
```

## Game Over Detection

### Comprehensive Game Over Check

```typescript
isGameOver(): boolean {
  return (
    this.isCheckmate() ||           // Checkmate
    this.isDraw() ||                // Draw conditions
    this._commanders[RED] === -1 || // Red commander captured
    this._commanders[BLUE] === -1   // Blue commander captured
  )
}
```

### Game State Validation

The system validates game ending conditions through multiple mechanisms:

1. **Move Generation**: Legal move filtering prevents illegal positions
2. **State Consistency**: Commander positions tracked accurately
3. **History Integrity**: Undo/redo maintains consistent state
4. **Position Counting**: Accurate repetition detection

## Win/Loss/Draw Determination

### Result Calculation

```typescript
getGameResult(): 'red-wins' | 'blue-wins' | 'draw' | 'ongoing' {
  if (!this.isGameOver()) {
    return 'ongoing'
  }

  // Check for draws first
  if (this.isDraw()) {
    return 'draw'
  }

  // Check for commander capture
  if (this._commanders[RED] === -1) {
    return 'blue-wins'
  }
  if (this._commanders[BLUE] === -1) {
    return 'red-wins'
  }

  // Check for checkmate
  if (this.isCheckmate()) {
    return this._turn === RED ? 'blue-wins' : 'red-wins'
  }

  // Stalemate (should be rare in CoTuLenh)
  return 'draw'
}
```

### Victory Conditions Priority

1. **Commander Capture**: Immediate victory for capturing player
2. **Checkmate**: Victory for player delivering checkmate
3. **Draw Conditions**: Game ends in draw
4. **Stalemate**: Game ends in draw (rare in CoTuLenh)

## Special Ending Scenarios

### Deploy Phase Endings

Games can end during deploy phases:

- Commander captured during deployment
- Checkmate delivered through deployment
- Draw conditions reached during deployment

### Stack-Related Endings

- Commander captured while in a stack
- Checkmate through stack deployment
- Complex attack patterns involving stacks

### Air Defense Endings

- Air force suicide captures leading to checkmate
- Air defense preventing escape moves
- Kamikaze attacks on commanders

## Performance Considerations

### Efficient Detection

- **Lazy Evaluation**: Game over checks only when needed
- **Early Termination**: Stop checking once any ending condition is met
- **Cached Results**: Legal move generation cached for performance
- **Incremental Updates**: Position counts updated incrementally

### Optimization Strategies

- **Attack Caching**: Cache attack calculations for repeated positions
- **Move Filtering**: Efficient legal move filtering with early termination
- **State Validation**: Minimal validation overhead in critical paths
- **Memory Management**: Efficient storage of position counts and history

## Error Handling

### Invalid Game States

- **Missing Commanders**: Handle cases where commanders are not found
- **Inconsistent State**: Detect and recover from state inconsistencies
- **Invalid Positions**: Validate positions before game over checks

### Recovery Mechanisms

- **State Restoration**: Undo operations to restore valid states
- **Validation Checks**: Comprehensive state validation before critical
  operations
- **Error Reporting**: Clear error messages for debugging invalid states

## Testing and Validation

### Test Scenarios

- **Basic Checkmate**: Simple commander attack scenarios
- **Complex Checkmate**: Multi-piece attack patterns
- **Draw Conditions**: Fifty-move rule and repetition scenarios
- **Commander Capture**: Direct capture victory conditions
- **Edge Cases**: Unusual positions and complex interactions

### Validation Methods

- **Unit Tests**: Individual ending condition detection
- **Integration Tests**: Complete game scenarios
- **Performance Tests**: Efficiency of detection algorithms
- **Regression Tests**: Prevent reintroduction of bugs
