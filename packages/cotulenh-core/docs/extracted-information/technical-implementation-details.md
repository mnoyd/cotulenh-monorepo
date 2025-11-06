# Technical Implementation Details Mining

## Overview

This document captures all technical implementation details extracted from the
126 documentation files, focusing on the current TypeScript implementation using
0x88 board representation and singleton patterns.

## 0x88 Board Representation

### Core Architecture

**Board Structure**:

- Uses 256-element array (16×16 grid) to store 11×12 board
- Only 132 out of 256 positions are valid squares
- Memory efficiency: ~51.6% utilization
- Enables fast boundary checking with single bitwise operation

**Coordinate System**:

```typescript
// Internal 0x88 representation
function file(square: number): number {
  return square & 0xf // Extract zero-based file (0-10)
}

function rank(square: number): number {
  return square >> 4 // Extract zero-based rank (0-11)
}

// Boundary checking
// Any square with bits set in positions 0x88 (136 decimal) is off-board
function isSquareOnBoard(square: number): boolean {
  return !(square & 0x88)
}
```

**Algebraic Notation Conversion**:

- External: a1 to k12 (algebraic notation)
- Internal: 0x88 format for efficient computation
- Conversion functions handle translation between formats

**Performance Characteristics**:

- Fast boundary checking: Single bitwise operation
- Efficient direction vectors: Simple arithmetic for piece movement
- Memory alignment: Good cache performance for move generation
- Direction offsets work directly with 0x88 representation

## Mask Operations and Terrain Validation

### Terrain Masks

**NAVY_MASK**:

- Defines water-navigable squares (1 = navigable)
- Covers pure water zones (a-b files) and mixed zones
- Used for Navy piece placement and movement validation

**LAND_MASK**:

- Defines land-accessible squares (1 = accessible)
- Covers pure land zones (c-k files) and mixed zones
- Used for all non-Navy piece placement and movement validation

**Terrain Validation Logic**:

```typescript
// Navy piece placement
if (newPiece.type === NAVY) {
  if (!NAVY_MASK[sq]) return false // Must be on water or mixed
}

// Land piece placement
if (newPiece.type !== NAVY) {
  if (!LAND_MASK[sq]) return false // Must be on land or mixed
}

// Stay validation during deployment
function canStayOnSquare(square: number, pieceType: PieceSymbol): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}
```

**Terrain Zone Classification**:

- Pure Water: a-b files (NAVY_MASK = 1, LAND_MASK = 0)
- Mixed Zones: d6, e6, d7, e7, bridge squares f6, f7, h6, h7
- Pure Land: c-k files (LAND_MASK = 1, NAVY_MASK = 0)

**Performance Optimization**:

- O(1) terrain validation using bitmasks
- Mask lookups are constant time operations
- Early exits for invalid squares

## HEAVY_PIECES Restrictions and River Crossing

### Heavy Piece Classification

**HEAVY_PIECES Set**:

- ARTILLERY
- ANTI_AIR (for terrain restrictions only, not air defense)
- MISSILE
- TANK (implied from context)

**River Crossing Mechanics**:

- Subject to zone-based movement limitations
- Must use designated crossing points (bridge squares)
- Bridge squares: f6, f7, h6, h7 act as crossing points
- Files f and h have strategic importance for bridge control

**Zone-Based Restrictions**:

- Heavy pieces cannot freely cross between terrain zones
- Must use specific bridge squares for zone transitions
- Positioning strategy requires consideration of zone placement
- Timing of zone transitions requires careful planning

**Implementation Details**:

- Zone validation occurs during move generation
- Bridge utilization checked for heavy piece movement
- Terrain compatibility affects legal move calculation

## Heroic Promotion System

### Promotion Triggers

**Automatic Promotion**:

- Any piece that attacks (threatens) the enemy commander becomes heroic
- Promotion happens immediately when attack is established
- Persistent until piece is captured or game ends

**Heroic Effects by Piece Type**:

**INFANTRY/ENGINEER/ANTI_AIR**:

