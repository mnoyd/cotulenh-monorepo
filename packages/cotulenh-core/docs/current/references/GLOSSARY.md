# CoTuLenh Glossary

## Terms, Definitions, and Technical Vocabulary

### Game Mechanics Terms

#### **Air Defense Zone**

Circular area around anti-air pieces that restricts air force movement. Multiple
zones can overlap, creating multi-layered defense systems.

#### **Bridge Square**

Special terrain squares that allow heavy pieces to cross rivers. Part of the
mixed terrain system.

#### **Capture Types**

- **Normal Capture**: Move to target square, removing enemy piece
- **Stay Capture**: Attack without moving, both pieces remain
- **Suicide Capture**: Both attacking and defending pieces are destroyed

#### **Commander Exposure (Flying General)**

Rule preventing commanders from facing each other on the same rank/file without
intervening pieces.

#### **Deploy Move**

Special move that splits a stack, placing some pieces on adjacent squares while
keeping others in the original position.

#### **Heroic Promotion**

Enhancement triggered when a piece attacks an enemy commander. Each piece type
gains specific abilities when heroic.

#### **Stack**

Combination of multiple pieces occupying the same square. Can contain up to
specific carrying capacities based on piece types.

#### **Terrain Zones**

- **Water Zones**: Navy-only movement areas
- **Land Zones**: Standard movement for most pieces
- **Mixed Zones**: Bridge areas allowing heavy piece river crossing

### Technical Implementation Terms

#### **0x88 Board Representation**

256-element array representation where valid squares are identified by
`(square & 0x88) == 0`. Provides efficient boundary checking.

#### **Action-Based Deploy**

Current deploy system implementation that processes deploy moves as discrete
actions rather than virtual state overlays.

#### **Bitboard**

Alternative board representation using 64-bit integers with bitwise operations
for move generation and position analysis.

#### **Command Pattern**

Design pattern used for move execution, enabling undo functionality by
encapsulating moves as objects.

#### **FEN (Forsyth-Edwards Notation)**

Extended notation for CoTuLenh positions including stack notation `(NFT)` and
heroic markers `+`.

#### **HEAVY_PIECES**

Set of piece types (Tank, Artillery, Missile) that require bridges to cross
rivers and have special terrain restrictions.

#### **LAND_MASK / NAVY_MASK**

Bitwise masks defining valid movement squares for land-based and naval pieces
respectively.

#### **Recombine Move**

Move that merges pieces from adjacent squares into a single stack. Currently has
implementation gaps.

#### **SAN (Standard Algebraic Notation)**

Extended notation for CoTuLenh moves including special symbols for deploy,
capture, and suicide moves.

#### **Singleton Pattern**

Design pattern used for game state management, creating circular dependencies in
current implementation.

#### **Virtual State Overlay**

Deprecated deploy system that maintained separate virtual game states. Replaced
by action-based approach.

### Piece Types and Abbreviations

#### **Commander (C)**

- **Movement**: One square in any direction
- **Special**: Cannot be captured by stay capture, triggers heroic promotion
- **Heroic Effect**: Gains additional movement range

#### **Infantry (I)**

- **Movement**: One square orthogonally
- **Special**: Basic combat unit, can combine in stacks
- **Heroic Effect**: Gains diagonal movement

#### **Tank (T)**

- **Movement**: Multiple squares orthogonally, can shoot over blocking pieces
- **Special**: Heavy piece, requires bridges for river crossing
- **Heroic Effect**: Enhanced shooting range and power

#### **Artillery (A)**

- **Movement**: Multiple squares orthogonally
- **Special**: Heavy piece, long-range attacks
- **Heroic Effect**: Increased range and area damage

#### **Navy (N)**

- **Movement**: Water zones only, multiple squares
- **Special**: Cannot move on land (critical bug: can be placed on land)
- **Heroic Effect**: Enhanced movement and attack range

#### **Air Force (F)**

- **Movement**: Can move anywhere, restricted by air defense zones
- **Special**: Ignores terrain restrictions except air defense
- **Heroic Effect**: Reduced air defense zone effects

#### **Missile (M)**

- **Movement**: Diagonal only, limited range
- **Special**: Heavy piece, unique movement pattern
- **Heroic Effect**: Extended range and multi-target capability

#### **Engineer (E)**

- **Movement**: One square orthogonally
- **Special**: Can build and destroy terrain features
- **Heroic Effect**: Enhanced construction abilities

#### **Anti-Air (AA)**

