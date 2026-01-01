# CoTuLenh App Documentation

This directory contains documentation specific to the CoTuLenh web application.

## Performance Documentation

### Implementation Guides

- **[LAZY_LOADING_IMPLEMENTATION.md](./LAZY_LOADING_IMPLEMENTATION.md)** - Complete implementation of lazy move generation
  - Performance improvements (94-98% faster)
  - Code changes and patterns
  - Testing and verification
  - Production-ready implementation

- **[QUICK_PERFORMANCE_FIX.md](./QUICK_PERFORMANCE_FIX.md)** - Quick reference guide
  - 15-minute implementation guide
  - Step-by-step instructions
  - Code snippets

### Analysis & Reports

- **[PERFORMANCE_ANALYSIS_REPORT.md](./PERFORMANCE_ANALYSIS_REPORT.md)** - Chrome DevTools analysis
  - Bottleneck identification
  - Console log analysis
  - Performance metrics
  - Root cause analysis

## Related Documentation

### Core Library Performance

See `packages/cotulenh/core/` for core game logic and testing:

- Run `pnpm test` in packages/cotulenh/core for benchmarks
- Run `pnpm bench` for performance analysis

### Architecture & Standards

See `docs/architecture/` for:

- Chess programming standards
- Industry best practices
- Design patterns

### General Performance

See `docs/performance/` for:

- Overall optimization strategies
- Performance planning
- Future improvements

---

## Quick Links

- [Main README](../../../README.md)
- [Core Library](../../../packages/cotulenh/core/)
- [Architecture Docs](../../../docs/architecture/)
