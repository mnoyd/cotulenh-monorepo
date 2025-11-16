# Requirements Document

## Introduction

This document specifies the requirements for implementing cotulenh-bitboard, a high-performance bitboard-based chess engine for the CoTuLenh game. The bitboard engine must replicate all functionality of cotulenh-core (0x88 array-based) while using bitboard data structures for improved performance in move generation, position evaluation, and complex game mechanics like stacks, deploy moves, and air defense zones.

## Glossary

- **Bitboard**: A 64-bit or 128-bit integer where each bit represents a square on the board
- **0x88 Engine**: The current cotulenh-core implementation using array-based board representation
- **Stack**: Multiple pieces occupying the same square (carrier + carried pieces)
- **Deploy Move**: A multi-step move sequence where pieces from a stack are deployed to multiple destinations
- **Air Defense Zone**: Areas of the board where anti-air units exert influence
- **Heroic Piece**: A piece with enhanced capabilities after certain conditions
- **Commander**: The king-equivalent piece that must be protected
- **FEN**: Forsyth-Edwards Notation for representing game positions

## Requirements

### Requirement 1

**User Story:** As a developer integrating the bitboard engine, I want it to have the same public API as cotulenh-core, so that I can swap engines without changing application code.

#### Acceptance Criteria

1. THE bitboard engine SHALL implement all public methods from cotulenh-core
2. THE bitboard engine SHALL accept the same input parameters as cotulenh-core for all methods
3. THE bitboard engine SHALL return the same output formats as cotulenh-core for all methods
4. THE bitboard engine SHALL support the same FEN format as cotulenh-core
5. WHEN given identical positions, THE bitboard engine SHALL generate the same legal moves as cotulenh-core
6. WHEN executing the same move sequence, THE bitboard engine SHALL produce the same final position as cotulenh-core
7. THE bitboard engine SHALL support the same move notation formats as cotulenh-core (SAN, LAN)
8. THE bitboard engine SHALL maintain the same error handling behavior as cotulenh-core

### Requirement 2

**User Story:** As a game developer, I want the bitboard engine to handle the 11x12 board efficiently, so that move generation is faster than the array-based implementation.

#### Acceptance Criteria

1. THE bitboard engine SHALL represent the 11x12 board using 128-bit bitboards (two 64-bit integers)
2. THE bitboard engine SHALL use bitwise operations for piece queries
3. THE bitboard engine SHALL use bitwise operations for move generation
4. THE bitboard engine SHALL use bitwise operations for attack detection
5. WHEN generating moves for a position, THE bitboard engine SHALL complete in less time than cotulenh-core
6. WHEN checking if a square is attacked, THE bitboard engine SHALL complete in less time than cotulenh-core
7. THE bitboard engine SHALL maintain separate bitboards for each piece type
8. THE bitboard engine SHALL maintain separate bitboards for each color

### Requirement 3

**User Story:** As a game developer, I want the bitboard engine to support stack mechanics, so that pieces can carry other pieces as in the original game.

#### Acceptance Criteria

1. THE bitboard engine SHALL track which squares contain stacks
2. THE bitboard engine SHALL store stack composition (carrier + carried pieces) for each stack square
3. THE bitboard engine SHALL generate moves for carrier pieces with their carried pieces
4. THE bitboard engine SHALL handle piece combination when pieces merge into stacks
5. WHEN a piece moves to a square with another friendly piece, THE bitboard engine SHALL combine them into a stack
6. WHEN a stack moves, THE bitboard engine SHALL move all pieces in the stack together
7. THE bitboard engine SHALL enforce stack composition rules (which pieces can carry which)
8. THE bitboard engine SHALL track heroic status for pieces in stacks

### Requirement 4

**User Story:** As a game developer, I want the bitboard engine to support deploy moves, so that players can deploy stacked pieces across multiple squares.

#### Acceptance Criteria

1. THE bitboard engine SHALL support initiating deploy sessions from stack squares
2. THE bitboard engine SHALL track active deploy sessions with origin square and deployed pieces
3. THE bitboard engine SHALL generate valid deploy destinations for each piece in the stack
4. THE bitboard engine SHALL allow deploying pieces one at a time to different squares
5. THE bitboard engine SHALL support undoing individual deploy steps within a session
6. THE bitboard engine SHALL support committing completed deploy sessions
7. THE bitboard engine SHALL support canceling deploy sessions
8. WHEN a deploy session is active, THE bitboard engine SHALL restrict moves to deploy moves only
9. THE bitboard engine SHALL validate that all pieces are deployed before allowing session commit
10. THE bitboard engine SHALL switch turns only after deploy session is committed

### Requirement 5

