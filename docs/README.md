# CoTuLenh Monorepo Documentation

This directory contains general documentation that applies across the entire monorepo.

## Directory Structure

### `/architecture` - Architecture & Design Standards

Cross-cutting architectural documentation and industry standards.

- **[CHESS_PROGRAMMING_STANDARDS.md](./architecture/CHESS_PROGRAMMING_STANDARDS.md)** - Industry best practices
  - Research from chess.js, Lichess, Chess.com
  - Move generation patterns
  - UI/Core separation
  - Performance patterns
  - Code examples from popular libraries

### `/performance` - Performance Strategy & Planning

High-level performance documentation and optimization strategies.

- **[PERFORMANCE_OPTIMIZATION_PLAN.md](./performance/PERFORMANCE_OPTIMIZATION_PLAN.md)** - Comprehensive optimization plan
  - Multiple optimization phases
  - Core library improvements
  - App-layer strategies
  - Future enhancements

## Related Documentation

### Package-Specific Documentation

- **[Core Library](../packages/cotulenh/core/README.md)** - Game engine documentation
  - Game rules and mechanics
  - Deploy system architecture
  - Performance analysis
  - Porting guides

- **[CoTuLenh App](../apps/cotulenh/app/docs/)** - Web application documentation
  - Lazy loading implementation
  - Performance fixes
  - UI optimizations

- **[CoTuLenh Board](../packages/cotulenh/board/docs/)** - Board component documentation
  - Board API reference
  - Visualization guides
  - Deploy UI patterns

### AI Agent Guides

See `docs/ai-agent-guide/` for:

- Common implementation patterns
- API contracts
- Testing strategies
- Debugging guides

---

## Documentation Philosophy

### General Docs (This Directory)

- Cross-cutting concerns
- Architecture standards
- Performance strategy
- Industry research

### Package Docs

- Package-specific implementation
- API documentation
- Technical details
- Code examples

### Context Docs (Core Library)

- Language-agnostic game rules
- Porting guides
- Validation checklists
- Pure mechanics

---

## Quick Links

- [Main README](../README.md)
- [Core Library Docs](../packages/cotulenh/core/docs/)
- [App Docs](../apps/cotulenh/app/docs/)
- [Board Component Docs](../packages/cotulenh/board/docs/)
- [AI Agent Guide](./ai-agent-guide/)
