# Requirements Document

## Introduction

This document outlines the requirements for migrating the CoTuLenh game engine
to use a virtual deploy state architecture. The current implementation uses
direct board mutation during deploy sessions, which creates complexity in state
management, validation, and history tracking.

The migration will implement a virtual state overlay system that:

1. **Stages deploy changes virtually** without mutating the real board until
   completion
2. **Provides unified validation logic** that works correctly during deploy
   sessions
3. **Simplifies state management** by eliminating complex deploy state tracking
4. **Enables proper FEN serialization** with deploy session markers
5. **Maintains backward compatibility** with existing game functionality

This migration addresses the most complex aspect of CoTuLenh - deploy sessions -
by implementing a clean virtual state architecture that makes deploy mechanics
manageable and maintainable.

## Requirements

### Requirement 1: Virtual Board Architecture Implementation

**User Story:** As a game engine developer, I need to implement a virtual board
overlay system so that deploy sessions can stage changes without mutating the
real board state until completion.

#### Acceptance Criteria

1. WHEN creating a virtual board THEN the system SHALL implement a VirtualBoard
   class that overlays virtual changes on top of the real board state
2. WHEN accessing board state during deploy sessions THEN the system SHALL
   return virtual pieces from the overlay when they exist, otherwise fall back
   to real board pieces
3. WHEN iterating over board pieces THEN the system SHALL provide a unified
   interface that combines virtual and real pieces without duplication
4. WHEN querying piece positions THEN the system SHALL support both individual
   piece lookup and bulk iteration with proper virtual state handling
5. WHEN managing virtual changes THEN the system SHALL use efficient data
   structures (Map) for O(1) virtual piece lookup and modification

### Requirement 2: Deploy Session State Management

**User Story:** As a game state manager, I need enhanced deploy session tracking
so that all deploy moves are staged virtually before being committed atomically.

#### Acceptance Criteria

1. WHEN starting a deploy session THEN the system SHALL create a DeploySession
   with virtualChanges Map to track all staged modifications
2. WHEN making deploy moves THEN the system SHALL update the virtualChanges Map
   without mutating the real board state
3. WHEN completing a deploy session THEN the system SHALL commit all virtual
   changes to the real board atomically and clear the deploy session
4. WHEN canceling a deploy session THEN the system SHALL discard all virtual
   changes and restore the original board state
5. WHEN tracking deploy progress THEN the system SHALL maintain lists of moved
   pieces, staying pieces, and deployed piece locations

### Requirement 3: Board Access Abstraction

**User Story:** As a validation function developer, I need abstracted board
access so that all game logic works correctly with both real and virtual board
states.

#### Acceptance Criteria

1. WHEN implementing validation functions THEN the system SHALL use
   getEffectiveBoard() method instead of direct \_board array access
2. WHEN checking commander safety THEN the system SHALL use virtual board state
   to accurately detect attacks and exposure during deploy sessions
3. WHEN generating legal moves THEN the system SHALL consider virtual piece
   positions for move validation and blocking calculations
4. WHEN calculating piece interactions THEN the system SHALL use effective board
   state for all piece relationship determinations
5. WHEN performing game rule checks THEN the system SHALL ensure all validation
   logic works identically for normal and deploy session states

### Requirement 4: Unified Command Action System

**User Story:** As a move execution developer, I need a unified command action
system so that all moves (normal and deploy) use the same virtual state
architecture with context-aware execution.

#### Acceptance Criteria

1. WHEN executing any move action THEN the system SHALL use the unified virtual
   state system with context-aware execution (deploy mode vs normal mode)
2. WHEN in deploy mode THEN the system SHALL stage all changes in virtual state
   without mutating the real board
3. WHEN in normal mode THEN the system SHALL commit changes directly to the real
   board and switch turns immediately
4. WHEN undoing actions THEN the system SHALL restore the appropriate state
   (virtual or real) based on the execution context
5. WHEN managing action sequences THEN the system SHALL ensure atomic execution
   and proper state management for both modes

### Requirement 5: Extended FEN Support

**User Story:** As a game serialization developer, I need extended FEN format
support so that games with active deploy sessions can be properly saved and
restored.

#### Acceptance Criteria

1. WHEN generating FEN during normal play THEN the system SHALL produce standard
   6-field FEN format
2. WHEN generating FEN during deploy sessions THEN the system SHALL append
   DEPLOY marker with session state information
3. WHEN parsing extended FEN THEN the system SHALL reconstruct both board state
   and active deploy session from the FEN string
4. WHEN serializing deploy session THEN the system SHALL include original
   square, remaining pieces, and move count in the FEN
5. WHEN loading extended FEN THEN the system SHALL validate deploy session
   consistency and restore virtual state correctly

### Requirement 6: Complete Deploy System Replacement

**User Story:** As a game engine architect, I need to completely replace the old
deploy system with the new virtual state management approach so that all deploy
functionality uses the unified virtual state architecture.

#### Acceptance Criteria

1. WHEN processing deploy moves THEN the system SHALL use only the new virtual
   state overlay system and discard all old deploy state tracking mechanisms
2. WHEN managing deploy sessions THEN the system SHALL remove all legacy deploy
   state management code and replace with virtual state architecture
3. WHEN executing deploy actions THEN the system SHALL eliminate old command
   actions and implement new virtual-state-aware actions
4. WHEN handling deploy move generation THEN the system SHALL replace old deploy
   move logic with new virtual board-based generation
5. WHEN completing the migration THEN the system SHALL ensure no legacy deploy
   code remains and all deploy functionality uses the new architecture
