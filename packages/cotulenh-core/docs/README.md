# CoTuLenh Core Documentation

Complete documentation for the CoTuLenh (Cờ Tư Lệnh) chess variant
implementation.

---

## 🎯 START HERE: Deploy Architecture (October 22, 2025)

### ✅ Current: Action-Based Deploy System

**CRITICAL FOR ALL IMPLEMENTATIONS**: CoTuLenh's most complex feature has been
redesigned.

- **📚 Master Guide**: [ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md) -
  Complete evolution & comparison
- **⭐ Current Spec**:
  [deploy-action-based-architecture/](deploy-action-based-architecture/) - Ready
  to implement
- **📚 Quick Start**:
  [deploy-action-based-architecture/FINAL-STATUS.md](deploy-action-based-architecture/FINAL-STATUS.md)

**Why This Matters**:

- **Simpler**: Single source of truth (no virtual state overlay)
- **Correct**: All bugs from virtual state approach resolved
- **Complete**: 0 blockers, fully specified, ready to code

**For Porters**: Use action-based architecture (TypeScript codebase uses legacy
virtual state being migrated)

---

## 📁 Documentation Structure

### `/context` - Game Rules & Porting Guide

**Complete game mechanics documentation for understanding and porting CoTuLenh
to any language.**

**Start here for:**

- 🚀 Porting to new language (Rust, Go, C++, Python, etc.)
- 📖 Understanding complete game rules
- 🎯 Learning all 11 piece types
- ✅ Validating your knowledge

**Key files:**

- **[PORTING-GUIDE.md](context/PORTING-GUIDE.md)** ← **START HERE** for
  cross-language porting
- **[IMPLEMENTATION-CHECKLIST.md](context/IMPLEMENTATION-CHECKLIST.md)** -
  118-point validation checklist
- **[README.md](context/README.md)** - Navigation guide
- **[complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)** -
  All rules in one document
- **[complete-piece-behavior-reference.md](context/complete-piece-behavior-reference.md)** -
  All 11 pieces compiled

> 🎯 **DEPLOY ARCHITECTURE** (Updated October 22, 2025):
>
> - **[ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md)** - **READ
>   FIRST** - Why action-based architecture
> - **[deploy-action-based-architecture/](deploy-action-based-architecture/)** -
>   **CURRENT SPEC** - Implementation guide
> - **[DEPLOY-CRITICAL-LEARNINGS.md](context/DEPLOY-CRITICAL-LEARNINGS.md)** -
>   **HISTORICAL** - Virtual state bugs (all resolved)

### `/deploy-action-based-architecture` - Deploy System (Current) ⭐

**The authoritative specification for CoTuLenh's deployment system.**

**Complete and ready to implement:**

- ✅ All critical issues resolved
- 📄 Full specification with examples
- 📦 SAN parser detailed
- 🧪 Test cases defined
- 🚀 Implementation plan (17-26 hours)

**Key files:**

- **[FINAL-STATUS.md](deploy-action-based-architecture/FINAL-STATUS.md)** -
  Current status, 0 blockers
- **[COMPLETE-IMPLEMENTATION-GUIDE.md](deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md)** -
  How to implement
- **[SAN-PARSER-SPEC.md](deploy-action-based-architecture/SAN-PARSER-SPEC.md)** -
  Parser specification

### `/legacy-square-by-square-approaches` - Historical Reference ⚠️

**Previous deploy architecture attempts - DEPRECATED, for reference only.**

- Virtual state overlay approach (TypeScript implementation)
- Square-by-square mutations
- All issues documented and resolved in action-based architecture

### `/implementation` - Other Architecture Discussions

**Technical discussions for non-deploy aspects of TypeScript codebase.**

- **[board-representation-analysis.md](implementation/board-representation-analysis.md)** -
  Why 0x88 array (not bitboards)

### `/performance` - Performance Analysis & Optimization

**Performance documentation for the core library.**

