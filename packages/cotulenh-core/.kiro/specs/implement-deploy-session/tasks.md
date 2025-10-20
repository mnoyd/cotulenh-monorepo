# Implementation Plan

## Overview

This implementation plan converts the virtual deploy state architecture design
into a series of concrete coding tasks. Each task builds incrementally toward
the complete replacement of the old deploy system with the new unified virtual
state architecture.

## Tasks

### 1. Virtual Board Foundation Implementation

- [x] 1.1 Create VirtualBoard class with overlay functionality

  - Create new VirtualBoard class in src/virtual-board.ts
  - Implement constructor accepting realBoard (Board array) and deploySession
  - Add get() method with virtual-first, real-fallback logic using algebraic
    notation
  - Add set() method for virtual state updates
  - Add pieces() generator for unified iteration over both virtual and real
    pieces
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 Create enhanced DeploySession interface with virtual state tracking

  - Create new DeploySession interface in src/type.ts to replace existing
    DeployState
  - Add virtualChanges Map<Square, Piece | null> property for staging changes
  - Add movedPieces array with detailed move tracking (piece, from, to,
    captured)
  - Add stayingPieces array for pieces marked as staying
  - Implement helper methods: getEffectivePiece(), getRemainingPieces(),
    hasMoved()
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 1.3 Implement getEffectiveBoard() abstraction method in CoTuLenh class

  - Add private getEffectiveBoard() method to CoTuLenh class
  - Return VirtualBoard when \_deploySession exists, real \_board array
    otherwise
  - Update method signature to return Board | VirtualBoard union type
  - Ensure proper type safety and interface compatibility
  - _Requirements: 3.1, 3.4_

- [ ]\* 1.4 Create comprehensive unit tests for virtual board functionality
  - Test virtual piece overlay behavior with real and virtual pieces
  - Test piece iteration with virtual changes and no duplicates
  - Test virtual state isolation from real board mutations
  - _Requirements: 1.1, 1.2, 1.3_

### 2. Board Access Migration and Validation Updates

- [x] 2.1 Replace direct \_board access in validation functions

  - Update \_isCommanderAttacked() to use getEffectiveBoard() instead of
    this.\_board
  - Update \_isCommanderExposed() to use getEffectiveBoard() instead of
    this.\_board
  - Update getAttackers() to use effective board state instead of
    this.\_board[sq]
  - Replace all direct \_board array access with getEffectiveBoard().get() calls
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 2.2 Update move generation to use effective board

  - Modify generateNormalMoves() to accept board parameter and use virtual board
    when available
  - Update generateDeployMoves() to work with virtual state instead of direct
    board access
  - Update generateMovesForPiece() to use passed board parameter instead of
    gameInstance.get()
  - Ensure legal move filtering uses effective board state
  - _Requirements: 3.3, 3.4_

- [x] 2.3 Replace board access in FEN generation and game queries

  - Update fen() method to use getEffectiveBoard() for piece scanning instead of
    this.\_board
  - Modify get() method to use getEffectiveBoard() when deploySession is active
  - Update board() method to use effective board state
  - Update printBoard() and other debugging functions
  - _Requirements: 3.4, 5.1_

- [ ]\* 2.4 Add integration tests for validation with virtual state
  - Test commander safety during deploy sessions with virtual pieces
  - Test legal move generation with virtual pieces overlaying real board
  - Test game state queries with active deploy sessions
  - _Requirements: 3.2, 3.3, 3.5_

### 3. Unified Move Application System

- [x] 3.1 Implement MoveContext and dual-mode move application

  - Create MoveContext interface in src/type.ts with isDeployMode and
    deploySession properties
  - Update \_makeMove() method to detect deploy mode and create appropriate
    context
  - Modify move application logic to use context-aware execution
  - Replace direct board mutations with context-aware updates
  - _Requirements: 4.1, 4.2_

