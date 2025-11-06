# Implementation-Specific Knowledge Extraction

## Overview

This document captures all implementation-specific knowledge extracted from the
126 documentation files, focusing on architectural patterns, design decisions,
performance strategies, and technical implementation details specific to the
current TypeScript codebase.

## Singleton Pattern Dependencies and Circular References

### Core Singleton Architecture

**Centralized Singleton Pattern**:

- `CoTuLenh` class serves as main game engine orchestrating all game logic
- Hub-and-spoke architecture where most components depend on central instance
- Single instance manages entire game state with tight coupling
- Singleton-like behavior creates complex dependency relationships

**Dependency Chain Structure**:

```
CoTuLenh (singleton)
├── move-apply.ts (Command Pattern)
├── deploy-move.ts (Deploy System)
├── air-defense.ts (Air Defense)
├── move-generation.ts (Move Generation)
└── utils.ts (Utility Functions)
```

### Circular Dependencies

**Central Hub Pattern**:

- `CoTuLenh` class creates circular dependency pattern
- It imports and uses all other modules
- Other modules require `CoTuLenh` instance to function
- Creates tight coupling but enables centralized state management

**Specific Circular Dependencies**:

1. **CoTuLenh ↔ Move Generation**: Game instance passed to move generation
   functions
2. **CoTuLenh ↔ Air Defense**: Air defense requires CoTuLenh instance for board
   state
3. **CoTuLenh ↔ Deploy Functions**: Deploy functions receive game instance
4. **Move Generation ↔ Board State**: Move generation depends on current board
   state

**Tight Coupling Points**:

- Game instance passed to deploy functions
- Air defense calculations require game instance
- Move generation depends on board state
- Command pattern usage in move execution

### State Management Through Singleton

**Core State Components**:

- Board state: `_board` array (0x88 representation)
- Commander positions: `_commanders` tracking
- Deploy state: `_deployState` management
- Air defense zones: `_airDefense` calculations
- Move history: `_history` tracking
- Position counts: `_positionCount` for repetition detection

**State Synchronization**:

- Singleton pattern ensures state consistency
- All components work with same state
- Performance benefits through caching and state reuse
- Atomicity through command pattern ensures consistent state updates

## Command Pattern Usage in Move Execution and Undo Operations

### Command Pattern Architecture

**Move Execution System**:

- Move execution and undo operations use command pattern
- Each move type has corresponding command class
- Supports undo/redo functionality through atomic operations
- Enables precise state restoration and rollback

**Command Pattern Implementation**:

```typescript
// Command creation and execution
// All move operations are atomic and reversible
// Command pattern enables efficient undo/redo
// State changes are batched for consistency

// Atomic operations ensure atomicity
// Each entry stores complete pre-move state
// Command pattern enables precise undo operations
// Supports both regular moves and deploy moves
```

### Command Types and Structure

**Command Classes**:

- Basic move commands for standard piece movement
- Deploy move commands for stack deployment
- Capture commands for different capture types
- Special move commands (heroic promotion, etc.)

**Command Pattern Integration**:

- Heroic promotion system fully integrated with command pattern
- Deploy system uses command pattern for perfect undo/redo
- All move operations encapsulated in command objects
- Atomic execution ensures consistency

### State Management Through Commands

**History Tracking**:

- Complete move history tracking through command objects
- Each history entry enables perfect undo operations
- Maintains game state consistency across undo/redo
- Command pattern ensures complete rollback capability

**Undo/Redo Functionality**:

- State restoration capabilities through command reversal
- Validation checks before critical operations
- Error reporting for debugging invalid states
- Atomic operations prevent partial state updates

## Move Validation Cycles and Legal Move Filtering Logic

### Legal Move Filtering Architecture

**Dual Validation System**:

- All moves must pass dual validation
- Generate all possible moves first
- Filter through legal move validation
- Complex interdependencies in legal move filtering

**Move Validation Cycle**:

```typescript
// Legal move filtering process
for (move of moves) {
  _makeMove(move) // Try the move
  if (!_isCommanderAttacked(us) && !_isCommanderExposed(us)) {
    legalMoves.push(move) // Move is legal
  }
  _undoMove(move) // Restore state
}
```

### Validation Components

**Commander Exposure Validation**:

- Flying general rule implementation
- Orthogonal exposure check between commanders
- Legal move filtering prevents commander exposure
- Complex calculations for legal move filtering

**Check and Attack Validation**:

- Check detection for commander safety
- Attack calculations for piece threats
- Legal move validation filters illegal positions
- Move filtering with early termination for performance

**Stack-Aware Validation**:

- Stack movement validation
- Deploy move validation with terrain checking
- Stack-aware legal move validation
- Carrier-based movement rule validation

### Performance Implications

**Validation Overhead**:

- Move validation cycles have performance overhead
- Complex positions take longer to validate
- Multiple validation passes with complex interdependencies
- Legal move filtering affects move generation speed

**Optimization Strategies**:

- Early termination for illegal moves
- Caching of attack calculations for repeated positions
- Efficient legal move filtering algorithms
- Minimal validation overhead in critical paths

## State Management Approaches and History Tracking

### Centralized State Management

**State Architecture**:

- Centralized state management through singleton pattern
- All game state managed by single `CoTuLenh` instance
- State consistency ensured through centralized control
- Complete game state tracking and history

**State Components**:

- Board management with 0x88 representation
- Move generation with comprehensive legal move calculation
- State management with complete game state tracking
- Rule enforcement with all game rules implemented

### History Tracking System

**History Structure**:

```typescript
// History entry structure
historyEntry = {
  move: moveCommand,
  commanders: preCommanderState,
  turn: preTurn,
  halfMoves: preHalfMoves,
  moveNumber: preMoveNumber,
}
```

**History Management**:

