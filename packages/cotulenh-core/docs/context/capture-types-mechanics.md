# Capture Types and Mechanics

## Overview

CoTuLenh features three distinct capture types, each with unique mechanics and
strategic implications. The capture system is designed around terrain
restrictions, piece capabilities, and tactical considerations that add depth to
combat interactions.

## Capture Types

### 1. Normal Capture (BITS.CAPTURE)

**Definition**: The attacking piece moves to the target square and replaces the
captured piece.

**Mechanics**:

- Attacker moves from origin square to target square
- Target piece is removed from the board
- Attacker occupies the target square
- Standard capture mechanism used by most pieces

**Flag**: `BITS.CAPTURE` (value: 2) **SAN Notation**: Uses `x` symbol (e.g.,
`Txe5` - Tank captures on e5)

**Implementation**:

```typescript
// Normal capture move generation
if (addNormalCapture) {
  addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE)
}
```

### 2. Stay Capture (BITS.STAY_CAPTURE)

**Definition**: The attacking piece captures the target without moving from its
current square.

**Mechanics**:

- Attacker remains on its original square
- Target piece is removed from the board
- Attacker does not change position
- Used when terrain restrictions prevent normal capture

**Flag**: `BITS.STAY_CAPTURE` (value: 4) **SAN Notation**: Uses `_` symbol
(e.g., `T_e5` - Tank stay captures on e5)

**Terrain-Based Activation**:

```typescript
const canLand = canStayOnSquare(to, pieceData.type)
if (!canLand) {
  addStayCapture = true
  addNormalCapture = false
}
```

### 3. Suicide Capture (BITS.SUICIDE_CAPTURE)

**Definition**: Both the attacking piece and target piece are destroyed in the
attack.

**Mechanics**:

- Attacker is destroyed in the process
- Target piece is also destroyed
- Both pieces are removed from the board
- Primarily used by AIR_FORCE in air defense zones

**Flag**: `BITS.SUICIDE_CAPTURE` (value: 8) **SAN Notation**: Uses `@` symbol
(e.g., `F@b2` - Air Force suicide captures on b2)

**Air Defense Activation**:

```typescript
if (isSuicideMove) {
  addMove(moves, us, from, to, pieceData, targetPiece, BITS.SUICIDE_CAPTURE)
  return
}
```

## Terrain-Based Capture Restrictions

### Terrain Compatibility Function

```typescript
export function canStayOnSquare(
  square: number,
  pieceType: PieceSymbol,
): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}
```

### Terrain Rules

#### NAVY Pieces

- **Water Squares**: Can perform normal captures on water squares
- **Land Squares**: Must use stay capture (cannot land on land)
- **Mixed Squares**: Can perform normal captures (water access available)

#### Land Pieces (All others)

- **Land Squares**: Can perform normal captures on land squares
- **Water Squares**: Must use stay capture (cannot land on water)
- **Mixed Squares**: Can perform normal captures (land access available)

### Stay Capture Scenarios

**Forced Stay Capture**:

1. NAVY attacking land-based pieces on pure land squares
2. Land pieces attacking NAVY on pure water squares
3. Any piece attacking targets on incompatible terrain

**Optional Stay Capture**:

1. AIR_FORCE can choose between normal and stay capture when terrain allows
2. Provides tactical flexibility for AIR_FORCE positioning

## Piece-Specific Capture Mechanics

### COMMANDER

**Capture Range**: 1 square (adjacent only) **Special Rules**:

- Cannot capture beyond adjacent squares (except commander vs commander)
- Flying general rule allows unlimited range vs enemy commander
- Must capture orthogonally (unless heroic)

```typescript
// Commander captures only adjacent
if (pieceData.type === COMMANDER && currentRange > 1) {
  captureAllowed = false
}
```

### NAVY

**Capture Range**: 4 squares **Special Attack Mechanisms**:

- **Torpedo Attack**: vs NAVY targets (full range)
- **Naval Gun Attack**: vs non-NAVY targets (range - 1)

```typescript
if (pieceData.type === NAVY) {
  if (targetPiece.type === NAVY) {
    // Torpedo attack
    if (currentRange > config.captureRange) {
      captureAllowed = false
    }
  } else {
    // Naval Gun attack
    if (currentRange > config.captureRange - 1) {
      captureAllowed = false
    }
  }
}
```

### AIR_FORCE

**Capture Range**: 4 squares **Special Capabilities**:

