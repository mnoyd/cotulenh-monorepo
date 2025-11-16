# Implementation Plan

## Overview

This implementation plan breaks down the development of `@repo/cotulenh-bitboard` into discrete, manageable tasks. Each task builds incrementally on previous work, with clear objectives and requirements references.

## Task Organization

- Top-level tasks represent major features or milestones
- Sub-tasks are specific implementation steps
- All tasks are required for production-ready implementation
- Each task references specific requirements from requirements.md

---

## Phase 1: Package Setup and Core Bitboard Infrastructure

- [ ] 1. Set up cotulenh-bitboard package structure

  - Create `packages/cotulenh-bitboard` directory
  - Initialize package.json with dependencies (TypeScript, Vitest)
  - Configure TypeScript (tsconfig.json)
  - Configure Vitest for testing
  - Set up build scripts
  - _Requirements: 1.1, 1.2_

- [ ] 2. Implement core bitboard data structures and operations
- [ ] 2.1 Create Bitboard interface and constants

  - Define Bitboard interface with low/high bigint fields
  - Define EMPTY_BB and FULL_BB constants
  - Define VALID_SQUARES_MASK for 11×12 board
  - _Requirements: 1.1, 1.2, 1.9, 1.10_

- [ ] 2.2 Implement basic bitboard operations

  - Implement and(), or(), xor(), not() functions
  - Implement shiftNorth(), shiftSouth(), shiftEast(), shiftWest()
  - Implement isSet(), setBit(), clearBit(), toggleBit()
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 2.3 Implement bitboard query operations

  - Implement popCount() for counting set bits
  - Implement lsb() for least significant bit
  - Implement msb() for most significant bit
  - _Requirements: 1.6, 1.7, 1.8_

- [ ] 2.4 Write unit tests for bitboard operations

  - Test all bitwise operations
  - Test shift operations with boundary conditions
  - Test bit manipulation functions
  - Test query operations (popCount, lsb, msb)
  - _Requirements: 1.1-1.10_

- [ ] 3. Implement position manager with piece bitboards
- [ ] 3.1 Create BitboardPosition interface

  - Define bitboards for all 11 piece types
  - Define bitboards for red and blue colors
  - Define occupancy bitboard
  - Define derived bitboards (carriers, heroic)
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3.2 Implement PositionManager class

  - Implement getPieceAt() method
  - Implement getPieceTypeAt() method
  - Implement placePiece() method with bitboard updates
  - Implement removePiece() method with bitboard updates
  - Implement occupancy query methods
  - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [ ] 3.3 Write unit tests for position manager

  - Test piece placement and removal
  - Test bitboard synchronization
  - Test occupancy queries
  - Test edge cases (placing on occupied square, removing from empty square)
  - _Requirements: 2.1-2.9_

- [ ] 4. Implement terrain masks and movement constraints
- [ ] 4.1 Create TerrainManager class

  - Compute navy mask bitboard (files a-c + specific squares)
  - Compute land mask bitboard (files c-k)
  - Implement isNavySquare() and isLandSquare() methods
  - Implement filterByTerrain() method
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 4.2 Write unit tests for terrain manager
  - Test navy mask coverage
  - Test land mask coverage
  - Test terrain filtering for different piece types
  - _Requirements: 3.1-3.8_

---

## Phase 2: FEN Parsing and Basic API

- [ ] 5. Implement FEN parsing and generation
- [ ] 5.1 Create FEN parser for bitboard positions

  - Parse piece placement and populate bitboards
  - Parse stack notation (parentheses)
  - Parse side to move, move counters
  - Parse deploy session state (if present)
  - Validate FEN format
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 5.2 Create FEN generator from bitboard positions

  - Generate piece placement from bitboards
  - Generate stack notation
  - Generate side to move, move counters
  - Generate deploy session state (if active)
  - _Requirements: 14.5, 14.6, 14.7, 14.8_

- [ ] 5.3 Write unit tests for FEN parsing/generation

  - Test parsing of standard positions
  - Test parsing of positions with stacks
  - Test parsing of positions with deploy sessions
  - Test FEN round-trip (parse -> generate -> parse)
  - Test against cotulenh-core FEN format
  - _Requirements: 14.1-14.8_