- [x] 3.2 Create context-aware move application methods

  - Update NormalMoveCommand to handle both deploy and normal modes
  - Update CaptureMoveCommand to stage changes in virtual state during deploy
    mode
  - Update SingleDeployMoveCommand to use virtual state staging
  - Add logic to detect deploy session completion and commit virtual changes
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3.3 Implement deploy session lifecycle management

  - Add startDeploySession() method to CoTuLenh class for session initialization
  - Implement commitDeploySession() for atomic virtual state commit to real
    board
  - Add rollbackDeploySession() for error recovery and session cancellation
  - Implement session completion detection logic in move commands
  - Update turn switching to only occur when deploy session completes
  - _Requirements: 2.3, 2.4, 4.4_

- [x]\* 3.4 Create comprehensive move application tests
  - Test normal moves in both deploy and normal modes
  - Test deploy moves with virtual state staging and no real board mutation
  - Test session completion and turn switching only after all pieces deployed
  - Test error handling and rollback scenarios
  - _Requirements: 4.1, 4.2, 4.5_

### 4. Command Action System Replacement

- [x] 4.1 Replace SetDeployStateAction with virtual state management

  - Remove SetDeployStateAction class from src/move-apply.ts
  - Update SingleDeployMoveCommand to use new DeploySession interface
  - Replace deploy state tracking with virtual state overlay
  - Update DeployMoveCommand to initialize virtual state instead of old deploy
    state
  - _Requirements: 6.1, 6.2_

- [x] 4.2 Implement virtual-state-aware RemovePieceAction

  - Add MoveContext parameter to RemovePieceAction constructor
  - Implement virtual state updates for deploy mode (update virtualChanges Map)
  - Maintain direct board mutation for normal mode (existing behavior)
  - Update undo logic to restore virtual state or real board based on context
  - _Requirements: 4.1, 4.4_

- [x] 4.3 Implement virtual-state-aware PlacePieceAction

  - Add MoveContext parameter to PlacePieceAction constructor
  - Implement piece placement in virtualChanges Map during deploy mode
  - Maintain normal mode direct board placement (existing behavior)
  - Update undo logic to handle both virtual and real state restoration
  - _Requirements: 4.1, 4.4_

- [x] 4.4 Update RemoveFromStackAction for virtual state

  - Add MoveContext parameter to RemoveFromStackAction constructor
  - Implement virtual stack manipulation during deploy (update virtualChanges)
  - Maintain direct board manipulation for normal mode
  - Ensure atomic stack operations work correctly in virtual state
  - _Requirements: 4.1, 4.5_

- [x]\* 4.5 Add comprehensive action system tests
  - Test all actions in both deploy and normal modes
  - Test undo/redo functionality with virtual state changes
  - Test atomic action sequences and rollback scenarios
  - _Requirements: 4.4, 4.5_

### 5. Extended FEN Format Implementation

- [x] 5.1 Implement extended FEN generation with deploy markers

  - Update fen() method in CoTuLenh class to detect active deploy sessions
  - Implement serializeDeploySession() helper method
  - Add DEPLOY marker with session state information when \_deploySession exists
  - Format: "base_fen DEPLOY originalSquare:remainingPieces moveCount
    virtualChanges"
  - Use effective board state for base FEN generation
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 5.2 Implement extended FEN parsing and loading

  - Update load() method in CoTuLenh class to detect DEPLOY marker
  - Implement parseDeploySession() helper method to reconstruct deploy session
  - Reconstruct virtual state from FEN deploy information into new DeploySession
  - Validate deploy session consistency after loading
  - Set \_deploySession property with reconstructed session
  - _Requirements: 5.3, 5.5_

- [x] 5.3 Add FEN validation for deploy sessions

  - Add validateDeploySession() method to validate session state consistency
  - Check piece count matches between original and moved/staying pieces
  - Ensure virtual state positions are valid board squares
  - Validate that virtual changes don't conflict with real board state
  - _Requirements: 5.5_

- [x]\* 5.4 Create FEN serialization tests
  - Test standard FEN generation when no deploy session is active
  - Test extended FEN with active deploy sessions and virtual changes
  - Test FEN round-trip (generate -> parse -> generate) preserves state
  - Test edge cases with complex virtual state scenarios
  - _Requirements: 5.1, 5.2, 5.3_

### 6. Legacy Code Removal and System Integration

