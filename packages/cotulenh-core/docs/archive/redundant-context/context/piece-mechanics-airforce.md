# AIR_FORCE Piece Mechanics

## Overview

The AIR_FORCE is the most mobile and versatile piece in CoTuLenh, representing
aerial units with unmatched range and movement capabilities. It can ignore
blocking pieces for both movement and capture, has multiple capture options
including suicide attacks, and can operate over both land and water. However, it
faces unique restrictions from enemy air defense zones.

## Basic Properties

- **Symbol**: `f` (lowercase for blue, `F` uppercase for red)
- **Movement Range**: 4 squares in all directions
- **Capture Range**: 4 squares in all directions
- **Diagonal Movement**: Yes (full diagonal capability)
- **Special Abilities**: Move-ignores-blocking, Capture-ignores-blocking, Stay
  capture, Suicide capture
- **Terrain Classification**: Air unit (can fly over water and land)

## Movement Rules

### Unrestricted Movement

- **Range**: Up to 4 squares in any of the 8 directions
- **Directions**: North, South, East, West, Northeast, Northwest, Southeast,
  Southwest
- **Ignores blocking**: Can move through any piece (friendly or enemy)
- **Terrain freedom**: Can move over both land and water squares

### Movement Capabilities

1. **Longest range**: 4 squares in all directions (tied with NAVY)
2. **Ignores all blocking**: Can fly over any pieces in its path
3. **Terrain independent**: Can move over water, land, and mixed terrain
4. **Air defense restrictions**: Movement limited by enemy air defense zones

### Air Defense Zone Interactions

AIR_FORCE movement is restricted by enemy air defense zones created by ANTI_AIR,
MISSILE, and NAVY pieces:

#### Zone Effects

- **Safe passage**: Can move freely through undefended areas
- **Kamikaze zone**: Can enter defended zones but will be destroyed (suicide
  move)
- **Destroyed**: Cannot enter zones with multiple or overlapping air defenses

#### Zone Calculation

- **Single zone entry**: Results in kamikaze (suicide) capability
- **Multiple zones**: Movement blocked, cannot enter
- **Zone exit and re-entry**: Moving out of one zone and into another results in
  destruction

## Capture Rules

### Multiple Capture Types

AIR_FORCE has the most diverse capture options of any piece:

#### Normal Capture

- **Range**: Up to 4 squares in all directions
- **Ignores blocking**: Can capture targets behind other pieces
- **Move to target**: AIR_FORCE moves to the target square, replacing the
  captured piece
- **Standard mechanics**: Works like other pieces' normal captures

#### Stay Capture

- **Unique ability**: AIR_FORCE can capture without moving from its current
  square
- **Same range**: Up to 4 squares in all directions
- **Terrain dependent**: Only available when AIR_FORCE can land on target square
- **Tactical advantage**: Allows capturing while maintaining position

#### Suicide Capture (Kamikaze)

- **Air defense triggered**: Occurs when AIR_FORCE enters enemy air defense
  zones
- **Both pieces destroyed**: Both the AIR_FORCE and target piece are eliminated
- **Forced option**: Sometimes the only way to attack in defended areas
- **Strategic sacrifice**: Can be used to eliminate key enemy pieces

### Capture Logic Implementation

```typescript
// Air Force gets both normal and stay capture options when it can land
if (canLand && pieceData.type === AIR_FORCE) {
  if (!isDeployMove) {
    addStayCapture = true
  }
  addNormalCapture = true
}
```

## Air Defense System Interactions

### Enemy Air Defense Zones

AIR_FORCE faces unique movement restrictions from enemy air defense pieces:

#### Air Defense Pieces

- **ANTI_AIR**: Creates level 1 air defense (level 2 when heroic)
- **MISSILE**: Creates level 2 air defense (level 3 when heroic)
- **NAVY**: Creates level 1 air defense (level 2 when heroic)

#### Zone Effects on Movement

1. **Safe areas**: No air defense, normal movement
2. **Single zone**: Can enter but triggers kamikaze mechanics
3. **Multiple zones**: Cannot enter, movement blocked
4. **Zone transitions**: Moving between different zones can trigger destruction

