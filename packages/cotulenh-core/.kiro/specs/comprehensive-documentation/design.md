# Design Document

## Overview

This design document outlines a systematic approach to achieve two critical
objectives:

1. **Complete Game Rules Mastery**: Exhaustive analysis and documentation of
   every CoTuLenh game mechanic, ensuring zero hidden bugs and perfect rule
   fidelity
2. **External API Pattern Documentation**: Clear specification of the
   request-response cycle for game interaction

The approach recognizes that the current codebase uses interconnected singleton
patterns that make analysis challenging. Therefore, we need a systematic
learning strategy to untangle dependencies and extract pure game logic.

## Architecture

### Systematic Learning Strategy

Given the interconnected singleton pattern in the codebase, we need a structured
approach to understand the system:

```
Learning Strategy:
├── Phase 1: Dependency Mapping
│   ├── Map all class relationships and singleton dependencies
│   ├── Identify circular dependencies and tight coupling
│   ├── Trace data flow through the system
│   └── Understand the singleton web structure
├── Phase 2: Game Rules Extraction
│   ├── Analyze each piece type in isolation
│   ├── Extract terrain and movement rules
│   ├── Understand special mechanics and edge cases
│   └── Validate rules against test cases
├── Phase 3: API Pattern Analysis
│   ├── Trace complete request-response cycles
│   ├── Understand state management and updates
│   ├── Map external interaction patterns
│   └── Document the game engine interface
└── Phase 4: Validation and Documentation
    ├── Cross-reference findings across code sections
    ├── Validate understanding with comprehensive tests
    ├── Document pure game rules independent of implementation
    └── Document clean API patterns for external use
```

### Documentation Structure

The final documentation will be organized around the two critical objectives:

```
CoTuLenh Complete Documentation/
├── 1. Complete Game Rules Encyclopedia/
│   ├── Piece Types (All 11 pieces with exact rules)
│   ├── Terrain System (Water, Land, Mixed zones)
│   ├── Movement and Capture Mechanics
│   ├── Special Rules (Heroic, Air Defense, Commander Exposure)
│   ├── Stack and Deployment System
│   ├── Game Flow and State Transitions
│   └── Edge Cases and Exceptions
└── 2. External API Usage Guide/
    ├── Game Initialization Pattern
    ├── Move Validation and Execution Cycle
    ├── State Query and Management
    ├── Game Ending Detection
    └── Complete Request-Response Examples
```

### Cross-Reference System

Each section will include cross-references to related sections, creating a web
of interconnected information that allows readers to navigate between conceptual
understanding and technical implementation.

## Core Functionality Mapping

### Complete Feature Coverage Matrix

To ensure comprehensive documentation coverage, here's the complete mapping of
all core functionality found in the codebase:

#### Game State Management

- **Board Representation**: 0x88 board system, 11x12 grid, square indexing,
  terrain masks (NAVY_MASK, LAND_MASK)
- **Piece Management**: Piece placement, removal, querying, stack handling,
  heroic status tracking
- **Turn Management**: Turn switching, move counting, half-move clock, position
  counting for repetition
- **Game History**: Move history stack, undo/redo functionality, position state
  snapshots
- **Deploy State**: Stack deployment phases, moved pieces tracking, deploy state
  transitions

#### Move System

- **Move Generation**:
  - Normal moves for all 11 piece types (COMMANDER, INFANTRY, TANK, MILITIA,
    ENGINEER, ARTILLERY, ANTI_AIR, MISSILE, AIR_FORCE, NAVY, HEADQUARTER)
  - Deploy moves from stacks
  - Combination moves (piece stacking)
  - Special capture types (normal, stay, suicide)
- **Move Validation**: Legal move filtering, check detection, commander exposure
  validation
- **Move Execution**: Command pattern implementation, atomic operations, state
  updates
- **Move Undo**: Complete state restoration, history management

#### Piece System

- **Piece Types**: All 11 piece types with unique movement patterns and special
  rules
- **Heroic System**: Heroic promotion when attacking commanders, enhanced
  movement/capture ranges
- **Stack System**: Piece carrying, combination rules, deployment mechanics
- **Special Mechanics**:
  - Commander exposure (flying general rule)
  - Air defense zones affecting air force movement
  - Terrain restrictions (water/land/mixed zones)
  - Heavy piece river crossing rules

#### Data Formats

- **FEN Parsing/Generation**: Extended FEN with stack notation `(NFT)`, heroic
  markers `+`
- **Move Notation**: SAN (Standard Algebraic Notation), LAN (Long Algebraic
  Notation)
- **Deploy Move Notation**: Special syntax for stack deployment moves
- **Board Display**: ASCII board representation with terrain visualization

#### Game Logic

- **Check Detection**: Commander attack validation, multiple attacker handling
- **Game Ending**: Checkmate, stalemate, draw conditions (50-move rule,
  repetition)
- **Legal Move Filtering**: Ensuring moves don't leave commander in check or
  exposed
- **Air Defense System**: Zone calculation, air force movement restrictions,
  kamikaze mechanics

#### Utility Functions

