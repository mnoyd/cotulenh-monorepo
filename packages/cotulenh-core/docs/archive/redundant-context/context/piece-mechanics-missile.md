# MISSILE Piece Mechanics

## Overview

The MISSILE is a specialized heavy piece with a unique movement pattern that
combines medium-range orthogonal movement with limited diagonal capability. It
represents guided missile systems that can engage targets at medium range while
ignoring blocking pieces for captures. As both a heavy piece and an air defense
unit, it has multiple special characteristics.

## Basic Properties

- **Symbol**: `s` (lowercase for blue, `S` uppercase for red)
- **Movement Range**: 2 squares orthogonal, 1 square diagonal
- **Capture Range**: 2 squares orthogonal, 1 square diagonal
- **Diagonal Movement**: Limited (1 square only)
- **Special Abilities**: Capture-ignores-blocking, Air defense level 2
- **Terrain Classification**: Heavy piece (subject to river crossing
  restrictions)

## Movement Rules

### Unique Movement Pattern

The MISSILE has a distinctive movement pattern that differs from other pieces:

#### Orthogonal Movement

- **Range**: Up to 2 squares in orthogonal directions (N, S, E, W)
- **Full range**: Can move 1 or 2 squares orthogonally

#### Diagonal Movement

- **Range**: Exactly 1 square in diagonal directions (NE, NW, SE, SW)
- **Limited range**: Cannot move 2 squares diagonally like other pieces with
  diagonal capability

### Movement Pattern Visualization

```
  X     X
X   X X   X
  X M X     (M = MISSILE, X = possible destinations)
X   X X   X
  X     X
```

### Movement Restrictions

1. **Asymmetric range**: Different ranges for orthogonal vs diagonal movement
2. **Blocked by all pieces**: Cannot move through or past any piece for movement
3. **Land pieces only**: Cannot move to water squares
4. **Heavy piece river crossing**: Subject to special river crossing
   restrictions

## Capture Rules

### Capture-Ignores-Blocking Ability

The MISSILE can capture targets while ignoring intervening pieces:

- **Capture range**: Up to 2 squares orthogonally, 1 square diagonally
- **Ignores blocking**: Can capture targets even if pieces are between the
  MISSILE and target
- **Same pattern as movement**: Capture range follows the same asymmetric
  pattern as movement
- **Movement vs capture**: This ability only applies to captures, not movement

### Capture Mechanics

- **Direct capture**: MISSILE moves to the target square, replacing the captured
  piece
- **Stay capture available**: MISSILE can also perform stay captures (capture
  without moving)
- **Pattern-based**: Must follow the unique MISSILE movement pattern for
  captures

### Examples

```
M . E . X    (M = MISSILE, E = Enemy piece, X = Target, . = Empty)
```

- MISSILE can capture X (2 squares orthogonally) even though E is blocking
- MISSILE cannot move to X because E blocks movement
- MISSILE can capture E normally (1 square orthogonally, no blocking issue)

## Special Movement Implementation

### Code Logic

The special diagonal range limitation is implemented with specific logic:

```typescript
// Special case for Missile diagonal movement
if (
  pieceData.type === MISSILE &&
  DIAGONAL_OFFSETS.includes(offset) &&
  currentRange > config.moveRange - 1
) {
  break
}
```

This ensures that MISSILE pieces stop after 1 square when moving diagonally,
even though their base `moveRange` is 2.

## Air Defense System

### Air Defense Level

- **Base level**: 2 (highest among air defense pieces)
- **Heroic level**: 3 (base + 1 when heroic)
- **Coverage area**: Circular area with radius equal to defense level
- **Effect**: Restricts AIR_FORCE movement and enables kamikaze attacks

### Air Defense Zone Calculation

- **Level 2 base**: Affects all squares within 2-square radius
- **Level 3 heroic**: Affects all squares within 3-square radius
- **Circular pattern**: Uses distance formula (i² + j² ≤ level²)
- **Strongest defense**: Provides the most powerful air defense among all pieces

### Strategic Air Defense Role

