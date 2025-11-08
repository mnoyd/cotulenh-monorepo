# Requirements Document

## Introduction

This specification defines the refactoring of the deploy move handling system in
the CoTuLenh chess engine. The current implementation has deploy session logic
split between `cotulenh.ts` and `deploy-session.ts`, making the code harder to
maintain and understand. This refactoring will consolidate all deploy session
logic into `deploy-session.ts` and simplify the `_makeMove()` method to only
handle complete, history-worthy moves.

## Glossary

- **CoTuLenh**: The main chess engine class that manages game state
- **Deploy Session**: A temporary state that tracks incremental deployment of
  stacked pieces
- **InternalMove**: A single atomic move operation
- **InternalDeployMove**: A batch move containing multiple InternalMove
  operations representing a complete deployment sequence
- **Deploy Flag**: A bit flag (BITS.DEPLOY) indicating a move is part of an
  incremental deployment
- **Move Command**: An object implementing the Command pattern for executing and
  undoing moves
- **History**: The game's move history used for undo/redo and game notation
- **Move Count**: The counter tracking full moves in the game

## Requirements

### Requirement 1: Centralized Deploy Session Logic

**User Story:** As a developer maintaining the codebase, I want all deploy
session logic consolidated in one place, so that I can understand and modify the
deployment system without navigating multiple files.

#### Acceptance Criteria

1. WHEN a developer needs to modify deploy session behavior, THE Deploy Session
   Module SHALL contain all logic for handling incremental deploy moves
2. WHEN an incremental deploy move is processed, THE Deploy Session Module SHALL
   manage session initialization, move execution, and session state updates
3. THE Deploy Session Module SHALL provide a single entry point method that
   accepts an InternalMove with DEPLOY flag and returns a deployment result
4. THE Deployment Result SHALL indicate whether the session is complete and
   ready for commit
5. WHERE the session is complete, THE Deployment Result SHALL include the
   InternalDeployMove object representing the entire sequence

### Requirement 2: Simplified Move Processing

**User Story:** As a developer working on the move system, I want `_makeMove()`
to only handle complete moves that should be added to history, so that the move
processing logic is clear and predictable.

#### Acceptance Criteria

1. THE CoTuLenh.\_makeMove() Method SHALL only process moves that should be
   added to game history
2. THE CoTuLenh.\_makeMove() Method SHALL handle two move types: InternalMove
   (normal moves) and InternalDeployMove (complete deployment sequences)
3. WHEN processing a normal InternalMove, THE CoTuLenh.\_makeMove() Method SHALL
   execute the move, add to history, switch turns, and increment move count
4. WHEN processing an InternalDeployMove, THE CoTuLenh.\_makeMove() Method SHALL
   execute the batch move, add to history, switch turns, and increment move
   count
5. THE CoTuLenh.\_makeMove() Method SHALL NOT contain conditional logic for
   DEPLOY flag handling

### Requirement 3: Deploy Session Result Interface

**User Story:** As a developer integrating deploy moves, I want a clear result
object from deploy session processing, so that I know what action to take next.

#### Acceptance Criteria

1. THE Deploy Session Module SHALL define a DeploySessionResult interface
2. THE DeploySessionResult Interface SHALL include a boolean field indicating if
   the session is complete
3. WHERE the session is complete, THE DeploySessionResult Interface SHALL
   include the InternalDeployMove object
4. WHERE the session is incomplete, THE DeploySessionResult Interface SHALL
   include the active DeploySession object
5. THE DeploySessionResult Interface SHALL provide clear information about
   session state without requiring inspection of internal properties

### Requirement 4: Incremental Deploy Move Delegation

**User Story:** As a developer implementing move logic, I want incremental
deploy moves to be automatically delegated to the deploy session handler, so
that I don't need to write special-case logic in the main move flow.

#### Acceptance Criteria

1. WHEN an InternalMove with DEPLOY flag is encountered, THE CoTuLenh.move()
   Method SHALL delegate to the deploy session handler
2. THE Deploy Session Handler SHALL return a DeploySessionResult indicating the
   outcome
3. WHERE the result indicates an incomplete session, THE CoTuLenh.move() Method
   SHALL NOT call \_makeMove()
4. WHERE the result indicates a complete session, THE CoTuLenh.move() Method
   SHALL call \_makeMove() with the InternalDeployMove
5. THE CoTuLenh.move() Method SHALL NOT directly manipulate deploy session state

### Requirement 5: Auto-Commit Integration

**User Story:** As a player deploying pieces, I want the system to automatically
commit my deployment when all pieces are placed, so that I don't need to
manually trigger the commit.

#### Acceptance Criteria

1. WHEN the last piece in a stack is deployed, THE Deploy Session Handler SHALL
   detect that all pieces are accounted for
2. WHEN all pieces are accounted for, THE Deploy Session Handler SHALL
   automatically create an InternalDeployMove
3. THE InternalDeployMove SHALL include all moves from the session
4. THE Deploy Session Handler SHALL apply any queued recombine instructions
   before creating the InternalDeployMove
5. THE Deploy Session Handler SHALL return a complete DeploySessionResult with
   the InternalDeployMove

### Requirement 6: Backward Compatibility

**User Story:** As a developer maintaining existing tests, I want the refactored
system to maintain the same external behavior, so that existing tests continue
to pass without modification.

#### Acceptance Criteria

1. THE Refactored System SHALL maintain the same public API for deploy
   operations
2. THE Refactored System SHALL produce the same game states as the current
   implementation
3. THE Refactored System SHALL generate the same move history as the current
   implementation
4. WHERE existing tests rely on internal implementation details, THE Tests SHALL
   be updated to use the new architecture
5. THE Refactored System SHALL maintain support for all existing deploy features
   including recombine instructions

### Requirement 7: Test Coverage

**User Story:** As a developer ensuring code quality, I want comprehensive tests
for the refactored deploy session logic, so that I can confidently make future
changes.

#### Acceptance Criteria

1. THE Test Suite SHALL include tests for incremental deploy move handling
2. THE Test Suite SHALL include tests for auto-commit behavior
3. THE Test Suite SHALL include tests for incomplete session handling
4. THE Test Suite SHALL include tests for deploy session result objects
5. WHERE redundant tests exist after refactoring, THE Test Suite SHALL have
   those tests removed or consolidated
