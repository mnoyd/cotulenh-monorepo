# MILITIA Piece Mechanics

## Overview

The MILITIA is a versatile short-range piece that stands out among the basic
units by having diagonal movement capability from the start. It represents local
defense forces or irregular troops that can move and fight in all directions,
making it more flexible than the orthogonal-only INFANTRY, ENGINEER, and
ANTI_AIR pieces.

## Basic Properties

- **Symbol**: `m` (lowercase for blue, `M` uppercase for red)
- **Movement Range**: 1 square in all directions
- **Capture Range**: 1 square in all directions
- **Diagonal Movement**: Yes (unique among basic pieces)
- **Special Abilities**: None (flexibility is its strength)
- **Terrain Classification**: Light piece

## Movement Rules

### Omnidirectional Movement

- **Range**: Exactly 1 square in any of the 8 directions
- **Directions**: North, South, East, West, Northeast, Northwest, Southeast,
  Southwest
- **Blocking**: Cannot move through any piece (friendly or enemy)
- **Terrain**: Must stay on land squares (LAND_MASK squares)

### Movement Pattern

The MILITIA can move to any of the 8 adjacent squares:

```
X X X
X M X    (M = MILITIA, X = possible destinations)
X X X
```

### Movement Restrictions

1. **Single step only**: Cannot move more than 1 square in any direction
2. **Blocked by all pieces**: Cannot move through or past any piece
3. **Land pieces only**: Cannot move to water squares
4. **No special movement**: No jumping or ignoring blocking abilities

## Capture Rules

### Omnidirectional Capture

- **Range**: Exactly 1 square in any of the 8 directions
- **Same as movement**: Capture range equals movement range in all directions
- **Direct capture**: Must move to the target square to capture
- **Standard capture only**: No special capture types (no stay capture or
  suicide capture)

### Capture Mechanics

- **Replace target**: Capturing piece moves to target square, replacing the
  captured piece
- **All directions**: Can capture orthogonally and diagonally
- **No blocking ignore**: Cannot capture through intervening pieces

## Heroic Status Effects

### Heroic Promotion

- **Trigger**: Any piece that attacks (threatens) the enemy commander becomes
  heroic
- **Automatic**: This promotion happens immediately when the attack is
  established
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends

### Heroic Abilities

When a MILITIA becomes heroic:

- **Movement Range**: Increases to 2 squares in all directions
- **Capture Range**: Increases to 2 squares in all directions
- **Diagonal Movement**: Already has diagonal capability (unchanged)
- **Enhanced reach**: Can now reach squares up to 2 steps away in any direction

### Heroic Movement Pattern

Heroic MILITIA can move and capture within a 2-square radius:

```
X X X X X
X X X X X
X X M X X    (M = MILITIA, X = possible destinations)
X X X X X
X X X X X
```

## Terrain Interactions

### Land Restriction

- **Water squares**: Cannot move to or stay on water squares (NAVY_MASK = 0)
- **Mixed zones**: Can move on mixed terrain squares where both land and water
  pieces can exist
- **Bridge squares**: Can cross bridge squares that connect land areas

### Light Piece Classification

- **Not heavy piece**: MILITIA is not in the HEAVY_PIECES set
- **No river restrictions**: Not subject to river crossing limitations
- **Full terrain mobility**: Can move freely between terrain zones (within land
  areas)

## Stacking and Deployment

### Carrying Capacity

- **Can be carried**: MILITIA can be carried by other pieces in stacks
- **Can carry others**: MILITIA can carry other compatible pieces
- **Standard stacking rules**: Follow normal piece combination rules

### Deployment from Stacks

- **Individual deployment**: Can be deployed individually from stacks
- **Retain abilities**: Heroic status is maintained during deployment
- **Standard deployment rules**: Follow normal deployment mechanics

## Code Implementation Details

### Movement Configuration

```typescript
[MILITIA]: {
  moveRange: 1,
  captureRange: 1,
  canMoveDiagonal: true,    // Key difference from other basic pieces
  captureIgnoresPieceBlocking: false,
  moveIgnoresBlocking: false,
}
```

### Heroic Modifications

When heroic, the configuration becomes:

