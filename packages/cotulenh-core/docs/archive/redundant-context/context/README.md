# CoTuLenh Complete Documentation

This directory contains **language-agnostic** documentation for the CoTuLenh (Cờ
Tư Lệnh) chess variant, designed for **cross-language porting and AI agent
implementation**.

---

## 🚀 START HERE FOR PORTING

### **[PORTING-GUIDE.md](PORTING-GUIDE.md)** ← **YOUR ENTRY POINT**

Complete guide for implementing CoTuLenh in **any programming language** (Rust,
Go, C++, Python, Java, etc.)

**Covers:**

- 📖 Structured reading path for AI agents
- 🏗️ Architecture flexibility (OOP, functional, data-oriented, hybrid)
- ✅ Critical game rule invariants that MUST be preserved
- 🔧 Implementation strategies for different paradigms
- 🧪 Testing and validation approach
- 🎯 Language-specific recommendations

---

## Documentation Organization

### 📋 Meta Documentation

- **[PORTING-GUIDE.md](PORTING-GUIDE.md)** - Complete porting guide (START HERE)
- **[AI-MASTER-INSTRUCTION.md](AI-MASTER-INSTRUCTION.md)** - AI agent processing
  instructions
- **[ORGANIZATION.md](ORGANIZATION.md)** - Documentation structure planning

### 🔍 System Analysis (Implementation Context)

- **[codebase-dependencies.md](codebase-dependencies.md)** - TypeScript
  implementation structure
- **[Data Flow Analysis](data-flow-analysis.md)** - How data flows
  (implementation example)

### 🎯 Game Rules Encyclopedia

#### Piece Mechanics (All 11 Piece Types)

- [Commander Piece](piece-mechanics-commander.md) - Commander movement, exposure
  rules, special captures
- [Infantry, Engineer, Anti-Air](piece-mechanics-infantry-engineer-antiair.md) -
  Basic 1-square orthogonal pieces
- [Militia Piece](piece-mechanics-militia.md) - 1-square all-direction movement
- [Tank Piece](piece-mechanics-tank.md) - 2-square orthogonal with shoot-over
  ability
- [Artillery Piece](piece-mechanics-artillery.md) - 3-square range with
  ignore-blocking
- [Missile Piece](piece-mechanics-missile.md) - Unique 2-orthogonal/1-diagonal
  pattern
- [Air Force Piece](piece-mechanics-airforce.md) - 4-square range with air
  defense interactions
- [Navy Piece](piece-mechanics-navy.md) - Water-based 4-square movement
- [Headquarter Piece](piece-mechanics-headquarter.md) - Immobile unless heroic

#### Terrain System

- [Board Layout & Coordinates](terrain-board-layout.md) - 11x12 board,
  coordinate system
- [Terrain Zones & Masks](terrain-zones-masks.md) - Water, land, mixed zones
- [Heavy Piece River Crossing](heavy-piece-river-crossing.md) - Special crossing
  rules
- [Piece Placement Restrictions](piece-placement-restrictions.md) -
  Terrain-based placement rules

#### Stack & Deployment System

- [Stack Combination Rules](stack-combination-rules.md) - Which pieces can
  combine
- [Deployment Mechanics](deployment-mechanics.md) - Deploy phase initiation and
  rules
- [Stack Splitting & Movement](stack-splitting-movement.md) - How stacks can be
  split and deployed
- [Combined Piece Movement](combined-piece-movement.md) - How stacked pieces
  move together

#### Special Mechanics

- [Heroic Promotion System](heroic-promotion-system.md) - When and how pieces
  become heroic
- [Air Defense System](air-defense-system.md) - Air defense zones and air force
  restrictions
- [Commander Exposure Rules](commander-exposure-rules.md) - Flying general rule
  implementation
- [Capture Types & Mechanics](capture-types-mechanics.md) - Normal, stay, and
  suicide captures

#### Game State & Data Formats

- [FEN Format Construction](fen-format-construction.md) - Extended FEN with
  stack notation
- [SAN Notation Construction](san-notation-construction.md) - Move notation with
  special symbols
