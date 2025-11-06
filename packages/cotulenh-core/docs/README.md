# CoTuLenh Core Documentation

Complete documentation for the CoTuLenh (Cờ Tư Lệnh) chess variant
implementation.

**📚 Documentation Version 2.0** - Consolidated from 126 files into streamlined
structure (November 2025)

---

## 🎯 START HERE

### For Current Implementation (TypeScript)

**👉 [docs/current/README.md](current/README.md)** - Single entry point for
current codebase

### For Alternative Architectures (Future)

**👉 [docs/alternatives/README.md](alternatives/README.md)** - Bitboard and
modern approaches

### For Deep Technical Details

**👉 [docs/extracted-information/](extracted-information/)** - Comprehensive
technical analysis

---

## 📁 Documentation Structure

### `/current/` - Current Codebase Support ⭐

**Complete documentation for the existing TypeScript implementation using 0x88
board representation.**

**Key Documents:**

- **[GAME-RULES.md](current/GAME-RULES.md)** - Complete game mechanics (all 11
  pieces, terrain, special rules)
- **[API-GUIDE.md](current/API-GUIDE.md)** - Current TypeScript API reference
- **[IMPLEMENTATION-GUIDE.md](current/IMPLEMENTATION-GUIDE.md)** - Current 0x88
  architecture
- **[MIGRATION-GUIDE.md](current/MIGRATION-GUIDE.md)** - Incremental improvement
  strategies
- **[DATA-FORMATS.md](current/DATA-FORMATS.md)** - FEN/SAN specifications
- **[PIECE-REFERENCE.md](current/PIECE-REFERENCE.md)** - All 11 piece types
  reference
- **[TESTING-GUIDE.md](current/TESTING-GUIDE.md)** - Validation and testing
  approaches

### `/alternatives/` - Future Architecture Exploration

**Exploration of modern chess engine techniques and alternative
implementations.**

**Key Areas:**

- **[bitboard/](alternatives/bitboard/)** - Bitboard architecture for CoTuLenh
- **[references/](alternatives/references/)** - Architecture comparisons and
  benchmarks

### `/extracted-information/` - Deep Technical Analysis

**Comprehensive extraction of technical details, edge cases, and implementation
knowledge.**

**Key Documents:**

- **[critical-markers-catalog.md](extracted-information/critical-markers-catalog.md)** -
  All CRITICAL/WARNING markers
- **[edge-cases-special-mechanics.md](extracted-information/edge-cases-special-mechanics.md)** -
  Complex game scenarios
- **[known-issues-bug-catalog.md](extracted-information/known-issues-bug-catalog.md)** -
  Documented bugs and limitations
- **[technical-implementation-details.md](extracted-information/technical-implementation-details.md)** -
  0x88 implementation specifics
- **[implementation-specific-knowledge.md](extracted-information/implementation-specific-knowledge.md)** -
  Patterns and dependencies

### `/archive/` - Deprecated Content

**Historical documentation preserved for reference. See
[archive/README.md](archive/README.md) for details.**

---

## Quick Navigation

### For Developers Working with Current Codebase

1. **[current/README.md](current/README.md)** - Start here for navigation (5
   min)
2. **[current/GAME-RULES.md](current/GAME-RULES.md)** - Complete game mechanics
   (60 min)
3. **[current/API-GUIDE.md](current/API-GUIDE.md)** - Current TypeScript API (30
   min)
4. **[current/IMPLEMENTATION-GUIDE.md](current/IMPLEMENTATION-GUIDE.md)** -
   Current architecture (45 min)
5. **[current/MIGRATION-GUIDE.md](current/MIGRATION-GUIDE.md)** - Improvement
   strategies (30 min)
6. **Total: ~3 hours for complete understanding**

### For AI Agents Porting to New Language

1. **[current/GAME-RULES.md](current/GAME-RULES.md)** - Complete game mechanics
   (60 min)
