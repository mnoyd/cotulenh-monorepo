# CoTuLenh Complete Ground-Up Rebuild Plan

**Date:** 2025-10-15  
**Approach:** Square-by-square with hybrid bitboard air defense  
**Goal:** Clean, modular, best-practice implementation from scratch  
**Status:** Ready to execute

---

## 🎯 Vision

Build a **production-ready CoTuLenh game engine** following absolute best
practices:

- ✅ **Clean architecture** - Modular, testable, maintainable
- ✅ **Type-safe** - Full TypeScript with strict mode
- ✅ **Immutable state** - No hidden mutations, clear state transitions
- ✅ **Performance** - <15ms move generation, bitboard air defense
- ✅ **Testing** - Comprehensive unit and integration tests
- ✅ **Documentation** - Self-documenting code with clear interfaces

---

## 📋 Current State Analysis

### What We Have (Keep)

- ✅ **`docs/context/`** - Complete game rules documentation (40+ files)
- ✅ **`docs/legacy-square-by-square-approaches/`** - Architecture patterns
- ✅ **`src/bitboard/`** - Bitboard air defense implementation (3 files)
- ✅ **`__tests__/behavior/`** - Game rule tests (10 files, ~200 tests)
- ✅ **`__tests__/bitboard/`** - Bitboard tests (31 passing tests)
- ✅ **`src/type.ts`** - Type definitions
- ✅ **`src/utils.ts`** - Utility functions

### What We Remove (Legacy)

- 🔴 **`src/legacy/`** - Old monolithic implementation (100KB+)
- 🔴 **`__tests__/legacy/`** - Old implementation tests
- 🔴 **`src/cotulenh.ts`** - Stub file pointing to legacy
- 🔴 **`src/deploy-move.ts`** - Stub file pointing to legacy
- 🔴 **`docs/implementation-tracking/`** - Wrong incremental plan
- 🔴 **`docs/MIGRATION_STATUS.md`** - Obsolete migration tracking

---

## 🏗️ Target Architecture

### Module Structure (Clean Separation)

```
src/
├── index.ts                    # Public API exports
├── CoTuLenh.ts                 # Main facade class
│
├── core/                       # Core game entities
│   ├── GameState.ts            # Immutable game state
│   ├── Board.ts                # 0x88 mailbox + piece lists
│   ├── Piece.ts                # Piece type & stack logic
│   ├── Move.ts                 # Move entity with types
│   └── DeploySession.ts        # Virtual deploy state overlay
│
├── move-generation/            # Move generation
│   ├── MoveGenerator.ts        # Main orchestrator
│   ├── generators/
│   │   ├── CommanderGenerator.ts
│   │   ├── InfantryGenerator.ts
│   │   ├── TankGenerator.ts
│   │   ├── MilitiaGenerator.ts
│   │   ├── EngineerGenerator.ts
│   │   ├── ArtilleryGenerator.ts
│   │   ├── AntiAirGenerator.ts
│   │   ├── MissileGenerator.ts
│   │   ├── AirForceGenerator.ts
│   │   ├── NavyGenerator.ts
│   │   └── HeadquarterGenerator.ts
│   └── DeployMoveGenerator.ts  # Deploy move generation
│
├── move-validation/            # Move validation
│   ├── MoveValidator.ts        # Legal move filtering
│   ├── CommanderChecker.ts     # Exposure & attack detection
│   └── TerrainValidator.ts     # Terrain-based validation
│
├── move-application/           # Move execution
│   ├── MoveApplicator.ts       # Make/unmake moves
│   ├── UndoInfo.ts             # Undo data structure
│   └── StateTransitions.ts     # State transition logic
│
├── serialization/              # FEN/SAN
│   ├── FENSerializer.ts        # FEN generation & parsing
│   └── SANParser.ts            # SAN notation
│
├── history/                    # History management
│   └── HistoryManager.ts       # Undo/redo stack
│
├── bitboard/                   # ✅ Already implemented
│   ├── bitboard-utils.ts       # Basic bitboard operations
│   ├── circle-masks.ts         # Precomputed circle masks
│   └── air-defense-bitboard.ts # Air defense calculator
│
├── types/                      # TypeScript types
│   ├── index.ts
│   ├── Board.ts
│   ├── Move.ts
│   ├── GameState.ts
│   └── Piece.ts
│
└── utils/                      # Utilities (existing + new)
    ├── constants.ts
    ├── square.ts
    ├── terrain.ts
    └── validation.ts
```

### Key Architecture Decisions

| Aspect          | Decision                     | Rationale                                 |
| --------------- | ---------------------------- | ----------------------------------------- |
| **Board**       | 0x88 mailbox + piece lists   | Fast for 11×12, efficient iteration       |
| **State**       | Immutable with copy-on-write | Predictable, debuggable, testable         |
| **Move Types**  | Discriminated union types    | Type-safe, compiler-enforced completeness |
| **Deploy**      | Virtual state overlay        | Clean, no branches in main logic          |
| **Air Defense** | Bitboard with caching        | O(1) lookups vs O(n) loops                |
| **Validation**  | Make/unmake with rollback    | Accurate legality checks                  |
| **History**     | Immutable state snapshots    | Simple undo/redo                          |
| **Testing**     | Unit tests per module        | Fast, focused, maintainable               |

