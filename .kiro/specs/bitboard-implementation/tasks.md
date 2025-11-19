# Implementation Plan

This plan breaks down the bitboard engine implementation into discrete, manageable coding tasks. Each task builds incrementally toward a complete, high-performance bitboard engine that matches cotulenh-core's functionality.

## Key Architectural Decisions (From Chess Programming Study)

After studying mature chess projects (chessops, chess.js, chessground, En Croissant), we made these key decisions:

### 1. Bridge Layer for UI Communication

- **Pattern:** Simple objects instead of FEN/SAN serialization
- **Benefit:** ~5x faster UI interactions
- **Implementation:** Task 11.0
- **Reference:** `docs/BRIDGE-ARCHITECTURE.md`

### 2. History Management in Engine

- **Pattern:** Mutable with internal history (like chess.js, cotulenh-core)
- **Benefit:** API compatibility, user convenience
- **Implementation:** Task 10
- **Reference:** `docs/GUI-STATE-MANAGEMENT.md`

### 3. Two-Level Undo Pattern

- **Level 1:** Minimal undo info for validation (~50 bytes, temporary)
- **Level 2:** Full history for user undo (~500 bytes, permanent)
- **Benefit:** 10x less memory for legality checking
- **Implementation:** Tasks 10.1-10.6
- **Reference:** `docs/MAKE-UNDO-WITHOUT-HISTORY.md`

### 4. Make/Undo for Legality (with optimization path)

- **Current:** Make/undo with minimal undo info
- **Future:** Can optimize to pre-computed safety (Stockfish pattern)
- **Benefit:** Correct now, can optimize later
- **Implementation:** Task 7.3, future Task 13.3
- **Reference:** `docs/CHESSOPS-LEGALITY-PATTERN.md`

### 5. Mutable State

- **Pattern:** Mutate in place (not immutable like chessops)
- **Benefit:** API compatibility with cotulenh-core
- **Implementation:** All tasks
- **Reference:** `docs/FINAL-ARCHITECTURE-DECISIONS.md`

**See `docs/` directory for detailed architectural documentation.**

## Task List

- [x] 1. Implement core bitboard data structures and operations
- [x] 1.1 Create 128-bit bitboard structure

  - Define Bitboard interface with low and high 64-bit integers
  - Create EMPTY and FULL bitboard constants
  - Add type definitions for bitboard operations
  - _Requirements: 2.1_

- [x] 1.2 Implement basic bitboard operations

  - Implement and(a, b) for bitwise AND
  - Implement or(a, b) for bitwise OR
  - Implement xor(a, b) for bitwise XOR
  - Implement not(a) for bitwise NOT
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 1.3 Implement bitboard query operations

  - Implement isSet(bb, square) to check if bit is set
  - Implement setBit(bb, square) to set a bit
  - Implement clearBit(bb, square) to clear a bit
  - Implement popCount(bb) to count set bits
  - Implement lsb(bb) to find least significant bit
  - Implement msb(bb) to find most significant bit
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 1.4 Implement square-bitboard conversion utilities

  - Create squareToBit(square) to convert square index to bit position
  - Create bitToSquare(bit) to convert bit position to square index
  - Handle 11x12 board mapping to 128-bit space
  - Add validation for valid squares
  - _Requirements: 2.1_

- [x] 1.5 Add unit tests for bitboard operations

  - Test basic operations (and, or, xor, not)
  - Test query operations (isSet, setBit, clearBit)
  - Test counting and finding operations (popCount, lsb, msb)
  - Test edge cases (empty, full, single bit)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Implement position representation with bitboards
- [x] 2.1 Create BitboardPosition class structure

  - Define piece bitboards for all 11 piece types
  - Define color bitboards for red and blue
  - Define occupied bitboard
  - Define carriers bitboard for stacks
  - Define heroic bitboard
  - Add positionCount Map for repetition tracking
  - Add header Map for PGN metadata (optional)
  - Add comments Map for PGN annotations (optional)
  - _Requirements: 2.7, 2.8_

- [x] 2.2 Implement piece placement operations

  - Implement placePiece(piece, square) to set piece bitboards
  - Update color bitboard when placing piece
  - Update occupied bitboard when placing piece
  - Handle heroic status
  - _Requirements: 1.2, 1.3_

