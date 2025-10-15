# Test Organization

**Reorganized:** 2025-10-15  
**Strategy:** Separate behavioral tests from implementation tests

---

## Folder Structure

```
__tests__/
├── bitboard/              # NEW - Tests for new bitboard implementation
│   └── bitboard-utils.test.ts (31 tests) ✅
│
├── behavior/              # KEEP - Game rule and behavior tests
│   ├── move.test.ts
│   ├── basic-move.test.ts
│   ├── combined-stack.test.ts
│   ├── heroic.test.ts
│   ├── king-attacked.test.ts
│   ├── san.test.ts
│   ├── get-attackers.test.ts
│   ├── generate-stack-move.test.ts
│   ├── stress.test.ts
│   └── utils.test.ts
│
├── legacy/                # ARCHIVED - Old implementation tests
│   ├── air-defense.test.ts
│   ├── atomic-move.test.ts
│   ├── move-generation.test.ts
│   ├── cotulenh.test.ts
│   └── cotulenh.benchmark.ts
│
└── test-helpers.ts        # Shared test utilities
```

---

## Test Categories

### 1. Bitboard Tests (`bitboard/`)

**Purpose:** Test new bitboard implementation  
**Status:** Growing - adding tests as we build  
**Run:** `npm test -- bitboard`

These test the **new architecture** with clean, modular design:

- Bitboard utilities (Task 1.1-1.2) ✅
- Circle masks (Task 1.3-1.4) 🔄 Next
- Air defense calculator (Task 1.5-1.6)
- Integration tests

**Characteristics:**

- Unit tests for pure functions
- Fast execution
- No dependencies on legacy code
- Follow best practices

---

### 2. Behavioral Tests (`behavior/`)

**Purpose:** Define WHAT the game should do (game rules)  
**Status:** Active - running against current implementation  
**Run:** `npm test -- behavior`

These tests are **implementation-agnostic** and should:

- ✅ Pass with both old and new implementation
- ✅ Document game rules and mechanics
- ✅ Catch regressions during migration
- ✅ Remain valuable long-term

**Examples:**

- "Tank moves 1 square orthogonally"
- "Heroic piece has extended range"
- "Commander cannot move into check"
- "SAN notation parses correctly"

**Why keep them:**

- 140KB of valuable test scenarios
- Document game requirements
- Regression detection
- Time-tested edge cases

---

### 3. Legacy Tests (`legacy/`)

**Purpose:** Test old implementation details  
**Status:** Archived - excluded from build  
**Run:** Not run by default

These tests are **implementation-specific** to old code:

- Test old command pattern internals
- Test old air defense loop logic
- Test old move generation algorithm
- Benchmarks for old system

**Why archive them:**

- Tightly coupled to old architecture
- Won't work with new implementation
- Kept for reference only
- Will be removed eventually

---

## Migration Strategy

### Phase 1: Foundation (Current)

```bash
# Add new tests as we build
__tests__/bitboard/bitboard-utils.test.ts    ✅
__tests__/bitboard/circle-masks.test.ts      🔄 Next
__tests__/bitboard/air-defense-bitboard.test.ts
```

### Phase 2: Integration

```bash
# Add integration tests
__tests__/integration/
├── air-defense-integration.test.ts
└── performance-comparison.test.ts
```

### Phase 3: Full Migration

```bash
# Behavioral tests adapted to new API (if needed)
# Legacy tests removed
# New comprehensive test suite complete
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run only new bitboard tests
npm test -- bitboard

# Run only behavioral tests
npm test -- behavior

# Run specific test file
npm test -- basic-move

# Watch mode
npm test -- --watch
```

---

## Test Counts

| Category         | Files | Tests | Status         |
| ---------------- | ----- | ----- | -------------- |
| **Bitboard**     | 1     | 31    | ✅ Passing     |
| **Behavior**     | 10    | ~200  | ✅ Passing     |
| **Legacy**       | 5     | ~100  | 🔴 Archived    |
| **Total Active** | 11    | ~231  | ✅ All Passing |

---

## Writing New Tests

When adding tests for new implementation:

### ✅ DO:

- Put in `__tests__/bitboard/` or appropriate new folder
- Write unit tests for pure functions
- Test edge cases thoroughly
- Use descriptive test names
- Follow existing test patterns
- Keep tests fast and isolated

### ❌ DON'T:

- Put in `__tests__/legacy/` (that's archive only)
- Copy patterns from legacy tests
- Test implementation details
- Create dependencies on legacy code
- Write slow or brittle tests

---

## Example: Good vs Bad Tests

### ✅ Good (Behavioral)

```typescript
test('tank moves 1 square orthogonally', () => {
  const game = new CoTuLenh()
  game.clear()
  game.put({ type: 't', color: 'r' }, 'e5')

  const moves = game.moves({ square: 'e5' })

  expect(moves).toContainEqual(
    expect.objectContaining({ from: 'e5', to: 'e6' }),
  )
})
```

### ❌ Bad (Implementation-specific)

```typescript
test('RemovePieceAction removes piece from board array', () => {
  const action = new RemovePieceAction(...)
  action.execute()
  expect(game._board[68]).toBe(null) // Tests internal details
})
```

---

## Questions?

See:

- `/docs/implementation-tracking/` - Implementation plan
- `/docs/implementation-tracking/STATUS.md` - Current progress
- `/src/legacy/README.md` - Why legacy exists