- **[VERBOSE_MODE_PERFORMANCE_ANALYSIS.md](performance/VERBOSE_MODE_PERFORMANCE_ANALYSIS.md)** -
  Deep dive into verbose mode bottlenecks
- **[VERBOSE_BOTTLENECK_SUMMARY.md](performance/VERBOSE_BOTTLENECK_SUMMARY.md)** -
  Executive summary of performance issues

---

## Quick Navigation

### For AI Agents Porting to New Language

1. **[ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md)** - Deploy
   architecture (30 min) ⭐
2. **[deploy-action-based-architecture/FINAL-STATUS.md](deploy-action-based-architecture/FINAL-STATUS.md)** -
   Implementation guide (30 min)
3. Read [context/PORTING-GUIDE.md](context/PORTING-GUIDE.md) (30 min)
4. Read
   [context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)
   (60 min)
5. Study all piece mechanics (2 hours)
6. Complete
   [context/IMPLEMENTATION-CHECKLIST.md](context/IMPLEMENTATION-CHECKLIST.md)
7. **Total: ~5-6 hours for complete understanding**

### For TypeScript Implementation Contributors

1. **[ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md)** - Understand
   virtual state → action-based migration ⭐
2. **[context/DEPLOY-CRITICAL-LEARNINGS.md](context/DEPLOY-CRITICAL-LEARNINGS.md)** -
   Historical bugs to avoid
3. Read
   [implementation/board-representation-analysis.md](implementation/board-representation-analysis.md)
4. Review [context/codebase-dependencies.md](context/codebase-dependencies.md)
5. Study [context/data-flow-analysis.md](context/data-flow-analysis.md)
6. Check
   [context/external-api-usage-guide.md](context/external-api-usage-guide.md)

### For Game Rules Only

1. [context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)
2. [context/complete-piece-behavior-reference.md](context/complete-piece-behavior-reference.md)
3. Individual piece-mechanics-\*.md files as needed

---

## Documentation Philosophy

### Context Documentation (Language-Agnostic)

- **Pure game rules** - No implementation details
- **Architecture flexibility** - OOP, functional, data-oriented, hybrid
- **Critical invariants** - What MUST be preserved
- **Test cases** - Validation examples

### Implementation Documentation (TypeScript-Specific)

- **Architecture decisions** - Why we chose X over Y
- **Performance analysis** - Benchmarks and optimizations
- **Design patterns** - How we structure the code
- **Migration guides** - How to improve existing code

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

### Architecture Decisions

- **Board:** 0x88 array (not bitboards)
- **Piece lists:** Fast iteration (19 pieces, not 256 squares)
- **Per-piece generators:** Clean separation of concerns
- **Auxiliary structures:** Terrain masks, air defense state

---

## Contributing

### Adding Context Documentation

- Keep language-agnostic
- Focus on game rules, not implementation
- Include examples and edge cases
- Cross-reference related documents

### Adding Implementation Documentation

- Explain the "why" behind decisions
- Include performance analysis
- Show code examples
- Reference similar games (Xiangqi, Shogi)

---

## Document Index

### Context (Game Rules)

- Complete references (2 files)
- Piece mechanics (9 files)
- Advanced mechanics (7 files)
- Data formats (3 files)
- Validation (2 files)
- API patterns (3 files)
- Meta documentation (5 files)

### Implementation (Architecture)

- Board representation analysis
- _(More to be added as discussions happen)_

**Total:** 40+ context documents, growing implementation guides

---

## Questions?

- **Game rules unclear?** Check
  [context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)
- **Porting to new language?** Start with
  [context/PORTING-GUIDE.md](context/PORTING-GUIDE.md)
- **Architecture decisions?** Read
  [implementation/board-representation-analysis.md](implementation/board-representation-analysis.md)
- **Need validation?** Use
  [context/IMPLEMENTATION-CHECKLIST.md](context/IMPLEMENTATION-CHECKLIST.md)

**Ready to implement CoTuLenh!** 🚀
