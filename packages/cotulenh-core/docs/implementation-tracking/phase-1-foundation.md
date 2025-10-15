# Phase 1: Foundation (Week 1)

**Goal:** Build core bitboard infrastructure  
**Duration:** 5 days  
**Status:** 🔴 Not Started

---

## Task 1.1: Bitboard Utils Implementation

**File:** `src/bitboard/bitboard-utils.ts`  
**Estimated Time:** 2-3 hours

### Steps

1. Create directory: `mkdir -p src/bitboard`
2. Create file: `touch src/bitboard/bitboard-utils.ts`
3. Copy the implementation from `docs/bitboard-implementation/` or write:
   - Type definition: `export type Bitboard = bigint`
   - Constants: `EMPTY_BITBOARD`, `BOARD_STRIDE`
   - Class `BitboardUtils` with methods:
     - `squareToBit(file, rank)` → number
     - `bitToSquare(bit)` → [file, rank]
     - `singleBit(file, rank)` → Bitboard
     - `isSet(bb, file, rank)` → boolean
     - `popCount(bb)` → number
     - `getLowestSetBit(bb)` → number
     - `printBitboard(bb, label)` → void

### Acceptance Criteria

- [ ] File exists at `src/bitboard/bitboard-utils.ts`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] All 6 methods implemented
- [ ] Can import:
      `import { Bitboard, BitboardUtils } from './bitboard/bitboard-utils'`

### Verification

```bash
# Check file exists
ls -la src/bitboard/bitboard-utils.ts

# Check TypeScript compiles
npx tsc --noEmit

# Try importing in Node
node -e "const { BitboardUtils } = require('./dist/bitboard/bitboard-utils'); console.log('OK')"
```

---

## Task 1.2: Bitboard Utils Tests

**File:** `test/bitboard/bitboard-utils.test.ts`  
**Estimated Time:** 1-2 hours

### Steps

1. Create directory: `mkdir -p test/bitboard`
2. Create file: `touch test/bitboard/bitboard-utils.test.ts`
3. Write tests:
   - Test `squareToBit()` converts e5 correctly
   - Test `bitToSquare()` round trip
   - Test `singleBit()` creates correct bitboard
   - Test `isSet()` checks bits correctly
   - Test `popCount()` counts multiple bits
   - Test `getLowestSetBit()` finds first bit

### Acceptance Criteria

- [ ] File exists at `test/bitboard/bitboard-utils.test.ts`
- [ ] At least 6 tests written
- [ ] All tests pass: `npm test -- bitboard-utils`
- [ ] No skipped or pending tests

### Verification

```bash
# Run tests
npm test -- bitboard-utils

# Expected output: 6+ tests passing
```

---

## Task 1.3: Circle Mask Generation

**File:** `src/bitboard/circle-masks.ts`  
**Estimated Time:** 3-4 hours

### Steps

1. Create file: `touch src/bitboard/circle-masks.ts`
2. Implement `CircleMasks` class:
   - `initialize()` - pre-compute circles for radius 1, 2, 3
   - `generateCircle(radius)` - create circle centered at (6,6)
   - `getCircle(radius)` - return pre-computed circle
   - `slideCircleToPosition(circle, file, rank)` - move circle to position
   - `getValidBoardMask()` - 12×12 board mask
3. Call `initialize()` at module load

### Acceptance Criteria

- [ ] File exists at `src/bitboard/circle-masks.ts`
- [ ] No TypeScript errors
- [ ] `CircleMasks.getCircle(1)` returns a bitboard
- [ ] `CircleMasks.slideCircleToPosition()` works
- [ ] Circles are pre-computed at import time

### Verification

```bash
# Check file exists
ls -la src/bitboard/circle-masks.ts

# Check TypeScript compiles
npx tsc --noEmit

# Manual test
node -e "const { CircleMasks } = require('./dist/bitboard/circle-masks'); console.log('Circle:', CircleMasks.getCircle(1))"
```

---

## Task 1.4: Circle Mask Tests

**File:** `test/bitboard/circle-masks.test.ts`  
**Estimated Time:** 2 hours

### Steps

