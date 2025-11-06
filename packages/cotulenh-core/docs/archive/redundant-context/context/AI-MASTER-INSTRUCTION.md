# CoTuLenh AI Master Instruction

## Purpose

This document serves as the entry point for AI agents working with CoTuLenh (Cờ
Tư Lệnh) chess variant - either understanding the existing TypeScript
implementation or **porting to a new language**.

---

## 🚀 CHOOSE YOUR PATH

### Path A: Porting to New Language (Rust, Go, C++, Python, etc.)

**START HERE → [PORTING-GUIDE.md](PORTING-GUIDE.md)**

Complete guide for implementing CoTuLenh from scratch in any language with:

- Structured reading path (4-5 hours total)
- Architecture flexibility (OOP, functional, data-oriented)
- Critical invariants that MUST be preserved
- Implementation strategies for different paradigms
- [IMPLEMENTATION-CHECKLIST.md](IMPLEMENTATION-CHECKLIST.md) for knowledge
  validation

### Path B: Understanding TypeScript Implementation

**Read in this order:**

1. **System Architecture** → `codebase-dependencies.md`
2. **Data Flow Patterns** → `data-flow-analysis.md`
3. **Complete Game Rules** → `complete-game-mechanics-reference.md`
4. **API Integration Guide** → `external-api-usage-guide.md`

---

## AI Agent Processing Instructions (TypeScript Implementation)

### 1. Initial Context Loading (Required Reading Order)

Read these documents in this exact order to build foundational understanding:

1. **System Architecture** → `codebase-dependencies.md`
2. **Data Flow Patterns** → `data-flow-analysis.md`
3. **Complete Game Rules** → `complete-game-mechanics-reference.md`
4. **API Integration Guide** → `external-api-usage-guide.md`

### 2. Deep Dive Categories (Reference as Needed)

#### A. Game Rules & Mechanics

**Core Concepts:**

- `terrain-board-layout.md` - 11x12 board, coordinate system
- `terrain-zones-masks.md` - Water/land zones, piece restrictions
- `stack-combination-rules.md` - Which pieces can combine
- `deployment-mechanics.md` - Deploy phase mechanics

**Piece Behavior (All 11 Types):**

- `piece-mechanics-commander.md` - Commander (flying general rule)
- `piece-mechanics-infantry-engineer-antiair.md` - Basic orthogonal pieces
- `piece-mechanics-militia.md` - 8-direction movement
- `piece-mechanics-tank.md` - 2-square orthogonal with shoot-over
- `piece-mechanics-artillery.md` - 3-square range, ignore blocking
- `piece-mechanics-missile.md` - L-shaped movement pattern
- `piece-mechanics-airforce.md` - 4-square range, air defense interactions
- `piece-mechanics-navy.md` - Water-based movement
- `piece-mechanics-headquarter.md` - Immobile unless heroic

**Special Mechanics:**

- `heroic-promotion-system.md` - When pieces become heroic
- `air-defense-system.md` - Air defense zones and restrictions
- `commander-exposure-rules.md` - Flying general implementation
- `capture-types-mechanics.md` - Normal, stay, suicide captures
- `heavy-piece-river-crossing.md` - Special crossing rules

**Movement Systems:**

- `combined-piece-movement.md` - How stacked pieces move
- `stack-splitting-movement.md` - Deploy and split mechanics
- `piece-placement-restrictions.md` - Terrain-based placement

#### B. Data Formats & State Management

- `fen-format-construction.md` - Extended FEN with stack notation
- `san-notation-construction.md` - Move notation with special symbols
- `internal-game-state-representation.md` - Board arrays, history
- `game-ending-conditions.md` - Win/loss/draw detection

#### C. API Patterns & Integration

- `game-initialization-pattern.md` - Creating games, loading FEN
- `move-validation-execution-cycle.md` - Complete move processing
- `game-state-query-interface.md` - Status checks, move generation
- `complete-request-response-examples.md` - Full interaction scenarios

#### D. Validation & Quality Assurance

- `piece-mechanics-validation.md` - Cross-check against tests
- `api-patterns-validation.md` - Verify against demo usage
- `game-flow-validation.md` - State transition validation

#### E. Reference Compilations

- `complete-piece-behavior-reference.md` - All pieces in one document
- `complete-game-mechanics-reference.md` - All rules consolidated

