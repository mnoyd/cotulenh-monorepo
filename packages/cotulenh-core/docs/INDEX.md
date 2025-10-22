# CoTuLenh Documentation Index

Welcome to the comprehensive CoTuLenh documentation!

## 🎯 START HERE: Deploy Architecture

### ✅ CURRENT: [Action-Based Deploy Architecture](deploy-action-based-architecture/)

**The authoritative production-ready architecture** - All issues resolved, ready
to implement

**Read**: `FINAL-STATUS.md` → `COMPLETE-IMPLEMENTATION-GUIDE.md` →
`SAN-PARSER-SPEC.md`

### 📋 Architecture Overview: [ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md)

**Complete consolidation of all approaches** - Virtual state evolution →
Action-based solution

---

## 🚀 Quick Start

| Goal                                     | Start Here                                                                                                                      | Time      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **Understand deploy architecture**       | [ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md) → [deploy-action-based-architecture/](deploy-action-based-architecture/) | 2 hours   |
| **Port to new language**                 | [context/PORTING-GUIDE.md](context/PORTING-GUIDE.md)                                                                            | 4-5 hours |
| **Understand TypeScript implementation** | [ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md) (legacy virtual state explained)                                         | 1 hour    |
| **Learn game rules only**                | [context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)                                    | 1 hour    |
| **Validate knowledge**                   | [context/IMPLEMENTATION-CHECKLIST.md](context/IMPLEMENTATION-CHECKLIST.md)                                                      | 30 min    |

---

## 📚 All Documents by Category

### Meta Documentation (7 files)

- [README.md](README.md) - Main documentation hub
- [INDEX.md](INDEX.md) - This file
- [ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md) - **Deploy architecture
  consolidation** ⭐
- [STRUCTURE.md](STRUCTURE.md) - Documentation structure
- [context/README.md](context/README.md) - Context documentation guide
- [context/PORTING-GUIDE.md](context/PORTING-GUIDE.md) - **Master porting
  guide**
- [context/IMPLEMENTATION-CHECKLIST.md](context/IMPLEMENTATION-CHECKLIST.md) -
  **118-point validation**
- [context/AI-MASTER-INSTRUCTION.md](context/AI-MASTER-INSTRUCTION.md) - AI
  agent instructions

### Complete References (3 files)

- [context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md) -
  **All rules**
- [context/complete-piece-behavior-reference.md](context/complete-piece-behavior-reference.md) -
  **All 11 pieces**
- [context/complete-request-response-examples.md](context/complete-request-response-examples.md) -
  **Test cases**

### Piece Mechanics (9 files)

- [context/piece-mechanics-commander.md](context/piece-mechanics-commander.md) -
  Commander (C)
- [context/piece-mechanics-infantry-engineer-antiair.md](context/piece-mechanics-infantry-engineer-antiair.md) -
  Infantry (I), Engineer (E), Anti-Air (A)
- [context/piece-mechanics-militia.md](context/piece-mechanics-militia.md) -
  Militia (M)
- [context/piece-mechanics-tank.md](context/piece-mechanics-tank.md) - Tank (T)
- [context/piece-mechanics-artillery.md](context/piece-mechanics-artillery.md) -
  Artillery (G)
- [context/piece-mechanics-missile.md](context/piece-mechanics-missile.md) -
  Missile (S)
- [context/piece-mechanics-airforce.md](context/piece-mechanics-airforce.md) -
  Air Force (F)
- [context/piece-mechanics-navy.md](context/piece-mechanics-navy.md) - Navy (N)
- [context/piece-mechanics-headquarter.md](context/piece-mechanics-headquarter.md) -
  Headquarter (H)

### Terrain System (3 files)

- [context/terrain-board-layout.md](context/terrain-board-layout.md) - Board
  structure
- [context/terrain-zones-masks.md](context/terrain-zones-masks.md) -
  Water/land/mixed zones
- [context/heavy-piece-river-crossing.md](context/heavy-piece-river-crossing.md) -
  River crossing rules

### Advanced Mechanics (7 files)

- [context/stack-combination-rules.md](context/stack-combination-rules.md) -
  Stack formation
- [context/stack-splitting-movement.md](context/stack-splitting-movement.md) -
  Deploy mechanics
- [context/heroic-promotion-system.md](context/heroic-promotion-system.md) -
  Heroic status
- [context/air-defense-system.md](context/air-defense-system.md) - Air defense
  zones
- [context/commander-exposure-rules.md](context/commander-exposure-rules.md) -
  Flying general
- [context/capture-types-mechanics.md](context/capture-types-mechanics.md) -
  Normal/stay/suicide
- [context/piece-mechanics-validation.md](context/piece-mechanics-validation.md) -
  Cross-validation

### Data Formats (3 files)

- [context/fen-format-construction.md](context/fen-format-construction.md) - FEN
  with stacks
- [context/san-notation-construction.md](context/san-notation-construction.md) -
  Move notation