### Strategic Implications

- **Route planning**: Must plan movement to avoid or minimize air defense
  exposure
- **Kamikaze tactics**: Can sacrifice AIR_FORCE for high-value targets in
  defended areas
- **Zone awareness**: Must constantly monitor enemy air defense piece positions

## Terrain Interactions

### Universal Terrain Access

- **Water squares**: Can move over and land on water squares
- **Land squares**: Can move over and land on land squares
- **Mixed zones**: Can operate in any terrain type
- **No restrictions**: Unlike other pieces, has no terrain-based movement
  limitations

### Terrain-Based Capture Options

- **Land targets**: Can use both normal capture and stay capture
- **Water targets**: Can use both normal capture and stay capture
- **Terrain flexibility**: Can engage targets regardless of terrain type

## Heroic Status Effects

### Heroic Promotion

- **Trigger**: Any piece that attacks (threatens) the enemy commander becomes
  heroic
- **Automatic**: This promotion happens immediately when the attack is
  established
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends

### Heroic Abilities

When an AIR_FORCE becomes heroic:

- **Movement Range**: Increases to 5 squares in all directions
- **Capture Range**: Increases to 5 squares in all directions
- **Retains all abilities**: All special capture types and movement abilities
  remain
- **Enhanced dominance**: Becomes even more powerful with extended range

### Heroic Movement Pattern

Heroic AIR_FORCE can move and capture within a 5-square radius in all
directions, making it the most dominant piece on the board.

## Stacking and Deployment

### Carrying Capacity

- **Can be carried**: AIR_FORCE can be carried by other pieces in stacks
- **Can carry others**: AIR_FORCE can carry other compatible pieces
- **Terrain flexibility**: Can carry pieces to areas they couldn't normally
  reach

### Deployment from Stacks

- **Individual deployment**: Can be deployed individually from stacks
- **Retain abilities**: All special abilities are maintained during deployment
- **Terrain deployment**: Can deploy to both land and water squares
- **Air defense consideration**: Deployment subject to air defense zone
  restrictions

### Special Deployment Considerations

- **Carrier synergy**: Often carried by NAVY pieces for combined operations
- **Flexible deployment**: Can deploy to optimal positions regardless of terrain
- **Air defense awareness**: Must consider air defense zones when deploying

## Code Implementation Details

### Movement Configuration

```typescript
[AIR_FORCE]: {
  moveRange: 4,
  captureRange: 4,
  canMoveDiagonal: true,
  captureIgnoresPieceBlocking: true,
  moveIgnoresBlocking: true,    // Unique: ignores blocking for movement too
}
```

### Special Capture Logic

```typescript
// Air Force gets both options when it can land on the target square
if (canLand && pieceData.type === AIR_FORCE) {
  if (!isDeployMove) {
    addStayCapture = true
  }
  addNormalCapture = true
}
```

### Air Defense Integration

AIR_FORCE movement generation includes special air defense checking that can
result in:

- Normal movement (safe areas)
- Kamikaze movement (single air defense zone)
- Blocked movement (multiple air defense zones)

### Heroic Modifications

When heroic, the configuration becomes:

- `moveRange`: 5 (increased from 4)
- `captureRange`: 5 (increased from 4)
- All special abilities remain active

## Strategic Considerations

### Positioning Advantages

- **Maximum mobility**: Can reach any square on the board quickly
- **Terrain independence**: Not limited by water/land restrictions
- **Multiple attack options**: Can choose optimal capture type for each
  situation

### Tactical Uses

- **Deep strikes**: Can attack targets deep in enemy territory
- **Flexible positioning**: Can reposition quickly to respond to threats
- **Stay capture control**: Can eliminate threats without exposing itself

### Common Strategies

- **Air superiority**: Use mobility to dominate airspace
- **Kamikaze strikes**: Sacrifice AIR_FORCE to eliminate key enemy pieces
- **Flexible support**: Provide support where needed most

## Interactions with Other Pieces

### With Air Defense Pieces

- **Primary target**: Air defense pieces specifically counter AIR_FORCE
- **Tactical challenge**: Must navigate around or through air defense zones
- **Kamikaze option**: Can sacrifice itself to eliminate air defense pieces

