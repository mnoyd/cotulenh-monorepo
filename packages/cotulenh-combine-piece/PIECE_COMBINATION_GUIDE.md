# CoTuLenh Piece Combination System

## Overview

CoTuLenh features a sophisticated piece combination system where certain pieces can carry other pieces, creating powerful stacks that move as a single unit. This system adds strategic depth by allowing players to combine different unit types for tactical advantages.

## Core Concepts

### Carrier and Carried Pieces

- **Carrier**: The main piece that can transport other pieces
- **Carried**: Pieces that are transported by the carrier
- **Stack**: A combined unit consisting of a carrier and its carried pieces

### Key Rules

1. **Same Color Only**: Only pieces of the same color can be combined
2. **Carrier Hierarchy**: When combining two potential carriers, the system determines which should carry the other
3. **Slot System**: Each carrier has specific slots that can only hold certain types of pieces
4. **Flattening**: When combining stacks, all pieces are flattened and reorganized under the appropriate carrier

## Piece Types and Roles

### Role Categories

#### Humanlike Roles

- **Commander** (`commander`)
- **Infantry** (`infantry`)
- **Militia** (`militia`)

#### Heavy Equipment

- **Artillery** (`artillery`)
- **Anti-Air** (`anti_air`)
- **Missile** (`missile`)

#### Individual Roles

- **Tank** (`tank`)
- **Air Force** (`air_force`)
- **Engineer** (`engineer`)
- **Navy** (`navy`)
- **Headquarter** (`headquarter`)

## Carrier Blueprints

Each carrier type has specific slots that define what pieces it can carry:

### Navy

**Slots**: 2

- **Slot 0**: Air Force only
- **Slot 1**: Humanlike roles (Commander, Infantry, Militia) OR Tank

**Examples**:

- Navy + Air Force ✅
- Navy + Tank ✅
- Navy + Infantry ✅
- Navy + Air Force + Tank ✅
- Navy + Air Force + Infantry ✅
- Navy + Artillery ❌ (Artillery not allowed)

### Tank

**Slots**: 1

- **Slot 0**: Humanlike roles only (Commander, Infantry, Militia)

**Examples**:

- Tank + Infantry ✅
- Tank + Commander ✅
- Tank + Militia ✅
- Tank + Artillery ❌ (Artillery not humanlike)

### Engineer

**Slots**: 1

- **Slot 0**: Heavy Equipment only (Artillery, Anti-Air, Missile)

**Examples**:

- Engineer + Artillery ✅
- Engineer + Anti-Air ✅
- Engineer + Missile ✅
- Engineer + Infantry ❌ (Infantry not heavy equipment)
- Engineer + Artillery + Anti-Air ❌ (Only one slot available)

### Air Force

**Slots**: 2

- **Slot 0**: Tank only
- **Slot 1**: Humanlike roles only (Commander, Infantry, Militia)

**Examples**:

- Air Force + Tank ✅
- Air Force + Infantry ✅
- Air Force + Tank + Infantry ✅
- Air Force + Tank + Commander ✅
- Air Force + Commander + Infantry ❌ (Only one humanlike slot)

### Headquarter

**Slots**: 1

- **Slot 0**: Commander only

**Examples**:

- Headquarter + Commander ✅
- Headquarter + Infantry ❌ (Only Commander allowed)

## Carrier Hierarchy

When combining two pieces that can both be carriers, the system uses a hierarchy to determine which should carry the other:

### Hierarchy Rules

1. **Navy** > Air Force, Tank, Humanlike
2. **Air Force** > Tank, Humanlike
3. **Tank** > Humanlike
4. **Engineer** > Heavy Equipment
5. **Headquarter** > Commander

### Examples

- Navy + Air Force → Navy carries Air Force
- Air Force + Tank → Air Force carries Tank
- Tank + Infantry → Tank carries Infantry
- Engineer + Artillery → Engineer carries Artillery

## Combination Process

### Step-by-Step Process

