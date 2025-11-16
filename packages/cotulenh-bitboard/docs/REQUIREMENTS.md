# Requirements Document

## Introduction

This specification defines the implementation of a bitboard-based architecture for the CoTuLenh chess engine. The current implementation uses a 0x88 board representation which, while functional, has performance limitations for move generation and position evaluation. This specification addresses the complete transition to a bitboard system that can handle CoTuLenh's unique mechanics including the 11×12 board, stack system, terrain constraints, air defense zones, and heroic status tracking.

## Glossary

- **Bitboard**: A 128-bit data structure representing the 11×12 board (132 squares) using two 64-bit integers
- **0x88 Representation**: Current board representation using a 256-element array with 16×16 grid mapping
- **Stack System**: CoTuLenh's unique mechanic allowing pieces to carry other pieces, creating hierarchical combinations
- **Deploy Session**: Temporary state tracking incremental deployment of stacked pieces across multiple moves
- **Recombine Move**: Special deploy move allowing pieces to rejoin their original stack during deployment
- **Air Defense Zone**: Area of influence where air defense pieces can intercept air units
- **Terrain Mask**: Bitboard representing valid movement areas for specific piece types (navy water, land pieces)
- **Heroic Status**: Enhanced piece state triggered when a piece captures an enemy commander
- **Magic Bitboards**: Precomputed lookup tables using multiplication and bit shifts for fast sliding piece move generation
- **Hybrid Architecture**: Implementation approach using bitboards for performance-critical operations while maintaining compatibility layers
- **Position Hash**: Zobrist hashing for efficient position comparison and transposition table lookups

## Requirements

### Requirement 1: Core Bitboard Data Structures

**User Story:** As a developer implementing the bitboard system, I want fundamental bitboard data structures and operations, so that I can represent and manipulate the 11×12 board efficiently.

#### Acceptance Criteria

1. THE Bitboard Module SHALL define a Bitboard interface with low and high 64-bit integer fields to represent 128 bits
2. THE Bitboard Module SHALL provide bitwise operations: AND, OR, XOR, NOT, shift left, shift right
3. THE Bitboard Module SHALL provide a function to set a bit at a given square index
4. THE Bitboard Module SHALL provide a function to clear a bit at a given square index
5. THE Bitboard Module SHALL provide a function to test if a bit is set at a given square index
6. THE Bitboard Module SHALL provide a function to count the number of set bits (population count)
7. THE Bitboard Module SHALL provide a function to find the index of the least significant set bit
8. THE Bitboard Module SHALL provide a function to find the index of the most significant set bit
9. THE Bitboard Module SHALL define constant bitboards for empty board and full board
10. THE Bitboard Module SHALL define a valid squares mask bitboard representing all 132 valid squares on the 11×12 board

### Requirement 2: Board Representation and Piece Bitboards

**User Story:** As a developer managing game state, I want bitboard representations for all pieces and colors, so that I can efficiently query piece positions and occupancy.

#### Acceptance Criteria

1. THE BitboardPosition Module SHALL maintain 11 bitboards for each piece type (Commander, Infantry, Tank, Militia, Engineer, Artillery, Anti-Air, Missile, Air Force, Navy, Headquarter)
2. THE BitboardPosition Module SHALL maintain 2 bitboards for each color (Red, Blue)
3. THE BitboardPosition Module SHALL maintain 1 bitboard for all occupied squares
4. THE BitboardPosition Module SHALL provide a method to get the piece type at a given square
5. THE BitboardPosition Module SHALL provide a method to get the piece color at a given square
6. THE BitboardPosition Module SHALL synchronize piece bitboards with color bitboards and occupancy bitboard
7. WHEN a piece is placed, THE BitboardPosition Module SHALL update the corresponding piece type bitboard, color bitboard, and occupancy bitboard
8. WHEN a piece is removed, THE BitboardPosition Module SHALL clear the corresponding bits in piece type, color, and occupancy bitboards
9. THE BitboardPosition Module SHALL validate that no square has multiple piece types set simultaneously

### Requirement 3: Terrain and Movement Masks

**User Story:** As a developer implementing movement rules, I want precomputed terrain masks, so that I can efficiently validate piece movement based on terrain constraints.

#### Acceptance Criteria

