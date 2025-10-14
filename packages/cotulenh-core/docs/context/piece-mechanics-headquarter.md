# HEADQUARTER Piece Mechanics

## Overview

The HEADQUARTER is a unique piece that represents command and control centers.
In its base form, it is completely immobile and cannot move or capture. However,
when it becomes heroic (by attacking the enemy commander), it undergoes a
dramatic transformation, becoming mobile and gaining the same movement
capabilities as a MILITIA piece.

## Basic Properties

- **Symbol**: `h` (lowercase for blue, `H` uppercase for red)
- **Base Movement Range**: 0 (immobile)
- **Base Capture Range**: 0 (cannot capture)
- **Base Diagonal Movement**: No
- **Special Abilities**: Heroic transformation
- **Terrain Classification**: Land piece

## Base Form Mechanics

### Complete Immobility

- **Movement Range**: 0 squares (cannot move at all)
- **Capture Range**: 0 squares (cannot capture at all)
- **No actions**: Cannot perform any moves or captures
- **Static piece**: Functions purely as a positional element

### Base Form Characteristics

- **Defensive only**: Can only be captured, cannot take offensive action
- **Positional value**: Provides tactical positioning but no active capability
- **Heroic potential**: Can become heroic when it's the last remaining piece
  (excluding commanders)
- **Stacking capability**: Can be part of stacks and be carried by other pieces

## Heroic Transformation

### Heroic Promotion Trigger

- **Last piece rule**: HEADQUARTER becomes heroic when it's the last remaining
  piece on the board (excluding commanders)
- **Automatic transformation**: Promotion happens immediately when this
  condition is met
- **Persistent status**: Heroic status remains until the piece is captured or
  the game ends

### Heroic Abilities

When a HEADQUARTER becomes heroic, it undergoes complete transformation:

- **Movement Range**: Becomes 1 square in all directions
- **Capture Range**: Becomes 1 square in all directions
- **Diagonal Movement**: Gains full diagonal movement capability
- **Complete activation**: Transforms from immobile to fully mobile

### Heroic Movement Pattern

Heroic HEADQUARTER moves exactly like a MILITIA:

```
X X X
X H X    (H = Heroic HEADQUARTER, X = possible destinations)
X X X
```

## Code Implementation

### Base Configuration

```typescript
[HEADQUARTER]: {
  moveRange: 0,
  captureRange: 0,
  canMoveDiagonal: false,
  captureIgnoresPieceBlocking: false,
  moveIgnoresBlocking: false,
}
```

### Heroic Transformation Logic

```typescript
// Special case for Headquarter
if (pieceType === HEADQUARTER) {
  baseConfig.moveRange = 1
  baseConfig.captureRange = 1
}
```

The heroic HEADQUARTER gets special handling that overrides the normal heroic
modification rules, setting it to exactly 1 square range in all directions with
diagonal capability.

## Strategic Considerations

### Base Form Strategy

- **Defensive positioning**: Place where it provides tactical value without
  being vulnerable
- **Stack integration**: Use as part of stacks where other pieces can protect it
- **Heroic preparation**: Position to benefit from potential heroic
  transformation

### Heroic Form Strategy

- **Sudden mobility**: Use the surprise factor of sudden mobility
- **MILITIA-like tactics**: Apply all MILITIA tactical principles
- **Flexible positioning**: Utilize newfound omnidirectional movement

## Terrain Interactions

### Land Restriction

- **Water squares**: Cannot move to or stay on water squares (NAVY_MASK = 0)
- **Mixed zones**: Can move on mixed terrain squares when heroic
- **Bridge squares**: Can use bridge squares when heroic

### Terrain Considerations

- **Base form**: Terrain is irrelevant since piece cannot move
- **Heroic form**: Subject to normal land piece terrain restrictions

## Stacking and Deployment

### Carrying Capacity

- **Can be carried**: HEADQUARTER can be carried by other pieces in stacks
- **Can carry others**: HEADQUARTER can carry other compatible pieces
- **Immobile carrier**: In base form, cannot move stacks but can be part of them

### Deployment Considerations

- **Base form deployment**: Cannot deploy itself, but can be deployed by others
- **Heroic deployment**: Gains normal deployment capabilities when heroic
- **Stack dynamics**: Transformation can dramatically change stack capabilities

## Comparison with MILITIA

### Heroic HEADQUARTER vs MILITIA

