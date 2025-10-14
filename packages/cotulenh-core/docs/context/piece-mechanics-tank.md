# TANK Piece Mechanics

## Overview

The TANK is a medium-range combat piece with unique "shoot-over-blocking"
capabilities. It represents armored units that can engage targets at medium
range while having the special ability to shoot over intervening pieces for
captures, though not for movement.

## Basic Properties

- **Symbol**: `t` (lowercase for blue, `T` uppercase for red)
- **Movement Range**: 2 squares orthogonal
- **Capture Range**: 2 squares orthogonal
- **Diagonal Movement**: No (orthogonal only)
- **Special Abilities**: Shoot-over-blocking for captures
- **Terrain Classification**: Light piece (not subject to heavy piece river
  crossing rules)

## Movement Rules

### Normal Movement

- **Range**: Up to 2 squares orthogonally (north, south, east, west)
- **Blocking**: Cannot move through any piece (friendly or enemy)
- **Terrain**: Must stay on land squares (LAND_MASK squares)
- **Path requirement**: All squares in the movement path must be empty

### Movement Restrictions

1. **Two-square maximum**: Cannot move more than 2 squares in any direction
2. **Orthogonal only**: Cannot move diagonally in base form
3. **Blocked by all pieces**: Cannot move through or past any piece
4. **Land pieces only**: Cannot move to water squares

## Capture Rules

### Shoot-Over-Blocking Ability

The TANK's signature ability allows it to capture targets while ignoring
blocking pieces:

- **Capture range**: Up to 2 squares orthogonally
- **Ignores blocking**: Can capture targets even if pieces are between the TANK
  and target
- **Line of sight**: Must have a clear orthogonal line to the target (no
  diagonal shooting)
- **Movement vs capture**: This ability only applies to captures, not movement

### Capture Mechanics

- **Direct capture**: TANK moves to the target square, replacing the captured
  piece
- **No stay capture**: TANK must move to capture (cannot capture without moving)
- **Standard capture only**: No special capture types like suicide or stay
  capture

### Examples

```
T . E . X    (T = TANK, E = Enemy piece, X = Target, . = Empty)
```

- TANK can capture X even though E is blocking the path
- TANK cannot move to X because E blocks movement
- TANK can capture E normally (adjacent, no blocking issue)

## Heroic Status Effects

### Heroic Promotion

- **Trigger**: Any piece that attacks (threatens) the enemy commander becomes
  heroic
- **Automatic**: This promotion happens immediately when the attack is
  established
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends

### Heroic Abilities

When a TANK becomes heroic:

- **Movement Range**: Increases to 3 squares orthogonal
- **Capture Range**: Increases to 3 squares orthogonal
- **Diagonal Movement**: Gains ability to move and capture diagonally
- **Diagonal Range**: 3 squares diagonally for both movement and capture
- **Retains shoot-over-blocking**: Special capture ability works in all
  directions

### Heroic Movement Pattern

Heroic TANK can move and capture:

- Up to 3 squares orthogonally (N, S, E, W)
- Up to 3 squares diagonally (NE, NW, SE, SW)
- Can shoot over blocking pieces for captures in all 8 directions

## Terrain Interactions

### Land Restriction

- **Water squares**: Cannot move to or stay on water squares (NAVY_MASK = 0)
- **Mixed zones**: Can move on mixed terrain squares where both land and water
  pieces can exist
- **Bridge squares**: Can cross bridge squares that connect land areas

### Light Piece Classification

- **Not heavy piece**: TANK is not in the HEAVY_PIECES set
- **No river restrictions**: Not subject to river crossing limitations that
  apply to ARTILLERY, ANTI_AIR, and MISSILE
- **Full terrain mobility**: Can move freely between terrain zones (within land
  areas)

## Stacking and Deployment

### Carrying Capacity

- **Can be carried**: TANK can be carried by other pieces in stacks
- **Can carry others**: TANK can carry other compatible pieces
- **Standard stacking rules**: Follow normal piece combination rules

### Deployment from Stacks