1. THE Terrain Module SHALL define a navy mask bitboard representing water squares where navy can operate
2. THE Terrain Module SHALL define a land mask bitboard representing land squares where ground units can operate
3. THE Terrain Module SHALL initialize navy mask with squares in files a-c plus specific squares in files d-e at ranks 5-6
4. THE Terrain Module SHALL initialize land mask with squares in files c-k
5. THE Terrain Module SHALL provide a function to check if a square is valid for navy movement
6. THE Terrain Module SHALL provide a function to check if a square is valid for land piece movement
7. THE Terrain Module SHALL provide a function to get valid destination squares for a piece type from a given square
8. WHERE a piece attempts to move to invalid terrain, THE Terrain Module SHALL exclude that square from valid moves

### Requirement 4: Basic Move Generation with Bitboards

**User Story:** As a developer implementing move generation, I want bitboard-based move generation for simple pieces, so that I can generate moves faster than the current 0x88 approach.

#### Acceptance Criteria

1. THE Move Generation Module SHALL generate moves for Infantry using bitboard operations
2. THE Move Generation Module SHALL generate moves for Commander using bitboard operations
3. THE Move Generation Module SHALL generate moves for Militia using bitboard operations
4. THE Move Generation Module SHALL generate moves for Engineer using bitboard operations
5. THE Move Generation Module SHALL use precomputed attack tables for single-step pieces
6. THE Move Generation Module SHALL apply terrain masks to filter invalid destination squares
7. THE Move Generation Module SHALL apply occupancy masks to detect blocked squares
8. THE Move Generation Module SHALL apply enemy occupancy masks to detect capture opportunities
9. THE Move Generation Module SHALL apply friendly occupancy masks to detect combination opportunities
10. THE Move Generation Module SHALL generate moves at least 2x faster than current 0x88 implementation

### Requirement 5: Sliding Piece Move Generation with Magic Bitboards

**User Story:** As a developer optimizing move generation, I want magic bitboard implementation for sliding pieces, so that I can generate moves for Tank, Artillery, Anti-Air, and Missile efficiently.

#### Acceptance Criteria

1. THE Magic Bitboard Module SHALL precompute magic numbers for all 132 squares
2. THE Magic Bitboard Module SHALL precompute attack tables for orthogonal sliding pieces
3. THE Magic Bitboard Module SHALL precompute attack tables for diagonal sliding pieces
4. THE Magic Bitboard Module SHALL provide a function to get sliding attacks given a square and occupancy bitboard
5. THE Move Generation Module SHALL use magic bitboards to generate Tank moves (2-square orthogonal)
6. THE Move Generation Module SHALL use magic bitboards to generate Artillery moves (3-square orthogonal)
7. THE Move Generation Module SHALL use magic bitboards to generate Anti-Air moves (3-square orthogonal)
8. THE Move Generation Module SHALL use magic bitboards to generate Missile moves (4-square orthogonal)
9. THE Move Generation Module SHALL handle Tank's special shoot-over-blocking rule using modified occupancy masks
10. THE Move Generation Module SHALL generate sliding piece moves at least 3x faster than current implementation

### Requirement 6: Air Defense Zone Calculation

**User Story:** As a developer implementing air defense mechanics, I want bitboard-based air defense zone calculation, so that I can efficiently determine which squares are protected by air defense.

#### Acceptance Criteria

1. THE Air Defense Module SHALL maintain bitboards for air defense zones for each color
2. THE Air Defense Module SHALL calculate air defense zones using bitboard operations
3. THE Air Defense Module SHALL use precomputed attack patterns for air defense pieces
4. WHEN an air defense piece is placed, THE Air Defense Module SHALL update the air defense zone bitboard
5. WHEN an air defense piece is removed, THE Air Defense Module SHALL recalculate the air defense zone bitboard
6. THE Air Defense Module SHALL provide a function to check if a square is in an air defense zone
7. THE Air Defense Module SHALL provide a function to get all squares in air defense zones for a color
8. THE Move Generation Module SHALL use air defense zone bitboards to filter Air Force moves
9. THE Air Defense Module SHALL calculate air defense zones at least 5x faster than current implementation

### Requirement 7: Hybrid Stack System Representation

**User Story:** As a developer managing stacked pieces, I want a hybrid approach for stack representation, so that I can balance performance with the complexity of CoTuLenh's stack mechanics.