- [context/internal-game-state-representation.md](context/internal-game-state-representation.md) -
  State design

### API & Patterns (3 files)

- [context/external-api-usage-guide.md](context/external-api-usage-guide.md) -
  Public API
- [context/game-initialization-pattern.md](context/game-initialization-pattern.md) -
  Setup
- [context/move-validation-execution-cycle.md](context/move-validation-execution-cycle.md) -
  Move flow
- [context/game-state-query-interface.md](context/game-state-query-interface.md) -
  State queries

### TypeScript Implementation (5 files)

- [context/codebase-dependencies.md](context/codebase-dependencies.md) - Code
  structure
- [context/data-flow-analysis.md](context/data-flow-analysis.md) - Data flow
- [context/deploy-move-documentation.md](context/deploy-move-documentation.md) -
  Deploy system
- [context/api-flow-documentation.md](context/api-flow-documentation.md) - API
  flow
- [context/api-validation-test.ts](context/api-validation-test.ts) - Test
  examples

### Deploy Architecture (Current) ⭐

- [deploy-action-based-architecture/FINAL-STATUS.md](deploy-action-based-architecture/FINAL-STATUS.md) -
  **Current status, all issues resolved**
- [deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md](deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md) -
  **Core specification**
- [deploy-action-based-architecture/SAN-PARSER-SPEC.md](deploy-action-based-architecture/SAN-PARSER-SPEC.md) -
  **Parser implementation**
- [deploy-action-based-architecture/RESOLVED-GAPS.md](deploy-action-based-architecture/RESOLVED-GAPS.md) -
  Design decisions
- [deploy-action-based-architecture/00-OVERVIEW.md](deploy-action-based-architecture/00-OVERVIEW.md) -
  Architecture overview
- [deploy-action-based-architecture/01-FEN-HANDLING.md](deploy-action-based-architecture/01-FEN-HANDLING.md) -
  Extended FEN format
- [deploy-action-based-architecture/02-MOVE-GENERATION.md](deploy-action-based-architecture/02-MOVE-GENERATION.md) -
  Move generation

### Legacy Implementation Discussions (14 files) ⚠️ DEPRECATED

- [implementation/board-and-piece-representation.md](implementation/board-and-piece-representation.md) -
  **16x16 mailbox & Piece structure** ⭐
- [implementation/board-representation-analysis.md](implementation/board-representation-analysis.md) -
  **Why mailbox (not bitboards)**
- [implementation/fen-san-notation-design.md](implementation/fen-san-notation-design.md) -
  **FEN & SAN notation analysis**
- [implementation/move-generation-with-immutable-state.md](implementation/move-generation-with-immutable-state.md) -
  **Move generation strategies**
- [implementation/move-application-architecture.md](implementation/move-application-architecture.md) -
  **Move types & state transitions**
- [implementation/mutation-vs-immutability-analysis.md](implementation/mutation-vs-immutability-analysis.md) -
  **Honest performance comparison**
- [legacy-square-by-square-approaches/deploy-session-state-management.md](legacy-square-by-square-approaches/deploy-session-state-management.md) -
  ⚠️ **LEGACY - Virtual state approach**
- [legacy-square-by-square-approaches/deploy-session-ui-engine-api.md](legacy-square-by-square-approaches/deploy-session-ui-engine-api.md) -
  ⚠️ **LEGACY - UI pattern**
- [implementation/command-pattern-architecture.md](implementation/command-pattern-architecture.md) -
  **Command Pattern design**
- [implementation/command-pattern-examples.md](implementation/command-pattern-examples.md) -
  **Complete examples**
- [legacy-square-by-square-approaches/virtual-deploy-state-architecture.md](legacy-square-by-square-approaches/virtual-deploy-state-architecture.md) -
  ⚠️ **DEPRECATED - Replaced by action-based**
- [legacy-square-by-square-approaches/air-defense-zones-architecture.md](legacy-square-by-square-approaches/air-defense-zones-architecture.md) -
  ⚠️ **LEGACY - Virtual state bugs documented**
- [legacy-square-by-square-approaches/virtual-state-integration-flow.md](legacy-square-by-square-approaches/virtual-state-integration-flow.md) -
  ⚠️ **DEPRECATED** **Complete flow: move() → response** ⭐⭐
- [implementation/board-presentation-api.md](implementation/board-presentation-api.md) -
  **Complete UI/Board API** ⭐⭐

---

## 📖 Reading Paths

### Path 1: Porting to New Language (4-5 hours)

**Phase 1: Understanding (30-60 min)**

1. [context/PORTING-GUIDE.md](context/PORTING-GUIDE.md)
2. [context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)
3. [context/internal-game-state-representation.md](context/internal-game-state-representation.md)

