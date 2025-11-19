# Special Move Mechanisms Analysis

## Current Implementation Status in cotulenh-bitboard

Based on analysis of both cotulenh-core and cotulenh-bitboard implementations:

### ✅ Fully Implemented

1. **Normal Capture (BITS.CAPTURE = 2)**

   - Standard capture where piece moves to target square and captures enemy piece
   - Implemented in move generator with CAPTURE flag

2. **Combination Moves (BITS.COMBINATION = 32)**

   - Friendly pieces combining into stacks
   - Basic validation in `canCombinePieces()`
   - Marked with COMBINATION flag

3. **Deploy Moves (BITS.DEPLOY = 16)**

   - Multi-step deployment from stacks
   - Full deploy session lifecycle management
   - Marked with DEPLOY flag

4. **Terrain Awareness**
   - Navy pieces restricted to water (WATER_MASK)
   - Land pieces restricted to land (LAND_MASK)
   - Validation in `canPieceStayOnSquare()`

### ❌ Missing in cotulenh-bitboard

1. **Stay Capture (BITS.STAY_CAPTURE = 4)**
   - **Definition**: Capture without moving to the target square
   - **When it occurs**:
     - Navy captures land piece on land → stay capture only (can't move to land)
     - Land piece captures navy on water → stay capture only (can't move to water)
     - Air Force can CHOOSE stay capture OR normal capture (player decision)
       - Exception: Air Force capturing Navy at sea → stay capture only
2. **Suicide Capture (BITS.SUICIDE_CAPTURE = 8)**
   - **Definition**: Air Force kamikaze attack in air defense zones
   - **When it occurs**:
     - Air Force enters FIRST air defense zone → can trade itself with enemy piece
     - Air Force leaving first zone → cannot reach further (destroyed)
   - **Implementation in cotulenh-core**:
     - Uses `AirDefenseResult.KAMIKAZE` flag
     - Checked via `getCheckAirDefenseZone()` function
     - Marked with SUICIDE_CAPTURE flag

## Implementation Details from cotulenh-core

### Stay Capture Logic (from handleCaptureLogic)

```typescript
let addNormalCapture = true;
let addStayCapture = false;

const canLand = canStayOnSquare(to, pieceData.type);
if (!canLand) {
  // Terrain incompatible → stay capture only
  addStayCapture = true;
  addNormalCapture = false;
}

// Air Force special case: can choose both options
if (canLand && pieceData.type === AIR_FORCE) {
  if (!isDeployMove) {
    addStayCapture = true; // Add stay capture option
  }
  addNormalCapture = true; // Keep normal capture option
}

if (captureAllowed) {
  if (addNormalCapture) {
    addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE);
  }
  if (addStayCapture) {
    addMove(moves, us, from, to, pieceData, targetPiece, BITS.STAY_CAPTURE);
  }
}
```

### Suicide Capture Logic (from handleCaptureLogic)

```typescript
// Check air defense before capture logic
let airDefenseResult: number = -1;
if (shouldCheckAirDefense) {
  airDefenseResult = checkAirforceState();
}
if (airDefenseResult === AirDefenseResult.DESTROYED) {
  break; // Can't move further
}

// In handleCaptureLogic:
if (isSuicideMove) {
  addMove(moves, us, from, to, pieceData, targetPiece, BITS.SUICIDE_CAPTURE);
  return;
}
```

## What Needs to Be Added to cotulenh-bitboard

### 1. Add Missing Move Flags

In `packages/cotulenh-bitboard/src/move-generator.ts`:

```typescript
export const MOVE_FLAGS = {
  NORMAL: 0,
  CAPTURE: 1,
  COMBINATION: 2,
  DEPLOY: 4,
  KAMIKAZE: 8,
  STAY_CAPTURE: 16, // ADD THIS
  SUICIDE_CAPTURE: 32 // ADD THIS (or use KAMIKAZE)
} as const;
```

### 2. Update handleCaptureLogic in Move Generator

Add terrain-based stay capture logic:

- Check if attacker can stay on target square
- If not, generate stay capture instead of normal capture
- For Air Force, generate BOTH options (except Navy at sea)

### 3. Integrate Air Defense System

- Implement air defense zone checking for Air Force moves
- Mark moves entering first zone as SUICIDE_CAPTURE
- Block moves beyond first zone (destroyed)

### 4. Update Move Execution

Ensure move execution handles:

- Stay capture: piece stays at origin, target piece removed
- Suicide capture: both pieces removed from board

## Priority Implementation Order

1. **Stay Capture** (High Priority)

   - Core game mechanic
   - Affects Navy and Air Force significantly
   - Relatively straightforward to implement

2. **Suicide Capture** (Medium Priority)

   - Air Force specific
   - Requires air defense integration
   - More complex but less frequently used

3. **Testing** (High Priority)
   - Test Navy capturing land pieces
   - Test land pieces capturing Navy
   - Test Air Force capture options
   - Test Air Force kamikaze in defense zones

## References

- cotulenh-core implementation: `packages/cotulenh-core/src/move-generation.ts`
- Flag definitions: `packages/cotulenh-core/src/type.ts` (BITS constant)
- Air defense: `packages/cotulenh-core/src/air-defense.ts`