#### Acceptance Criteria

1. THE Stack System Module SHALL maintain bitboards for carrier pieces (pieces carrying others)
2. THE Stack System Module SHALL maintain a map from square index to stack data structure
3. THE Stack Data Structure SHALL store the carrier piece and array of carried pieces
4. THE Stack System Module SHALL provide a function to check if a square contains a stack
5. THE Stack System Module SHALL provide a function to get stack contents at a square
6. THE Stack System Module SHALL provide a function to add a piece to a stack
7. THE Stack System Module SHALL provide a function to remove a piece from a stack
8. THE Stack System Module SHALL validate stack composition rules (which pieces can carry which)
9. THE Stack System Module SHALL update carrier bitboard when stacks are created or destroyed
10. THE Stack System Module SHALL synchronize stack map with piece bitboards

### Requirement 8: Deploy Move Generation and Execution

**User Story:** As a developer implementing deploy mechanics, I want bitboard-based deploy move generation, so that I can efficiently generate and execute deploy moves during deployment sessions.

#### Acceptance Criteria

1. THE Deploy Module SHALL generate deploy moves using bitboard operations
2. THE Deploy Module SHALL use carrier bitboard to identify squares with stacks
3. THE Deploy Module SHALL generate moves for each piece in a stack to valid destination squares
4. THE Deploy Module SHALL apply terrain masks to deploy move generation
5. THE Deploy Module SHALL apply occupancy masks to detect blocked deploy destinations
6. THE Deploy Module SHALL generate recombine moves to squares where stack pieces were previously deployed
7. THE Deploy Module SHALL track deployed piece locations using a bitboard
8. THE Deploy Module SHALL validate that all pieces in a stack are deployed before session completion
9. THE Deploy Module SHALL execute deploy moves by updating piece bitboards and stack map
10. THE Deploy Module SHALL generate deploy moves at least 2x faster than current implementation

### Requirement 9: Heroic Status Tracking

**User Story:** As a developer implementing heroic mechanics, I want bitboard-based heroic status tracking, so that I can efficiently manage and query heroic piece states.

#### Acceptance Criteria

1. THE Heroic Module SHALL maintain a bitboard for heroic pieces
2. THE Heroic Module SHALL provide a function to mark a piece as heroic at a given square
3. THE Heroic Module SHALL provide a function to check if a piece at a square is heroic
4. THE Heroic Module SHALL provide a function to remove heroic status from a square
5. WHEN a piece captures an enemy commander, THE Heroic Module SHALL mark the capturing piece as heroic
6. WHEN a heroic piece moves, THE Heroic Module SHALL update the heroic bitboard
7. WHEN a heroic piece is captured, THE Heroic Module SHALL clear the heroic bit
8. THE Move Generation Module SHALL apply heroic bonuses to move generation for heroic pieces
9. THE Heroic Module SHALL synchronize heroic bitboard with piece movements
10. THE Heroic Module SHALL provide a function to get all heroic pieces for a color

### Requirement 10: Position Hashing and Zobrist Keys

**User Story:** As a developer implementing position comparison, I want Zobrist hashing for bitboard positions, so that I can efficiently detect repeated positions and implement transposition tables.

#### Acceptance Criteria

1. THE Zobrist Module SHALL precompute random 64-bit keys for each piece type at each square
2. THE Zobrist Module SHALL precompute random 64-bit keys for side to move
3. THE Zobrist Module SHALL precompute random 64-bit keys for heroic status at each square
4. THE Zobrist Module SHALL provide a function to compute the hash of a position
5. THE Zobrist Module SHALL provide a function to incrementally update hash after a move
6. THE Zobrist Module SHALL provide a function to incrementally update hash after heroic status change
7. THE Position Module SHALL maintain the current position hash
8. WHEN a move is executed, THE Position Module SHALL update the position hash incrementally
9. THE Position Module SHALL use position hash for threefold repetition detection
10. THE Position Module SHALL use position hash for transposition table lookups

### Requirement 11: Compatibility Layer and API Preservation

**User Story:** As a developer maintaining backward compatibility, I want a compatibility layer that preserves the current API, so that existing code continues to work without modification.

#### Acceptance Criteria