- [ ] 6. Implement basic CoTuLenh API
- [ ] 6.1 Create CoTuLenh class with core methods

  - Implement constructor and initialization
  - Implement get(square) method
  - Implement put(piece, square) method
  - Implement remove(square) method
  - Implement fen() method
  - Implement load(fen) method
  - Implement turn() method
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.8, 11.9_

- [ ] 6.2 Write compatibility tests against cotulenh-core
  - Test get/put/remove operations
  - Test FEN generation matches cotulenh-core
  - Test FEN loading produces same state
  - Test basic API behavior matches
  - _Requirements: 11.1-11.9_

---

## Phase 3: Basic Move Generation

- [ ] 7. Precompute attack tables for simple pieces
- [ ] 7.1 Generate attack tables for Infantry

  - Compute 1-square orthogonal attacks for all squares
  - Store in array indexed by square
  - _Requirements: 4.5, 4.10_

- [ ] 7.2 Generate attack tables for Commander

  - Compute unlimited orthogonal attacks for all squares
  - Handle board boundaries
  - _Requirements: 4.5, 4.10_

- [ ] 7.3 Generate attack tables for Militia and Engineer

  - Compute attack patterns for Militia
  - Compute attack patterns for Engineer
  - _Requirements: 4.5, 4.10_

- [ ] 7.4 Write unit tests for attack tables

  - Validate attack patterns for each piece type
  - Test boundary conditions
  - Compare against expected patterns
  - _Requirements: 4.5, 4.10_

- [ ] 8. Implement move generation for simple pieces
- [ ] 8.1 Create MoveGenerator class

  - Initialize with position, stack, and terrain managers
  - Implement generateMoves() entry point
  - Implement generateMovesForPiece() dispatcher
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8.2 Implement Infantry move generation

  - Use precomputed attack table
  - Apply terrain constraints
  - Generate normal moves to empty squares
  - Generate capture moves to enemy squares
  - Generate combination moves to friendly squares
  - _Requirements: 4.1, 4.4, 4.6, 4.7, 4.8, 4.9_

- [ ] 8.3 Implement Commander move generation

  - Use precomputed attack table
  - Apply terrain constraints
  - Generate moves with unlimited range
  - Handle blocking pieces
  - _Requirements: 4.1, 4.4, 4.6, 4.7, 4.8, 4.9_

- [ ] 8.4 Implement Militia and Engineer move generation

  - Generate moves using attack tables
  - Apply terrain and occupancy constraints
  - _Requirements: 4.1, 4.4, 4.6, 4.7, 4.8, 4.9_

- [ ] 8.5 Write unit tests for simple piece move generation

  - Test Infantry moves in various positions
  - Test Commander moves with blocking
  - Test Militia and Engineer moves
  - Test terrain constraint application
  - Compare move counts against cotulenh-core
  - _Requirements: 4.1-4.10_

- [ ] 9. Implement commander safety checking
- [ ] 9.1 Implement isCommanderAttacked() method

  - Check if commander square is attacked by enemy pieces
  - Use attack tables to detect attacks
  - Handle all piece types
  - _Requirements: 14.1, 14.2, 14.3_

- [ ] 9.2 Implement move legality filtering

  - Implement make-unmake pattern for move testing
  - Filter moves that leave commander in check
  - Filter moves that expose commander
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 9.3 Write unit tests for commander safety
  - Test attack detection from all piece types
  - Test move filtering for check situations
  - Test edge cases (pinned pieces, discovered check)
  - _Requirements: 14.1-14.4_

---

## Phase 4: Sliding Pieces with Magic Bitboards

- [ ] 10. Implement magic bitboard generation
- [ ] 10.1 Create magic number finding algorithm

  - Implement trial-and-error magic number search
  - Validate magic numbers for all occupancy patterns
  - Compute optimal shift values
  - _Requirements: 5.1, 5.2_

- [ ] 10.2 Generate magic numbers for all squares

  - Generate magic numbers for orthogonal sliding
  - Generate magic numbers for diagonal sliding (if needed)
  - Store magic numbers and shift values
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 10.3 Precompute attack tables using magic numbers

  - Generate attack tables for all squares and occupancies
  - Validate table correctness
  - Optimize table size
  - _Requirements: 5.2, 5.3, 5.4_