- Can choose between normal and stay capture when terrain allows
- Subject to air defense restrictions (may force suicide capture)
- Ignores piece blocking for captures

```typescript
// Air Force gets both capture options when terrain allows
if (canLand && pieceData.type === AIR_FORCE) {
  if (!isDeployMove) {
    addStayCapture = true
  }
  addNormalCapture = true
}
```

### ARTILLERY & MISSILE

**Capture Range**: 3 squares (ARTILLERY), 2 squares (MISSILE) **Special
Ability**: `captureIgnoresPieceBlocking: true`

- Can capture through blocking pieces
- Pieces between attacker and target don't prevent capture
- Maintains range limitations

### TANK

**Capture Range**: 2 squares **Special Ability**: `tankShootOverBlocking: true`

- Can capture through blocking pieces (similar to artillery)
- Specialized anti-armor capability

### Standard Pieces (INFANTRY, ENGINEER, ANTI_AIR, MILITIA)

**Capture Range**: 1 square **Standard Rules**: Normal capture mechanics with
terrain restrictions

### HEADQUARTER

**Base Capture Range**: 0 (cannot capture) **Heroic Capture Range**: 1 square
(when heroic)

- Transforms from non-combatant to combatant when heroic

## Capture Validation and Terrain Considerations

### Capture Validation Process

1. **Range Check**: Verify target is within capture range
2. **Terrain Compatibility**: Determine if normal capture is possible
3. **Blocking Check**: Apply piece-specific blocking rules
4. **Special Rules**: Apply piece-specific capture mechanics
5. **Move Generation**: Create appropriate capture move types

### Terrain Interaction Matrix

| Attacker Type | Target Terrain | Capture Type Available |
| ------------- | -------------- | ---------------------- |
| NAVY          | Water          | Normal                 |
| NAVY          | Land           | Stay Only              |
| NAVY          | Mixed          | Normal                 |
| Land Piece    | Land           | Normal                 |
| Land Piece    | Water          | Stay Only              |
| Land Piece    | Mixed          | Normal                 |
| AIR_FORCE     | Any Compatible | Normal + Stay          |
| AIR_FORCE     | Incompatible   | Stay Only              |

### Blocking Considerations

#### Pieces That Ignore Blocking

- **ARTILLERY**: `captureIgnoresPieceBlocking: true`
- **MISSILE**: `captureIgnoresPieceBlocking: true`
- **AIR_FORCE**: `captureIgnoresPieceBlocking: true`
- **NAVY**: `captureIgnoresPieceBlocking: true`
- **TANK**: Special shoot-over-blocking ability

#### Pieces Affected by Blocking

- **COMMANDER**: Blocked by pieces (except vs enemy commander)
- **INFANTRY**: Blocked by pieces
- **ENGINEER**: Blocked by pieces
- **ANTI_AIR**: Blocked by pieces
- **MILITIA**: Blocked by pieces
- **HEADQUARTER**: Blocked by pieces (when heroic)

## Command Pattern Implementation

### Capture Command Classes

#### Normal Capture

```typescript
export class CTLMoveCommand extends CTLMoveCommandBase {
  // Handles normal capture through standard move execution
  // Removes captured piece and places attacking piece
}
```

#### Stay Capture

```typescript
export class StayCaptureMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    // Remove captured piece but don't move attacker
    this.actions.push(new RemovePieceAction(this.game, targetSq))
    // Attacker stays on original square
  }
}
```

#### Suicide Capture

```typescript
export class SuicideCaptureMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    // Remove both attacker and target pieces
    this.actions.push(new RemovePieceAction(this.game, this.move.from))
    this.actions.push(new RemovePieceAction(this.game, this.move.to))
  }
}
```

### Command Selection Logic

```typescript
export function createMoveCommand(
  game: CoTuLenh,
  move: InternalMove,
): CTLMoveCommandInteface {
  if (move.flags & BITS.DEPLOY) {
    return new SingleDeployMoveCommand(game, move)
  } else if (move.flags & BITS.SUICIDE_CAPTURE) {
    return new SuicideCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.STAY_CAPTURE) {
    return new StayCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.COMBINATION) {
    return new CombinationMoveCommand(game, move)
  } else {
    return new CTLMoveCommand(game, move)
  }
}
```

## Strategic Implications

### Tactical Advantages

#### Normal Capture

- **Position Control**: Attacker gains control of target square
- **Piece Development**: Advances piece to new position
- **Tempo Gain**: Combines movement and capture in single action