- Movement Range: Increases to 2 squares orthogonal
- Diagonal Range: 2 squares diagonally for both movement and capture
- Air Defense Level: Increases by 1 (ANTI_AIR only)

**COMMANDER**:

- Movement Range: Still infinite orthogonal (unchanged)
- Special abilities remain the same

**HEADQUARTER**:

- Transforms from non-combatant to combatant
- Capture Range: 1 square (when heroic)
- Can use bridge squares when heroic

**MISSILE**:

- Air Defense Level: Increases from 2 to 3 (highest among all pieces)
- Coverage area expands to 3-square radius

**Implementation Details**:

```typescript
// Heroic status tracking
const isHeroic = game.getHeroicStatus('e4')

// Configuration changes for heroic pieces
// Base ANTI_AIR: Level 1 defense
// Heroic ANTI_AIR: Level 2 defense (base + 1)

// Heroic modifications persist through:
// - Stack deployment
// - Move execution
// - State transitions
```

## Stack Combination Rules and Carrying Capacity

### Combination System Architecture

**Core Components**:

- `blueprints.yaml` - Human-readable combination rules
- `src/index.ts` - Main API and role definitions
- `src/predefined-stacks.ts` - Generated combination lookup table
- `helpers/build-stacks.ts` - Blueprint parser and generator

**Combination Rules**:

- Hierarchical stacks where one piece acts as carrier
- Others are carried pieces
- Carrier determines movement characteristics for entire stack
- Complex piece compatibility matrix

**Validation Requirements**:

1. No Duplicates: Each piece type appears once only
2. Color Consistency: All pieces must be same color
3. Blueprint Compliance: Must match predefined combination rules
4. Terrain Compatibility: Combined piece must satisfy terrain rules

**Carrying Capacity**:

- Standard stacking rules apply to all pieces
- Can be carried: Most pieces can be carried by others
- Can carry others: Most pieces can carry compatible pieces
- Limitations on stack size and composition

### Deploy Mechanics

**Current Implementation (Action-Based)**:

- Uses `InternalMove[]` actions for deploy tracking
- `DeploySession` class manages deploy state
- Terrain validation via try/catch in move application
- Extended FEN format with defined grammar

**Deploy Process**:

1. Stack splitting changes board representation
2. All pieces must be accounted for (moved or staying)
3. Terrain validation for each deployed piece
4. Sequence validation ensures complete coverage

**Critical Bugs Identified**:

- Navy can be placed on land during deploy (game-breaking)
- Pieces cannot rejoin already-deployed stacks (recombine missing)
- No intermediate state validation after partial deploy
- Board mutated during deploy instead of virtual overlay

**Deploy State Tracking**:

```typescript
new SetDeployStateAction(game, {
  stackSquare: move.from, // c3 in 0x88 format
  turn: currentPlayer, // RED or BLUE
  originalPiece: stackAtC3, // Complete (N|FT) stack
})
```

## Air Defense Zone Calculations

### Air Defense System Architecture

**Zone Creation**:

- Automatic calculation and updates when pieces move
- Circular area using distance formula (i² + j² ≤ level²)
- Multiple pieces can overlap zones for stronger defense

**Defense Levels by Piece**:

- ANTI_AIR: Base level 1, Heroic level 2
- MISSILE: Base level 2, Heroic level 3 (highest)
- Other pieces: No air defense capability

**Air Defense Effects**:

- AIR_FORCE movement restrictions in defended zones
- Kamikaze (suicide attack) mechanics enabled in zones
- Zone stacking allows overlapping coverage

**Implementation Details**:

```typescript
// Air defense configuration
BASE_AIRDEFENSE_CONFIG: {
  [ANTI_AIR]: 1,  // Base air defense level
}

// Air defense API
const airDefense = game.getAirDefense()
const airDefenseInfluence = game.getAirDefenseInfluence()

// Zone calculation
// Level 1: Affects squares within 1-square radius
// Level 2: Affects squares within 2-square radius
// Level 3: Affects squares within 3-square radius
```

**Performance Considerations**:

- Air defense recalculation only for relevant piece types
- Zone calculations affect move generation performance
- Overlapping coverage requires complex calculations

