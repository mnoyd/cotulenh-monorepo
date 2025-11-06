# Air Defense System

## Overview

The air defense system is a sophisticated mechanic that restricts AIR_FORCE
movement through enemy-controlled zones. Certain pieces create "air defense
zones" that can destroy, restrict, or force suicide attacks on AIR_FORCE pieces
attempting to pass through them. This system adds strategic depth by creating
protected areas and forcing tactical decisions about air force deployment.

## Air Defense Pieces and Levels

### Base Air Defense Configuration

Three piece types provide air defense capabilities:

```typescript
const BASE_AIRDEFENSE_CONFIG = {
  [MISSILE]: 2, // Level 2 air defense
  [NAVY]: 1, // Level 1 air defense
  [ANTI_AIR]: 1, // Level 1 air defense
}
```

### Air Defense Levels

**Level Calculation**:

```typescript
function getAirDefenseLevel(piece: PieceSymbol, isHero: boolean): number {
  const base = BASE_AIRDEFENSE_CONFIG[piece]
  if (!base) return 0
  if (isHero) {
    return base + 1 // Heroic pieces get +1 level
  }
  return base
}
```

**Air Defense Levels by Piece**:

#### MISSILE

- **Base Level**: 2 (covers 13 squares in circular pattern)
- **Heroic Level**: 3 (covers 29 squares in circular pattern)
- **Pattern**: Circular coverage with radius based on level

#### NAVY

- **Base Level**: 1 (covers 5 squares in cross pattern)
- **Heroic Level**: 2 (covers 13 squares in circular pattern)
- **Pattern**: Circular coverage expanding with level

#### ANTI_AIR

- **Base Level**: 1 (covers 5 squares in cross pattern)
- **Heroic Level**: 2 (covers 13 squares in circular pattern)
- **Pattern**: Circular coverage expanding with level

### Air Defense Zone Calculation

**Zone Coverage Algorithm**:

```typescript
function calculateAirDefenseForSquare(curSq: number, level: number): number[] {
  const allInflunceSq: number[] = []
  if (level === 0) return allInflunceSq

  for (let i = -level; i <= level; i++) {
    for (let j = -level; j <= level; j++) {
      if (!isSquareOnBoard(curSq + i + j * 16)) continue
      if (i * i + j * j <= level * level) {
        allInflunceSq.push(curSq + i + j * 16)
      }
    }
  }
  return allInflunceSq
}
```

**Coverage Patterns**:

- **Level 1**: 5 squares (center + 4 orthogonal)
- **Level 2**: 13 squares (circular pattern with radius ~2.2)
- **Level 3**: 29 squares (circular pattern with radius ~3.2)

**Board Edge Handling**: Air defense zones are clipped at board boundaries,
reducing coverage for pieces near edges and corners.

## Air Defense Zone Effects

### AIR_FORCE Movement Restrictions

Only AIR_FORCE pieces are affected by air defense zones. The system tracks
AIR_FORCE movement through enemy air defense zones and applies restrictions
based on the movement pattern.

### Air Defense Results

```typescript
export const AirDefenseResult = {
  SAFE_PASS: 0, // Can safely pass through this square
  KAMIKAZE: 1, // Can pass but will be destroyed (suicide move)
  DESTROYED: 2, // Cannot pass, movement stops
}
```

### Movement Analysis Algorithm

The `getCheckAirDefenseZone` function creates a closure that tracks AIR_FORCE
movement through air defense zones:

```typescript
function getCheckAirDefenseZone(
  gameInstance: CoTuLenh,
  fromSquare: number,
  defenseColor: Color,
  offset: number,
): () => AirDefenseResult
```

**Tracking Logic**:

1. **Zone Encounter Tracking**: Maintains set of encountered air defense pieces
2. **Zone Exit Detection**: Tracks when AIR_FORCE moves out of first encountered
   zone
3. **Result Determination**: Based on zones encountered and movement pattern

### Air Defense Rules

#### SAFE_PASS (Result: 0)