---

## 📅 Implementation Phases

### Phase 1: Core Foundation (Week 1)

**Goal:** Build the core data structures and state management

#### Task 1.1: Core Entities (2-3 days)

- [ ] `src/core/Piece.ts` - Piece type, color, heroic, carrying
- [ ] `src/core/Board.ts` - 0x88 board with piece lists
- [ ] `src/core/Move.ts` - Discriminated union move types
- [ ] `src/core/GameState.ts` - Immutable game state
- [ ] `src/core/DeploySession.ts` - Virtual deploy overlay
- [ ] `src/types/` - Complete TypeScript interfaces
- [ ] Unit tests: 50+ tests for core entities

#### Task 1.2: Utilities & Constants (1 day)

- [ ] `src/utils/constants.ts` - Piece types, board dimensions
- [ ] `src/utils/square.ts` - Square conversion utilities
- [ ] `src/utils/terrain.ts` - Terrain masks and validation
- [ ] `src/utils/validation.ts` - Common validators
- [ ] Unit tests: 20+ tests for utilities

**Checkpoint 1:**

- ✅ All core entities compile
- ✅ 70+ unit tests passing
- ✅ Full type safety
- ✅ Zero dependencies on legacy

---

### Phase 2: Move Generation (Week 2)

**Goal:** Generate pseudo-legal moves for all piece types

#### Task 2.1: Move Generator Framework (1 day)

- [ ] `src/move-generation/MoveGenerator.ts` - Main orchestrator
- [ ] Interface for piece-specific generators
- [ ] Integration with DeploySession for virtual state

#### Task 2.2: Piece Generators (3 days)

- [ ] Commander generator (flying general awareness)
- [ ] Infantry, Engineer, Anti-Air generators (orthogonal)
- [ ] Militia generator (8-direction)
- [ ] Tank generator (2-square with shoot-over)
- [ ] Artillery generator (3-square, ignore blocking)
- [ ] Missile generator (L-shaped)
- [ ] Air Force generator (4-square, air defense integration)
- [ ] Navy generator (water terrain + stay-capture)
- [ ] Headquarter generator (immobile unless heroic)
- [ ] Unit tests: 100+ tests covering all pieces

#### Task 2.3: Deploy Move Generation (1 day)

- [ ] `src/move-generation/DeployMoveGenerator.ts`
- [ ] Stack splitting logic
- [ ] Deploy session integration
- [ ] Unit tests: 20+ tests

**Checkpoint 2:**

- ✅ All piece moves generated correctly
- ✅ Terrain validation working
- ✅ 120+ move generation tests passing
- ✅ Performance: <15ms for typical position

---

### Phase 3: Move Validation & Application (Week 3)

**Goal:** Filter legal moves and apply them to state

#### Task 3.1: Move Validation (2 days)

- [ ] `src/move-validation/MoveValidator.ts` - Legal filtering
- [ ] `src/move-validation/CommanderChecker.ts` - Attack/exposure
- [ ] `src/move-validation/TerrainValidator.ts` - Terrain checks
- [ ] Make/unmake simulation for legality
- [ ] Unit tests: 50+ tests

#### Task 3.2: Move Application (2 days)

- [ ] `src/move-application/MoveApplicator.ts` - Apply moves
- [ ] `src/move-application/UndoInfo.ts` - Undo data
- [ ] `src/move-application/StateTransitions.ts` - State logic
- [ ] Handle all 7+ move types
- [ ] Heroic promotion logic
- [ ] Unit tests: 50+ tests

#### Task 3.3: History Management (1 day)

- [ ] `src/history/HistoryManager.ts` - Undo/redo
- [ ] State snapshot management
- [ ] Unit tests: 20+ tests

**Checkpoint 3:**

- ✅ Legal moves filtered correctly
- ✅ All move types apply properly
- ✅ Undo/redo working
- ✅ 120+ validation/application tests passing

---

### Phase 4: Serialization & Public API (Week 4)

**Goal:** FEN/SAN support and clean public interface

#### Task 4.1: FEN Serialization (2 days)

- [ ] `src/serialization/FENSerializer.ts`
- [ ] FEN generation with stack notation
- [ ] FEN parsing with validation
- [ ] Deploy state in FEN
- [ ] Unit tests: 30+ tests

#### Task 4.2: SAN Notation (2 days)

- [ ] `src/serialization/SANParser.ts`
- [ ] SAN parsing (Tc3, Nf6+, etc.)
- [ ] LAN support (e2-e4)
- [ ] Disambiguation logic
- [ ] Unit tests: 30+ tests