### With NAVY

- **Carrier operations**: Often carried by NAVY for combined operations
- **Terrain synergy**: Both pieces can operate over water
- **Mutual support**: Can support each other in water-based operations

### With Land Pieces

- **Air support**: Can provide air support to land-based operations
- **Flexible rescue**: Can extract or support land pieces in difficult positions
- **Combined operations**: Can coordinate with land pieces for complex attacks

## Common Mistakes

### Tactical Errors

- **Ignoring air defense**: Flying into air defense zones without considering
  consequences
- **Poor capture choice**: Not choosing optimal capture type for the situation
- **Overextension**: Using maximum range without considering retreat options

### Strategic Oversights

- **Air defense neglect**: Not tracking enemy air defense piece positions
- **Kamikaze waste**: Using suicide attacks when other options are available
- **Terrain assumptions**: Assuming AIR_FORCE can always land where it can move

## Advanced Tactics

### Air Defense Navigation

- **Zone mapping**: Constantly track enemy air defense zones
- **Safe corridors**: Identify and use safe movement corridors
- **Kamikaze timing**: Use suicide attacks at optimal moments for maximum impact

### Multi-Capture Mastery

- **Stay capture advantage**: Use stay capture to maintain position while
  eliminating threats
- **Normal capture positioning**: Use normal capture for optimal repositioning
- **Suicide capture sacrifice**: Use kamikaze attacks to eliminate key enemy
  pieces

### Heroic AIR_FORCE Utilization

- **Extended dominance**: Use 5-square range to dominate even larger areas
- **Multi-directional pressure**: Create pressure from multiple angles
  simultaneously
- **Endgame power**: Heroic AIR_FORCE becomes nearly unstoppable in endgames

## Comparison with Other Long-Range Pieces

### vs NAVY

- **Range**: Both have 4-square base range (5 when heroic)
- **Terrain**: AIR_FORCE universal, NAVY water-only
- **Blocking**: Both ignore blocking for captures, AIR_FORCE also for movement
- **Restrictions**: AIR_FORCE has air defense, NAVY has terrain restrictions

### vs ARTILLERY

- **Range**: AIR_FORCE 4 squares, ARTILLERY 3 squares
- **Blocking**: Both ignore blocking for captures, AIR_FORCE also for movement
- **Capture types**: AIR_FORCE has stay/suicide capture, ARTILLERY has stay
  capture
- **Restrictions**: AIR_FORCE has air defense, ARTILLERY has river crossing

### vs MISSILE

- **Range**: AIR_FORCE 4 squares, MISSILE 2/1 squares
- **Pattern**: AIR_FORCE symmetric, MISSILE asymmetric
- **Counter-relationship**: MISSILE creates air defense that restricts AIR_FORCE
- **Mobility**: AIR_FORCE much more mobile

## Endgame Considerations

### Simplified Positions

- **Increased dominance**: Fewer pieces mean less air defense coverage
- **Maximum mobility**: Can control large areas with minimal opposition
- **Multiple capture options**: Can choose optimal attack method for each
  situation

### AIR_FORCE and Commander Endgames

- **Powerful combination**: AIR_FORCE and commander can create complex mating
  nets
- **Stay capture advantage**: Can attack enemy commander without counter-attack
  risk
- **Heroic potential**: Attacking enemy commander makes AIR_FORCE even more
  powerful

### Air Defense Endgames

- **Reduced restrictions**: Fewer air defense pieces mean more freedom of
  movement
- **Kamikaze value**: Suicide attacks become more valuable against remaining air
  defense
- **Terrain control**: Can control both land and water areas simultaneously

## Unique Characteristics

### Among All Pieces

- **Most mobile**: Highest mobility with 4-square range and ignores-blocking
- **Most capture options**: Only piece with normal, stay, and suicide capture
  types
- **Most versatile**: Can operate effectively in any terrain or situation
- **Most restricted**: Only piece subject to air defense zone restrictions

### Tactical Niche

- **Air superiority**: Dominates aerial combat and mobility
- **Flexible striker**: Can attack from unexpected angles and positions
- **Strategic piece**: Often determines the flow of the entire game