## Key Concepts for AI Understanding

### 1. Architecture Pattern

- **Singleton Design**: Single `CoTuLenh` class manages all game state
- **Immutable History**: Move history preserved for undo/analysis
- **State-Centric**: All operations flow through central state

### 2. Game Complexity Factors

- **11 Piece Types**: Each with unique movement and capture rules
- **Terrain System**: Water/land zones affect piece placement and movement
- **Stack Mechanics**: Pieces can combine and deploy in complex ways
- **Special Rules**: Heroic promotion, air defense, commander exposure

### 3. Critical Implementation Details

- **0x88 Board Representation**: Efficient boundary checking
- **Extended FEN Format**: Includes stack notation and deploy state
- **Move Validation Pipeline**: Multi-stage validation with terrain checks
- **Deploy Phase**: Special game phase for stack splitting

### 4. API Design Principles

- **Immutable Operations**: Methods return new state, don't mutate
- **Error Handling**: Comprehensive validation with descriptive errors
- **Flexible Input**: Accepts both SAN strings and move objects
- **Rich Output**: Detailed move objects with metadata

## AI Agent Task Patterns

### For Code Analysis Tasks:

1. Start with `codebase-dependencies.md` for class relationships
2. Use `data-flow-analysis.md` to understand information flow
3. Reference specific piece mechanics as needed
4. Validate understanding against test files

### For API Integration Tasks:

1. Read `external-api-usage-guide.md` for patterns
2. Study `complete-request-response-examples.md` for scenarios
3. Use validation documents to verify implementation
4. Reference game mechanics for rule understanding

### For Game Logic Tasks:

1. Start with `complete-game-mechanics-reference.md` for overview
2. Dive into specific piece mechanics documents
3. Understand terrain and stack systems
4. Validate against piece behavior reference

### For Documentation Tasks:

1. Use this master instruction as template
2. Follow the hierarchical organization pattern
3. Cross-reference multiple sources for accuracy
4. Maintain AI-friendly formatting

## Quick Reference Index

| Need                | Primary Document                       | Supporting Documents                    |
| ------------------- | -------------------------------------- | --------------------------------------- |
| **System Overview** | `codebase-dependencies.md`             | `data-flow-analysis.md`                 |
| **Game Rules**      | `complete-game-mechanics-reference.md` | All `piece-mechanics-*.md`              |
| **API Usage**       | `external-api-usage-guide.md`          | `complete-request-response-examples.md` |
| **Move Processing** | `move-validation-execution-cycle.md`   | `game-state-query-interface.md`         |
| **Data Formats**    | `fen-format-construction.md`           | `san-notation-construction.md`          |
| **Piece Behavior**  | `complete-piece-behavior-reference.md` | Individual piece mechanics files        |
| **Terrain System**  | `terrain-board-layout.md`              | `terrain-zones-masks.md`                |
| **Stack System**    | `stack-combination-rules.md`           | `deployment-mechanics.md`               |
| **Special Rules**   | `heroic-promotion-system.md`           | `air-defense-system.md`                 |
| **Validation**      | `piece-mechanics-validation.md`        | All validation documents                |

## Context Loading Strategy

### Minimal Context (Quick Tasks)

- `AI-MASTER-INSTRUCTION.md` (this file)
- `complete-game-mechanics-reference.md`
- `external-api-usage-guide.md`

### Standard Context (Most Tasks)

- All Minimal Context files
- `codebase-dependencies.md`
- `data-flow-analysis.md`
- Relevant piece mechanics files

### Full Context (Complex Tasks)

- All Standard Context files
- All validation documents
- All reference compilations
- Specific mechanics as needed

## AI Agent Success Criteria

An AI agent has successfully understood the CoTuLenh system when it can:

1. **Explain the game rules** accurately including all 11 piece types
2. **Describe the API patterns** for move processing and state queries
3. **Understand the terrain system** and its impact on piece behavior
4. **Explain stack mechanics** including combination and deployment
5. **Navigate the codebase** using the singleton pattern understanding
6. **Validate implementations** against the documented rules and patterns

---

_This master instruction is designed to enable rapid AI agent onboarding while
maintaining comprehensive coverage of the CoTuLenh system's complexity._