- **Area denial**: Creates large no-fly zones for enemy AIR_FORCE
- **Kamikaze enablement**: Forces AIR_FORCE into suicide attacks within zones
- **Overlapping coverage**: Can coordinate with other air defense pieces

## Heavy Piece River Crossing Rules

### Zone System

The board is divided into zones for heavy piece movement:

- **Zone 0**: Files a-b (water area, heavy pieces cannot enter)
- **Zone 1**: Files c-k, ranks 7-12 (upper half)
- **Zone 2**: Files c-k, ranks 1-6 (lower half)

### River Crossing Restrictions

Heavy pieces (ARTILLERY, ANTI_AIR, MISSILE) have restricted movement between
zones:

#### Blocked Crossings

- **Zone 1 to Zone 2**: Generally blocked (crossing the river)
- **Zone 2 to Zone 1**: Generally blocked (crossing the river)

#### Allowed Crossings

- **Horizontal movement**: Allowed at files f (file index 5) and h (file
  index 7)
- **Bridge squares**: These act as crossing points for heavy pieces
- **Same zone**: Free movement within the same zone

## Heroic Status Effects

### Heroic Promotion

- **Trigger**: Any piece that attacks (threatens) the enemy commander becomes
  heroic
- **Automatic**: This promotion happens immediately when the attack is
  established
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends

### Heroic Abilities

When a MISSILE becomes heroic:

- **Movement Range**: Increases to 3 squares orthogonal, 2 squares diagonal
- **Capture Range**: Increases to 3 squares orthogonal, 2 squares diagonal
- **Air Defense Level**: Increases to 3 (from base level 2)
- **Retains capture-ignores-blocking**: Special capture ability works at
  extended range

### Heroic Movement Pattern

```
    X       X
  X   X   X   X
X       X       X
  X   X M X   X    (M = MISSILE, X = possible destinations)
X       X       X
  X   X   X   X
    X       X
```

## Terrain Interactions

### Land Restriction

- **Water squares**: Cannot move to or stay on water squares (NAVY_MASK = 0)
- **Mixed zones**: Can move on mixed terrain squares where both land and water
  pieces can exist
- **Bridge squares**: Can cross bridge squares that connect land areas

### Heavy Piece Classification

- **River crossing restrictions**: Subject to zone-based movement limitations
- **Bridge utilization**: Must use designated crossing points to move between
  zones
- **Strategic positioning**: River crossing rules significantly impact
  positioning

## Stacking and Deployment

### Carrying Capacity

- **Can be carried**: MISSILE can be carried by other pieces in stacks
- **Can carry others**: MISSILE can carry other compatible pieces
- **Standard stacking rules**: Follow normal piece combination rules

### Deployment from Stacks

- **Individual deployment**: Can be deployed individually from stacks
- **Retain abilities**: Heroic status, capture-ignores-blocking, and air defense
  are maintained during deployment
- **Standard deployment rules**: Follow normal deployment mechanics

## Code Implementation Details

### Movement Configuration

```typescript
[MISSILE]: {
  moveRange: 2,
  captureRange: 2,
  canMoveDiagonal: true,
  captureIgnoresPieceBlocking: true,
  moveIgnoresBlocking: false,
  specialRules: { missileSpecialRange: true },
}
```

### Air Defense Configuration

```typescript
BASE_AIRDEFENSE_CONFIG: {
  [MISSILE]: 2,  // Highest base air defense level
}
```

### Special Range Logic

The `missileSpecialRange` rule is implemented with specific diagonal movement
limitations that override the normal diagonal range.

### Heroic Modifications

When heroic, the configuration becomes:

- `moveRange`: 3 (increased from 2) - but diagonal still limited to 2
- `captureRange`: 3 (increased from 2) - but diagonal still limited to 2
- Air defense level increases to 3

## Strategic Considerations

### Positioning Advantages

- **Asymmetric control**: Controls different ranges in different directions
- **Air defense coverage**: Creates powerful no-fly zones
- **Medium-range precision**: Effective at medium combat ranges

### Tactical Uses