**Phase 2: Deep Dive (2-4 hours)** 4.
[context/terrain-board-layout.md](context/terrain-board-layout.md) 5.
[context/terrain-zones-masks.md](context/terrain-zones-masks.md) 6. All 9
piece-mechanics-\*.md files 7. All 7 advanced mechanics files 8.
[context/fen-format-construction.md](context/fen-format-construction.md) 9.
[context/san-notation-construction.md](context/san-notation-construction.md)

**Phase 3: Validation (30 min)** 10.
[context/IMPLEMENTATION-CHECKLIST.md](context/IMPLEMENTATION-CHECKLIST.md) 11.
[context/complete-request-response-examples.md](context/complete-request-response-examples.md)

### Path 2: TypeScript Implementation (2-3 hours)

**Phase 1: Architecture (1 hour)**

1. [implementation/board-representation-analysis.md](implementation/board-representation-analysis.md)
2. [context/codebase-dependencies.md](context/codebase-dependencies.md)
3. [context/data-flow-analysis.md](context/data-flow-analysis.md)

**Phase 2: Patterns (1 hour)** 4.
[context/external-api-usage-guide.md](context/external-api-usage-guide.md) 5.
[context/game-initialization-pattern.md](context/game-initialization-pattern.md) 6.
[context/move-validation-execution-cycle.md](context/move-validation-execution-cycle.md)

**Phase 3: Details (1 hour)** 7.
[context/deploy-move-documentation.md](context/deploy-move-documentation.md) 8.
[context/api-flow-documentation.md](context/api-flow-documentation.md) 9.
[context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)

### Path 3: Game Rules Only (1-2 hours)

**Quick Overview (30 min)**

1. [context/complete-game-mechanics-reference.md](context/complete-game-mechanics-reference.md)
2. [context/complete-piece-behavior-reference.md](context/complete-piece-behavior-reference.md)

**Deep Dive (1 hour)** 3. Individual piece-mechanics-\*.md files for pieces of
interest 4.
[context/stack-combination-rules.md](context/stack-combination-rules.md) 5.
[context/heroic-promotion-system.md](context/heroic-promotion-system.md) 6.
[context/air-defense-system.md](context/air-defense-system.md)

---

## 🔍 Find by Topic

### Board & Coordinates

- [context/terrain-board-layout.md](context/terrain-board-layout.md)
- [context/internal-game-state-representation.md](context/internal-game-state-representation.md)
- [implementation/board-representation-analysis.md](implementation/board-representation-analysis.md)

### Piece Movement

- [context/complete-piece-behavior-reference.md](context/complete-piece-behavior-reference.md)
- All piece-mechanics-\*.md files

### Stacks & Deploy

- [context/stack-combination-rules.md](context/stack-combination-rules.md)
- [context/stack-splitting-movement.md](context/stack-splitting-movement.md)
- [context/deploy-move-documentation.md](context/deploy-move-documentation.md)

### Special Mechanics

- [context/heroic-promotion-system.md](context/heroic-promotion-system.md)
- [context/air-defense-system.md](context/air-defense-system.md)
- [context/commander-exposure-rules.md](context/commander-exposure-rules.md)
- [context/capture-types-mechanics.md](context/capture-types-mechanics.md)

### Data Formats

- [context/fen-format-construction.md](context/fen-format-construction.md)
- [context/san-notation-construction.md](context/san-notation-construction.md)

### Implementation

- [implementation/board-representation-analysis.md](implementation/board-representation-analysis.md)
- [context/codebase-dependencies.md](context/codebase-dependencies.md)
- [context/data-flow-analysis.md](context/data-flow-analysis.md)

---

## 📊 Document Statistics

- **Total documents:** 40+
- **Context (game rules):** 35+ files
- **Implementation (architecture):** 1+ files (growing)
- **Total words:** ~150,000+
- **Reading time:** 4-8 hours for complete mastery

---

## 🎯 Common Questions → Documents

| Question                          | Document                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| How do I port CoTuLenh to Rust?   | [context/PORTING-GUIDE.md](context/PORTING-GUIDE.md)                                               |
| What are all the piece types?     | [context/complete-piece-behavior-reference.md](context/complete-piece-behavior-reference.md)       |
| How does heroic promotion work?   | [context/heroic-promotion-system.md](context/heroic-promotion-system.md)                           |
| What is stay-capture?             | [context/capture-types-mechanics.md](context/capture-types-mechanics.md)                           |
| How do stacks work?               | [context/stack-combination-rules.md](context/stack-combination-rules.md)                           |
| Why not use bitboards?            | [implementation/board-representation-analysis.md](implementation/board-representation-analysis.md) |
| What is the FEN format?           | [context/fen-format-construction.md](context/fen-format-construction.md)                           |
| How does air defense work?        | [context/air-defense-system.md](context/air-defense-system.md)                                     |
| What is commander exposure?       | [context/commander-exposure-rules.md](context/commander-exposure-rules.md)                         |
| How to validate my understanding? | [context/IMPLEMENTATION-CHECKLIST.md](context/IMPLEMENTATION-CHECKLIST.md)                         |

---

**Last updated:** 2025-10-14