#### Task 4.3: CoTuLenh Facade (1 day)

- [ ] `src/CoTuLenh.ts` - Main public API
- [ ] Simple method delegation
- [ ] Caching strategy
- [ ] Error handling
- [ ] Integration tests: 50+ tests

**Checkpoint 4:**

- ✅ FEN round-trips correctly
- ✅ SAN parsing works
- ✅ Public API clean and simple
- ✅ 110+ serialization tests passing
- ✅ All behavioral tests adapted

---

### Phase 5: Integration & Polish (Week 5)

**Goal:** Final integration, optimization, documentation

#### Task 5.1: Behavioral Test Migration (2 days)

- [ ] Adapt all `__tests__/behavior/` tests to new API
- [ ] Verify game rules preserved
- [ ] Edge case coverage
- [ ] ~200 behavioral tests passing

#### Task 5.2: Performance Optimization (1 day)

- [ ] Profile move generation
- [ ] Optimize hot paths
- [ ] Cache tuning
- [ ] Benchmark: <15ms move gen, <5ms validation

#### Task 5.3: Documentation (1 day)

- [ ] API documentation
- [ ] Architecture diagrams
- [ ] Usage examples
- [ ] Migration guide from legacy

#### Task 5.4: Package Configuration (1 day)

- [ ] Build scripts (ESM + CJS)
- [ ] Type declarations
- [ ] Package.json cleanup
- [ ] Bundle size optimization

**Checkpoint 5:**

- ✅ All 200+ behavioral tests passing
- ✅ Performance targets met
- ✅ Complete documentation
- ✅ Ready for production

---

## 🗑️ Cleanup Tasks (Execute First)

### Files to Delete

```bash
# Legacy implementation
rm -rf src/legacy/

# Legacy tests
rm -rf __tests__/legacy/

# Stub files
rm src/cotulenh.ts
rm src/deploy-move.ts

# Obsolete documentation
rm -rf docs/implementation-tracking/
rm docs/MIGRATION_STATUS.md
```

### Files to Keep

```bash
# Preserve these
src/bitboard/          # New bitboard implementation
src/type.ts            # Type definitions
src/utils.ts           # Utilities
__tests__/behavior/    # Game rule tests
__tests__/bitboard/    # Bitboard tests
docs/context/          # Game rules documentation
docs/legacy-square-by-square-approaches/  # Architecture patterns
```

---

## ✅ Success Criteria

### Code Quality

- [ ] 100% TypeScript strict mode
- [ ] Zero `any` types in core logic
- [ ] Full test coverage (>90%)
- [ ] ESLint/Prettier compliant

### Performance

- [ ] Move generation: <15ms for typical position
- [ ] Move validation: <5ms per move
- [ ] FEN serialization: <1ms
- [ ] Memory: <1MB per game instance

### Testing

- [ ] 400+ total tests passing
- [ ] Unit tests for all modules
- [ ] Integration tests for public API
- [ ] All behavioral tests adapted

### Documentation

- [ ] API documentation complete
- [ ] Architecture documented
- [ ] Usage examples provided
- [ ] Migration guide written

---

## 🚀 Execution Strategy

### Step 1: Clean Slate (30 minutes)

Execute cleanup tasks, remove all legacy code

### Step 2: Foundation First (Week 1)

Build core entities with full test coverage before moving on

### Step 3: Incremental Build (Weeks 2-4)

One module at a time, tests before moving forward

### Step 4: Integration (Week 5)

Bring it all together, optimize, document

### Step 5: Production Ready

All tests passing, documentation complete, ready to ship

---

## 📊 Estimated Timeline

| Phase     | Duration     | Deliverable              |
| --------- | ------------ | ------------------------ |
| Cleanup   | 0.5 days     | Legacy removed           |
| Phase 1   | 5 days       | Core foundation          |
| Phase 2   | 5 days       | Move generation          |
| Phase 3   | 5 days       | Validation & application |
| Phase 4   | 5 days       | Serialization & API      |
| Phase 5   | 5 days       | Integration & polish     |
| **Total** | **~5 weeks** | Production-ready engine  |

---

## 🎯 Key Principles

1. **No legacy dependencies** - Complete fresh start
2. **Test-driven** - Write tests first, implementation follows
3. **Type-safe** - Full TypeScript, no shortcuts
4. **Immutable** - Clear state transitions, no hidden mutations
5. **Modular** - Each module has one clear responsibility
6. **Performance** - Meet targets without premature optimization
7. **Documentation** - Self-documenting code + clear docs

---

## 📝 Notes

- **Bitboard air defense** is already implemented and tested (31 tests passing)
- **Behavioral tests** validate game rules, keep them as integration tests
- **Game rules docs** in `docs/context/` are the source of truth
- **Architecture patterns** in `docs/legacy-square-by-square-approaches/` guide
  design
- This is a **library package**, not an application - no UI, no API layer

---

**Ready to build the best CoTuLenh implementation!** 🚀