- **Individual deployment**: Can be deployed individually from stacks
- **Retain abilities**: Heroic status and shoot-over-blocking ability are
  maintained during deployment
- **Standard deployment rules**: Follow normal deployment mechanics

## Code Implementation Details

### Movement Configuration

```typescript
[TANK]: {
  moveRange: 2,
  captureRange: 2,
  canMoveDiagonal: false,
  captureIgnoresPieceBlocking: false,  // Note: Special rule overrides this
  moveIgnoresBlocking: false,
  specialRules: { tankShootOverBlocking: true },
}
```

### Special Rule Implementation

The `tankShootOverBlocking` special rule is handled in the capture logic:

- Normal movement respects blocking (moveIgnoresBlocking: false)
- Capture logic checks for the special rule and allows shooting over pieces
- Only applies to captures, not movement

### Heroic Modifications

When heroic, the configuration becomes:

- `moveRange`: 3 (increased from 2)
- `captureRange`: 3 (increased from 2)
- `canMoveDiagonal`: true (changed from false)
- Special rule remains active in all directions

## Strategic Considerations

### Positioning

- **Medium range control**: Use 2-square range to control key squares
- **Shoot-over tactics**: Position to shoot over friendly pieces at enemy
  targets
- **Heroic potential**: Position to attack enemy commander for heroic
  enhancement

### Tactical Uses

- **Breakthrough attacks**: Use shoot-over-blocking to attack protected targets
- **Support fire**: Provide ranged support while friendly pieces advance
- **Flexible positioning**: Use 2-square movement for rapid repositioning

### Common Strategies

- **Overwatch positions**: Place where TANK can cover multiple approach routes
- **Combined arms**: Coordinate with infantry to create shooting lanes
- **Heroic transformation**: Sacrifice positioning to attack commanders for
  heroic status

## Interactions with Other Pieces

### With Infantry/Light Pieces

- **Shooting over**: Can capture targets behind friendly light pieces
- **Coordination**: Light pieces can screen TANK while it provides fire support
- **Stacking synergy**: Can form effective combined stacks

### With Heavy Pieces

- **Similar range**: Comparable to some heavy pieces but with different
  abilities
- **Terrain advantage**: Can move where heavy pieces cannot (no river
  restrictions)
- **Complementary roles**: TANK provides mobile fire support, heavy pieces
  provide specialized abilities

### With Commanders

- **Heroic promotion**: Attacking enemy commanders promotes TANK to heroic
  status
- **Protection duty**: Can provide medium-range protection for friendly
  commander
- **Threat projection**: Heroic TANK becomes a significant threat to enemy
  commander

## Common Mistakes

### Tactical Errors

- **Confusing movement and capture**: Thinking TANK can move through pieces like
  it can shoot
- **Underestimating range**: Not utilizing the full 2-square range effectively
- **Poor positioning**: Placing TANK where it cannot use its shoot-over-blocking
  ability

### Strategic Oversights

- **Ignoring heroic potential**: Not positioning TANK to attack enemy commanders
- **Static deployment**: Not utilizing TANK's mobility for dynamic positioning
- **Terrain neglect**: Not taking advantage of TANK's freedom from heavy piece
  restrictions

## Advanced Tactics

### Shoot-Over-Blocking Mastery

- **Friendly screens**: Use friendly pieces as mobile cover while maintaining
  fire capability
- **Layered defense**: Position behind defensive lines while maintaining
  offensive capability
- **Breakthrough support**: Support advancing pieces by shooting over them at
  defenders

### Heroic TANK Utilization

- **Diagonal shooting**: Use newly gained diagonal capability for unexpected
  angles
- **Extended range**: Utilize 3-square range for deep strikes
- **Multi-directional threat**: Threaten multiple areas simultaneously with
  enhanced range and directions

### Endgame Considerations

- **Active piece**: TANK becomes increasingly valuable in simplified positions
- **King hunting**: Heroic TANK is excellent for pursuing enemy commanders
- **Tactical complexity**: Creates complex tactical situations with its unique
  abilities