- [x] 6.1 Replace DeployState with new DeploySession interface

  - Update \_deployState property in CoTuLenh class to use new DeploySession
    type
  - Update getDeployState() and setDeployState() methods to work with
    DeploySession
  - Replace all DeployState references with DeploySession throughout codebase
  - Ensure backward compatibility during transition
  - _Requirements: 6.1, 6.2_

- [x] 6.2 Update deploy move generation to use virtual state

  - Modify generateDeployMoves() to work with virtual board state
  - Update move generation to use getEffectiveBoard() instead of direct board
    access
  - Remove legacy deploy state tracking from move generation functions
  - Ensure deploy moves are generated based on virtual state
  - _Requirements: 6.3, 6.4_

- [ ] 6.3 Update all deploy-related tests to use new architecture

  - Modify existing deploy tests in **tests** directory to use virtual state
    system
  - Update test assertions to check virtual state instead of legacy deploy state
  - Add new tests for virtual state scenarios and edge cases
  - Ensure all existing deploy functionality still works with new architecture
  - _Requirements: 6.5_

- [ ] 6.4 Implement deploy move recombination functionality

  - Add logic for pieces to rejoin deployed stacks during deploy sessions
  - Implement range checking for recombination moves in virtual state
  - Add recombination move generation and validation using virtual board
  - Update move commands to handle recombination in virtual state
  - _Requirements: 2.2, 3.3_

- [ ]\* 6.5 Create comprehensive integration tests
  - Test complete deploy sequences with virtual state from start to finish
  - Test complex scenarios (recombination, stay moves, captures) with virtual
    state
  - Test error conditions and edge cases with virtual state rollback
  - Test performance impact of virtual state overhead vs direct board access
  - _Requirements: 6.5_

### 7. Performance Optimization and Final Validation

- [ ] 7.1 Optimize virtual board performance

  - Implement efficient Map operations for virtualChanges using Square keys
  - Add caching for frequently accessed virtual pieces in VirtualBoard class
  - Optimize pieces() generator to minimize iteration overhead
  - Profile and optimize getEffectiveBoard() method calls
  - _Requirements: 1.1, 1.2_

- [ ] 7.2 Add comprehensive error handling and validation

  - Implement virtual state consistency checks in DeploySession
  - Add deploy session validation methods (validateConsistency,
    validateVirtualState)
  - Implement atomic commit/rollback error handling in commitDeploySession
  - Add error recovery for corrupted virtual state scenarios
  - _Requirements: 2.4, 4.4_

- [ ] 7.3 Validate complete system functionality

  - Run full test suite with new virtual state system enabled
  - Test all game scenarios (normal moves, deploy sequences, complex edge cases)
  - Validate performance meets baseline requirements (no significant regression)
  - Ensure complete removal of legacy DeployState code and SetDeployStateAction
  - Verify all existing game functionality works with virtual state architecture
  - _Requirements: 6.5_

- [ ]\* 7.4 Create performance benchmarks and optimization tests
  - Benchmark normal move performance vs baseline (should be unchanged)
  - Test virtual state overhead in deploy scenarios (should be minimal)
  - Validate memory usage with virtual state (should not significantly increase)
  - Create stress tests for complex deploy scenarios with virtual state
  - _Requirements: Performance validation_

## Implementation Notes

### Key Dependencies

- Tasks 1.1-1.3 must be completed before any board access migration
- Task 3.1 depends on completion of Phase 1 (virtual board foundation)
- Legacy code removal (6.1-6.2) should happen after new system is fully
  functional
- All testing tasks are marked as optional but highly recommended for system
  reliability

### Critical Success Factors

- Maintain atomic operations for virtual state commits
- Ensure proper error handling and rollback capabilities
- Validate state consistency at all virtual state boundaries
- Complete removal of legacy deploy code to avoid confusion

### Testing Strategy

- Unit tests for each virtual state component
- Integration tests for complete deploy sequences
- Performance tests to validate overhead is acceptable
- Edge case tests for complex deploy scenarios

This implementation plan provides a systematic approach to completely replacing
the old deploy system with the new unified virtual state architecture.
