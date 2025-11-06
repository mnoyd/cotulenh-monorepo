# Testing Guide

## Overview

This comprehensive testing guide consolidates validation strategies, test
coverage analysis, and testing methodologies for the CoTuLenh chess engine. It
provides guidance for validating all major system components, identifying test
gaps, and implementing effective testing strategies.

## Table of Contents

1. [Current Test Architecture](#current-test-architecture)
2. [Test Coverage Analysis](#test-coverage-analysis)
3. [Validation Strategies](#validation-strategies)
4. [Edge Case Testing](#edge-case-testing)
5. [Performance Testing](#performance-testing)
6. [Regression Testing](#regression-testing)
7. [Testing Utilities](#testing-utilities)
8. [Known Testing Gaps](#known-testing-gaps)
9. [Testing Best Practices](#testing-best-practices)
10. [Debugging and Diagnostics](#debugging-and-diagnostics)

## Current Test Architecture

### Test Framework Setup

**Testing Stack**:

- **Framework**: Vitest (modern, fast test runner)
- **Language**: TypeScript with full type checking
- **Configuration**: `vitest.config.js` with performance profiling
- **Coverage**: V8 coverage reporting available
- **Benchmarking**: Built-in benchmarking support

**Test Structure**:

```
__tests__/
├── test-helpers.ts          # Common test utilities
├── cotulenh.test.ts         # Core game functionality
├── air-defense.test.ts      # Air defense system
├── deploy-session.test.ts   # Deploy mechanics
├── heroic.test.ts          # Heroic promotion system
├── move-generation.test.ts  # Move generation
├── san.test.ts             # SAN notation
├── stress.test.ts          # Stress testing
├── cotulenh.benchmark.ts   # Performance benchmarks
└── [component].test.ts     # Component-specific tests
```

### Test Helper Utilities

**Core Helpers** (`test-helpers.ts`):

```typescript
// Piece creation helper
makePiece(type: PieceSymbol, color: Color, heroic: boolean, carrying: Piece[])

// Move creation helper
makeMove(params: Partial<InternalMove> & { piece: Piece })

// Game setup helper
setupGameBasic(): CoTuLenh

// Move finding utilities
findMove(moves: Move[], from: Square, to: Square): Move | undefined
findVerboseMove(moves: Move[], from: Square, to: Square, options): Move | undefined

// Destination extraction
getDestinationSquares(moves: Move[]): Square[]
```

**Usage Patterns**:

- Consistent test setup with `setupGameBasic()`
- Standardized piece and move creation
- Verbose move analysis for complex scenarios
- Helper functions for common assertions

## Test Coverage Analysis

### Current Coverage by Component

#### ✅ Well-Covered Components

**Core Game Functionality** (90%+ coverage):

- Basic move validation and execution
- FEN loading and generation
- Turn management and game state
- Commander placement and validation
- Basic piece movement patterns

**Air Defense System** (85%+ coverage):

- Zone calculation algorithms
- Defense level calculations
- Air force movement restrictions
- Heroic air defense enhancements

**Deploy Session Management** (80%+ coverage):

- Session creation and management
- Move tracking and validation
- Commit and rollback operations
- Legacy state conversion

**Heroic Promotion System** (75%+ coverage):

- Promotion trigger detection
- Heroic status management
- Enhanced movement capabilities
- Status persistence through operations

#### ⚠️ Partially Covered Components

**Stack System** (60% coverage):

- Basic stack operations tested
- Complex deployment scenarios missing
- Recombine operations not tested (feature missing)
- Edge cases in stack validation

**Terrain Validation** (55% coverage):

- Basic terrain rules tested
- Complex zone transitions missing
- Bridge mechanics partially tested
- Heavy piece restrictions incomplete

**Commander Rules** (50% coverage):

- Basic flying general rule tested
- Complex exposure scenarios missing
- Special capture mechanics incomplete
- Checkmate detection gaps

#### ❌ Under-Covered Components

**Critical Missing Coverage**:

- **TANK Shoot-Over-Blocking**: Signature ability not validated
- **Navy Water-Only Movement**: Comprehensive movement tests needed
- **Heavy Piece River Crossing**: Zone-based movement validation missing
- **Stay Capture Mechanics**: Complex scenarios not tested
- **Suicide Capture Edge Cases**: Multi-piece interactions missing
- **Recombine Moves**: Feature completely missing from tests

### Coverage Metrics by Test Type

**Unit Tests**: 70% overall coverage

- Core functionality: 85%
- Edge cases: 45%
- Error conditions: 40%

**Integration Tests**: 60% coverage

- Component interactions: 65%
- Complex scenarios: 50%
- End-to-end flows: 55%

**Performance Tests**: 30% coverage

- Basic benchmarks exist
- Stress testing limited
- Memory profiling minimal

## Validation Strategies

### 1. Core Game Mechanics Validation

#### Board State Validation

```typescript
describe('Board State Integrity', () => {
  it('should maintain valid board state after moves', () => {
    const game = new CoTuLenh()
    const initialFEN = game.fen()

    // Make moves and validate state
    game.move('Ik6')
    expect(game.fen()).toBeDefined()
    expect(game.isValidPosition()).toBe(true)

    // Undo and verify restoration
    game.undo()
    expect(game.fen()).toBe(initialFEN)
  })
})
```

#### Move Generation Validation

```typescript
describe('Move Generation Completeness', () => {
  it('should generate all legal moves for position', () => {
    const game = new CoTuLenh(testFEN)
    const moves = game.moves({ verbose: true })

    // Validate move completeness
    moves.forEach((move) => {
      expect(move.from).toBeDefined()
      expect(move.to).toBeDefined()
      expect(move.piece).toBeDefined()
      expect(move.san).toBeDefined()
    })
  })
})
```

### 2. Terrain System Validation

#### Terrain Compatibility Testing

```typescript
describe('Terrain Validation', () => {
  it('should enforce terrain restrictions', () => {
    const game = new CoTuLenh()
    game.clear()

    // Test Navy on water
    expect(game.put({ type: NAVY, color: RED }, 'a1')).toBe(true)
    expect(game.put({ type: NAVY, color: RED }, 'e4')).toBe(false)

    // Test land pieces on land
    expect(game.put({ type: TANK, color: RED }, 'e4')).toBe(true)
    expect(game.put({ type: TANK, color: RED }, 'a1')).toBe(false)
  })
})
```

#### Bridge Mechanics Validation

```typescript
describe('Bridge Mechanics', () => {
  it('should allow heavy pieces to cross bridges', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: TANK, color: RED }, 'f5')

    const moves = game.moves({ square: 'f5', verbose: true })
    const bridgeMoves = moves.filter((m) => ['f6', 'f7'].includes(m.to))

    expect(bridgeMoves.length).toBeGreaterThan(0)
  })
})
```

### 3. Stack System Validation

#### Stack Composition Validation

```typescript
describe('Stack Validation', () => {
  it('should validate stack composition rules', () => {
    const game = new CoTuLenh()
    game.clear()

    // Valid stack
    const validStack = {
      type: NAVY,
      color: RED,
      carrying: [
        { type: TANK, color: RED },
        { type: INFANTRY, color: RED },
      ],
    }
    expect(game.put(validStack, 'a1')).toBe(true)

    // Invalid stack (color mismatch)
    const invalidStack = {
      type: NAVY,
      color: RED,
      carrying: [{ type: TANK, color: BLUE }],
    }
    expect(game.put(invalidStack, 'a2')).toBe(false)
  })
})
```

#### Deploy Validation

```typescript
describe('Deploy Mechanics', () => {
  it('should validate complete deployment', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [{ type: TANK, color: RED }],
      },
      'a1',
    )

    const deployMove = {
      from: 'a1',
      moves: [
        { piece: { type: NAVY, color: RED }, to: 'a2' },
        { piece: { type: TANK, color: RED }, to: 'b1' },
      ],
    }

    expect(() => game.deployMove(deployMove)).not.toThrow()
    expect(game.get('a1')).toBeUndefined()
    expect(game.get('a2')?.type).toBe(NAVY)
    expect(game.get('b1')?.type).toBe(TANK)
  })
})
```

### 4. Air Defense System Validation

#### Zone Calculation Validation

```typescript
describe('Air Defense Zones', () => {
  it('should calculate correct defense zones', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: ANTI_AIR, color: RED }, 'e5')

    const airDefense = updateAirDefensePiecesPosition(game)
    const redZones = airDefense[RED]

    // Verify zone coverage
    expect(redZones.has(SQUARE_MAP.e5)).toBe(true) // Center
    expect(redZones.has(SQUARE_MAP.e4)).toBe(true) // Orthogonal
    expect(redZones.has(SQUARE_MAP.d5)).toBe(true) // Orthogonal
    expect(redZones.has(SQUARE_MAP.d4)).toBe(true) // Diagonal
  })

  it('should handle heroic air defense enhancement', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: ANTI_AIR, color: RED, heroic: true }, 'e5')

    const airDefense = updateAirDefensePiecesPosition(game)
    const redZones = airDefense[RED]

    // Heroic should have larger coverage
    expect(redZones.size).toBeGreaterThan(5) // More than basic level
  })
})
```

### 5. Heroic System Validation

#### Promotion Trigger Validation

```typescript
describe('Heroic Promotion', () => {
  it('should promote pieces that attack commander', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: COMMANDER, color: RED }, 'f1')
    game.put({ type: TANK, color: RED }, 'g10')

    // Move tank to attack commander
    const result = game.move({ from: 'g10', to: 'g11' })

    expect(result).not.toBeNull()
    expect(game.get('g11')?.heroic).toBe(true)
    expect(game.isCheck()).toBe(true)
  })

  it('should enhance piece capabilities when heroic', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: INFANTRY, color: RED, heroic: true }, 'e5')

    const moves = game.moves({ square: 'e5', verbose: true })
    const diagonalMoves = moves.filter((m) =>
      ['d4', 'd6', 'f4', 'f6'].includes(m.to),
    )

    expect(diagonalMoves.length).toBeGreaterThan(0)
  })
})
```

## Edge Case Testing

### Critical Edge Cases to Test

#### 1. Boundary Conditions

```typescript
describe('Boundary Conditions', () => {
  it('should handle board edge movements', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: TANK, color: RED }, 'a1')

    const moves = game.moves({ square: 'a1', verbose: true })
    // Verify no off-board moves generated
    moves.forEach((move) => {
      expect(isValidSquare(move.to)).toBe(true)
    })
  })

  it('should handle corner positions correctly', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: ANTI_AIR, color: RED }, 'k1')

    const airDefense = calculateAirDefenseForSquare(SQUARE_MAP.k1, 2)
    expect(airDefense.length).toBe(6) // Corner has limited coverage
  })
})
```

#### 2. Complex Interactions

```typescript
describe('Complex Interactions', () => {
  it('should handle multiple special mechanics together', () => {
    const game = new CoTuLenh()
    game.clear()

    // Setup complex scenario
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
    game.put({ type: ANTI_AIR, color: BLUE, heroic: true }, 'f11')
    game.put({ type: AIR_FORCE, color: RED }, 'e10')

    // Air force in heroic air defense zone
    const moves = game.moves({ square: 'e10', verbose: true })
    const suicideMoves = moves.filter((m) => m.isSuicideCapture?.())

    expect(suicideMoves.length).toBeGreaterThan(0)
  })
})
```

#### 3. State Transition Edge Cases

```typescript
describe('State Transitions', () => {
  it('should handle deploy cancellation correctly', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [{ type: TANK, color: RED }],
      },
      'a1',
    )

    const initialFEN = game.fen()

    // Start deploy
    game.startDeploy('a1')
    expect(game.isInDeploy()).toBe(true)

    // Cancel deploy
    game.cancelDeploy()
    expect(game.isInDeploy()).toBe(false)
    expect(game.fen()).toBe(initialFEN)
  })
})
```

### Error Condition Testing

#### Invalid Input Handling

```typescript
describe('Error Handling', () => {
  it('should handle invalid FEN gracefully', () => {
    const game = new CoTuLenh()
    const invalidFEN = '11/11/11/11/11/11/11/11/11/11/11 r - - 0 1'

    expect(() => game.load(invalidFEN)).toThrow(/expected 12 ranks/)
  })

  it('should handle invalid moves gracefully', () => {
    const game = new CoTuLenh()

    expect(() => game.move('InvalidMove')).toThrow()
    expect(() => game.move({ from: 'z9', to: 'a1' })).toThrow()
  })
})
```

## Performance Testing

### Benchmarking Strategy

#### Move Generation Performance

```typescript
describe('Performance Benchmarks', () => {
  bench('moves() performance [default position]', () => {
    const game = new CoTuLenh()
    game.moves({})
  })

  bench('moves(verbose: true) [complex position]', () => {
    const game = new CoTuLenh(complexFEN)
    game.moves({ verbose: true })
  })
})
```

#### Stress Testing

```typescript
describe('Stress Testing', () => {
  it('should handle long games without performance degradation', () => {
    const game = new CoTuLenh()
    const startTime = performance.now()

    // Play random moves
    for (let i = 0; i < 100; i++) {
      const moves = game.moves()
      if (moves.length === 0) break

      const randomMove = moves[Math.floor(Math.random() * moves.length)]
      game.move(randomMove)
    }

    const endTime = performance.now()
    expect(endTime - startTime).toBeLessThan(5000) // 5 second limit
  })
})
```

### Memory Usage Testing

```typescript
describe('Memory Usage', () => {
  it('should not leak memory during extended play', () => {
    const initialMemory = process.memoryUsage().heapUsed

    for (let game = 0; game < 10; game++) {
      const instance = new CoTuLenh()
      playRandomGame(instance, 50)
    }

    // Force garbage collection if available
    if (global.gc) global.gc()

    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory

    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB limit
  })
})
```

## Regression Testing

### Test Suite Organization

#### Critical Path Tests

```typescript
describe('Critical Path Regression', () => {
  const criticalScenarios = [
    'default_position_moves',
    'commander_exposure_detection',
    'heroic_promotion_triggers',
    'deploy_complete_sequence',
    'air_defense_zone_calculation',
  ]

  criticalScenarios.forEach((scenario) => {
    it(`should handle ${scenario} correctly`, () => {
      // Load scenario and validate expected behavior
      const game = loadScenario(scenario)
      const result = executeScenario(game, scenario)
      expect(result).toMatchSnapshot()
    })
  })
})
```

#### Historical Bug Prevention

```typescript
describe('Historical Bug Prevention', () => {
  it('should prevent Navy land placement bug', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [{ type: TANK, color: RED }],
      },
      'a1',
    )

    // This should fail - Navy cannot be placed on land
    const deployMove = {
      from: 'a1',
      moves: [{ piece: { type: NAVY, color: RED }, to: 'e4' }],
    }

    expect(() => game.deployMove(deployMove)).toThrow()
  })

  it('should prevent commander duplication', () => {
    const game = new CoTuLenh()
    game.clear()
    game.put({ type: COMMANDER, color: RED }, 'f1')

    // Second commander should fail
    expect(game.put({ type: COMMANDER, color: RED }, 'g1')).toBe(false)
  })
})
```

### Automated Regression Detection

```typescript
describe('Automated Regression Detection', () => {
  it('should detect FEN round-trip consistency', () => {
    const testFENs = [
      DEFAULT_POSITION,
      '6c4/11/11/11/11/5C5/11/11/11/11/11/5C5 r - - 0 1',
      '6c4/11/11/11/11/11/6(TI)4/11/11/11/11/5C5 r - - 0 1',
    ]

    testFENs.forEach((fen) => {
      const game = new CoTuLenh(fen)
      expect(game.fen()).toBe(fen)
    })
  })
})
```

## Testing Utilities

### Custom Matchers and Assertions

#### Game State Matchers

```typescript
// Custom matcher for valid game states
expect.extend({
  toBeValidGameState(received: CoTuLenh) {
    const isValid = received.isValidPosition()
    const fen = received.fen()

    return {
      message: () => `Expected game state to be valid. FEN: ${fen}`,
      pass: isValid,
    }
  },
})
```

#### Move Validation Utilities

```typescript
function expectMoveExists(moves: Move[], from: string, to: string) {
  const move = findMove(moves, from as Square, to as Square)
  expect(move).toBeDefined()
  return move
}

function expectMoveNotExists(moves: Move[], from: string, to: string) {
  const move = findMove(moves, from as Square, to as Square)
  expect(move).toBeUndefined()
}
```

### Test Data Management

#### Scenario Loading

```typescript
interface TestScenario {
  name: string
  fen: string
  expectedMoves: string[]
  expectedChecks: boolean
  description: string
}

const testScenarios: TestScenario[] = [
  {
    name: 'basic_commander_exposure',
    fen: '6c4/11/11/11/11/6C4/11/11/11/11/11/11 r - - 0 1',
    expectedMoves: ['Cg12'],
    expectedChecks: true,
    description: 'Commanders exposed on same file',
  },
  // ... more scenarios
]
```

#### Random Game Generation

```typescript
export function playRandomGame(game: CoTuLenh, depth = 20): string[] {
  const moves: string[] = []

  for (let i = 0; i < depth; i++) {
    const legalMoves = game.moves()
    if (legalMoves.length === 0) break

    // Favor capture moves for more interesting games
    const captureMoves = legalMoves.filter(
      (m) => m.includes('x') || m.includes('_'),
    )

    const move =
      captureMoves.length > 0
        ? captureMoves[Math.floor(Math.random() * captureMoves.length)]
        : legalMoves[Math.floor(Math.random() * legalMoves.length)]

    try {
      game.move(move)
      moves.push(move)
    } catch (error) {
      console.error(`Error during move: ${move}`)
      console.error(`Game history: ${moves.join(', ')}`)
      throw error
    }
  }

  return moves
}
```

## Known Testing Gaps

### Critical Missing Test Coverage

#### 1. TANK Shoot-Over-Blocking Mechanics

**Status**: ❌ Not Tested **Priority**: Critical **Description**: Tank's
signature ability to shoot over blocking pieces **Required Tests**:

- Basic shoot-over scenarios
- Multiple blocking pieces
- Terrain interaction with shoot-over
- Edge cases at board boundaries

#### 2. Navy Water-Only Movement Validation

**Status**: ❌ Incomplete **Priority**: Critical **Description**: Comprehensive
Navy movement and placement validation **Required Tests**:

- Water zone movement validation
- Mixed zone navigation
- Bridge utilization restrictions
- Deploy terrain validation

#### 3. Heavy Piece River Crossing Mechanics

**Status**: ❌ Not Tested **Priority**: High **Description**: Zone-based
movement restrictions for heavy pieces **Required Tests**:

- Bridge crossing validation
- Zone transition rules
- Heavy piece identification
- Terrain compatibility

#### 4. Recombine Move Generation

**Status**: ❌ Feature Missing **Priority**: Critical **Description**: Pieces
rejoining already-deployed stacks **Required Tests**:

- Basic recombine scenarios
- Complex stack recombination
- Terrain validation for recombine
- Move generation completeness

#### 5. Stay Capture Mechanics

**Status**: ⚠️ Partially Tested **Priority**: High **Description**: Attack
without moving mechanics **Required Tests**:

- Terrain-dependent stay capture
- Complex multi-piece scenarios
- Stay vs normal capture decision logic
- Edge cases and boundary conditions

#### 6. Suicide Capture Edge Cases

**Status**: ⚠️ Basic Only **Priority**: High **Description**: Both pieces
destroyed in air defense zones **Required Tests**:

- Multi-level air defense interactions
- Complex zone overlaps
- Forced vs optional suicide capture
- Chain reaction scenarios

### Test Infrastructure Gaps

#### 1. Automated Test Generation

**Status**: ❌ Missing **Priority**: Medium **Description**: Automated
generation of edge case tests **Needed**:

- Property-based testing
- Fuzzing for invalid inputs
- Exhaustive scenario generation
- Mutation testing

#### 2. Visual Test Validation

**Status**: ❌ Missing **Priority**: Low **Description**: Visual validation of
board states **Needed**:

- Board state visualization
- Move path visualization
- Zone coverage visualization
- Test result visualization

#### 3. Performance Regression Detection

**Status**: ⚠️ Basic Only **Priority**: Medium **Description**: Automated
performance regression detection **Needed**:

- Continuous performance monitoring
- Performance baseline establishment
- Regression alert system
- Memory leak detection

## Testing Best Practices

### Test Organization Principles

#### 1. Test Structure

```typescript
describe('Component Name', () => {
  describe('Feature Group', () => {
    beforeEach(() => {
      // Setup common to all tests in group
    })

    it('should handle normal case', () => {
      // Test normal operation
    })

    it('should handle edge case', () => {
      // Test edge conditions
    })

    it('should handle error case', () => {
      // Test error conditions
    })
  })
})
```

#### 2. Test Naming Conventions

- **Descriptive**: `should generate correct moves for heroic infantry`
- **Specific**: `should prevent Navy placement on land during deploy`
- **Testable**: `should return false when commander limit exceeded`

#### 3. Test Data Management

```typescript
// Good: Centralized test data
const TEST_POSITIONS = {
  COMMANDER_EXPOSURE: '6c4/11/11/11/11/6C4/11/11/11/11/11/11 r - - 0 1',
  COMPLEX_DEPLOY: '6c4/11/11/11/11/11/6(FTI)4/11/11/11/11/5C5 r - - 0 1',
}

// Good: Reusable setup functions
function setupCommanderExposureTest(): CoTuLenh {
  return new CoTuLenh(TEST_POSITIONS.COMMANDER_EXPOSURE)
}
```

### Assertion Best Practices

#### 1. Specific Assertions

```typescript
// Good: Specific assertion
expect(game.get('e4')?.type).toBe(INFANTRY)
expect(game.get('e4')?.heroic).toBe(true)

// Avoid: Generic assertion
expect(game.get('e4')).toBeTruthy()
```

#### 2. Error Message Context

```typescript
// Good: Contextual error messages
expect(moves.length).toBeGreaterThan(
  0,
  `No moves generated for ${piece.type} at ${square}`,
)

// Good: Custom matchers with context
expect(game).toBeValidGameState()
```

#### 3. Test Independence

```typescript
// Good: Each test is independent
beforeEach(() => {
  game = new CoTuLenh()
  game.clear()
  // Setup specific to test
})

// Avoid: Tests depending on previous test state
```

### Performance Testing Guidelines

#### 1. Benchmark Structure

```typescript
describe('Performance Benchmarks', () => {
  const positions = [
    { name: 'default', fen: DEFAULT_POSITION },
    { name: 'complex', fen: COMPLEX_POSITION },
  ]

  positions.forEach(({ name, fen }) => {
    bench(`moves() performance [${name}]`, () => {
      const game = new CoTuLenh(fen)
      game.moves({})
    })
  })
})
```

#### 2. Memory Testing

```typescript
it('should not leak memory during extended play', () => {
  const initialMemory = process.memoryUsage().heapUsed

  // Perform memory-intensive operations
  for (let i = 0; i < 1000; i++) {
    const game = new CoTuLenh()
    game.moves({ verbose: true })
  }

  // Force garbage collection
  if (global.gc) global.gc()

  const finalMemory = process.memoryUsage().heapUsed
  const memoryIncrease = finalMemory - initialMemory

  expect(memoryIncrease).toBeLessThan(MEMORY_THRESHOLD)
})
```

## Debugging and Diagnostics

### Debugging Utilities

#### 1. Game State Inspection

```typescript
function debugGameState(game: CoTuLenh): void {
  console.log('=== Game State Debug ===')
  console.log('FEN:', game.fen())
  console.log('Turn:', game.turn())
  console.log('In Check:', game.isCheck())
  console.log('In Deploy:', game.isInDeploy())
  console.log('History Length:', game.history().length)
  console.log('Legal Moves:', game.moves().length)
}
```

#### 2. Move Analysis

```typescript
function debugMoveGeneration(game: CoTuLenh, square?: Square): void {
  const moves = game.moves({
    square,
    verbose: true,
  }) as Move[]

  console.log(`=== Move Analysis ${square ? `for ${square}` : ''} ===`)
  moves.forEach((move) => {
    console.log(`${move.san}: ${move.from} -> ${move.to}`)
    if (move.captured) console.log(`  Captures: ${move.captured.type}`)
    if (move.isDeploy?.()) console.log(`  Deploy move`)
    if (move.isCapture()) console.log(`  Capture move`)
  })
}
```

#### 3. Air Defense Visualization

```typescript
function debugAirDefense(game: CoTuLenh): void {
  const airDefense = updateAirDefensePiecesPosition(game)

  console.log('=== Air Defense Zones ===')
  Object.entries(airDefense).forEach(([color, zones]) => {
    console.log(`${color} zones:`, zones.size)
    zones.forEach((defenders, square) => {
      const algebraicSquare = algebraic(square)
      console.log(
        `  ${algebraicSquare}: defended by ${defenders.length} pieces`,
      )
    })
  })
}
```

### Test Failure Analysis

#### 1. Failure Context Capture

```typescript
function captureFailureContext(game: CoTuLenh, error: Error): void {
  const context = {
    fen: game.fen(),
    turn: game.turn(),
    history: game.history(),
    isCheck: game.isCheck(),
    isInDeploy: game.isInDeploy(),
    error: error.message,
    stack: error.stack,
  }

  console.error('Test Failure Context:', JSON.stringify(context, null, 2))
}
```

#### 2. Move Validation Debugging

```typescript
function debugMoveValidation(game: CoTuLenh, move: string | object): void {
  try {
    const result = game.move(move)
    console.log('Move successful:', result)
  } catch (error) {
    console.error('Move failed:', error.message)
    console.log('Game state before move:')
    debugGameState(game)

    if (typeof move === 'string') {
      console.log('Attempted move (SAN):', move)
    } else {
      console.log('Attempted move (object):', move)
    }
  }
}
```

### Diagnostic Tools

#### 1. Position Analysis

```typescript
function analyzePosition(fen: string): void {
  const game = new CoTuLenh(fen)

  console.log('=== Position Analysis ===')
  console.log('FEN:', fen)
  console.log('Turn:', game.turn())
  console.log('Legal moves:', game.moves().length)
  console.log('In check:', game.isCheck())

  // Analyze piece distribution
  const pieces = new Map<string, number>()
  for (let rank = 1; rank <= 12; rank++) {
    for (
      let file = 'a';
      file <= 'k';
      file = String.fromCharCode(file.charCodeAt(0) + 1)
    ) {
      const square = `${file}${rank}` as Square
      const piece = game.get(square)
      if (piece) {
        const key = `${piece.color}${piece.type}`
        pieces.set(key, (pieces.get(key) || 0) + 1)
      }
    }
  }

  console.log('Piece distribution:', Object.fromEntries(pieces))
}
```

#### 2. Performance Profiling

```typescript
function profileFunction<T>(name: string, fn: () => T): T {
  const start = performance.now()
  const result = fn()
  const end = performance.now()

  console.log(`${name}: ${(end - start).toFixed(2)}ms`)
  return result
}

// Usage in tests
it('should generate moves efficiently', () => {
  const game = new CoTuLenh()

  const moves = profileFunction('Move generation', () => {
    return game.moves({ verbose: true })
  })

  expect(moves.length).toBeGreaterThan(0)
})
```

## Test Execution and CI/CD

### Running Tests

#### Local Development

```bash
# Run all tests
npm test

# Run specific test file
npm test air-defense.test.ts

# Run tests with coverage
npm test -- --coverage

# Run benchmarks
npm run bench

# Run tests in watch mode
npm test -- --watch
```

#### Test Configuration

```javascript
// vitest.config.js
export default defineConfig({
  test: {
    // Enable type checking
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },

    // Performance profiling
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: [
          '--cpu-prof',
          '--cpu-prof-dir=test-runner-profile',
          '--heap-prof',
          '--heap-prof-dir=test-runner-profile',
        ],
        singleFork: true,
      },
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['__tests__/**', 'dist/**', 'node_modules/**'],
    },
  },
})
```

### Continuous Integration

#### Test Pipeline

```yaml
# Example CI configuration
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run tests
      run: npm test -- --coverage

    - name: Run benchmarks
      run: npm run bench

    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## Conclusion

This testing guide provides a comprehensive framework for validating the
CoTuLenh chess engine. The current test suite covers core functionality well but
has significant gaps in edge cases and complex interactions. Priority should be
given to:

1. **Critical Missing Coverage**: TANK shoot-over mechanics, Navy movement
   validation, recombine moves
2. **Edge Case Testing**: Boundary conditions, complex interactions, state
   transitions
3. **Performance Testing**: Memory usage, regression detection, stress testing
4. **Test Infrastructure**: Automated test generation, visual validation,
   diagnostic tools

By following the strategies and best practices outlined in this guide,
developers can ensure robust validation of all system components and maintain
high code quality as the engine evolves.