2. **[current/PIECE-REFERENCE.md](current/PIECE-REFERENCE.md)** - All 11 pieces
   (45 min)
3. **[current/DATA-FORMATS.md](current/DATA-FORMATS.md)** - FEN/SAN
   specifications (30 min)
4. **[extracted-information/](extracted-information/)** - Deep technical details
   (60 min)
5. **[current/TESTING-GUIDE.md](current/TESTING-GUIDE.md)** - Validation
   approaches (30 min)
6. **Total: ~4 hours for complete understanding**

### For Architecture Research

1. **[alternatives/README.md](alternatives/README.md)** - Alternative approaches
   overview (15 min)
2. **[alternatives/bitboard/](alternatives/bitboard/)** - Bitboard architecture
   exploration (2 hours)
3. **[alternatives/references/](alternatives/references/)** - Comparisons and
   benchmarks (1 hour)
4. **Total: ~3 hours for architecture exploration**

### For Historical Context

1. **[archive/README.md](archive/README.md)** - Archive overview and policies
   (10 min)
2. **[archive/ARCHIVE-INDEX.md](archive/ARCHIVE-INDEX.md)** - Detailed content
   mapping (20 min)
3. **[archive/VERSION-HISTORY.md](archive/VERSION-HISTORY.md)** - Documentation
   evolution (15 min)

---

## Documentation Philosophy

### Current Implementation Focus

- **Accurate Documentation**: Reflects actual TypeScript codebase
- **Incremental Improvement**: Practical enhancement strategies
- **Maintainability**: Clear boundaries and responsibilities
- **AI-Friendly**: Consistent structure for agent consumption

### Alternative Architecture Exploration

- **Future-Oriented**: Modern chess engine techniques
- **Research-Based**: Thorough analysis and benchmarking
- **Implementation-Ready**: Concrete guidance for new repositories
- **Separation of Concerns**: Clear distinction from current implementation

---

## Key Concepts

### Game Characteristics

- **Board:** 11×12 (files a-k, ranks 1-12)
- **Pieces:** 19 per side (38 total)
- **Piece types:** 11 unique types
- **Moves:** ~300-500 pseudo-legal per position

### Special Mechanics

- **Stacks:** Pieces can carry other pieces
- **Deploy:** Stack splitting into multiple moves
- **Heroic:** Pieces gain enhanced abilities
- **Stay-capture:** Attack without moving
- **Air defense:** Circular zones affecting air force
- **Commander exposure:** Flying general rule
- **Terrain:** Water/mixed/land zones

### Current Architecture (0x88)

- **Board:** 0x88 array representation
- **Piece lists:** Fast iteration (19 pieces, not 256 squares)
- **Per-piece generators:** Clean separation of concerns
- **Auxiliary structures:** Terrain masks, air defense state

---

## Version Information

**Current Version:** 2.0 (November 2025)

- **Consolidation:** 126 files → 15 core documents
- **Size Reduction:** 2MB → 500KB (75% reduction)
- **Reading Time:** 8+ hours → 2-3 hours (65% reduction)
- **Maintenance:** High complexity → Low complexity (80% reduction)

**Previous Version:** 1.x (2024-2025) - Archived in `docs/archive/`

---

## Questions?

- **Game rules unclear?** Check [current/GAME-RULES.md](current/GAME-RULES.md)
- **API questions?** Reference [current/API-GUIDE.md](current/API-GUIDE.md)
- **Architecture decisions?** Read
  [current/IMPLEMENTATION-GUIDE.md](current/IMPLEMENTATION-GUIDE.md)
- **Need improvements?** Follow
  [current/MIGRATION-GUIDE.md](current/MIGRATION-GUIDE.md)
- **Alternative approaches?** Explore [alternatives/](alternatives/)
- **Historical context?** Check [archive/](archive/)

**Ready to work with CoTuLenh!** 🚀