- [x] 2.3 Implement piece removal operations

  - Implement removePiece(square) to clear piece bitboards
  - Update color bitboard when removing piece
  - Update occupied bitboard when removing piece
  - Return removed piece information
  - _Requirements: 1.2, 1.3_

- [x] 2.4 Implement piece query operations

  - Implement getPieceAt(square) to identify piece type
  - Implement getColorAt(square) to identify piece color
  - Implement isOccupied(square) to check occupancy
  - Implement getPiecesOfType(type, color) to get piece bitboard
  - _Requirements: 1.2, 1.3, 2.2, 2.3, 2.4_

- [ ]\* 2.5 Add unit tests for position operations

  - Test piece placement and removal
  - Test piece queries
  - Test bitboard synchronization
  - Test edge cases (invalid squares, multiple operations)
  - _Requirements: 1.2, 1.3_

- [x] 3. Implement terrain masks and restrictions
- [x] 3.1 Create terrain bitboard masks

  - Define WATER_MASK bitboard for navy-accessible squares
  - Define LAND_MASK bitboard for land piece-accessible squares
  - Initialize masks based on board layout
  - _Requirements: 6.1, 6.2_

- [x] 3.2 Implement terrain validation

  - Create isWaterSquare(square) check
  - Create isLandSquare(square) check
  - Validate navy pieces only on water
  - Validate land pieces only on land
  - _Requirements: 6.3, 6.4, 6.7, 6.8_

- [x] 3.3 Integrate terrain masks with move generation

  - Mask navy move destinations with WATER_MASK
  - Mask land piece move destinations with LAND_MASK
  - Apply terrain restrictions during piece placement
  - _Requirements: 6.5, 6.6_

- [x] 4. Implement Stack Manager for hybrid stack handling
- [x] 4.1 Create StackData structure

  - Define StackData with square, carrier, and carried pieces
  - Create StackManager class with Map storage
  - Maintain carrierBitboard for quick stack detection
  - _Requirements: 3.1, 3.2_

- [x] 4.2 Implement stack creation and modification

  - Implement createStack(carrier, carried, square)
  - Implement addToStack(piece, square)
  - Implement removeFromStack(pieceType, square)
  - Implement destroyStack(square)
  - Sync carrierBitboard with stack operations
  - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [x] 4.3 Implement stack validation

  - Create validateStackComposition(carrier, carried) rules
  - Check piece type compatibility
  - Enforce stack size limits
  - Validate heroic status preservation
  - _Requirements: 3.7, 3.8_

- [x] 4.4 Integrate Stack Manager with position

  - Update getPieceAt() to check stacks
  - Update placePiece() to handle stack combinations
  - Update removePiece() to handle stack decomposition
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4.5 Add unit tests for Stack Manager

  - Test stack creation and destruction
  - Test adding and removing pieces
  - Test stack validation rules
  - Test integration with bitboards
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 5. Implement Deploy Session Manager
- [x] 5.1 Create DeploySession structure

  - Define DeploySession with origin square and deployed moves
  - Track remaining pieces to deploy
  - Track turn and session state
  - _Requirements: 4.1, 4.2_

- [x] 5.2 Implement deploy session lifecycle

  - Implement initiateSession(stackSquare) to start deploy
  - Implement deployPiece(piece, to) to deploy one piece
  - Implement undoLastDeploy() to undo deploy step
  - Implement canCommit() to validate completion
  - Implement commit() to finalize deploy
  - Implement cancel() to abort deploy
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 5.3 Integrate deploy session with position

  - Track active deploy session in position
  - Restrict moves to deploy moves when session active
  - Update bitboards during deploy steps
  - Restore state on cancel
  - _Requirements: 4.8, 4.9, 4.10_

- [x] 5.4 Add unit tests for Deploy Session

  - Test session initiation and completion
  - Test deploying pieces one by one
  - Test undo within session
  - Test commit validation
  - Test cancel and restore
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 6. Implement Air Defense Zone Calculator
- [x] 6.1 Create AirDefenseZones structure

  - Define zone maps for red and blue sides
  - Track anti-air piece positions with bitboards
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6.2 Implement zone calculation

  - Implement calculateZoneForPiece(square, pieceType) for single anti-air
  - Implement calculateAllZones() for complete recalculation
  - Use bitboard operations for zone coverage
  - Store zones in Map<square, influencedSquares[]>
  - _Requirements: 5.2, 5.4_