When heroic, HEADQUARTER becomes functionally identical to MILITIA:

- **Same movement**: 1 square in all 8 directions
- **Same capture**: 1 square in all 8 directions
- **Same capabilities**: Identical tactical options

### Key Differences

- **Starting state**: MILITIA starts mobile, HEADQUARTER starts immobile
- **Heroic requirement**: HEADQUARTER requires heroic status to function
- **Surprise factor**: HEADQUARTER transformation can be unexpected

## Tactical Applications

### Base Form Tactics

- **Positional piece**: Use for controlling key squares without active threat
- **Stack component**: Include in stacks for future potential
- **Defensive anchor**: Use as immobile defensive element

### Heroic Form Tactics

- **Sudden activation**: Exploit the surprise of sudden mobility
- **Flexible response**: Use omnidirectional movement for tactical flexibility
- **MILITIA substitute**: Functions as an additional MILITIA piece

## Common Mistakes

### Base Form Errors

- **Overexposure**: Placing HEADQUARTER where it can be easily captured
- **Neglecting potential**: Not considering heroic transformation possibilities
- **Poor positioning**: Placing where heroic transformation won't be useful

### Heroic Form Errors

- **Underutilizing mobility**: Not taking advantage of sudden movement
  capability
- **Poor timing**: Not coordinating heroic transformation with overall strategy
- **Tactical confusion**: Not adapting to the piece's new capabilities

## Advanced Tactics

### Transformation Timing

- **Last piece scenario**: HEADQUARTER becomes heroic when it's the sole
  remaining piece (excluding commanders)
- **Strategic surprise**: Use transformation as part of larger tactical plans
- **Position preparation**: Pre-position HEADQUARTER for maximum heroic impact
  when other pieces are eliminated

### Heroic Utilization

- **Omnidirectional pressure**: Use 8-direction movement for maximum flexibility
- **Tactical flexibility**: Adapt quickly to changing battlefield conditions
- **Surprise factor**: Exploit opponent's potential oversight of heroic
  HEADQUARTER

## Interactions with Other Pieces

### With Commanders

- **Heroic trigger**: Becomes heroic when it's the last remaining piece
  (excluding commanders)
- **Protection duty**: Can protect friendly commander when heroic
- **Tactical coordination**: Coordinate with commander for optimal positioning

### With Other Pieces

- **Stack synergy**: Can enhance stacks when heroic
- **Support role**: Provides flexible support when activated
- **Defensive coordination**: Can participate in defensive formations when
  heroic

## Endgame Considerations

### Base Form Endgames

- **Limited value**: Immobile pieces have reduced value in simplified positions
- **Positional anchor**: Can still provide positional value
- **Heroic potential**: May become valuable if heroic transformation occurs

### Heroic Form Endgames

- **Increased activity**: Mobile HEADQUARTER becomes much more valuable
- **Flexible support**: Can provide crucial support in simplified positions
- **Tactical options**: Adds tactical complexity to endgame positions

## Unique Characteristics

### Among All Pieces

- **Only transforming piece**: Only piece that changes capabilities so
  dramatically
- **Conditional mobility**: Only piece whose mobility depends on heroic status
- **Binary nature**: Either completely immobile or fully mobile
- **Surprise element**: Transformation can catch opponents off-guard

### Tactical Niche

- **Conditional asset**: Value depends entirely on game circumstances
- **Strategic wildcard**: Can dramatically change tactical balance when
  activated
- **Positional piece**: Provides unique positional considerations

## Design Philosophy

### Thematic Representation

- **Command center**: Represents static command and control facilities
- **Emergency activation**: Heroic transformation represents emergency
  mobilization when all other forces are eliminated
- **Last stand**: Becomes active as the final remaining military asset

### Game Balance

- **Risk-reward**: Immobile piece with potential for significant activation
- **Conditional power**: Powerful when activated but useless when not
- **Strategic depth**: Adds layer of strategic planning and timing
  considerations

## Summary

The HEADQUARTER piece represents one of the most unique mechanics in CoTuLenh,
transforming from a completely immobile piece into a fully capable
MILITIA-equivalent when heroic. This transformation creates interesting
strategic considerations around positioning and endgame scenarios where it
becomes the last remaining piece. Players must balance the risk of having an
immobile piece with the potential reward of sudden tactical activation in
desperate situations, making HEADQUARTER a fascinating element of strategic
planning and last-stand scenarios.
