# @repo/cotulenh-bitboard

High-performance bitboard-based implementation of the CoTuLenh chess engine.

## Overview

This package provides a complete rewrite of CoTuLenh using bitboard architecture for significant performance improvements while maintaining API compatibility with `@repo/cotulenh-core`.

**Status**: 🚧 Under Development

## Features (Planned)

- ⚡ **2.5-4x faster** move generation using bitboards
- 💾 **50-70% less memory** usage
- 🔄 **Drop-in replacement** for `@repo/cotulenh-core`
- 🎯 **Same API** - just change the import
- 🧪 **Comprehensive tests** with compatibility validation
- 📊 **Performance benchmarks** vs current implementation

## Installation

```bash
pnpm add @repo/cotulenh-bitboard
```

## Usage

```typescript
// Simply change your import from cotulenh-core to cotulenh-bitboard
import { CoTuLenh } from '@repo/cotulenh-bitboard';

const game = new CoTuLenh();
console.log(game.moves());
```

## Architecture

This implementation uses:

- **128-bit bitboards** for 11×12 board representation
- **Magic bitboards** for fast sliding piece move generation
- **Hybrid stack system** (bitboards + map) for complex mechanics
- **Precomputed tables** for attack patterns and terrain masks
- **Zobrist hashing** for position comparison

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture documentation.

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Implementation Guide](./docs/IMPLEMENTATION-GUIDE.md)
- [API Reference](./docs/API.md)
- [Performance Benchmarks](./docs/PERFORMANCE.md)
- [Migration Guide](./docs/MIGRATION.md)

For CoTuLenh game rules and mechanics, see [@repo/cotulenh-core documentation](../cotulenh-core/docs/README.md).

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Type check
pnpm type-check
```

## Project Structure

```
packages/cotulenh-bitboard/
├── src/
│   ├── bitboard/          # Core bitboard operations
│   ├── position/          # Position management
│   ├── moves/             # Move generation
│   ├── stacks/            # Stack system
│   ├── deploy/            # Deploy mechanics
│   ├── air-defense/       # Air defense zones
│   ├── validation/        # Move validation
│   ├── fen/               # FEN parsing/generation
│   ├── hash/              # Zobrist hashing
│   ├── types.ts           # Type definitions
│   └── index.ts           # Public API
├── docs/                  # Documentation
├── tests/                 # Test suite
└── package.json
```

## Implementation Status

See [docs/IMPLEMENTATION-GUIDE.md](./docs/IMPLEMENTATION-GUIDE.md) for the complete implementation plan and current progress.

### Phases

- [ ] Phase 1: Package Setup and Core Bitboard Infrastructure
- [ ] Phase 2: FEN Parsing and Basic API
- [ ] Phase 3: Basic Move Generation
- [ ] Phase 4: Sliding Pieces with Magic Bitboards
- [ ] Phase 5: Air Defense System
- [ ] Phase 6: Stack System
- [ ] Phase 7: Deploy System
- [ ] Phase 8: Heroic Status and Position Hashing
- [ ] Phase 9: Complete API Implementation
- [ ] Phase 10: Optimization and Production Readiness

## Performance Goals

| Metric                | Target           | Status |
| --------------------- | ---------------- | ------ |
| Move Generation Speed | 2.5-4x faster    | 🚧     |
| Memory Usage          | 50-70% reduction | 🚧     |
| API Compatibility     | 100%             | 🚧     |
| Test Coverage         | >90%             | 🚧     |

## Contributing

This package is part of the CoTuLenh monorepo. See the main repository for contribution guidelines.

## License

MIT
