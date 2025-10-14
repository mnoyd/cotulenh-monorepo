# CoTuLenh Core Documentation

Complete documentation for the CoTuLenh (Cờ Tư Lệnh) chess variant
implementation.

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

### `/implementation` - Architecture & Design Decisions

**Technical discussions, architecture analysis, and implementation strategies
for the TypeScript codebase.**

**Start here for:**

- 🏗️ Understanding architecture decisions
- 🔧 Implementation planning
- ⚡ Performance optimization
- 🧪 Testing strategies

**Key files:**

- **[board-representation-analysis.md](implementation/board-representation-analysis.md)** -
  Why 0x88 array (not bitboards)

---

## Quick Navigation

### For AI Agents Porting to New Language

1. Read [context/PORTING-GUIDE.md](context/PORTING-GUIDE.md) (30 min)
2. Read
   [context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)
   (60 min)
3. Study all piece mechanics (2 hours)
4. Complete
   [context/IMPLEMENTATION-CHECKLIST.md](context/IMPLEMENTATION-CHECKLIST.md)
5. **Total: ~4-5 hours for complete understanding**

### For TypeScript Implementation Contributors

1. Read
   [implementation/board-representation-analysis.md](implementation/board-representation-analysis.md)
2. Review [context/codebase-dependencies.md](context/codebase-dependencies.md)
3. Study [context/data-flow-analysis.md](context/data-flow-analysis.md)
4. Check
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