- **Air superiority**: Use air defense to control airspace
- **Selective engagement**: Use unique range pattern for tactical advantage
- **Support positioning**: Provide air defense while maintaining combat
  capability

### Common Strategies

- **Air defense networks**: Coordinate with other air defense pieces
- **Bridge control**: Position to control river crossing points
- **Asymmetric positioning**: Use unique movement pattern to create unexpected
  threats

## Interactions with Other Pieces

### With AIR_FORCE

- **Primary counter**: MISSILE is the strongest counter to AIR_FORCE pieces
- **Zone control**: Creates large areas where AIR_FORCE cannot operate safely
- **Kamikaze forcing**: Forces AIR_FORCE into suicide attacks

### With Other Heavy Pieces

- **Similar restrictions**: All heavy pieces share river crossing limitations
- **Complementary air defense**: Can coordinate with ANTI_AIR for overlapping
  coverage
- **Bridge competition**: May compete for limited river crossing points

### With Light Pieces

- **Shooting over**: Can capture targets behind friendly light pieces
- **Air defense coordination**: Light pieces can benefit from MISSILE air
  defense coverage
- **Stacking synergy**: Can form effective combined stacks

## Common Mistakes

### Tactical Errors

- **Ignoring asymmetric range**: Not utilizing the different orthogonal vs
  diagonal ranges
- **Poor air defense placement**: Placing MISSILE where its air defense doesn't
  cover key areas
- **Confusing movement and capture**: Thinking MISSILE can move through pieces
  like it can shoot

### Strategic Oversights

- **Underutilizing air defense**: Not using MISSILE's powerful air defense
  capability
- **River crossing neglect**: Not considering heavy piece movement restrictions
- **Pattern confusion**: Not understanding the unique movement pattern

## Advanced Tactics

### Asymmetric Range Mastery

- **Directional control**: Use different ranges to control specific board areas
- **Unexpected angles**: Use limited diagonal range for precise positioning
- **Range optimization**: Position to maximize both orthogonal and diagonal
  coverage

### Air Defense Mastery

- **Zone layering**: Create overlapping air defense zones with multiple pieces
- **Strategic placement**: Position to deny key squares to enemy AIR_FORCE
- **Kamikaze baiting**: Force enemy AIR_FORCE into unfavorable suicide attacks

### Heavy Piece Coordination

- **Bridge control**: Coordinate with other heavy pieces to control crossing
  points
- **Zone dominance**: Use multiple heavy pieces to dominate specific board zones
- **Crossing timing**: Time river crossings to maximize tactical advantage

## Comparison with Other Pieces

### vs ARTILLERY

- **Range**: MISSILE 2 squares, ARTILLERY 3 squares
- **Pattern**: MISSILE asymmetric, ARTILLERY symmetric
- **Air defense**: MISSILE level 2, ARTILLERY none
- **Special abilities**: Both ignore blocking for captures

### vs ANTI_AIR

- **Range**: MISSILE 2/1 squares, ANTI_AIR 1 square
- **Air defense**: MISSILE level 2, ANTI_AIR level 1
- **Mobility**: MISSILE much more mobile
- **Terrain**: Both are heavy pieces

### vs AIR_FORCE

- **Range**: MISSILE 2/1 squares, AIR_FORCE 4 squares
- **Blocking**: MISSILE ignores for captures only, AIR_FORCE ignores for both
- **Counter-relationship**: MISSILE counters AIR_FORCE with air defense
- **Terrain**: MISSILE has river restrictions, AIR_FORCE has air defense
  restrictions

## Endgame Considerations

### Simplified Positions

- **Increased air defense value**: Air defense becomes more important with fewer
  pieces
- **Asymmetric advantage**: Unique movement pattern creates tactical
  opportunities
- **Stay capture power**: Can eliminate threats without counter-attack risk

### MISSILE and Commander Endgames

- **Powerful combination**: MISSILE and commander can create complex tactical
  situations
- **Air defense support**: Can protect commander from AIR_FORCE attacks
- **Heroic potential**: Attacking enemy commander makes MISSILE even more
  powerful with level 3 air defense