1. **Color Check**: Verify both pieces have the same color
2. **Flatten Stacks**: Break down any existing stacks into individual pieces
3. **Determine Carrier**: Find the piece that can carry all others
4. **Slot Assignment**: Assign pieces to appropriate carrier slots
5. **Validation**: Ensure all pieces can be accommodated

### Example: Complex Combination

```
Navy (carrying Air Force + Tank) + Engineer (carrying Artillery)
```

**Process**:

1. Flatten: Navy, Air Force, Tank, Engineer, Artillery
2. Determine Carrier: Navy (highest in hierarchy)
3. Check Navy's capacity:
   - Slot 0: Air Force ✅
   - Slot 1: Tank ✅
   - Engineer: ❌ (Navy cannot carry Engineer)
   - Artillery: ❌ (Navy cannot carry Artillery)
4. **Result**: Combination fails ❌

## Strategic Implications

### Advantages of Stacking

- **Movement Efficiency**: Move multiple pieces as one unit
- **Protection**: Carried pieces are protected by the carrier
- **Tactical Flexibility**: Deploy pieces from stacks during combat
- **Space Management**: Reduce board congestion

### Disadvantages

- **Single Target**: Entire stack can be captured as one unit
- **Limited Mobility**: Stack moves at carrier's speed
- **Deployment Complexity**: Must manage piece deployment strategically

## Usage in Code

### Creating a Factory

```typescript
import { CombinePieceFactory } from '@repo/cotulenh-combine-piece';

// For board pieces
const boardFactory = new CombinePieceFactory<BoardPiece>(
  (piece) => piece.role // Extract role from piece
);

// For core pieces
const coreFactory = new CombinePieceFactory<CorePiece>(
  (piece) => piece.type, // Extract type from piece
  (type) => typeToRoleMap[type] // Map type to role name
);
```

### Combining Pieces

```typescript
// Combine two pieces
const result = factory.formStack(piece1, piece2);
if (result) {
  console.log('Successfully combined!');
  console.log('Carrier:', result.id);
  console.log(
    'Carrying:',
    result.carrying?.map((p) => p.id)
  );
} else {
  console.log('Cannot combine these pieces');
}

// Combine multiple pieces
const { combined, uncombined } = factory.createCombineStackFromPieces([
  tank,
  infantry,
  artillery,
  engineer
]);
```

### Checking Combinations

```typescript
// Valid combinations
tank + infantry     → Tank carrying Infantry ✅
navy + airforce     → Navy carrying Air Force ✅
engineer + artillery → Engineer carrying Artillery ✅

// Invalid combinations
tank + artillery    → Cannot combine ❌
engineer + infantry → Cannot combine ❌
navy + engineer     → Cannot combine ❌
```

## Common Patterns

### Effective Combinations

1. **Navy + Air Force + Tank**: Maximum mobility and firepower
2. **Air Force + Tank + Infantry**: Versatile assault unit
3. **Engineer + Artillery**: Mobile heavy weapons platform
4. **Tank + Infantry**: Basic combined arms unit
5. **Headquarter + Commander**: Protected command structure

### Combination Mistakes to Avoid

1. Trying to combine pieces of different colors
2. Exceeding carrier slot capacity
3. Mixing incompatible piece types
4. Not considering carrier hierarchy in complex combinations

## Technical Implementation

The system uses bitwise operations for efficient role checking:

```typescript
// Role flags (powers of 2)
COMMANDER: 1; // 0000001
INFANTRY: 2; // 0000010
MILITIA: 4; // 0000100
ARTILLERY: 8; // 0001000
// ... etc

// Role groups (bitwise OR)
HUMANLIKE_ROLES = COMMANDER | INFANTRY | MILITIA; // 0000111
HEAVY_EQUIPMENT = ARTILLERY | ANTI_AIR | MISSILE; // 0111000
```

This allows for fast role compatibility checking and flexible blueprint definitions.

## Conclusion

The piece combination system in CoTuLenh adds significant strategic depth while maintaining clear, logical rules. Understanding carrier capabilities, slot limitations, and hierarchy rules is essential for effective gameplay and successful tactical combinations.