- **Movement**: One square orthogonally
- **Special**: Creates air defense zones
- **Heroic Effect**: Larger and more effective air defense zones

#### **Militia (ML)**

- **Movement**: One square orthogonally
- **Special**: Defensive unit with special capture rules
- **Heroic Effect**: Enhanced defensive capabilities

#### **Headquarters (HQ)**

- **Movement**: Cannot move
- **Special**: Strategic building, victory condition
- **Heroic Effect**: Enhanced defensive and support capabilities

### Stack System Terms

#### **Carrying Capacity**

Maximum number of pieces that can be combined in a single stack, varies by piece
type and combination.

#### **Stack Notation**

FEN extension using parentheses to denote piece combinations: `(NFT)` = Navy,
Air Force, Tank stack.

#### **Stack Splitting**

Deploy move mechanic that divides a stack between original and target squares.

#### **Hierarchical Stacking**

Rules governing which pieces can carry others and in what combinations.

### Error and Bug Categories

#### **Critical Bugs**

- Navy placement on land terrain
- Deploy system edge cases
- Commander validation gaps

#### **Implementation Gaps**

- Incomplete recombine move generation
- Missing edge case validation
- Performance bottlenecks in verbose mode

#### **Deprecated Features**

- Virtual state overlay architecture
- Legacy move validation approaches
- Outdated terrain calculation methods

### Performance and Optimization Terms

#### **Boundary Checking**

Validation that moves stay within valid board squares using 0x88 representation.

#### **Hot Path**

Frequently executed code sections that benefit most from optimization.

#### **Move Generation**

Process of calculating all legal moves for a given position.

#### **Position Evaluation**

Analysis of game state for strategic decision making.

#### **Verbose Mode**

Detailed logging and validation mode that significantly impacts performance.

### Architecture Patterns

#### **Immutable State**

Approach where game states are never modified, only replaced with new states.

#### **Make-Unmake**

Pattern for applying and reversing moves, used in search algorithms.

#### **Mutable State**

Current approach where game state is modified in place with undo capability.

#### **State Management**

Handling of game state transitions, history, and validation.

### Cross-Language Porting Terms

#### **API Surface**

Public interface that must be maintained across different language
implementations.

#### **Language-Agnostic**

Design decisions that work across multiple programming languages.

#### **Platform-Specific**

Implementation details that vary by programming language or platform.

#### **Porting Guide**

Documentation for implementing CoTuLenh in different programming languages.

### Testing and Validation Terms

#### **Boundary Conditions**

Edge cases at the limits of valid input ranges.

#### **Edge Case Testing**

Validation of unusual or extreme scenarios.

#### **Integration Testing**

Testing of complete game flows and system interactions.

#### **Regression Testing**

Validation that changes don't break existing functionality.

#### **Unit Testing**

Testing of individual components in isolation.

### Documentation Categories

#### **Agent-Friendly**

Documentation optimized for AI agent consumption with consistent structure.

#### **Consolidated Documentation**

Reduced set of comprehensive documents replacing scattered information.

#### **Cross-Reference**

Links and connections between related documentation sections.

#### **Incremental Migration**

Gradual improvement strategies that maintain current functionality.

#### **Legacy Documentation**

Outdated or deprecated documentation maintained for historical context.

### Alternative Architecture Terms

#### **Bitboard Architecture**

Alternative implementation using bitwise operations for performance.

#### **Data-Oriented Design**

Architecture focused on data layout and cache efficiency.

#### **Functional Programming**

Approach emphasizing immutable data and pure functions.

#### **Hybrid Architecture**

Combination of different architectural approaches for optimal results.

#### **Migration Path**

Strategy for transitioning from current to alternative architectures.

### Abbreviations and Acronyms

- **AA**: Anti-Air
- **API**: Application Programming Interface
- **C**: Commander
- **E**: Engineer
- **F**: Air Force
- **FEN**: Forsyth-Edwards Notation
- **HQ**: Headquarters
- **I**: Infantry
- **M**: Missile
- **ML**: Militia
- **N**: Navy
- **SAN**: Standard Algebraic Notation
- **T**: Tank
- **TODO**: To Do (implementation task)
- **UI**: User Interface

### References

- **Game Rules**: See GAME-RULES.md for complete mechanics
- **API Documentation**: See API-GUIDE.md for interface details
- **Implementation**: See IMPLEMENTATION-GUIDE.md for technical details
- **Testing**: See TESTING-GUIDE.md for validation approaches
