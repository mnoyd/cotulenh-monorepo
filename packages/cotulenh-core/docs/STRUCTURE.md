# Documentation Structure

Visual overview of the CoTuLenh documentation organization.

---

## Directory Tree

```
docs/
├── README.md                    # Main documentation hub
├── INDEX.md                     # Quick reference index
├── STRUCTURE.md                 # This file
│
├── context/                     # Game rules & porting (45 files)
│   ├── README.md               # Context navigation guide
│   │
│   ├── Meta Documentation (7 files)
│   ├── PORTING-GUIDE.md        ⭐ START HERE for porting
│   ├── IMPLEMENTATION-CHECKLIST.md  ⭐ 118-point validation
│   ├── AI-MASTER-INSTRUCTION.md
│   ├── ORGANIZATION-SUMMARY.md
│   ├── ORGANIZATION.md
│   │
│   ├── Complete References (3 files)
│   ├── complete-game-mechanics-reference.md  ⭐ All rules
│   ├── complete-piece-behavior-reference.md  ⭐ All pieces
│   ├── complete-request-response-examples.md ⭐ Test cases
│   │
│   ├── Piece Mechanics (9 files)
│   ├── piece-mechanics-commander.md
│   ├── piece-mechanics-infantry-engineer-antiair.md
│   ├── piece-mechanics-militia.md
│   ├── piece-mechanics-tank.md
│   ├── piece-mechanics-artillery.md
│   ├── piece-mechanics-missile.md
│   ├── piece-mechanics-airforce.md
│   ├── piece-mechanics-navy.md
│   ├── piece-mechanics-headquarter.md
│   ├── piece-mechanics-validation.md
│   │
│   ├── Terrain System (4 files)
│   ├── terrain-board-layout.md
│   ├── terrain-zones-masks.md
│   ├── heavy-piece-river-crossing.md
│   ├── piece-placement-restrictions.md
│   │
│   ├── Advanced Mechanics (7 files)
│   ├── stack-combination-rules.md
│   ├── stack-splitting-movement.md
│   ├── combined-piece-movement.md
│   ├── deployment-mechanics.md
│   ├── heroic-promotion-system.md
│   ├── air-defense-system.md
│   ├── commander-exposure-rules.md
│   ├── capture-types-mechanics.md
│   │
│   ├── Data Formats (3 files)
│   ├── fen-format-construction.md
│   ├── san-notation-construction.md
│   ├── internal-game-state-representation.md
│   │
│   ├── API & Patterns (5 files)
│   ├── external-api-usage-guide.md
│   ├── game-initialization-pattern.md
│   ├── move-validation-execution-cycle.md
│   ├── game-state-query-interface.md
│   ├── api-patterns-validation.md
│   │
│   ├── Game Logic (2 files)
│   ├── game-ending-conditions.md
│   ├── game-flow-validation.md
│   │
│   └── TypeScript Implementation (2 files)
│       ├── codebase-dependencies.md
│       └── data-flow-analysis.md
│
└── implementation/              # Architecture discussions (1+ files)
    └── board-representation-analysis.md  ⭐ Why 0x88 array
```

---

## File Count Summary

| Category                       | Files  | Purpose                                |
| ------------------------------ | ------ | -------------------------------------- |
| **Meta**                       | 7      | Navigation, porting guides, checklists |
| **Complete References**        | 3      | Compiled overviews                     |
| **Piece Mechanics**            | 10     | All 11 piece types + validation        |
| **Terrain**                    | 4      | Board, zones, restrictions             |
| **Advanced Mechanics**         | 8      | Stacks, heroic, air defense, captures  |
| **Data Formats**               | 3      | FEN, SAN, state representation         |
| **API & Patterns**             | 5      | Public API, initialization, validation |
| **Game Logic**                 | 2      | Ending conditions, flow                |
| **TypeScript Impl**            | 2      | Codebase structure, data flow          |
| **Implementation Discussions** | 1      | Architecture analysis                  |
| **Total**                      | **45** | Complete documentation                 |

---

## Key Entry Points

### 🚀 For Porting to New Language

**Start:** `docs/context/PORTING-GUIDE.md`

- Complete guide for any language (Rust, Go, C++, Python, etc.)
- Structured reading path (4-5 hours)
- Architecture flexibility (OOP, functional, data-oriented, hybrid)
- Critical invariants that MUST be preserved

**Validate:** `docs/context/IMPLEMENTATION-CHECKLIST.md`

- 118 checkpoints across 8 phases
- Self-assessment scoring
- Readiness evaluation