- `moveRange`: 2 (increased from 1)
- `captureRange`: 2 (increased from 1)
- `canMoveDiagonal`: true (already true, unchanged)

## Strategic Considerations

### Positioning Advantages

- **Flexible positioning**: Can move in any direction for optimal placement
- **Diagonal control**: Only basic piece that can control diagonal squares
- **Escape routes**: Has more movement options than orthogonal-only pieces

### Tactical Uses

- **Corner control**: Excellent for controlling corner squares and diagonal
  approaches
- **Flexible defense**: Can respond to threats from any direction
- **Heroic potential**: Position to attack enemy commander for heroic
  enhancement

### Common Strategies

- **Diagonal pressure**: Use diagonal movement to create unique attack angles
- **Flexible screening**: Provide mobile screening that can adapt to changing
  situations
- **Multi-directional threat**: Create threats that are harder to block than
  orthogonal-only pieces

## Interactions with Other Pieces

### Compared to Basic Pieces

- **More flexible than INFANTRY/ENGINEER/ANTI_AIR**: Has diagonal movement they
  lack
- **Similar range to TANK**: But TANK has 2-square range and shoot-over-blocking
- **Unique niche**: Only basic piece with inherent diagonal capability

### With Heavy Pieces

- **Complementary mobility**: Can move where heavy pieces cannot
- **Stacking synergy**: Provides diagonal capability to stacks
- **Support role**: Can provide flexible support for specialized heavy pieces

### With Commanders

- **Heroic promotion**: Attacking enemy commanders promotes MILITIA to heroic
  status
- **Flexible protection**: Can protect commanders from multiple angles
- **Diagonal threats**: Can create diagonal threats that commanders cannot
  easily counter

## Comparison with HEADQUARTER

### Heroic HEADQUARTER Similarity

When HEADQUARTER becomes heroic, it gains movement similar to MILITIA:

- **Same pattern**: 1 square in all directions
- **Same flexibility**: Can move and capture in all 8 directions
- **Key difference**: HEADQUARTER starts immobile, MILITIA starts mobile

### Strategic Implications

- **MILITIA as mobile HQ**: Think of MILITIA as a mobile version of heroic
  HEADQUARTER
- **Consistent mechanics**: Both pieces use the same movement pattern when
  active
- **Role overlap**: In some positions, heroic HEADQUARTER and MILITIA are
  functionally equivalent

## Common Mistakes

### Tactical Errors

- **Underestimating diagonal capability**: Not utilizing the unique diagonal
  movement
- **Poor positioning**: Placing MILITIA where its flexibility is wasted
- **Ignoring heroic potential**: Not positioning to attack enemy commanders

### Strategic Oversights

- **Treating as basic infantry**: Not recognizing MILITIA's superior flexibility
- **Static deployment**: Not utilizing MILITIA's omnidirectional mobility
- **Diagonal neglect**: Not using diagonal movement to create unique tactical
  situations

## Advanced Tactics

### Diagonal Mastery

- **Diagonal pins**: Use diagonal movement to create pins that orthogonal pieces
  cannot
- **Corner attacks**: Exploit diagonal capability to attack from unexpected
  angles
- **Flexible retreats**: Use omnidirectional movement for superior retreat
  options

### Heroic MILITIA Utilization

- **Extended control**: Use 2-square omnidirectional range for area control
- **Multi-threat positioning**: Position to threaten multiple targets
  simultaneously
- **Flexible support**: Provide support that can quickly adapt to changing
  situations

### Positional Considerations

- **Central placement**: MILITIA benefits greatly from central positions where
  it can move in any direction
- **Edge limitations**: Near board edges, some movement options are lost
- **Coordination**: Works well with pieces that can create "holes" in enemy
  formations for diagonal exploitation

## Unique Characteristics

### Among Basic Pieces

- **Only diagonal mover**: Unique among INFANTRY, ENGINEER, ANTI_AIR, and
  MILITIA
- **Most flexible**: Has the most movement options of the basic pieces
- **Balanced stats**: Same range as other basic pieces but with directional
  advantage

### Tactical Niche

- **Gap filler**: Excellent for filling tactical gaps that require diagonal
  movement
- **Flexible response**: Can respond to threats from any direction
- **Positional piece**: Excels in positions where flexibility is more important
  than raw power