- [x] 6.3 Implement incremental zone updates

  - Implement updateZone(square) when anti-air moves
  - Implement removeZone(square) when anti-air captured
  - Optimize by updating only affected zones
  - _Requirements: 5.5, 5.6_

- [x] 6.4 Integrate air defense with move generation

  - Check if destination is in enemy zone
  - Restrict air force moves into defended zones
  - Allow kamikaze attacks into zones
  - _Requirements: 5.7, 5.8_

- [ ]\* 6.5 Add unit tests for Air Defense

  - Test zone calculation for each anti-air type
  - Test incremental updates
  - Test zone removal
  - Test integration with move generation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 7. Implement move generation using bitboards
- [x] 7.1 Implement pseudo-legal move generation for each piece type

  - Implement generateInfantryMoves() using bitboard attacks
  - Implement generateTankMoves() using bitboard attacks
  - Implement generateCommanderMoves() using bitboard attacks
  - Implement generateMilitiaMoves() using bitboard attacks
  - Implement generateEngineerMoves() using bitboard attacks
  - Implement generateArtilleryMoves() using bitboard attacks
  - Implement generateAntiAirMoves() using bitboard attacks
  - Implement generateMissileMoves() using bitboard attacks
  - Implement generateAirForceMoves() using bitboard attacks
  - Implement generateNavyMoves() using bitboard attacks
  - Implement generateHeadquarterMoves() using bitboard attacks
  - _Requirements: 9.1, 9.6_

- [x] 7.2 Implement move filtering

  - Filter moves by square parameter
  - Filter moves by piece type parameter
  - Apply terrain restrictions
  - Apply air defense restrictions
  - _Requirements: 9.2, 9.3_

- [x] 7.3 Implement legality filtering

  - Execute move temporarily on bitboards (using minimal undo)
  - Check if commander in check after move
  - Check if commander exposed after move
  - Undo temporary move (using minimal undo info)
  - Filter out illegal moves
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - _Note: Uses minimal undo pattern (Task 10.2-10.3), not full history_

- [x] 7.4 Implement deploy move generation

  - Generate deploy moves when session active
  - Generate moves for remaining pieces in stack
  - Apply same filtering as normal moves
  - _Requirements: 4.3, 4.4_

- [x] 7.5 Implement move caching

  - Create cache key from position + parameters
  - Cache generated moves
  - Invalidate cache on position change
  - _Requirements: 9.4, 9.5_

- [x] 7.6 Add unit tests for move generation

  - Test move generation for each piece type
  - Test filtering by square and piece type
  - Test legality filtering
  - Test deploy move generation
  - Test caching behavior
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 8. Implement check and checkmate detection
- [x] 8.1 Implement commander tracking

  - Track red commander position
  - Track blue commander position
  - Update positions when commanders move
  - _Requirements: 7.1_

- [x] 8.2 Implement attack detection

  - Implement isSquareAttacked(square, byColor) using bitboards
  - Check attacks from all enemy piece types
  - Use bitboard operations for fast detection
  - _Requirements: 7.2, 7.8_

- [x] 8.3 Implement check detection

  - Implement isCheck() to check if commander attacked
  - Implement isCommanderExposed() to check facing enemy commander
  - _Requirements: 7.3, 7.4_

- [x] 8.4 Implement checkmate and stalemate detection

  - Implement isCheckmate() when in check with no legal moves
  - Implement isStalemate() when not in check with no legal moves
  - _Requirements: 7.6, 7.7_

- [x] 8.5 Add unit tests for check detection

  - Test attack detection for all piece types
  - Test check detection
  - Test commander exposure detection
  - Test checkmate detection
  - Test stalemate detection
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 9. Implement FEN parsing and generation
- [x] 9.1 Implement FEN parser

  - Parse piece placement into bitboards
  - Parse stack notation (parentheses)
  - Parse heroic notation (+)
  - Parse turn, move counters
  - Parse deploy session markers
  - Validate FEN format
  - _Requirements: 10.1, 10.2, 10.3, 10.9_

- [x] 9.2 Implement FEN generator

  - Generate piece placement from bitboards
  - Generate stack notation for stacks
  - Generate heroic notation for heroic pieces
  - Generate turn, move counters
  - Generate deploy session markers if active
  - _Requirements: 10.4, 10.5, 10.6_