### 🏗️ For TypeScript Implementation

**Start:** `docs/implementation/board-representation-analysis.md`

- Why 0x88 array (not bitboards)
- Performance analysis
- Comparison to Xiangqi/Shogi
- Implementation strategy

**Then:** `docs/context/codebase-dependencies.md`

- Current TypeScript structure
- Module organization
- Dependency graph

### 📖 For Game Rules Only

**Start:** `docs/context/complete-game-mechanics-reference.md`

- All rules in one document
- Complete overview

**Deep Dive:** `docs/context/complete-piece-behavior-reference.md`

- All 11 pieces compiled
- Movement patterns
- Special abilities

---

## Reading Paths

### Path 1: Quick Start (1 hour)

1. `docs/README.md` - Overview
2. `docs/context/complete-game-mechanics-reference.md` - Rules
3. `docs/context/complete-piece-behavior-reference.md` - Pieces

### Path 2: Porting (4-5 hours)

1. `docs/context/PORTING-GUIDE.md` - Master guide (30 min)
2. `docs/context/complete-game-mechanics-reference.md` - Rules (60 min)
3. All piece-mechanics-\*.md files - Pieces (2 hours)
4. Advanced mechanics files - Special rules (1 hour)
5. `docs/context/IMPLEMENTATION-CHECKLIST.md` - Validation (30 min)

### Path 3: TypeScript Development (2-3 hours)

1. `docs/implementation/board-representation-analysis.md` - Architecture (30
   min)
2. `docs/context/codebase-dependencies.md` - Structure (30 min)
3. `docs/context/data-flow-analysis.md` - Flow (30 min)
4. `docs/context/external-api-usage-guide.md` - API (30 min)
5. Advanced mechanics as needed (1 hour)

---

## Document Relationships

### Core Dependencies

```
PORTING-GUIDE.md
    ├─→ complete-game-mechanics-reference.md
    ├─→ internal-game-state-representation.md
    ├─→ All piece-mechanics-*.md
    ├─→ All advanced mechanics
    └─→ IMPLEMENTATION-CHECKLIST.md

board-representation-analysis.md
    ├─→ complete-game-mechanics-reference.md
    ├─→ piece-mechanics-*.md (for move patterns)
    └─→ codebase-dependencies.md
```

### Reference Flow

```
complete-game-mechanics-reference.md
    ├─→ terrain-board-layout.md
    ├─→ All piece-mechanics-*.md
    ├─→ stack-combination-rules.md
    ├─→ heroic-promotion-system.md
    ├─→ air-defense-system.md
    └─→ commander-exposure-rules.md
```

---

## Maintenance

### Adding New Context Documentation

**Location:** `docs/context/` **Naming:** `kebab-case-descriptive-name.md`
**Update:**

- `docs/INDEX.md` - Add to appropriate category
- `docs/context/README.md` - Add to relevant section
- `docs/STRUCTURE.md` - Update file count

### Adding New Implementation Documentation

**Location:** `docs/implementation/` **Naming:** `kebab-case-topic-analysis.md`
**Update:**

- `docs/INDEX.md` - Add to implementation section
- `docs/README.md` - Add to implementation list
- `docs/STRUCTURE.md` - Update file count

---

## Statistics

- **Total documents:** 45 markdown files
- **Total words:** ~150,000+
- **Total lines:** ~10,000+
- **Context documentation:** 44 files (97%)
- **Implementation documentation:** 1 file (3%, growing)
- **Reading time:** 4-8 hours for complete mastery
- **Languages covered:** Language-agnostic (portable to any language)

---

## Quick Search

### By Topic

- **Board:** `terrain-*.md`, `board-representation-analysis.md`
- **Pieces:** `piece-mechanics-*.md`, `complete-piece-behavior-reference.md`
- **Stacks:** `stack-*.md`, `combined-piece-movement.md`,
  `deployment-mechanics.md`
- **Special:** `heroic-*.md`, `air-defense-*.md`, `commander-exposure-*.md`
- **Formats:** `fen-*.md`, `san-*.md`
- **API:** `external-api-*.md`, `game-*-pattern.md`

### By Audience

- **AI Agents:** `PORTING-GUIDE.md`, `AI-MASTER-INSTRUCTION.md`
- **Developers:** `board-representation-analysis.md`, `codebase-dependencies.md`
- **Game Designers:** `complete-game-mechanics-reference.md`
- **Testers:** `complete-request-response-examples.md`,
  `IMPLEMENTATION-CHECKLIST.md`

---

**Last updated:** 2025-10-14 **Documentation version:** 1.0