- [ ] 10.4 Write unit tests for magic bitboards

  - Test magic number validity
  - Test attack table lookups
  - Test with various occupancy patterns
  - _Requirements: 5.1-5.4_

- [ ] 11. Implement sliding piece move generation
- [ ] 11.1 Implement Tank move generation

  - Use magic bitboards for 2-square orthogonal moves
  - Handle shoot-over-blocking for captures
  - Apply terrain constraints
  - _Requirements: 5.5, 5.9, 5.10_

- [ ] 11.2 Implement Artillery move generation

  - Use magic bitboards for 3-square orthogonal moves
  - Apply terrain and occupancy constraints
  - _Requirements: 5.6, 5.10_

- [ ] 11.3 Implement Anti-Air move generation

  - Use magic bitboards for 3-square orthogonal moves
  - Apply terrain and occupancy constraints
  - _Requirements: 5.7, 5.10_

- [ ] 11.4 Implement Missile move generation

  - Use magic bitboards for 4-square orthogonal moves
  - Apply terrain and occupancy constraints
  - _Requirements: 5.8, 5.10_

- [ ] 11.5 Write unit tests for sliding piece moves

  - Test Tank moves with shoot-over-blocking
  - Test Artillery, Anti-Air, Missile moves
  - Test terrain constraints
  - Compare against cotulenh-core
  - _Requirements: 5.5-5.10_

- [ ] 12. Performance benchmark sliding piece move generation
  - Benchmark Tank move generation speed
  - Benchmark Artillery/Anti-Air/Missile generation
  - Compare against cotulenh-core (target: 3x faster)
  - Profile and optimize hot paths
  - _Requirements: 5.10, 12.8_

---

## Phase 5: Air Defense System

- [ ] 13. Implement air defense zone calculation
- [ ] 13.1 Create AirDefenseManager class

  - Initialize with position and stack managers
  - Maintain zone bitboards for each color
  - Implement recalculateZones() method
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 13.2 Implement zone calculation for air defense pieces

  - Calculate zones for Anti-Air pieces (3-square range)
  - Calculate zones for Missile pieces (4-square range)
  - Use precomputed attack patterns
  - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 13.3 Handle air defense in stacks

  - Check stacks for air defense pieces
  - Include stacked air defense in zone calculation
  - _Requirements: 6.4, 6.5, 6.8_

- [ ] 13.4 Integrate air defense with move generation

  - Filter Air Force moves through air defense zones
  - Implement isInAirDefenseZone() query
  - Update zones after moves
  - _Requirements: 6.8, 6.9, 6.10_

- [ ] 13.5 Write unit tests for air defense

  - Test zone calculation for Anti-Air and Missile
  - Test zone calculation with stacked pieces
  - Test Air Force move filtering
  - Test zone updates after moves
  - _Requirements: 6.1-6.10_

- [ ] 14. Performance benchmark air defense calculation
  - Benchmark zone calculation speed
  - Compare against cotulenh-core (target: 5x faster)
  - Profile and optimize
  - _Requirements: 6.9, 12.8_

---

## Phase 6: Stack System

- [ ] 15. Implement stack manager with hybrid approach
- [ ] 15.1 Create StackManager class

  - Initialize stack map and carrier bitboard
  - Implement hasStack() and getStack() methods
  - Implement getCarrierBitboard() method
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 15.2 Implement stack creation and destruction

  - Implement createStack() method
  - Implement destroyStack() method
  - Update carrier bitboard
  - Synchronize with position manager
  - _Requirements: 7.6, 7.7, 7.9, 7.10_

- [ ] 15.3 Implement stack modification

  - Implement addToStack() method
  - Implement removeFromStack() method
  - Update stack data structure
  - _Requirements: 7.6, 7.7_

- [ ] 15.4 Implement stack validation rules

  - Define which pieces can carry which pieces
  - Implement validateStackComposition() method
  - Implement canAddToStack() method
  - Document complete stack composition matrix
  - _Requirements: 7.8, 7.9, 14.1, 14.2_

- [ ] 15.5 Write unit tests for stack manager

  - Test stack creation and destruction
  - Test stack modification
  - Test stack validation rules
  - Test all valid stack combinations
  - Test invalid stack combinations
  - _Requirements: 7.1-7.10, 14.1-14.4_