- **Coordinate Conversion**: Algebraic notation ↔ internal coordinates
- **Piece Utilities**: Flattening stacks, creating combinations, cloning pieces
- **Validation**: FEN validation, move validation, piece placement validation
- **Debugging**: Board printing, move disambiguation, SAN generation

#### Performance Features

- **Move Caching**: LRU cache for generated moves
- **Position Counting**: Threefold repetition detection
- **Efficient Algorithms**: Optimized move generation, attack detection

## Components and Interfaces

### 1. Game Rules Reference Component

**Purpose**: Provide complete, language-agnostic documentation of all game rules
and mechanics.

**Structure**:

- **Board and Terrain**: 11x12 board layout, coordinate system, terrain zones
  (water/mixed/land), movement restrictions
- **Piece Types**: All 11 piece types with movement patterns, capture rules,
  special abilities, and heroic modifications
- **Stack Mechanics**: Piece combination rules, carrying capacity, deployment
  phases, stack splitting
- **Special Rules**: Commander exposure, air defense systems, heroic promotions,
  game ending conditions

**Key Features**:

- Visual diagrams for movement patterns
- Example positions and scenarios
- Rule interaction matrices
- Exception cases and edge conditions

### 2. Technical Architecture Component

**Purpose**: Document the internal structure, design patterns, and architectural
decisions.

**Structure**:

- **Core Classes**:
  - `CoTuLenh` main game class with all public methods
  - `Move` and `DeployMove` classes for move representation
  - `Piece` interface and piece management
  - Command pattern classes (`CTLMoveCommand`, `DeployMoveCommand`, etc.)
- **Board Representation**:
  - 0x88 board system (256-element array for 11x12 board)
  - Square indexing and coordinate conversion
  - Terrain masks (NAVY_MASK, LAND_MASK) for movement restrictions
- **Move System**:
  - `InternalMove` and `InternalDeployMove` structures
  - Command pattern for move execution/undo
  - Move generation algorithms for each piece type
  - Legal move validation and filtering
- **State Management**:
  - Game history with `History` interface
  - Position counting for repetition detection
  - Deploy state tracking with `DeployState`
  - Commander position tracking
  - Air defense system state

**Key Features**:

- Class diagrams and relationships
- Data flow documentation
- Design pattern explanations
- Memory layout considerations

### 3. API Reference Component

**Purpose**: Complete documentation of all public interfaces and methods.

**Structure**:

- **Constructor and Setup**:
  - `new CoTuLenh(fen?)` - Game initialization
  - `load(fen, options?)` - FEN loading with validation
  - `clear(options?)` - Board clearing and reset
- **Move Operations**:
  - `moves(options?)` - Move generation with filtering
  - `move(move)` - Move execution (SAN string or move object)
  - `deployMove(deployMoveRequest)` - Stack deployment moves
  - `undo()` - Move undo functionality
- **Piece Management**:
  - `get(square, pieceType?)` - Piece querying
  - `put(piece, square, allowCombine?)` - Piece placement
  - `remove(square)` - Piece removal
  - `getHeroicStatus(square, pieceType?)` - Heroic status querying
  - `setHeroicStatus(square, pieceType, heroic)` - Heroic status setting
- **Game State**:
  - `turn()` - Current turn
  - `isCheck()` - Check detection
  - `isCheckmate()` - Checkmate detection
  - `isDraw()` - Draw condition detection
  - `isGameOver()` - Game ending detection
  - `fen()` - FEN generation
- **Utility Methods**:
  - `printBoard()` - ASCII board display
  - `getAttackers(square, color)` - Attack detection
  - `getAirDefense()` - Air defense system state
  - `getDeployState()` - Deploy phase state

**Key Features**:

- Method signatures with parameter types
- Return value specifications
- Usage examples
- Error conditions and exceptions

### 4. Data Formats Component

**Purpose**: Specify all data formats used for game representation and
communication.

**Structure**:

- **Extended FEN**: Stack notation `(NFT)`, heroic markers `+`, position
  encoding
- **Move Notation**: SAN format extensions, deploy move syntax, capture notation
- **Internal Formats**: Piece object structure, board array layout, move flags
- **Serialization**: JSON representations, binary formats, compression
  considerations

**Key Features**:

- Format specifications with EBNF grammar
- Parsing and generation algorithms
- Validation rules and constraints
- Compatibility considerations

### 5. Algorithm Guide Component

**Purpose**: Detailed implementation guidance for complex algorithms and game
logic.

**Structure**:

- **Move Generation**:
  - Per-piece movement algorithms with direction vectors and ranges
  - Terrain-based movement restrictions
  - Blocking detection and piece interaction
  - Heroic piece enhanced movement patterns
- **Legal Validation**:
  - Check detection using `getAttackers()` algorithm
  - Commander exposure detection (`_isCommanderExposed()`)
  - Legal move filtering (`_filterLegalMoves()`)
  - Flying general rule implementation
- **Deploy Mechanics**:
  - Stack splitting algorithms (`createAllPieceSplits()`)
  - Deploy move generation and sequencing
  - Deploy state management and transitions
  - Piece combination validation