- Complete move history tracking
- Pre-move state storage for undo operations
- Position counts for repetition detection
- History integrity maintained through command pattern

### Deploy State Management

**Deploy State Tracking**:

- Deploy state management for multi-step deployments
- Deploy session state tracking
- Action-based deploy architecture
- Deploy state efficiency optimization

**State Transitions**:

- Turn management and deploy phases
- State updates through move execution
- Deploy state transitions and completion
- Turn switching after deploy completion

## Performance Optimization Strategies and Caching Mechanisms

### Current Performance Optimizations

**Algorithmic Optimizations**:

- 0x88 board system for fast boundary checking
- O(1) terrain validation using bitmasks
- Efficient direction vectors with 0x88 representation
- Fast boundary checking with single bitwise operation

**Caching Strategies**:

- LRU move caching for expensive move generation results
- Move cache with 1000 entry limit
- Cache keys include FEN, deploy state, and move parameters
- Cache invalidation tied to state changes

**Lazy Evaluation**:

- Air defense zones calculated only when AIR_FORCE moves
- Complex calculations performed only when needed
- Incremental updates for state changes
- Lazy evaluation of expensive calculations

### Memory Management and Caching

**LRU Cache Implementation**:

```typescript
// Performance optimization through caching
private _movesCache = new QuickLRU<string, InternalMove[]>({ maxSize: 1000 })

// Cache management
// - LRU cache for expensive move generation
// - Key includes FEN, deploy state, and filter parameters
// - Invalidated on board state changes
```

**Cache Management**:

- Move caching by carrier type and position
- Attack calculations cached for repeated positions
- Air defense zone caching for performance
- Cache limits to prevent memory leaks

### Performance Bottlenecks and Optimization Opportunities

**Current Bottlenecks**:

- Air defense zone calculation complexity
- Move generation overhead for complex positions
- Memory usage patterns need optimization
- State mutation during operations

**Optimization Opportunities**:

- Caching mechanisms for repeated calculations
- Bitboard representation for faster operations
- Immutable state management
- Parallel processing for move generation

## Memory Usage Patterns and Object Lifecycle Management

### Current Memory Architecture

**Memory Allocation Patterns**:

- Board representation: 256-element array (~2KB per position)
- Additional state tracking structures
- History storage for undo operations
- Position count tracking for repetition detection

**Object Lifecycle**:

- Singleton pattern creates long-lived objects
- Move objects created and destroyed frequently
- State snapshots for undo functionality
- Garbage collection considerations for temporary objects

### Memory Efficiency Issues

**Board Representation Inefficiency**:

- 0x88 representation uses only 51.6% of allocated memory
- 256-element array for 132 valid squares
- Memory waste but enables fast boundary checking
- Trade-off between memory efficiency and performance

**Memory Growth Patterns**:

- History storage grows over time without bounds
- Position counts grow with unique positions
- Move cache has bounded size (1000 entries)
- State tracking in multiple places creates redundancy

### Memory Optimization Strategies

**Current Optimizations**:

- Bounded caches prevent memory leaks
- Object reuse for efficient lifecycle management
- Sparse representation for occupied squares only
- Command pattern with minimal history storage

**Potential Improvements**:

- Bitboard representation (~1KB vs ~2KB per position)
- Object pooling for move generation
- Compressed history storage
- Memory-mapped data structures for large games

## Architecture Strengths and Weaknesses

### Architectural Strengths

**Centralized Control**:

- Single source of truth for game state
- Consistency across all components
- Performance benefits through caching and state reuse
- Atomicity through command pattern

**Proven Patterns**:

- Command pattern for reliable undo/redo
- Singleton pattern for state management
- 0x88 representation for efficient boundary checking
- LRU caching for performance optimization

### Architectural Weaknesses

**Tight Coupling**:

- Circular dependencies create maintenance challenges
- Difficult to test components in isolation
- Changes ripple through multiple components
- Hard to extend or modify individual components

**Scalability Limitations**:

- State management approaches not optimized for scale
- Performance degrades with game length
- Memory usage grows over time
- Single-threaded architecture limits parallelization

### Design Trade-offs

**Performance vs. Maintainability**:

- 0x88 representation: fast but memory inefficient
- Singleton pattern: consistent but tightly coupled
- Command pattern: reliable but complex
- Caching: fast but adds complexity

**Memory vs. Speed**:

- History storage: complete but memory intensive
- Move caching: fast but memory consuming
- State tracking: comprehensive but redundant
- Object lifecycle: functional but not optimized

## Implementation-Specific Insights

### TypeScript-Specific Patterns

**Language Features Used**:

- Object-oriented programming with singleton pattern
- Command pattern with atomic actions
- Mutable singleton with history stack
- Type safety through TypeScript interfaces

**External Dependencies**:

- QuickLRU for move caching
- External piece combination library
- Utility libraries for game logic
- Testing frameworks for validation

### Cross-Platform Considerations

**Porting Challenges**:

- Singleton pattern creates language-specific dependencies
- Command pattern implementation varies by language
- Memory management patterns differ across platforms
- Performance characteristics vary by runtime

**Architecture-Agnostic Elements**:

- Game rules and validation logic
- Move generation algorithms
- State management patterns (general concepts)
- Data flow concepts and architecture principles

### Future Architecture Considerations

**Alternative Approaches**:

- Functional programming with immutable state
- Data-oriented design with component systems
- Hybrid approaches combining multiple paradigms
- Bitboard representation for performance

**Scalability Improvements**:

- Parallel processing for move generation
- Distributed state management
- Streaming algorithms for large games
- Memory-efficient data structures

**Maintainability Enhancements**:

- Dependency injection for loose coupling
- Modular architecture with clear interfaces
- Event-driven architecture for decoupling
- Microservice patterns for large systems