1. THE Compatibility Layer SHALL implement the CoTuLenh interface using bitboard backend
2. THE Compatibility Layer SHALL provide get(square) method that queries bitboard position
3. THE Compatibility Layer SHALL provide put(piece, square) method that updates bitboard position
4. THE Compatibility Layer SHALL provide remove(square) method that clears bitboard position
5. THE Compatibility Layer SHALL provide moves(options) method that generates moves using bitboards
6. THE Compatibility Layer SHALL provide move(moveRequest) method that executes moves on bitboards
7. THE Compatibility Layer SHALL provide undo() method that reverses moves on bitboards
8. THE Compatibility Layer SHALL provide fen() method that generates FEN from bitboard position
9. THE Compatibility Layer SHALL provide load(fen) method that initializes bitboards from FEN
10. THE Compatibility Layer SHALL pass all existing unit tests without modification

### Requirement 12: Performance Benchmarking and Validation

**User Story:** As a developer validating the bitboard implementation, I want comprehensive performance benchmarks, so that I can verify the performance improvements meet expectations.

#### Acceptance Criteria

1. THE Benchmark Suite SHALL measure move generation speed for bitboard vs 0x88 implementation
2. THE Benchmark Suite SHALL measure air defense zone calculation speed for bitboard vs 0x88
3. THE Benchmark Suite SHALL measure deploy move generation speed for bitboard vs 0x88
4. THE Benchmark Suite SHALL measure memory usage for bitboard vs 0x88 representation
5. THE Benchmark Suite SHALL measure position hash calculation speed
6. THE Benchmark Suite SHALL test performance with various position complexities
7. THE Benchmark Suite SHALL test performance with maximum stack complexity
8. THE Benchmark Suite SHALL verify bitboard implementation achieves minimum 2.5x speedup in move generation
9. THE Benchmark Suite SHALL verify bitboard implementation achieves minimum 50% memory reduction
10. THE Benchmark Suite SHALL verify bitboard implementation produces identical results to 0x88 implementation

### Requirement 13: Incremental Migration Strategy

**User Story:** As a developer managing the transition, I want a phased migration approach, so that I can adopt bitboards incrementally while maintaining system stability.

#### Acceptance Criteria

1. THE Migration Strategy SHALL define Phase 1 as core bitboard infrastructure implementation
2. THE Migration Strategy SHALL define Phase 2 as basic move generation for simple pieces
3. THE Migration Strategy SHALL define Phase 3 as sliding piece move generation with magic bitboards
4. THE Migration Strategy SHALL define Phase 4 as air defense zone calculation
5. THE Migration Strategy SHALL define Phase 5 as hybrid stack system integration
6. THE Migration Strategy SHALL define Phase 6 as deploy move generation and execution
7. THE Migration Strategy SHALL define Phase 7 as heroic status tracking
8. THE Migration Strategy SHALL define Phase 8 as position hashing and optimization
9. THE Migration Strategy SHALL define Phase 9 as compatibility layer and full integration
10. THE Migration Strategy SHALL define Phase 10 as performance optimization and production readiness
11. WHERE a phase is incomplete, THE Migration Strategy SHALL allow fallback to 0x88 implementation
12. THE Migration Strategy SHALL maintain all existing tests passing at each phase completion

### Requirement 14: Critical Missing Components Analysis

**User Story:** As a developer planning the implementation, I want identification of missing components that would block full bitboard adoption, so that I can prioritize development efforts.

#### Acceptance Criteria

1. THE Analysis SHALL identify missing precomputed attack tables for all piece types
2. THE Analysis SHALL identify missing magic number generation algorithm
3. THE Analysis SHALL identify missing stack validation rules in bitboard context
4. THE Analysis SHALL identify missing deploy session state management in bitboard context
5. THE Analysis SHALL identify missing recombine move validation in bitboard context
6. THE Analysis SHALL identify missing commander safety checking in bitboard context
7. THE Analysis SHALL identify missing combination move validation in bitboard context
8. THE Analysis SHALL identify missing FEN parsing and generation for bitboard representation
9. THE Analysis SHALL identify missing move history and undo system for bitboard operations
10. THE Analysis SHALL identify missing air defense influence calculation for stacked pieces
11. THE Analysis SHALL identify missing terrain validation for combined pieces
12. THE Analysis SHALL document each missing component with priority and complexity estimate
