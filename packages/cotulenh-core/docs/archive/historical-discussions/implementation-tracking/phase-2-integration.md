# Phase 2: Integration (Week 2)

**Goal:** Integrate bitboard air defense into CoTuLenh  
**Duration:** 5 days  
**Status:** 🔴 Not Started  
**Prerequisites:** Phase 1 Checkpoint MUST pass

---

## Task 2.1: Add Air Defense Cache

**Files:** Main CoTuLenh class  
**Time:** 2-3 hours

### Steps

1. Find main class: `grep -r "export class CoTuLenh" src/`
2. Add imports, properties, methods (see phase-1-foundation.md for details)
3. Implement cache getter and invalidation

### Acceptance Criteria

- [ ] Cache properties added
- [ ] `getAirDefenseCoverage()` method works
- [ ] No TypeScript errors

### Verification

```bash
npx tsc --noEmit
node -e "const {CoTuLenh} = require('./dist/cotulenh'); const g = new CoTuLenh(); console.log(g.getAirDefenseCoverage('red'))"
```

---

## Task 2.2: Invalidate Cache on Moves

**Files:** Move execution logic  
**Time:** 2-3 hours

### Steps

1. Find move execution: `_makeMove()` or `executeMove()`
2. Add invalidation after moves
3. Detect air defense piece types
4. Also invalidate on undo/put/remove

### Acceptance Criteria

- [ ] Cache invalidates when needed
- [ ] Optimization: doesn't invalidate for non-air-defense pieces
- [ ] Works with undo

### Verification

```bash
# Test moves invalidate cache
npm test -- integration
```

---

## Task 2.3: Replace Air Defense Checks

**Files:** Air Force move generation, air defense checks  
**Time:** 3-4 hours

### Steps

1. Find: `grep -r "air.*defense" src/`
2. Replace loop-based checks with bitboard lookups
3. Import `AirDefenseBitboard`

### Acceptance Criteria

- [ ] All checks use bitboards
- [ ] No old loop logic remains
- [ ] Existing tests pass

### Verification

```bash
npm test -- air-force
npm test -- air-defense
```

---

## Task 2.4: Integration Tests

**File:** `test/integration/air-defense-integration.test.ts`  
**Time:** 2-3 hours

### Tests to Write

- Air defense updates after moves
- Air defense after captures
- Heroic promotion
- Air Force respects zones
- Undo restores correctly

### Acceptance Criteria

- [ ] 5+ integration tests
- [ ] All pass

### Verification

```bash
npm test -- integration/air-defense
```

---

## Task 2.5: Performance Benchmark

**File:** `test/performance/air-defense-benchmark.test.ts`  
**Time:** 1-2 hours

### Benchmark

Test 10,000 air defense checks, measure time per check

### Acceptance Criteria

- [ ] Benchmark exists
- [ ] <10μs per check
- [ ] Results logged

### Verification

```bash
npm test -- performance/air-defense
```

---

## 🎯 CHECKPOINT 2

### Verify All

```bash
# All tests pass
npm test

# Integration tests
npm test -- integration/air-defense

# Performance
npm test -- performance/air-defense

# No regressions
npm test -- air-force
```

### Checklist

- [ ] Cache working
- [ ] Invalidation working
- [ ] All checks use bitboards
- [ ] Integration tests pass (5+)
- [ ] Performance <10μs
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] Ready for Phase 3

**Next:** [Phase 3: Polish](./phase-3-polish.md)