- **Condition**: AIR_FORCE has not encountered any air defense zones
- **Effect**: Normal movement, no restrictions
- **Move Generation**: Standard moves and captures allowed

#### KAMIKAZE (Result: 1)

- **Condition**: AIR_FORCE is in exactly one air defense zone and has not exited
  it
- **Effect**: Can capture but will be destroyed (suicide capture)
- **Move Generation**: Only suicide capture moves allowed
  (`BITS.SUICIDE_CAPTURE`)
- **Notation**: Uses `@` symbol in SAN (e.g., `F@b2`)

#### DESTROYED (Result: 2)

- **Condition**: AIR_FORCE has encountered multiple zones OR exited first zone
  and entered another
- **Effect**: Movement stops, no further moves possible in this direction
- **Move Generation**: No moves generated beyond this point

### Detailed Movement Rules

#### Single Zone Entry

```
AIR_FORCE enters single enemy air defense zone:
- Can move through zone normally (SAFE_PASS while approaching)
- Can capture pieces in zone via suicide attack (KAMIKAZE)
- Cannot move to empty squares in zone (would be KAMIKAZE without target)
```

#### Multiple Zone Encounter

```
AIR_FORCE encounters multiple air defense zones:
- Movement immediately stops (DESTROYED)
- No moves possible in zones with overlapping coverage
- Must find alternate routes avoiding multiple zones
```

#### Zone Exit and Re-entry

```
AIR_FORCE exits first zone then enters another:
- Movement stops at second zone entry (DESTROYED)
- Cannot pass through multiple separate zones in single move
- Forces tactical decisions about route planning
```

## Suicide Capture Mechanics

### Suicide Capture Conditions

**When Suicide Capture Occurs**:

1. AIR_FORCE is in KAMIKAZE state (single air defense zone)
2. Target square contains enemy piece
3. AIR_FORCE can legally capture the target piece

**Suicide Capture Effects**:

1. **Target Destroyed**: Enemy piece is captured and removed
2. **Attacker Destroyed**: AIR_FORCE piece is also destroyed
3. **Both Removed**: Both pieces are removed from the board

### Suicide Capture Implementation

**Move Flag**: `BITS.SUICIDE_CAPTURE` (value: 8)

**Command Class**: `SuicideCaptureMoveCommand`

- Handles the destruction of both pieces
- Properly integrates with undo/redo system
- Manages stack interactions for carried pieces

**Move Generation**:

```typescript
if (isSuicideMove) {
  addMove(moves, us, from, to, pieceData, targetPiece, BITS.SUICIDE_CAPTURE)
  return
}
```

### SAN Notation for Suicide Capture

**Notation Format**: `F@b2` (AIR_FORCE suicide captures on b2)

- **Piece Symbol**: `F` for AIR_FORCE
- **Suicide Marker**: `@` indicates suicide capture
- **Target Square**: Destination where both pieces are destroyed

### Stack Interactions

**AIR_FORCE in Stacks**:

- When AIR_FORCE is carried and performs suicide capture, only the AIR_FORCE is
  destroyed
- Carrier piece remains on original square
- Other carried pieces remain with carrier

**AIR_FORCE Carrying Others**:

- When AIR_FORCE carries other pieces and performs suicide capture
- All carried pieces are also destroyed with the AIR_FORCE
- Only target piece survives the interaction

## Strategic Implications

### Defensive Strategy

#### Air Defense Networks

1. **Overlapping Coverage**: Create zones with multiple air defense pieces to
   block AIR_FORCE movement
2. **Chokepoint Control**: Place air defense pieces to control key squares and
   passages
3. **Commander Protection**: Use air defense to create safe zones around
   commanders
4. **Zone Layering**: Multiple defense levels to force suicide attacks or block
   movement entirely

#### Piece Positioning

1. **MISSILE Placement**: Level 2 defense creates large protected areas
2. **ANTI_AIR Networks**: Multiple ANTI_AIR pieces create overlapping coverage
3. **NAVY Support**: Naval pieces provide mobile air defense capability
4. **Heroic Enhancement**: Promote air defense pieces for expanded coverage

### Offensive Strategy

