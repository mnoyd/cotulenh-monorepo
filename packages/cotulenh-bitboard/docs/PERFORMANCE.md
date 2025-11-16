# Performance Benchmarks

> 🚧 **Under Development** - Benchmarks will be added as implementation progresses.

## Performance Goals

| Metric                  | cotulenh-core | cotulenh-bitboard (Target) | Improvement   |
| ----------------------- | ------------- | -------------------------- | ------------- |
| Move Generation         | ~5ms          | ~2ms                       | 2.5x faster   |
| Position Evaluation     | ~10ms         | ~4ms                       | 2.5x faster   |
| Air Defense Calculation | ~15ms         | ~3ms                       | 5x faster     |
| Memory per Position     | 6KB           | 2KB                        | 70% reduction |
| Cache Size              | 5MB           | 1.5MB                      | 70% reduction |

## Benchmark Methodology

Benchmarks will be conducted using:

- Standard test positions
- Complex positions with stacks
- Positions with active deploy sessions
- 1000+ iterations for statistical significance
- Comparison against cotulenh-core v1.0

## Expected Performance Characteristics

### Move Generation

**Simple Pieces (Infantry, Commander, Militia, Engineer)**

- Current: ~2-5ms per 1000 calls
- Target: ~1-2ms per 1000 calls
- Improvement: 2x faster

**Sliding Pieces (Tank, Artillery, Anti-Air, Missile)**

- Current: ~5-10ms per 1000 calls
- Target: ~1.5-3ms per 1000 calls
- Improvement: 3-4x faster (magic bitboards)

**Air Force (with air defense)**

- Current: ~15-20ms per 1000 calls
- Target: ~3-5ms per 1000 calls
- Improvement: 4-5x faster (bitboard zones)

### Memory Usage

**Core State**

- Current: 3,068 bytes
- Target: 648 bytes
- Reduction: 79%

**Caches**

- Current: 2,000 bytes
- Target: 500 bytes
- Reduction: 75%

**History**

- Current: 1,000 bytes per entry
- Target: 800 bytes per entry
- Reduction: 20%

### Scaling Characteristics

**Position Complexity**

- Bitboards: O(1) for most operations
- 0x88: O(n) where n = piece count

**Board Size**

- Bitboards: Constant time regardless of board size
- 0x88: Linear with board size

## Benchmark Results

> Results will be added here as implementation progresses.

### Phase 1: Core Operations

TBD

### Phase 2: Basic Move Generation

TBD

### Phase 3: Sliding Pieces

TBD

### Phase 4: Air Defense

TBD

### Phase 5: Stack System

TBD

### Phase 6: Deploy System

TBD

### Phase 7: Complete System

TBD

## Profiling

Performance profiling will identify hot paths and optimization opportunities.

### Tools

- Node.js built-in profiler
- Chrome DevTools
- Benchmark.js
- Memory profiler

### Hot Paths (Expected)

1. Move generation (40% of time)
2. Legal move filtering (30% of time)
3. Position evaluation (15% of time)
4. Air defense calculation (10% of time)
5. Other (5% of time)

## Optimization Strategies

### Implemented

- TBD

### Planned

- Magic bitboards for sliding pieces
- Precomputed attack tables
- Bitboard-based air defense zones
- Efficient position hashing
- LRU caching

### Future

- SIMD operations (if beneficial)
- WebAssembly compilation
- Parallel move generation

## Comparison with Other Engines

For reference, modern chess engines achieve:

- Stockfish: ~100M nodes/second
- Leela Chess Zero: ~40K nodes/second (GPU)

CoTuLenh has different mechanics (stacks, deploy, air defense), so direct comparison is not meaningful. However, bitboard architecture brings us closer to modern engine performance characteristics.

## Links

- [Architecture](./ARCHITECTURE.md)
- [Implementation Guide](./IMPLEMENTATION-GUIDE.md)
- [Critical Gaps](./CRITICAL-GAPS.md)
