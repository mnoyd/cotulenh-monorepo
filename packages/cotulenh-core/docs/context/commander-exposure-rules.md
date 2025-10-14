# Commander Exposure Rules

## Overview

The commander exposure system, also known as the "Flying General" rule, is a
fundamental mechanic in CoTuLenh that prevents commanders from facing each other
directly across clear orthogonal lines. This rule adds strategic depth by
creating forbidden positions and restricting piece movement to prevent commander
exposure.

## Flying General Rule

### Core Principle

**Flying General Rule**: Two commanders cannot face each other directly across a
clear orthogonal line (same rank or file) with no pieces between them.

**Implementation**: The `_isCommanderExposed()` method checks if the current
player's commander is exposed to the enemy commander.

### Exposure Detection Algorithm

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

  return false // Not exposed in any orthogonal direction
}
```

### Key Characteristics

1. **Orthogonal Only**: Only checks ranks (horizontal) and files (vertical), not
   diagonals
2. **Clear Line Required**: Any piece between commanders blocks the exposure
3. **First Piece Rule**: The first piece encountered in each direction
   determines blocking
4. **Bidirectional**: Checks all four orthogonal directions from the commander

## Legal Move Filtering

### Move Validation Process

All generated moves are filtered through the legal move validation system:

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

### Dual Validation

Every move must pass two tests:

1. **Check Prevention**: `!this._isCommanderAttacked(us)` - Move doesn't leave
   commander in check
2. **Exposure Prevention**: `!this._isCommanderExposed(us)` - Move doesn't
   expose commander to flying general

### Move Rejection Scenarios

**Moves that create exposure are automatically rejected**:

1. Moving a blocking piece away from between commanders
2. Moving the commander itself into an exposed position
3. Any move that results in clear orthogonal line between commanders

## Commander vs Commander Capture

### Special Capture Rules

When commanders face each other orthogonally with a clear path, the active
player can capture the enemy commander regardless of normal movement
restrictions.

**Special Commander Capture Implementation**:

```typescript
// Commander sees enemy commander orthogonally - immediate capture regardless of range/blockers
if (
  pieceData.type === COMMANDER &&
  targetPiece.type === COMMANDER &&
  targetPiece.color === them &&
  isOrthogonal
) {
  addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE)
  break // Stop searching in this direction after finding the commander
}
```

### Commander Capture Characteristics

1. **Immediate Capture**: Commander can capture enemy commander directly when
   exposed
2. **Ignores Range**: Normal 1-square capture limit doesn't apply to commander
   vs commander
3. **Ignores Blocking**: Can capture through pieces that would normally block
   movement
4. **Orthogonal Only**: Only works on same rank or file, not diagonally
5. **Mandatory**: If commanders are exposed, capture is the only legal move in
   that direction

### Adjacent Capture Restriction

For all other targets, commanders are restricted to adjacent captures:

```typescript
// Commander captures only adjacent
if (pieceData.type === COMMANDER && currentRange > 1) {
  captureAllowed = false
}
```

**Normal Commander Capture Rules**:

- **Range Limit**: Can only capture pieces on adjacent squares (1 square away)
- **Orthogonal Only**: Cannot capture diagonally (unless heroic)
- **No Shoot-Over**: Cannot capture through blocking pieces

## Strategic Implications

### Defensive Considerations

#### Blocking Pieces

1. **Strategic Placement**: Position pieces between commanders to prevent
   exposure
2. **Piece Value**: Use lower-value pieces as blockers when possible
3. **Multiple Blockers**: Create redundant blocking to prevent single-piece
   vulnerabilities
4. **Mobile Blocks**: Use pieces that can maintain blocking while serving other
   purposes

#### Commander Positioning

1. **Safe Squares**: Keep commanders on squares that don't create exposure risks
2. **Escape Routes**: Maintain multiple movement options for commander safety
3. **Terrain Advantage**: Use board edges and terrain to limit exposure angles
4. **Stack Protection**: Use stacks to provide additional blocking options

### Offensive Opportunities

#### Exposure Tactics

1. **Blocking Piece Attacks**: Target pieces that block commander exposure
2. **Forced Exposure**: Create situations where opponent must expose commander
3. **Pin Tactics**: Pin blocking pieces to create exposure threats
4. **Tempo Advantage**: Use exposure threats to gain tempo and initiative

#### Commander Hunting

1. **Direct Assault**: Use flying general rule to capture exposed commanders
2. **Zugzwang**: Force opponent into positions where any move creates exposure
3. **Combination Attacks**: Coordinate multiple pieces to create unavoidable
   exposure
4. **Endgame Technique**: Use commander exposure in simplified positions

### Common Tactical Patterns

#### The Blocking Sacrifice

```
Sacrifice a piece to remove the blocking piece between commanders,
creating immediate flying general capture opportunity.
```

#### The Exposure Fork

```
Create a position where the opponent must choose between:
- Allowing commander exposure
- Losing material to prevent exposure
```

#### The Commander Chase

```
Use flying general threats to drive the enemy commander
into increasingly restricted positions.
```

## Implementation Details

### Commander Position Tracking

**Global Commander State**:

```typescript
private _commanders: Record<Color, number> = { r: -1, b: -1 }
```

**Position Updates**:

- Updated automatically when commanders are placed or moved
- Set to -1 when commander is captured (game over condition)
- Tracked through move history for undo operations

### Move History Integration

**Commander State in History**:

```typescript
interface History {
  move: CTLMoveCommandInteface
  commanders: Record<Color, number> // Position before the move
  turn: Color
  halfMoves: number
}
```

**Undo Restoration**:

```typescript
// Restore commander positions during undo
this._commanders = old.commanders
```

### Performance Optimizations

**Efficient Exposure Checking**:

1. **Early Termination**: Stop checking direction when first piece is found
2. **Board Boundary Checks**: Validate squares before accessing board array
3. **Commander Validation**: Skip checks if either commander is captured
4. **Direction Optimization**: Only check four orthogonal directions

### Error Handling

**Edge Cases**:

1. **Missing Commanders**: Handle cases where commanders are captured or missing
2. **Invalid Positions**: Validate commander positions before exposure checks
3. **Board Boundaries**: Ensure exposure checks don't go off-board
4. **State Consistency**: Maintain commander position consistency across
   operations

## Testing and Validation

### Key Test Scenarios

#### Basic Exposure Detection

1. **File Exposure**: Commanders on same file with clear path
2. **Rank Exposure**: Commanders on same rank with clear path
3. **Blocked Paths**: Pieces between commanders prevent exposure
4. **Multiple Directions**: Exposure checking in all orthogonal directions

#### Move Filtering

1. **Illegal Moves**: Moves that create exposure are rejected
2. **Legal Alternatives**: Valid moves that don't create exposure
3. **Blocking Piece Movement**: Moving pieces that maintain or break blocking
4. **Commander Movement**: Commander moves that avoid exposure

#### Commander Capture

1. **Flying General Capture**: Direct commander vs commander capture
2. **Range Override**: Commander capture ignoring normal range limits
3. **Blocking Override**: Commander capture through normally blocking pieces
4. **Adjacent Restriction**: Normal captures limited to adjacent squares

### Edge Cases

#### Special Situations

1. **Board Edges**: Commanders near board boundaries
2. **Stack Interactions**: Commanders in or interacting with stacks
3. **Deployment Scenarios**: Commander exposure during piece deployment
4. **Endgame Positions**: Simplified positions with few pieces

#### Error Conditions

1. **Missing Commanders**: One or both commanders captured
2. **Invalid States**: Inconsistent commander position tracking
3. **Undo Complications**: Commander state restoration during undo
4. **Concurrent Threats**: Multiple simultaneous exposure threats

### Performance Testing

#### Efficiency Metrics

1. **Exposure Check Speed**: Time to validate commander exposure
2. **Move Filtering Performance**: Legal move filtering with exposure checks
3. **Memory Usage**: Commander state tracking overhead
4. **Batch Operations**: Multiple move validation efficiency

## Integration with Other Systems

### Check Detection

- Commander exposure works alongside check detection
- Both conditions must be satisfied for legal moves
- Exposure can create check situations through flying general captures

### Heroic Promotion

- Commanders that attack enemy commanders become heroic
- Heroic commanders gain diagonal movement but retain exposure restrictions
- Flying general rule applies regardless of heroic status

### Stack System

- Commanders in stacks are still subject to exposure rules
- Stack movement must not create commander exposure
- Blocking pieces can be part of stacks

### Air Defense

- Commander exposure is independent of air defense zones
- Air defense doesn't affect commander vs commander interactions
- Both systems operate simultaneously without interference
