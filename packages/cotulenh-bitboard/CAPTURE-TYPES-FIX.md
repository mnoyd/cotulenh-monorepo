# CoTuLenh Capture Types - Current Implementation Status

## Current State Analysis

The cotulenh-bitboard implementation currently has **basic move generation** but is **missing critical CoTuLenh-specific move mechanics**.

## What's Currently Implemented ✅

### 1. Basic Move Flags

```typescript
export const MOVE_FLAGS = {
  NORMAL: 0,
  CAPTURE: 1,
  COMBINATION: 2,
  DEPLOY: 4,
  KAMIKAZE: 8
} as const;
```

### 2. Standard Move Generation

- ✅ All 11 piece types have basic generators
- ✅ Terrain awareness (water/land restrictions)
- ✅ Heroic enhancement logic
- ✅ Basic capture and combination moves
- ✅ Capture-ignores-blocking for Artillery/Missile/Air Force/Navy

### 3. Terrain System

- ✅ Water/land masks working correctly
- ✅ Navy restricted to water squares
- ✅ Land pieces restricted to land squares
- ✅ Air Force universal terrain access

## What's Missing ❌ (Critical Gaps)

### 1. **Multiple Capture Types**

**CoTuLenh has 3 capture types, but only 1 is implemented:**

| Capture Type    | Symbol | Current Status     | Description            |
| --------------- | ------ | ------------------ | ---------------------- |
| Normal Capture  | `x`    | ✅ **Implemented** | Move to target square  |
| Stay Capture    | `_`    | ❌ **Missing**     | Capture without moving |
| Suicide Capture | `@`    | ❌ **Missing**     | Both pieces destroyed  |

**Impact:** Navy can't properly attack land pieces, Air Force can't handle air defense zones

### 2. **Air Force Special Mechanics**

**Missing:**

- ❌ Air defense zone interactions
- ❌ Kamikaze mechanics in single defense zones
- ❌ Suicide capture in multiple defense zones
- ❌ Stay-capture when terrain prevents landing

**Current Implementation:** Treats Air Force like any other piece

### 3. **Navy Dual Attack System**

**Missing:**

- ❌ Torpedo Attack (4 squares vs Navy pieces)
- ❌ Naval Gun Attack (3 squares vs land pieces)
- ❌ Stay-capture when attacking land pieces

**Current Implementation:** Same attack range for all targets

### 4. **Artillery Stay-Capture**

**Missing:**

- ❌ Stay-capture when terrain prevents normal capture
- ❌ Proper handling of capture-ignores-blocking + terrain restrictions

## Code Examples of Missing Features

### Missing Stay-Capture Logic

```typescript
// ❌ CURRENT: Only normal capture
if (targetPiece.color === them && currentRange <= config.captureRange) {
  if (!canPieceStayOnSquare(piece.type, to)) {
    break; // ❌ Just breaks, should generate stay-capture
  }
  moves.push({
    from,
    to,
    piece,
    captured: targetPiece,
    flags: MOVE_FLAGS.CAPTURE // ❌ Only normal capture
  });
}

// ✅ NEEDED: Multiple capture types
if (targetPiece.color === them && currentRange <= config.captureRange) {
  if (canPieceStayOnSquare(piece.type, to)) {
    // Normal capture
    moves.push({
      from,
      to,
      piece,
      captured: targetPiece,
      flags: MOVE_FLAGS.CAPTURE
    });
  } else if (piece.type === 'n' || piece.type === 'a') {
    // Stay capture for Navy/Artillery
    moves.push({
      from,
      to: from,
      piece,
      captured: targetPiece,
      flags: MOVE_FLAGS.STAY_CAPTURE
    });
  }
}
```

### Missing Navy Dual Attack

```typescript
// ❌ CURRENT: Same range for all targets
const config = getPieceMovementConfig('n', piece.heroic || false);
for (const offset of ALL_OFFSETS) {
  generateMovesInDirection(position, square, piece, config, offset, moves);
}

// ✅ NEEDED: Dual attack system
const torpedoRange = piece.heroic ? 5 : 4; // vs Navy
const navalGunRange = piece.heroic ? 4 : 3; // vs land pieces

if (targetPiece.type === 'n' && currentRange <= torpedoRange) {
  // Torpedo attack
} else if (targetPiece.type !== 'n' && currentRange <= navalGunRange) {
  // Naval gun attack (with stay-capture if on land)
}
```

### Missing Air Force Air Defense

```typescript
// ❌ CURRENT: No air defense logic
export function generateAirForceMoves(position: BitboardPosition, color: Color): Move[] {
  // Just treats like normal piece
}

// ✅ NEEDED: Air defense integration
const airDefense = new AirDefenseZoneCalculator(position);
const defenseLevel = airDefense.getInfluencingPieces(to, enemyColor).length;

if (defenseLevel >= 2) {
  // Suicide capture
} else if (defenseLevel === 1) {
  // Kamikaze flag
}
```

## Impact on UI Integration

### HeroicStatusPanel.svelte Limitations

**Current UI can't show:**

- ❌ "Stay Capture" ability for Navy/Artillery
- ❌ "Dual Attack" ranges for Navy
- ❌ "Air Defense Immunity" for Air Force
- ❌ Proper capture type indicators

**Missing Bridge API:**

```typescript
// ❌ CURRENT: Limited move info
interface UIMove {
  from: number;
  to: number;
  piece: UIPiece;
  captured?: UIPiece;
  flags: number; // ❌ Only basic flags
}

// ✅ NEEDED: Rich move info
interface UIMove {
  from: number;
  to: number;
  piece: UIPiece;
  captured?: UIPiece;
  captureType: 'normal' | 'stay' | 'suicide'; // ❌ Missing
  specialFlags: string[]; // ❌ Missing
  attackType?: 'torpedo' | 'naval-gun'; // ❌ Missing
}
```

## Implementation Priority

### **Phase 1: Critical Move Types (High Priority)**

1. Add `STAY_CAPTURE` and `SUICIDE_CAPTURE` flags
2. Implement stay-capture logic for Navy and Artillery
3. Add Air Force air defense zone integration

### **Phase 2: Navy Dual Attack (Medium Priority)**

1. Implement torpedo vs naval gun attack ranges
2. Add stay-capture for Navy attacking land pieces

### **Phase 3: UI Integration (Medium Priority)**

1. Update Bridge API to expose capture types
2. Add rich move information for UI components

### **Phase 4: Deploy System (Low Priority)**

1. Implement deploy move generation
2. Add deploy session management

## Current Completion Status

**Overall Implementation: ~60%**

| Component               | Status            | Completion    |
| ----------------------- | ----------------- | ------------- |
| Basic Move Generation   | ✅ Complete       | 100%          |
| Terrain System          | ✅ Complete       | 100%          |
| Stack Combination       | ✅ Complete       | 100%          |
| **Capture Types**       | ❌ **Incomplete** | **33%** (1/3) |
| **Air Force Mechanics** | ❌ **Missing**    | **0%**        |
| **Navy Dual Attack**    | ❌ **Missing**    | **0%**        |
| Deploy System           | 🚧 Partial        | 20%           |
| Bridge Integration      | 🚧 Partial        | 70%           |

## Conclusion

The cotulenh-bitboard implementation has **solid foundations** but **cannot be a drop-in replacement** for cotulenh-core until the missing capture types and special mechanics are implemented.

**Key Blocker:** Missing stay-capture and suicide-capture mechanics prevent proper CoTuLenh gameplay.