#### AIR_FORCE Tactics

1. **Route Planning**: Find paths avoiding multiple air defense zones
2. **Suicide Strikes**: Use kamikaze attacks for high-value targets
3. **Zone Mapping**: Identify single-zone areas for safe attacks
4. **Timing Attacks**: Coordinate with other pieces to eliminate air defense

#### Counter-Air Defense

1. **Direct Assault**: Attack air defense pieces with other units
2. **Overload Tactics**: Force air defense to cover too many areas
3. **Mobility Advantage**: Use AIR_FORCE speed before zones are established
4. **Stack Coordination**: Use AIR_FORCE in stacks for protection

### Tactical Considerations

#### Risk Assessment

1. **Value Exchange**: When suicide attacks are worthwhile
2. **Positional Sacrifice**: Trading AIR_FORCE for strategic advantage
3. **Tempo Considerations**: Speed vs safety in AIR_FORCE deployment
4. **Endgame Factors**: AIR_FORCE value changes in simplified positions

#### Common Patterns

1. **Kamikaze Commander**: Suicide attack on enemy commander for check/mate
2. **Piece Trading**: Exchange AIR_FORCE for high-value enemy pieces
3. **Zone Breaking**: Sacrifice AIR_FORCE to eliminate key air defense pieces
4. **Desperate Measures**: Last-resort attacks in losing positions

## Implementation Details

### Air Defense State Management

**Global Air Defense Tracking**:

```typescript
type AirDefense = {
  [RED]: Map<number, number[]> // square -> defending pieces
  [BLUE]: Map<number, number[]> // square -> defending pieces
}
```

**Update Mechanism**:

- Air defense state is recalculated after each move
- `updateAirDefensePiecesPosition()` scans board for air defense pieces
- `calculateAirDefense()` computes coverage zones for each side

### Performance Optimizations

**Lazy Evaluation**: Air defense zones are only calculated when AIR_FORCE moves
**Caching**: Air defense state is cached and updated incrementally **Efficient
Algorithms**: Circular zone calculation uses optimized distance formulas

### Integration with Move Generation

**AIR_FORCE Special Handling**:

```typescript
const shouldCheckAirDefense = pieceData.type === AIR_FORCE
const checkAirforceState = getCheckAirDefenseZone(
  gameInstance,
  from,
  them,
  offset,
)

// During move generation:
if (shouldCheckAirDefense) {
  airDefenseResult = checkAirforceState()
}
if (airDefenseResult === AirDefenseResult.DESTROYED) {
  break // Stop generating moves in this direction
}
```

### Error Handling

**Missing Pieces**: Throws error if air defense piece not found at expected
square **Invalid Zones**: Validates zone calculations against board boundaries  
**State Consistency**: Ensures air defense state matches actual board position

## Testing and Validation

### Key Test Scenarios

1. **Basic Coverage**: Air defense pieces create expected zone coverage
2. **Heroic Enhancement**: Heroic air defense pieces have expanded zones
3. **Overlapping Zones**: Multiple air defense pieces create combined coverage
4. **AIR_FORCE Restrictions**: AIR_FORCE movement properly restricted by zones
5. **Suicide Captures**: Kamikaze attacks work correctly and destroy both pieces
6. **Zone Transitions**: Movement through multiple zones properly blocked
7. **Board Boundaries**: Air defense zones properly clipped at board edges

### Edge Cases

1. **Corner Placement**: Air defense pieces in corners have reduced coverage
2. **Stack Interactions**: AIR_FORCE in stacks handles suicide captures
   correctly
3. **Multiple Attackers**: Multiple AIR_FORCE pieces in same zone
4. **Zone Updates**: Air defense state updates correctly after piece
   movement/capture
5. **Undo Operations**: Suicide captures properly undone with state restoration

### Performance Testing

1. **Zone Calculation Speed**: Large numbers of air defense pieces
2. **Movement Generation**: AIR_FORCE move generation with complex air defense
   networks
3. **Memory Usage**: Air defense state storage and updates
4. **Cache Efficiency**: Air defense zone caching and invalidation