- [Internal Game State](internal-game-state-representation.md) - Board arrays,
  history, deploy state
- [Game Ending Conditions](game-ending-conditions.md) - Checkmate, draw,
  win/loss detection

### 🔌 External API Usage Guide

#### Core API Patterns

- [Game Initialization](game-initialization-pattern.md) - Creating games,
  loading FEN
- [Move Validation & Execution](move-validation-execution-cycle.md) - Complete
  move processing cycle
- [Game State Queries](game-state-query-interface.md) - Checking status, getting
  moves
- [Complete Request-Response Examples](complete-request-response-examples.md) -
  Full interaction scenarios

### ✅ Validation & Cross-Reference

#### Validation Documents

- [Piece Mechanics Validation](piece-mechanics-validation.md) - Cross-check
  against tests
- [API Patterns Validation](api-patterns-validation.md) - Verify against demo
  usage
- [Game Flow Validation](game-flow-validation.md) - Validate state transitions

#### Reference Compilations

- [Complete Piece Behavior Reference](complete-piece-behavior-reference.md) -
  All pieces in one document
- [Complete Game Mechanics Reference](complete-game-mechanics-reference.md) -
  All rules in one document
- [External API Usage Guide](external-api-usage-guide.md) - Complete API
  interaction guide

#### Test Implementation

- [API Validation Test](api-validation-test.ts) - TypeScript test for API
  patterns

## How to Use This Documentation

### 🤖 For AI Agents Porting to New Language

**Follow this exact sequence:**

1. **[PORTING-GUIDE.md](PORTING-GUIDE.md)** - Master guide (30 min)
2. **[complete-game-mechanics-reference.md](complete-game-mechanics-reference.md)** -
   All rules (60 min)
3. **[internal-game-state-representation.md](internal-game-state-representation.md)** -
   State architecture (30 min)
4. **All piece-mechanics-\*.md files** - Individual piece rules (2 hours)
5. **Advanced mechanics:** Stacks, heroic, air defense, commander exposure
6. **Data formats:** FEN and SAN notation
7. **[complete-request-response-examples.md](complete-request-response-examples.md)** -
   Test cases

**Total reading time: ~4-5 hours for complete understanding**

### 👨‍💻 For Understanding TypeScript Implementation

1. Read [codebase-dependencies.md](codebase-dependencies.md) for structure
2. Study [data-flow-analysis.md](data-flow-analysis.md) for implementation
   patterns
3. Reference [external-api-usage-guide.md](external-api-usage-guide.md) for API
   design
4. Use validation documents to verify behavior

### 🎮 For Game Rules Only

1. **[complete-game-mechanics-reference.md](complete-game-mechanics-reference.md)** -
   Complete overview
2. **[complete-piece-behavior-reference.md](complete-piece-behavior-reference.md)** -
   All pieces
3. Individual piece/mechanic files as needed

## Documentation Quality Assurance

All documentation follows these principles:

- **Exhaustive Coverage**: Every rule, edge case, and mechanic is documented
- **AI-Friendly Format**: Structured markdown with clear sections and
  cross-references
- **Cross-Validated**: Information verified against multiple code sections and
  tests
- **Implementation-Agnostic**: Pure game logic separated from architectural
  choices
- **Complete Examples**: Full scenarios and edge cases included

## Quick Navigation

| Category            | Key Documents                                                                          |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Game Rules**      | [Complete Game Mechanics Reference](complete-game-mechanics-reference.md)              |
| **API Usage**       | [External API Usage Guide](external-api-usage-guide.md)                                |
| **Piece Behavior**  | [Complete Piece Behavior Reference](complete-piece-behavior-reference.md)              |
| **Data Formats**    | [FEN Format](fen-format-construction.md), [SAN Notation](san-notation-construction.md) |
| **System Analysis** | [Dependency Analysis](dependency-analysis.md), [Data Flow](data-flow-analysis.md)      |

---

_This documentation represents a complete analysis of the CoTuLenh chess
variant, designed to enable perfect implementation in any programming language
while preserving all game mechanics and rules._