**User Story:** As a game developer, I want the bitboard engine to calculate air defense zones efficiently, so that air force movement restrictions are enforced correctly.

#### Acceptance Criteria

1. THE bitboard engine SHALL identify all anti-air pieces on the board
2. THE bitboard engine SHALL calculate influence zones for each anti-air piece
3. THE bitboard engine SHALL maintain separate zone maps for red and blue sides
4. THE bitboard engine SHALL use bitboard operations to calculate zone coverage
5. WHEN an anti-air piece moves, THE bitboard engine SHALL recalculate affected zones
6. WHEN an anti-air piece is captured, THE bitboard engine SHALL remove its zones
7. THE bitboard engine SHALL restrict air force moves into enemy air defense zones
8. THE bitboard engine SHALL allow air force kamikaze attacks into defended zones

### Requirement 6

**User Story:** As a game developer, I want the bitboard engine to handle terrain restrictions, so that navy pieces stay in water and land pieces stay on land.

#### Acceptance Criteria

1. THE bitboard engine SHALL maintain a bitboard mask for water squares
2. THE bitboard engine SHALL maintain a bitboard mask for land squares
3. THE bitboard engine SHALL restrict navy pieces to water squares
4. THE bitboard engine SHALL restrict non-navy pieces to land squares
5. WHEN generating moves for navy pieces, THE bitboard engine SHALL mask destinations with water squares
6. WHEN generating moves for land pieces, THE bitboard engine SHALL mask destinations with land squares
7. THE bitboard engine SHALL enforce terrain restrictions during piece placement
8. THE bitboard engine SHALL enforce terrain restrictions during move execution

### Requirement 7

**User Story:** As a game developer, I want the bitboard engine to detect check and checkmate efficiently, so that game-ending conditions are identified quickly.

#### Acceptance Criteria

1. THE bitboard engine SHALL track commander positions for both colors
2. THE bitboard engine SHALL use bitboard operations to detect attacks on commanders
3. THE bitboard engine SHALL detect when a commander is in check
4. THE bitboard engine SHALL detect when a commander is exposed (facing enemy commander)
5. THE bitboard engine SHALL filter illegal moves that leave the commander in check
6. THE bitboard engine SHALL detect checkmate when no legal moves escape check
7. THE bitboard engine SHALL detect stalemate when no legal moves exist but not in check
8. WHEN checking for attacks, THE bitboard engine SHALL consider all enemy piece types

### Requirement 8

**User Story:** As a game developer, I want the bitboard engine to support move history and undo, so that players can review and reverse moves.

#### Acceptance Criteria

1. THE bitboard engine SHALL store move history with minimal memory overhead
2. THE bitboard engine SHALL support undoing the last move
3. THE bitboard engine SHALL restore complete game state when undoing
4. THE bitboard engine SHALL restore bitboard state when undoing
5. THE bitboard engine SHALL restore stack state when undoing
6. THE bitboard engine SHALL restore deploy session state when undoing
7. THE bitboard engine SHALL support undoing moves within deploy sessions
8. THE bitboard engine SHALL maintain move history across deploy sessions

### Requirement 9

**User Story:** As a game developer, I want the bitboard engine to generate moves efficiently, so that the UI remains responsive during gameplay.

#### Acceptance Criteria

1. THE bitboard engine SHALL generate all legal moves in under 5ms for typical positions
2. THE bitboard engine SHALL support filtering moves by square
3. THE bitboard engine SHALL support filtering moves by piece type
4. THE bitboard engine SHALL cache move generation results
5. THE bitboard engine SHALL invalidate cache when position changes
6. WHEN generating moves for a single piece, THE bitboard engine SHALL avoid generating moves for other pieces
7. THE bitboard engine SHALL use lazy evaluation for expensive move properties
8. THE bitboard engine SHALL support both verbose and non-verbose move output

### Requirement 10

**User Story:** As a game developer, I want the bitboard engine to handle FEN import/export correctly, so that positions can be saved and loaded.

#### Acceptance Criteria

1. THE bitboard engine SHALL parse standard FEN strings
2. THE bitboard engine SHALL parse extended FEN with stack notation
3. THE bitboard engine SHALL parse extended FEN with deploy session markers
4. THE bitboard engine SHALL generate standard FEN strings
5. THE bitboard engine SHALL generate extended FEN with stack notation
6. THE bitboard engine SHALL generate extended FEN with deploy session markers
7. WHEN loading a FEN, THE bitboard engine SHALL populate all bitboards correctly
8. WHEN generating a FEN, THE bitboard engine SHALL produce the same format as cotulenh-core
9. THE bitboard engine SHALL validate FEN strings before loading
10. THE bitboard engine SHALL handle invalid FEN strings gracefully