- [ ] 16. Implement combination move generation
- [ ] 16.1 Integrate stack validation with move generation

  - Check if pieces can combine using stack rules
  - Generate combination moves for valid combinations
  - Update stack state after combination
  - _Requirements: 14.3, 14.4, 14.7_

- [ ] 16.2 Write unit tests for combination moves
  - Test combination move generation
  - Test stack creation from combination
  - Test invalid combination rejection
  - Compare against cotulenh-core
  - _Requirements: 14.3, 14.4, 14.7_

---

## Phase 7: Deploy System

- [ ] 17. Implement deploy session manager
- [ ] 17.1 Create DeployManager class

  - Define DeploySessionState interface
  - Implement startSession() method
  - Implement activeSession tracking
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 17.2 Implement deploy move generation

  - Generate deploy moves for each piece in stack
  - Apply terrain constraints to deploy targets
  - Apply occupancy constraints
  - Track deployed piece locations
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.10_

- [ ] 17.3 Implement deploy move execution

  - Execute deploy move and update session state
  - Remove piece from remaining pieces
  - Track deployed piece location
  - Check for session completion
  - _Requirements: 8.8, 8.9, 8.10_

- [ ] 17.4 Implement session completion and auto-commit

  - Detect when all pieces are deployed
  - Complete session automatically
  - Clean up session state
  - _Requirements: 8.8, 8.9_

- [ ] 17.5 Write unit tests for deploy session

  - Test session lifecycle
  - Test deploy move generation
  - Test deploy move execution
  - Test session completion
  - Test auto-commit
  - _Requirements: 8.1-8.10_

- [ ] 18. Implement recombine move generation
- [ ] 18.1 Implement recombine move generation

  - Track deployed piece locations during session
  - Generate recombine moves to deployed pieces
  - Validate recombine targets
  - _Requirements: 8.6, 14.1, 14.2_

- [ ] 18.2 Implement recombine move execution

  - Execute recombine move
  - Update stack at target square
  - Update session state
  - _Requirements: 8.6, 14.3, 14.4_

- [ ] 18.3 Write unit tests for recombine moves
  - Test recombine move generation
  - Test recombine to different deployed pieces
  - Test multiple recombines in one session
  - Compare against cotulenh-core
  - _Requirements: 8.6, 14.1-14.4_

---

## Phase 8: Heroic Status and Position Hashing

- [ ] 19. Implement heroic status tracking
- [ ] 19.1 Add heroic bitboard to position

  - Maintain heroic bitboard in BitboardPosition
  - Implement markHeroic() method
  - Implement isHeroic() method
  - Implement removeHeroic() method
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 19.2 Integrate heroic status with move execution

  - Mark piece as heroic when capturing commander
  - Update heroic bitboard on piece movement
  - Clear heroic bit on piece capture
  - _Requirements: 9.5, 9.6, 9.7_

- [ ] 19.3 Apply heroic bonuses to move generation

  - Implement enhanced move generation for heroic pieces
  - Apply heroic bonuses (if any)
  - _Requirements: 9.8, 9.9_

- [ ] 19.4 Write unit tests for heroic status

  - Test heroic marking on commander capture
  - Test heroic bitboard updates
  - Test heroic piece queries
  - _Requirements: 9.1-9.10_

- [ ] 20. Implement Zobrist hashing
- [ ] 20.1 Generate Zobrist keys

  - Generate random keys for each piece type at each square
  - Generate keys for side to move
  - Generate keys for heroic status
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 20.2 Implement position hash calculation

  - Implement computeHash() method
  - Implement incrementalUpdate() method
  - Maintain current hash in position
  - _Requirements: 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ] 20.3 Implement position comparison

  - Use hash for threefold repetition detection
  - Use hash for transposition table (future)
  - _Requirements: 10.9, 10.10_

- [ ] 20.4 Write unit tests for Zobrist hashing
  - Test hash calculation
  - Test incremental updates
  - Test hash collisions (rare)
  - Test repetition detection
  - _Requirements: 10.1-10.10_

---

## Phase 9: Complete API Implementation