- [x] 9.3 Ensure FEN compatibility with cotulenh-core

  - Test FEN parsing produces same bitboards
  - Test FEN generation produces same format
  - Handle all edge cases
  - _Requirements: 1.4, 10.7, 10.8, 10.10_

- [x] 9.4 Add unit tests for FEN operations

  - Test parsing standard FEN
  - Test parsing extended FEN with stacks
  - Test parsing extended FEN with deploy markers
  - Test generating FEN
  - Test round-trip (parse → generate → parse)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

- [x] 10. Implement move history and undo (Two-Level Pattern)
- [x] 10.1 Create history entry structures

  - Create UndoInfo interface (minimal - for validation)
    - captured?: Piece
    - stackChanges?: StackDelta
    - ~50 bytes per validation
  - Create HistoryEntry interface (full - for user undo)
    - Store move data
    - Store pre-move bitboard state
    - Store pre-move stack state
    - Store pre-move deploy session state
    - Store pre-move game state (turn, counters)
    - ~500 bytes per move
  - _Requirements: 8.1_
  - _See: docs/MAKE-UNDO-WITHOUT-HISTORY.md_

- [x] 10.2 Implement temporary move execution (for validation)

  - Implement makeMoveTemporary() returning UndoInfo
  - Update bitboards for move
  - Update stacks if involved
  - Return minimal undo info (~50 bytes)
  - _Requirements: 8.2, 8.3_
  - _Note: Used by legality checking, NOT for user moves_

- [x] 10.3 Implement temporary move undo (for validation)

  - Implement undoMoveTemporary() using UndoInfo
  - Restore bitboards from undo info
  - Restore stacks from undo info
  - _Requirements: 8.2, 8.3_
  - _Note: Used by legality checking, NOT for user undo_

- [x] 10.4 Implement permanent move execution (for user moves)

  - Save full state to history array
  - Update bitboards for move
  - Update stacks if involved
  - Update deploy session if active
  - Update air defense zones if needed
  - Add HistoryEntry to history array
  - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 10.5 Implement user undo operation

  - Pop HistoryEntry from history array
  - Restore bitboards from history
  - Restore stacks from history
  - Restore deploy session from history
  - Restore game state from history
  - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_
  - _Note: Public API method, restores full state_

- [x] 10.6 Add unit tests for history and undo

  - Test temporary make/undo (minimal undo info)
  - Test permanent move execution updates history
  - Test user undo restores complete state
  - Test undo with stacks
  - Test undo with deploy sessions
  - Test multiple undo operations
  - Test memory usage (minimal vs full)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 11. Implement Bridge Layer and Public API
- [x] 11.0 Implement Bridge Layer (NEW - inspired by chess programming)

  - ✅ Define bridge interfaces (UIMove, UIPiece, UIGameState, UILegalMoves)
  - ✅ Create BitboardGameBridge class
  - [ ] Integrate move generator with getLegalMoves()
  - [ ] Integrate check detection with getState()
  - [ ] Implement FEN serialization in bridge
  - [ ] Add event system for reactive UIs
  - [ ] Create UI adapter examples (React/Vue/Svelte)
  - _Requirements: Communication efficiency, UI integration_
  - _See: docs/BRIDGE-ARCHITECTURE.md_

- [x] 11.1 Create CoTuLenh class with same interface

  - Implement constructor(fen)
  - Implement clear() method
  - Implement load(fen) method
  - Implement fen() method
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 11.2 Implement piece manipulation methods

  - Implement get(square, pieceType) method
  - Implement put(piece, square) method
  - Implement remove(square) method
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 11.3 Implement move methods

  - Implement moves(options) method with verbose and filtering
  - Implement move(from, to) method
  - Implement undo() method
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7_