1. Create file: `touch test/bitboard/circle-masks.test.ts`
2. Write tests:
   - Test radius 1 circle has correct size (5-9 squares)
   - Test radius 2 > radius 1
   - Test radius 3 > radius 2
   - Test slide to e5 centers correctly
   - Test slide to corner (0,0) clips correctly
   - Test slide to corner (11,11) clips correctly

### Acceptance Criteria

- [ ] File exists
- [ ] At least 6 tests written
- [ ] All tests pass: `npm test -- circle-masks`
- [ ] Tests verify circle sizes are reasonable

### Verification

```bash
npm test -- circle-masks
```

---

## Task 1.5: Air Defense Calculator

**File:** `src/bitboard/air-defense-bitboard.ts`  
**Estimated Time:** 4-5 hours

### Steps

1. Create file: `touch src/bitboard/air-defense-bitboard.ts`
2. Implement `AirDefenseBitboard` class:
   - Define `AIR_DEFENSE_RANGES` constant
   - `calculateAirDefense(game)` → { red, blue }
   - `calculateForColor(game, color)` → Bitboard
   - `squareToFileRank(sq)` → [file, rank]
   - `isInAirDefense(bb, file, rank)` → boolean
   - `getAirDefenseSquares(bb)` → number[]

### Acceptance Criteria

- [ ] File exists at `src/bitboard/air-defense-bitboard.ts`
- [ ] No TypeScript errors
- [ ] Can calculate air defense from CoTuLenh instance
- [ ] Returns bitboards for both colors
- [ ] Helper methods work

### Verification

```bash
# Check file exists
ls -la src/bitboard/air-defense-bitboard.ts

# Check TypeScript compiles
npx tsc --noEmit
```

---

## Task 1.6: Air Defense Tests

**File:** `test/bitboard/air-defense-bitboard.test.ts`  
**Estimated Time:** 2-3 hours

### Steps

1. Create file: `touch test/bitboard/air-defense-bitboard.test.ts`
2. Write tests:
   - Test calculates for starting position
   - Test tank at e5 creates radius 1 zone
   - Test heroic artillery creates radius 3 zone
   - Test multiple pieces combine coverage
   - Test empty board has no coverage

### Acceptance Criteria

- [ ] File exists
- [ ] At least 5 tests written
- [ ] All tests pass: `npm test -- air-defense-bitboard`
- [ ] Tests use real CoTuLenh instances

### Verification

```bash
npm test -- air-defense-bitboard
```

---

## 🎯 CHECKPOINT 1: Foundation Complete

**Before proceeding to Phase 2, verify ALL of the following:**

### Files Created (6 files)

```bash
# Check all files exist
ls -la src/bitboard/bitboard-utils.ts
ls -la src/bitboard/circle-masks.ts
ls -la src/bitboard/air-defense-bitboard.ts
ls -la test/bitboard/bitboard-utils.test.ts
ls -la test/bitboard/circle-masks.test.ts
ls -la test/bitboard/air-defense-bitboard.test.ts
```

### All Tests Pass

```bash
# Run ALL bitboard tests
npm test -- bitboard

# Expected: 17+ tests passing, 0 failures
```

### TypeScript Compiles

```bash
# No TypeScript errors
npx tsc --noEmit
```

### Manual Smoke Test

```bash
# Can calculate air defense
node -e "
const { CoTuLenh } = require('./dist/cotulenh');
const { AirDefenseBitboard } = require('./dist/bitboard/air-defense-bitboard');
const game = new CoTuLenh();
const ad = AirDefenseBitboard.calculateAirDefense(game);
console.log('Red coverage:', ad.red);
console.log('Blue coverage:', ad.blue);
console.log('CHECKPOINT 1: PASSED ✅');
"
```

### Checklist

- [ ] All 6 files created
- [ ] All tests pass (17+ tests)
- [ ] No TypeScript errors
- [ ] Manual smoke test passes
- [ ] Code reviewed for quality
- [ ] Ready to proceed to Phase 2

---

## 📝 Notes

**What's Working:**

- (Document what's working as you complete tasks)

**Issues Found:**

- (Document any issues or blockers)

**Next Steps:**

- After checkpoint passes, proceed to
  [Phase 2: Integration](./phase-2-integration.md)