- [ ] 21. Implement move history and undo system
- [ ] 21.1 Define history entry structure

  - Store move data
  - Store position snapshots
  - Store stack state
  - Store air defense zones
  - Store deploy session state
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 21.2 Implement move execution with history

  - Execute move and update all state
  - Create history entry
  - Push to history stack
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 21.3 Implement undo system

  - Pop history entry
  - Restore all state from snapshot
  - Reverse bitboard operations
  - _Requirements: 14.6, 14.7, 14.8, 14.9, 14.10_

- [ ] 21.4 Write unit tests for history and undo

  - Test move execution with history
  - Test undo for all move types
  - Test undo/redo sequences
  - Test state restoration accuracy
  - _Requirements: 14.1-14.10_

- [ ] 22. Implement remaining API methods
- [ ] 22.1 Implement moves() method with options

  - Support legal/pseudo-legal filtering
  - Support piece type filtering
  - Support square filtering
  - Support verbose mode
  - _Requirements: 11.5_

- [ ] 22.2 Implement move() method

  - Parse move request
  - Validate move legality
  - Execute move
  - Return move object
  - _Requirements: 11.6_

- [ ] 22.3 Implement undo() method

  - Expose undo functionality
  - Return undone move
  - _Requirements: 11.7_

- [ ] 22.4 Implement move notation (SAN/LAN)

  - Generate Standard Algebraic Notation
  - Generate Long Algebraic Notation
  - Handle disambiguation
  - _Requirements: 11.5, 11.6_

- [ ] 22.5 Implement game end detection

  - Detect checkmate
  - Detect stalemate
  - Detect threefold repetition
  - Detect insufficient material
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 22.6 Write comprehensive API tests

  - Test all API methods
  - Test method combinations
  - Test edge cases
  - Compare behavior against cotulenh-core
  - _Requirements: 11.1-11.10_

- [ ] 23. Write integration tests for complete game flow
  - Test complete games from start to finish
  - Test games with stacks and deploy
  - Test games with recombine moves
  - Test games with heroic pieces
  - Test undo/redo during games
  - _Requirements: 11.10, 12.9_

---

## Phase 10: Optimization and Production Readiness

- [ ] 24. Performance profiling and optimization

  - Profile move generation hot paths
  - Profile position updates
  - Profile air defense calculation
  - Identify and optimize bottlenecks
  - _Requirements: 12.1, 12.2, 12.3, 12.8_

- [ ] 25. Memory optimization

  - Measure memory usage
  - Optimize bitboard storage
  - Optimize history storage
  - Optimize cache usage
  - _Requirements: 12.4, 12.9_

- [ ] 26. Implement caching strategy

  - Cache move generation results
  - Implement cache invalidation
  - Implement LRU cache
  - Benchmark cache effectiveness
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 27. Comprehensive performance benchmarking

  - Benchmark all operations vs cotulenh-core
  - Verify 2.5x speedup in move generation
  - Verify 50% memory reduction
  - Verify identical results
  - Document performance characteristics
  - _Requirements: 12.1-12.10_

- [ ] 28. Documentation and production readiness
  - Write API documentation
  - Write architecture documentation
  - Write migration guide
  - Write performance comparison
  - Code review and cleanup
  - _Requirements: 13.1-13.12_

---

## Summary

**Total Tasks**: 28 top-level tasks  
**Total Sub-tasks**: 100+ implementation steps  
**All Tasks Required**: Comprehensive testing, optimization, and benchmarking included  
**Estimated Timeline**: 35-50 weeks (9-12 months) with comprehensive quality assurance

**Critical Path**:

1. Core bitboard operations (Phase 1)
2. FEN and basic API (Phase 2)
3. Move generation (Phases 3-4)
4. Stack system (Phase 6) - highest complexity
5. Deploy system (Phase 7)
6. Complete API (Phase 9)

**Key Milestones**:

- **Week 8**: Basic API functional with full test coverage
- **Week 15**: Simple piece move generation complete with benchmarks
- **Week 20**: Sliding piece move generation complete with optimization
- **Week 25**: Air defense system complete with performance validation
- **Week 35**: Stack system complete with comprehensive testing
- **Week 42**: Deploy system complete with integration tests
- **Week 50**: Production ready with full documentation and benchmarks

Each task builds on previous work and includes comprehensive testing and validation. All tasks are required to ensure production-quality implementation.
