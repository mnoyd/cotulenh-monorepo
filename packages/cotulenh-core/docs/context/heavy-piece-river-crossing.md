# Heavy Piece River Crossing Rules

## Overview

Heavy pieces in CoTuLenh are subject to special movement restrictions when
crossing between different zones of the board. This system creates strategic
depth by limiting the mobility of powerful pieces while still allowing them to
capture across zone boundaries.

## Heavy Piece Definition

### Heavy Piece Set

```typescript
export const HEAVY_PIECES = new Set([ARTILLERY, ANTI_AIR, MISSILE])
```

### Characteristics

- **ARTILLERY**: 3-range piece with capture-ignores-blocking
- **ANTI_AIR**: 1-range piece with air defense capability
- **MISSILE**: 2-range piece with unique movement pattern and air defense

### Non-Heavy Pieces

All other pieces (COMMANDER, INFANTRY, TANK, MILITIA, ENGINEER, AIR_FORCE, NAVY,
HEADQUARTER) are **not** subject to river crossing restrictions.

## Zone System

### Zone Definition Function

```typescript
function isHeavyZone(sq: number): 0 | 1 | 2 {
  const f = file(sq) // File index (0-10)
  const r = rank(sq) // Rank index (0-11)

  if (f < 2) return 0 // Not in heavy zone (pure water)

  return r <= 5 ? 1 : 2 // 1 = upper half, 2 = lower half
}
```

### Zone Boundaries

- **Zone 0**: Files a-b (0-1) - Pure water, no heavy piece restrictions
- **Zone 1**: Files c-k (2-10), ranks 7-12 (6-11) - Upper half
- **Zone 2**: Files c-k (2-10), ranks 1-6 (0-5) - Lower half

### Visual Zone Map

```
    a  b  c  d  e  f  g  h  i  j  k
12 [0][0][1][1][1][1][1][1][1][1][1]  ← Zone 1 (Upper)
11 [0][0][1][1][1][1][1][1][1][1][1]
10 [0][0][1][1][1][1][1][1][1][1][1]
 9 [0][0][1][1][1][1][1][1][1][1][1]
 8 [0][0][1][1][1][1][1][1][1][1][1]
 7 [0][0][1][1][1][1][1][1][1][1][1]
    ═══════════════════════════════════ River Boundary
 6 [0][0][2][2][2][2][2][2][2][2][2]  ← Zone 2 (Lower)
 5 [0][0][2][2][2][2][2][2][2][2][2]
 4 [0][0][2][2][2][2][2][2][2][2][2]
 3 [0][0][2][2][2][2][2][2][2][2][2]
 2 [0][0][2][2][2][2][2][2][2][2][2]
 1 [0][0][2][2][2][2][2][2][2][2][2]

Zone 0: No restrictions (water)
Zone 1: Upper half (ranks 7-12)
Zone 2: Lower half (ranks 1-6)
```

## River Crossing Restrictions

### Core Restriction Logic

```typescript
function checkTerrainBlocking(
  from: number,
  to: number,
  pieceDataType: PieceSymbol,
  isHorizontalOffset: boolean,
): boolean {
  // Heavy piece river crossing rule
  if (HEAVY_PIECES.has(pieceDataType)) {
    const zoneFrom = isHeavyZone(from)
    const zoneTo = isHeavyZone(to)

    if (zoneFrom !== 0 && zoneTo !== 0 && zoneFrom !== zoneTo) {
      // Special bridge crossing exception
      if (isHorizontalOffset && (file(from) === 5 || file(to) === 7)) {
        return false // Allow crossing
      }
      return true // Block crossing
    }
  }

  return false
}
```

### Movement Rules

1. **Same Zone Movement**: Always allowed within the same zone
2. **Zone 0 Movement**: No restrictions in pure water zones
3. **Cross-Zone Movement**: Blocked between Zone 1 ↔ Zone 2
4. **Bridge Exception**: Horizontal movement allowed at specific files

## Bridge Crossing System

### Horizontal Movement Definition

```typescript
function isHorizontalOffset(offset: number): boolean {
  return offset === 16 || offset === -16 // North/South movement
}
```

### Bridge Files

- **File f (5)**: Bridge crossing point from upper zone
- **File h (7)**: Bridge crossing point to lower zone

### Bridge Crossing Rules

Heavy pieces can cross between zones when:

1. **Movement is horizontal** (North-South direction)
2. **Origin file is f (5)** OR **destination file is h (7)**

### Bridge Squares

The bridge squares f6, f7, h6, h7 serve as designated crossing points, though
the rule applies to entire files f and h for horizontal movement.

## Capture vs Movement Distinction

### Movement Restrictions

- Heavy pieces **cannot move** between Zone 1 and Zone 2
- Exception: Bridge crossing via files f and h
- Applies only to movement, not captures

### Capture Permissions

- Heavy pieces **can capture** across zone boundaries
- No bridge requirement for captures
- Capture range and other rules still apply

### Test Case Examples

```typescript
// Movement blocked across river
game.put({ type: ARTILLERY, color: RED }, 'd5') // Zone 2
// Artillery cannot move to d8 (Zone 1) - blocked

// Capture allowed across river
game.put({ type: ARTILLERY, color: RED }, 'd5') // Zone 2
game.put({ type: INFANTRY, color: BLUE }, 'd8') // Zone 1
// Artillery CAN capture infantry at d8 - allowed
```

## Strategic Implications

### Tactical Considerations

- **Positioning**: Heavy pieces must consider zone placement
- **Bridge Control**: Files f and h become strategically important
- **Timing**: Zone transitions require careful planning

### Mobility Limitations

- **Reduced Flexibility**: Heavy pieces have restricted repositioning
- **Predictable Movement**: Opponents can anticipate crossing points
- **Strategic Trade-offs**: Power vs mobility balance

### Bridge Warfare

- **Chokepoints**: Limited crossing options create tactical bottlenecks
- **Control Battles**: Competing for bridge access
- **Defensive Advantages**: Easier to defend limited crossing points

## Implementation Details

### Zone Calculation

- **File Check**: `f < 2` determines if in Zone 0
- **Rank Check**: `r <= 5` determines Zone 1 vs Zone 2
- **Efficient**: O(1) calculation using bitwise operations

### Movement Validation

- **Pre-check**: Zone validation before move generation
- **Early Exit**: Blocked moves filtered out immediately
- **Performance**: Minimal overhead for non-heavy pieces

### Bridge Detection

- **File Comparison**: Direct file index comparison
- **Direction Check**: Horizontal offset validation
- **Exception Handling**: Override blocking for valid bridge crossings

## Edge Cases and Clarifications

### Water Zone Interaction

- Heavy pieces in Zone 0 (water) have no crossing restrictions
- Primarily affects ARTILLERY capturing from mixed zones
- ANTI_AIR and MISSILE typically cannot reach water zones

### Heroic Enhancement

- Heroic status does not override river crossing restrictions
- Enhanced range may allow captures across zones
- Movement restrictions still apply regardless of heroic status

### Stack Deployment

- Deployed heavy pieces inherit crossing restrictions
- Carrier piece location determines deployment zone
- Bridge rules apply to deployed piece movement

### Air Force Exception

- AIR_FORCE is not a heavy piece
- Can fly over river without restrictions
- No zone-based movement limitations