#### Stay Capture

- **Position Retention**: Maintains piece on strong square
- **Defensive Capability**: Removes threats without exposing attacker
- **Terrain Exploitation**: Allows cross-terrain attacks

#### Suicide Capture

- **High-Value Trades**: Exchange AIR_FORCE for critical targets
- **Breakthrough Attacks**: Penetrate heavily defended positions
- **Desperate Measures**: Last-resort attacks in losing positions

### Strategic Considerations

#### Terrain Planning

1. **Mixed Zone Control**: Secure squares that allow normal captures
2. **Terrain Barriers**: Use terrain to force stay captures
3. **Naval Positioning**: Position NAVY to exploit water access
4. **Air Superiority**: Use AIR_FORCE flexibility for tactical advantage

#### Piece Coordination

1. **Blocking Exploitation**: Use ignore-blocking pieces for breakthrough
2. **Capture Chains**: Coordinate multiple capture types
3. **Terrain Synergy**: Combine pieces with complementary terrain abilities
4. **Defensive Networks**: Create overlapping capture coverage

### Common Tactical Patterns

#### The Terrain Fork

```
Position pieces to threaten captures on both compatible and
incompatible terrain, forcing opponent to choose which threat to address.
```

#### The Stay Capture Pin

```
Use stay capture to pin enemy pieces while maintaining
defensive position on critical square.
```

#### The Suicide Strike

```
Sacrifice AIR_FORCE in suicide capture to eliminate
high-value target or break enemy formation.
```

## Implementation Details

### Move Generation Integration

**Capture Type Determination**:

```typescript
function handleCaptureLogic(/* parameters */) {
  let addNormalCapture = true
  let addStayCapture = false

  // Terrain compatibility check
  const canLand = canStayOnSquare(to, pieceData.type)
  if (!canLand) {
    addStayCapture = true
    addNormalCapture = false
  }

  // AIR_FORCE special handling
  if (canLand && pieceData.type === AIR_FORCE) {
    addStayCapture = true // Both options available
  }

  // Generate appropriate moves
  if (captureAllowed) {
    if (addNormalCapture) {
      addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE)
    }
    if (addStayCapture) {
      addMove(moves, us, from, to, pieceData, targetPiece, BITS.STAY_CAPTURE)
    }
  }
}
```

### Error Handling

**Validation Checks**:

1. **Target Validation**: Ensure target piece exists and is enemy
2. **Range Validation**: Verify capture is within piece range
3. **Terrain Validation**: Check terrain compatibility for capture type
4. **Blocking Validation**: Apply piece-specific blocking rules

**Error Conditions**:

1. **Invalid Target**: No piece or friendly piece at target square
2. **Out of Range**: Target beyond piece's capture range
3. **Terrain Mismatch**: Incompatible terrain for normal capture
4. **Blocked Path**: Path blocked for pieces that don't ignore blocking

## Testing and Validation

### Key Test Scenarios

#### Capture Type Selection

1. **Terrain Compatibility**: Correct capture type based on terrain
2. **AIR_FORCE Options**: Both normal and stay capture when possible
3. **Forced Stay Capture**: Stay capture when terrain incompatible
4. **Suicide Capture**: Proper suicide capture in air defense zones

#### Piece-Specific Mechanics

1. **COMMANDER Adjacent**: Only adjacent captures (except vs commander)
2. **NAVY Attack Types**: Torpedo vs naval gun mechanics
3. **Ignore Blocking**: Artillery/Missile/AIR_FORCE ignore blocking
4. **TANK Shoot-Over**: Tank special blocking rules

#### Command Execution

1. **Normal Capture**: Piece movement and target removal
2. **Stay Capture**: Target removal without attacker movement
3. **Suicide Capture**: Both pieces removed
4. **Undo Operations**: Proper restoration of all capture types

### Edge Cases

#### Complex Scenarios

1. **Stack Captures**: Capturing pieces in stacks
2. **Heroic Interactions**: Heroic piece capture modifications
3. **Multiple Options**: Choosing between capture types
4. **Terrain Boundaries**: Captures near terrain transitions

#### Error Recovery

1. **Invalid Captures**: Graceful handling of illegal capture attempts
2. **State Consistency**: Maintaining board state during capture operations
3. **Undo Reliability**: Proper restoration after capture undo
4. **Command Failures**: Recovery from failed capture commands
