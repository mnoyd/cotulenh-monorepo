# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Overview

This is **cotulenh-core**, the core game logic package for CoTuLenh (Cờ Tư
Lệnh) - a Vietnamese chess variant. This package is part of a Turborepo monorepo
and provides the game engine that powers move generation, validation, and game
state management for an 11×12 board with 11 unique piece types.

## Common Commands

### Development

```bash
# From monorepo root - recommended for most work
pnpm dev              # Run dev server for all packages
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm check-types      # Type check all packages

# From this package (cotulenh-core)
npm test              # Run tests with Vitest
npm run test -- --ui  # Run tests with Vitest UI
npm run bench         # Run performance benchmarks
npm run build         # Build this package only
npm run format        # Format code with Prettier
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/move-generation.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Architecture Overview

### Core Components

This package implements a chess variant engine with the following key
architectural elements:

#### 1. **Board Representation (0x88)**

- Uses a 256-element array with 0x88 (hexadecimal) coordinate system
- Board is 11×12 (files a-k, ranks 1-12) with water/land terrain
- Off-board squares used for fast boundary detection
- Piece positions tracked in `_board` array + commander position cache

#### 2. **Game State Management (CoTuLenh class)**

The main `CoTuLenh` class (`src/cotulenh.ts`) maintains:

- Board state (`_board`)
- Turn tracking (`_turn`)
- Commander positions (`_commanders`)
- Move history (`_history`)
- Air defense state (`_airDefense`)
- Deploy session state (`_deploySession`)

#### 3. **Move Generation System**

Split across multiple files for maintainability:

- `move-generation.ts`: Core move generation with per-piece generators
- `move-apply.ts`: Command pattern for move execution/undo
- `deploy-move.ts`: Special handling for stack deployment moves
- `deploy-session.ts`: Multi-step deploy sequence management
- `recombine-manager.ts`: Piece recombination during deploy

#### 4. **Special Mechanics**

**Stacks & Deploy**: Pieces can carry other pieces, creating stacks. Deploying a
stack is a multi-step process:

1. User selects stack square
2. System enters deploy session mode
3. User moves pieces from stack to board incrementally
4. Each deploy move is validated and executed immediately
5. User can recombine pieces during deployment
6. Session commits when all pieces deployed or staying

**Air Defense Zones**: Anti-air pieces create circular zones that limit air
force movement

- Tracked in `_airDefense` map structure
- Updated when anti-air pieces move
- Checked during air force move generation

**Commander Exposure**: Commanders cannot face each other on the same rank/file
without intervening pieces (flying general rule)

**Stay Capture**: Some pieces can capture without moving from their square

#### 5. **Move History & Undo**

- Command pattern for reversible moves
- History stores pre-move state snapshots
- Deploy sessions can be undone move-by-move or canceled entirely

### Key Design Patterns

**Command Pattern**: All moves are commands with `execute()` and `undo()`
methods

- `createMoveCommand()` factory for normal moves
- `DeployMoveCommand` for batch deploy operations
- Enables undo/redo and move validation

**Caching**: Move generation results cached with LRU cache

- Cache key includes FEN + deploy state + filters
- Cleared after any board mutation
- Significant performance improvement

**Lazy Evaluation**: Deploy moves processed incrementally

- No pre-generation of all deploy sequences
- Board updated after each step
- Better UX and performance

## File Organization

```
src/
├── cotulenh.ts           # Main game class (2100+ lines)
├── type.ts               # Core types, constants, piece definitions
├── move-generation.ts    # Per-piece move generators
├── move-apply.ts         # Command pattern for moves
├── deploy-move.ts        # Deploy move types and utilities
├── deploy-session.ts     # Multi-step deploy management
├── recombine-manager.ts  # Piece recombination logic
├── air-defense.ts        # Air defense zone calculations
└── utils.ts              # Helper functions (FEN, SAN, board printing)
```

## Critical Implementation Details

### Deploy Session Flow

When working with deploy moves, understand this state machine:

1. **No Session**: Normal moves only
2. **Session Active**: Only deploy moves from stack allowed
3. **Session Complete**: All pieces moved/staying, can commit or cancel
4. Committing adds to history and switches turn
5. Canceling undos all moves in session

**IMPORTANT**: Never manipulate `_deploySession` directly. Use public methods:

- `getDeploySession()` / `setDeploySession()`
- `commitDeploySession()` / `cancelDeploySession()`
- `recombine()` for piece recombination

### Move Validation

Moves are validated at multiple levels:

1. **Pseudo-legal**: Generated by piece-specific functions
2. **Legal**: Filtered to exclude moves leaving commander in check/exposed
3. **Deploy complete**: Additional validation for deploy session commits

**CRITICAL**: Deploy moves use **delayed validation**. Commander safety checked
only at commit time, not during individual deploy moves. This allows deploy
sequences to escape check.

### FEN Format

Extended FEN for deploy sessions:

```
[normal FEN] | DEPLOY stackSquare:turn | move1,move2,...
```

Example with deploy session:

```
rnsmkgsmcr/1e2a4e1/p1p1p1p1p1p/11/11/11/11/P1P1P1P1P1P/1E2A4E1/RNSMKGSMCR/F b - - 0 1 | DEPLOY c2:b | Ta>c3,Ia>c4
```

### Air Defense Implementation

Air defense zones are pre-calculated and cached:

- Updated when anti-air pieces move via `updateAirDefensePiecesPosition()`
- Stored as `Map<square, affectedSquares[]>`
- Checked during air force move generation via `getCheckAirDefenseZone()`

### Testing Strategy

- **Unit tests**: Per-file in `__tests__/` directory
- **Integration tests**: Full game scenarios (deploy, recombine, etc.)
- **Edge cases**: Commander exposure, air defense boundaries, stack limits
- See 23 test files covering all major systems

## Common Pitfalls

### 1. Deploy Session Corruption

**Problem**: Directly modifying board during active deploy session **Solution**:
Always check `_deploySession` state before operations. Use session methods.

### 2. Cache Invalidation

**Problem**: Stale move cache after board changes **Solution**: Cache
automatically cleared by move operations. Manual clear only needed for direct
`_board` manipulation.

### 3. Commander Position Tracking

**Problem**: `_commanders` out of sync with board **Solution**: Use `put()` and
`remove()` methods which update commander positions automatically.

### 4. Move History Corruption

**Problem**: Manually modifying `_history` array **Solution**: Only use
`_makeMove()` and `_undoMove()` private methods. Public `move()` and `undo()`
methods handle history correctly.

## Documentation

Extensive documentation in `docs/` directory:

- `docs/current/GAME-RULES.md` - Complete game mechanics (all 11 pieces)
- `docs/current/API-GUIDE.md` - Public API reference
- `docs/current/IMPLEMENTATION-GUIDE.md` - Architecture deep dive
- `docs/current/TESTING-GUIDE.md` - Test patterns and validation
- `docs/extracted-information/` - Edge cases and technical details

## Performance Considerations

- Move generation is the hottest path (~300-500 moves per position)
- Caching reduces repeated calculations significantly
- Piece lists used instead of iterating entire 256-element board
- Air defense pre-calculation amortizes cost across moves
- Deploy session incremental execution avoids batch overhead

## Integration with Other Packages

This package is consumed by:

- `@repo/cotulenh-board` - Svelte board visualization component
- `cotulenh-app` - Main SvelteKit web application

Export structure:

```typescript
// Main exports
export { CoTuLenh, Move, DeployMove }
export type { Color, Piece, PieceSymbol, Square }
export type { DeployMoveRequest }
export { validateFenString }
```

## Build & Distribution

```bash
npm run build  # Generates:
# - dist/cotulenh.js (ESM)
# - dist/cotulenh.cjs (CommonJS)
# - dist/cotulenh.d.ts (TypeScript types)
```

Package exports both ESM and CJS formats with full TypeScript support.