- **Air Defense**:
  - Air defense zone calculation (`calculateAirDefenseForSquare()`)
  - Air force movement restriction algorithms
  - Kamikaze detection and suicide capture mechanics
  - Multi-zone air defense interactions
- **Special Algorithms**:
  - FEN parsing with stack notation
  - SAN/LAN move notation generation
  - Position counting for repetition detection
  - Move caching with LRU strategy
- **Optimization**:
  - Move generation caching strategies
  - Performance bottlenecks identification
  - Algorithmic complexity analysis
  - Memory usage optimization

**Key Features**:

- Pseudocode implementations
- Complexity analysis
- Optimization techniques
- Common pitfalls and solutions

### 6. Testing Guide Component

**Purpose**: Comprehensive test cases and validation methods for ensuring
correctness.

**Structure**:

- **Unit Tests**: Individual piece movement, capture mechanics, special rules
- **Integration Tests**: Complete game scenarios, deploy sequences, complex
  interactions
- **Edge Cases**: Board boundaries, invalid moves, error conditions
- **Performance Tests**: Move generation speed, memory usage, scalability

**Key Features**:

- Test case specifications
- Expected outcomes
- Validation methods
- Regression test suites

### 7. Porting Guide Component

**Purpose**: Language-agnostic guidance for implementing the library in
different programming languages.

**Structure**:

- **Architecture Adaptation**: OOP to functional, memory management strategies
- **Data Structure Mapping**: Arrays vs vectors, hash maps vs objects
- **Concurrency Considerations**: Thread safety, immutability, atomic operations
- **Performance Optimization**: Language-specific optimizations, profiling
  guidance

**Key Features**:

- Language comparison matrices
- Implementation strategies
- Common challenges and solutions
- Best practice recommendations

## Data Models

### Documentation Entry Model

```typescript
interface DocumentationEntry {
  id: string
  title: string
  section: DocumentationSection
  content: string
  crossReferences: string[]
  codeExamples: CodeExample[]
  diagrams: Diagram[]
  testCases: TestCase[]
}
```

### Code Example Model

```typescript
interface CodeExample {
  language: string
  code: string
  description: string
  expectedOutput?: string
}
```

### Test Case Model

```typescript
interface TestCase {
  name: string
  setup: string
  action: string
  expectedResult: string
  category: TestCategory
}
```

### Cross-Reference Model

```typescript
interface CrossReference {
  fromSection: string
  toSection: string
  relationship: ReferenceType
  description: string
}
```

## Error Handling

### Documentation Completeness Validation

- **Missing Cross-References**: Detect broken links between sections
- **Incomplete Coverage**: Identify undocumented methods, classes, or rules
- **Inconsistent Information**: Flag contradictions between sections
- **Outdated Examples**: Validate code examples against current implementation

### Quality Assurance

- **Technical Accuracy**: Verify all technical details against source code
- **Clarity Assessment**: Ensure explanations are clear and unambiguous
- **Completeness Check**: Confirm all requirements are addressed
- **Accessibility Review**: Ensure documentation serves both human and AI
  readers

## Testing Strategy

### Documentation Testing Approach

1. **Accuracy Validation**: Cross-check all technical details against source
   code
2. **Completeness Testing**: Verify all public APIs and game rules are
   documented
3. **Usability Testing**: Validate that documentation enables successful porting
4. **Consistency Testing**: Ensure consistent terminology and formatting
   throughout

### Test Categories

- **Rule Verification**: Validate game rule descriptions against test cases
- **API Completeness**: Ensure all public methods are documented
- **Example Validation**: Verify all code examples compile and run correctly
- **Cross-Reference Integrity**: Check all internal links and references

### Validation Methods

- **Automated Checks**: Scripts to validate cross-references and code examples
- **Manual Review**: Expert review of technical accuracy and clarity
- **Implementation Testing**: Use documentation to implement sample
  functionality
- **AI Agent Testing**: Validate that AI agents can successfully use the
  documentation

## Implementation Phases

### Phase 1: Core Documentation Structure

- Set up documentation framework
- Create section templates
- Establish cross-reference system
- Define documentation standards

### Phase 2: Game Rules Documentation

- Document all piece types and movements
- Explain terrain system and restrictions
- Cover stack mechanics and deployment
- Detail special rules and edge cases

### Phase 3: Technical Architecture Documentation

- Document core classes and interfaces
- Explain data structures and representations
- Cover design patterns and architectural decisions
- Detail state management and history tracking

### Phase 4: API and Data Format Documentation

- Complete API reference with all methods
- Document all data formats and specifications
- Provide usage examples and error conditions
- Create validation and parsing guidelines

### Phase 5: Algorithm and Testing Documentation

- Detail all complex algorithms with pseudocode
- Provide comprehensive test cases and scenarios
- Document performance considerations and optimizations
- Create validation and benchmarking guidelines

### Phase 6: Porting Guide and Integration

- Create language-agnostic porting guidance
- Document common challenges and solutions
- Provide implementation strategies and best practices
- Integrate all sections with cross-references

### Phase 7: Validation and Refinement

- Validate documentation completeness and accuracy
- Test usability with sample porting exercises
- Refine based on feedback and testing results
- Finalize cross-reference system and navigation