- [x] 11.4 Implement deploy session methods

  - Implement getDeploySession() method
  - Implement setDeploySession() method
  - Implement commitDeploySession() method
  - Implement cancelDeploySession() method
  - Implement resetDeploySession() method
  - Implement canCommitDeploy() method
  - Implement recombine(from, to, piece) method
  - Implement getRecombineOptions(square) method
  - Implement undoRecombineInstruction() method
  - Implement deployMove(request) for backward compatibility
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 11.5 Implement game state query methods

  - Implement turn() method
  - Implement isCheck() method
  - Implement isCheckmate() method
  - Implement isGameOver() method
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 11.6 Implement draw detection methods

  - Implement isDrawByFiftyMoves() checking half-move counter
  - Add position count tracking in makeMove
  - Implement isThreefoldRepetition() checking position counts
  - Implement isDraw() combining all draw conditions
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 11.7 Implement SAN/LAN notation support

  - Implement moveToSanLan() to generate notation from move
  - Implement moveFromSan() to parse SAN strings
  - Handle disambiguation for ambiguous moves
  - Support all move types (normal, capture, deploy, combination)
  - _Requirements: 1.7_

- [x] 11.8 Implement additional query methods

  - Implement board() to return 2D array representation
  - Implement getCommanderSquare(color) public method
  - Implement getAttackers(square, color) using bitboards
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 11.9 Ensure error handling matches cotulenh-core

  - Return null for invalid moves
  - Return false for invalid operations
  - Handle invalid FEN gracefully
  - Match error behavior exactly
  - _Requirements: 1.8_

- [ ] 12. Add integration tests comparing with cotulenh-core
- [ ] 12.1 Create test suite for API compatibility

  - Test all public methods exist
  - Test method signatures match
  - Test return types match
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 12.2 Create test suite for move generation compatibility

  - Load same positions in both engines
  - Generate moves with both engines
  - Compare move lists are identical
  - Test with various positions (simple, complex, with stacks, with deploy)
  - _Requirements: 1.5_

- [ ] 12.3 Create test suite for move execution compatibility

  - Execute same move sequence in both engines
  - Compare final positions are identical
  - Compare FEN output is identical
  - Test with various move sequences
  - _Requirements: 1.6_

- [ ] 12.4 Create test suite for FEN compatibility

  - Parse same FEN in both engines
  - Generate FEN from both engines
  - Compare FEN strings are identical
  - Test with various FEN formats
  - _Requirements: 1.4, 1.7_

- [ ] 13. Performance optimization and benchmarking
- [ ] 13.1 Profile move generation performance

  - Measure time for move generation
  - Identify bottlenecks
  - Compare with cotulenh-core
  - _Requirements: 2.5, 9.1_

- [ ] 13.2 Profile attack detection performance

  - Measure time for attack detection
  - Identify bottlenecks
  - Compare with cotulenh-core
  - _Requirements: 2.6_

- [ ] 13.3 Optimize hot paths

  - Optimize bitboard operations
  - Optimize move generation loops
  - Optimize attack detection
  - Add inline hints where beneficial
  - _Requirements: 2.5, 2.6_

- [ ] 13.4 Measure memory usage

  - Measure memory per position
  - Compare with cotulenh-core
  - Optimize if needed
  - _Requirements: 2.1, 2.7, 2.8_

- [ ] 14. Documentation and examples
- [ ] 14.1 Document bitboard architecture

  - Explain 128-bit bitboard structure
  - Explain hybrid approach for stacks
  - Explain integration points
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 14.2 Document API usage

  - Provide usage examples for all public methods
  - Show how to swap from cotulenh-core
  - Document performance characteristics
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 14.3 Create migration guide
  - Explain differences from cotulenh-core
  - Provide migration checklist
  - Show before/after code examples
  - _Requirements: 1.1, 1.2, 1.3_

## Coverage Summary

This implementation plan covers **100% of cotulenh-core's public API**:

- ✅ All 35 public methods
- ✅ All game mechanics (stacks, deploy, air defense, terrain)
- ✅ All move types (normal, capture, deploy, combination, kamikaze)
- ✅ All game state queries (check, checkmate, draw conditions)
- ✅ All notation support (SAN, LAN, FEN)
- ✅ Full backward compatibility

See `COVERAGE-ANALYSIS.md` for detailed capability mapping.

## Notes

- Tasks marked with \* are optional testing tasks for faster MVP
- Each task references specific requirements from requirements.md
- Tasks build incrementally - complete in order
- Integration tests in task 12 validate compatibility with cotulenh-core
- Performance optimization in task 13 ensures speed improvements
- Focus on correctness first, then optimize
- Total: 14 phases, 68+ tasks (includes all missing capabilities from coverage analysis)