### Air Force Restrictions

**Movement Restrictions**:

- Subject to air defense zone limitations
- Can perform suicide attacks in defended zones
- Terrain exceptions: Can be placed anywhere (flies over water)

**Capture Types**:

- Normal capture: Move to target square
- Stay capture: Attack without moving (terrain dependent)
- Suicide capture: Both pieces destroyed (in air defense zones)

**Special Mechanics**:

- Ignores piece blocking for captures
- Can choose between capture types when terrain allows
- Forced suicide capture in air defense zones

## Singleton Pattern Dependencies

### Core Singleton Architecture

**CoTuLenh Class**:

- Central game state manager and orchestrator
- Single instance manages entire game state
- Singleton-like behavior with tight coupling

**State Management**:

- Board state: `_board` array (0x88 representation)
- Commander positions: `_commanders` tracking
- Deploy state: `_deployState` management
- Air defense zones: `_airDefense` calculations
- Move history: `_history` tracking
- Position counts: `_positionCount` for repetition

**Circular Dependencies**:

- CoTuLenh imports air defense calculations
- Air defense requires CoTuLenh instance for board state
- Move generation depends on current board state
- Deploy functions receive game instance

### Coupling Points

**Tight Coupling Areas**:

1. Game instance passed to deploy functions
2. Air defense calculations require game instance
3. Move generation depends on board state
4. Command pattern usage in move execution

**Dependency Chain**:

```
CoTuLenh (singleton)
├── move-apply.ts (Command Pattern)
├── deploy-move.ts (Deploy System)
├── air-defense.ts (Air Defense)
├── move-generation.ts (Move Generation)
└── utils.ts (Utility Functions)
```

## Command Pattern Usage

### Move Execution Architecture

**Command Pattern Implementation**:

- Move execution and undo operations use command pattern
- Each move type has corresponding command class
- Supports undo/redo functionality
- Atomic operations for state changes

**Command Types**:

- Basic move commands
- Deploy move commands
- Capture commands
- Special move commands (heroic promotion, etc.)

**State Management**:

- History tracking for undo operations
- State restoration capabilities
- Validation checks before critical operations
- Error reporting for debugging invalid states

## Performance Optimization Strategies

### Current Optimizations

**Move Generation**:

- Efficient direction vectors with 0x88 representation
- Early termination for illegal moves
- Caching of attack calculations for repeated positions
- Move filtering with legal move validation

**Memory Management**:

- Object lifecycle management patterns
- Efficient storage of position counts and history
- Memory alignment for cache performance
- Minimal validation overhead in critical paths

**State Validation**:

- O(1) terrain validation using bitmasks
- Fast boundary checking with bitwise operations
- Commander position tracking with direct lookup
- Early exits for invalid operations

### Performance Bottlenecks Identified

**Current Issues**:

- Air defense zone calculation complexity
- Move generation overhead for complex positions
- Memory usage patterns need optimization
- State mutation during operations

**Optimization Opportunities**:

- Caching mechanisms for repeated calculations
- Bitboard representation for faster operations
- Immutable state management
- Parallel processing for move generation

## Memory Usage Patterns

### Current Memory Architecture

**Board Representation**:

- 256-element array for 0x88 board (~2KB per position)
- Additional state tracking structures
- History storage for undo operations
- Position count tracking for repetition detection

**Object Lifecycle**:

- Singleton pattern creates long-lived objects
- Move objects created and destroyed frequently
- State snapshots for undo functionality
- Garbage collection considerations

**Memory Efficiency Issues**:

- 51.6% utilization of board array
- Redundant state tracking in multiple places
- History storage grows over time
- No memory pooling for frequent allocations

### Optimization Strategies

**Potential Improvements**:

- Bitboard representation (~1KB per position)
- Object pooling for move generation
- Compressed history storage
- Lazy evaluation of expensive calculations
- Memory-mapped data structures for large games

**Trade-offs**:

- Memory vs. computation speed
- Implementation complexity vs. performance
- Maintainability vs. optimization
- Cross-platform compatibility considerations
