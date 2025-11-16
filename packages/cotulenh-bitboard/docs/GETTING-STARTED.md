# Getting Started with CoTuLenh Bitboard

Welcome! This guide will help you get started with `@repo/cotulenh-bitboard`.

## Installation

### In the Monorepo

The package is already part of the monorepo. Install dependencies:

```bash
pnpm install
```

### As a Dependency

```bash
pnpm add @repo/cotulenh-bitboard
```

## Quick Start

```typescript
import { CoTuLenh } from '@repo/cotulenh-bitboard';

// Create a new game
const game = new CoTuLenh();

// Load a position
game.load(
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1'
);

// Get legal moves
const moves = game.moves();
console.log('Legal moves:', moves);

// Make a move
game.move({ from: 'e4', to: 'e5' });

// Get current position
console.log('FEN:', game.fen());

// Undo move
game.undo();
```

## Development Setup

### Prerequisites

- Node.js 18+ or 20+
- pnpm 8+

### Build the Package

```bash
cd packages/cotulenh-bitboard
pnpm build
```

### Run Tests

```bash
pnpm test
```

### Run Tests with UI

```bash
pnpm test:ui
```

### Type Check

```bash
pnpm type-check
```

### Watch Mode

```bash
pnpm dev
```

## Project Structure

```
packages/cotulenh-bitboard/
├── src/
│   ├── index.ts           # Main entry point
│   └── types.ts           # Type definitions
├── docs/                  # Documentation
├── tests/                 # Test suite (to be added)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Next Steps

### For Users

1. Read the [Migration Guide](./MIGRATION.md) if coming from cotulenh-core
2. Check the [API Reference](./API.md) for available methods
3. Review [Performance Benchmarks](./PERFORMANCE.md) for expected improvements

### For Developers

1. Read the [Architecture Overview](./ARCHITECTURE.md)
2. Review the [Requirements](./REQUIREMENTS.md)
3. Check the [Implementation Guide](./IMPLEMENTATION-GUIDE.md) for tasks
4. Review [Critical Gaps](./CRITICAL-GAPS.md) for known blockers

## Understanding CoTuLenh

If you're new to CoTuLenh, start with the core documentation:

- [CoTuLenh Core Docs](../../cotulenh-core/docs/README.md)
- [Core Concepts](../../cotulenh-core/docs/current/CORE-CONCEPTS.md)
- [Piece Reference](../../cotulenh-core/docs/current/PIECE-REFERENCE.md)

## Development Workflow

### 1. Pick a Task

See [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) for the task list.

### 2. Implement

Follow the architecture in [ARCHITECTURE.md](./ARCHITECTURE.md).

### 3. Test

Write tests for your implementation:

```typescript
// tests/bitboard.test.ts
import { describe, it, expect } from 'vitest';
import { setBit, isSet } from '../src/bitboard';

describe('Bitboard Operations', () => {
  it('should set and check bits', () => {
    const bb = { low: 0n, high: 0n };
    const result = setBit(bb, 0);
    expect(isSet(result, 0)).toBe(true);
  });
});
```

### 4. Benchmark

Compare performance against cotulenh-core:

```typescript
// tests/benchmark.test.ts
import { describe, it } from 'vitest';
import { CoTuLenh as BitboardEngine } from '../src';
import { CoTuLenh as CoreEngine } from '@repo/cotulenh-core';

describe('Performance', () => {
  it('should be faster than core', () => {
    // Benchmark code
  });
});
```

### 5. Document

Update documentation as you implement features.

## Common Tasks

### Add a New Module

```bash
# Create module file
touch src/bitboard/operations.ts

# Create test file
touch tests/bitboard/operations.test.ts

# Export from index
# Edit src/index.ts to export new module
```

### Run Specific Tests

```bash
pnpm test bitboard
```

### Generate Coverage Report

```bash
pnpm test:coverage
```

### Build for Production

```bash
pnpm build
```

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
pnpm clean
pnpm build
```

### Type Errors

```bash
# Check types
pnpm type-check
```

### Test Failures

```bash
# Run tests in watch mode
pnpm test --watch
```

## Getting Help

- Check [CRITICAL-GAPS.md](./CRITICAL-GAPS.md) for known issues
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions
- See [cotulenh-core docs](../../cotulenh-core/docs/README.md) for game rules

## Contributing

Contributions are welcome! See the implementation guide for available tasks.

## Links

- [Architecture](./ARCHITECTURE.md)
- [Requirements](./REQUIREMENTS.md)
- [Implementation Guide](./IMPLEMENTATION-GUIDE.md)
- [API Reference](./API.md)
- [Migration Guide](./MIGRATION.md)
- [Performance](./PERFORMANCE.md)
