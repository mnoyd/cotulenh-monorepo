# Critical Information Markers Catalog

## Overview

This document catalogs all critical information markers, edge cases, special
cases, exceptions, bugs, issues, problems, limitations, and undocumented
behaviors extracted from the 126 documentation files.

## Critical Information Markers

### CRITICAL Markers

1. **Commander Piece** - Most critical piece in CoTuLenh (equivalent to king)
2. **Deploy System Critical Bugs** - Navy placement on land issue
   (game-breaking)
3. **Recombine Move Generation** - Pieces cannot rejoin already-deployed stacks
   (critical missing feature)
4. **Intermediate State Validation** - Navy can move first, leaving land pieces
   on water (game-breaking bug)
5. **Deploy Architecture** - Two architectures exist (action-based vs deprecated
   virtual state)
6. **Critical Invariants** - Game rules that MUST be preserved regardless of
   implementation
7. **MoveContext Flags** - Critical for correctness in move processing
8. **isTesting Flag** - Critical to prevent state mutations during move
   simulation/validation
9. **Terrain Restrictions** - Critical for deploy moves, Navy can ONLY be placed
   on water squares
10. **Session Mutation Bug** - Fixed critical bug in deploy session handling

### IMPORTANT Markers

1. **Air Defense Value** - Becomes more important with fewer pieces in
   simplified positions
2. **Flexibility vs Power** - Militia excels where flexibility is more important
   than raw power
3. **Bridge Access** - Important for heavy piece river crossing
4. **New Implementations** - Important to understand two architectures before
   porting
5. **Navy Terrain Restrictions** - Undocumented behavior that Navy can only be
   placed on water

### WARNING Markers

1. **TANK Shoot-Over-Blocking** - Critical missing test coverage
2. **Stay Capture Mechanics** - Missing comprehensive test coverage
3. **Historical Virtual State** - Read DEPLOY-CRITICAL-LEARNINGS.md for bugs
   fixed during Phase 3
4. **Undocumented Behavior** - Navy can ONLY be placed on water squares
5. **Commander Under Attack** - Highlight commander or show warning in UI

### NOTE Markers

1. **Anti-Air Heavy Pieces** - Despite being in HEAVY_PIECES set, this is for
   terrain restrictions only
2. **Air Force Exception** - Can be placed on any terrain type (flies over
   water)
3. **Tank Special Rule** - Special rule overrides normal
   captureIgnoresPieceBlocking setting
4. **Missile Diagonal Limitation** - Special case for diagonal movement
   restrictions
5. **Stack Combination** - Note about Infantry+Militia combination rules
6. **Commander Capture Range** - Ignores normal 1-square capture limitation for
   commander vs commander

### TODO Markers

1. **Commander Validation** - Incomplete implementations and missing validations
2. **Terrain Validation Gaps** - Missing test coverage areas
3. **Performance Bottlenecks** - Memory usage issues need addressing
4. **Recombine Integration** - Update documentation with recombine examples
5. **Test Coverage** - Various pieces need additional edge case testing

### FIXME Markers

1. **Deploy System Bugs** - Multiple critical bugs in deploy mechanics
2. **Virtual State Issues** - Deprecated architecture had multiple problems
3. **State Validation** - Comprehensive state validation needed before critical
   operations
4. **Memory Management** - Object lifecycle management issues

## Edge Cases and Special Cases

### Air Force Special Cases

1. **Terrain Exception** - Air Force can be placed anywhere (flies over water)
2. **Movement Freedom** - Can stay on any terrain type during deployment
3. **Kamikaze Attacks** - Suicide capture mechanics for high-value trades
4. **Air Defense Neglect** - Common tactical error not tracking enemy air
   defense

### Tank Special Cases

1. **Shoot-Over-Blocking** - Can capture through blocking pieces (special rule)
2. **Range Limitations** - Maintains normal range limitations despite shoot-over
   ability
3. **Movement vs Capture** - Can capture where it cannot move due to blocking

### Missile Special Cases

1. **Diagonal Range Limitation** - Special diagonal movement restrictions
   override normal rules
2. **Asymmetric Movement** - Can capture orthogonally but has diagonal range
   limitations
3. **Blocking Behavior** - Cannot move through pieces but can capture over them

### Commander Special Cases

1. **Commander vs Commander** - Special capture mechanics ignoring normal range
   and blocking
2. **Flying General Rule** - Line-of-sight restrictions between commanders
3. **Edge Limitations** - Reduced movement options near board edges
4. **Exposure Detection** - Complex calculations for legal move filtering

### Navy Special Cases

1. **Terrain Restrictions** - Can ONLY be placed on water/mixed terrain
   (undocumented)
2. **Amphibious Operations** - Can transport land pieces to water-accessible
   positions
3. **Deployment Limitations** - Limited by water accessibility during stack
   deployment
4. **Critical Placement Bug** - Navy placement on land causes game-breaking
   issues

### Heavy Pieces Special Cases

1. **River Crossing Restrictions** - Subject to zone-based movement limitations
2. **Bridge Utilization** - Must use designated crossing points between zones
3. **Zone Placement** - Strategic importance of files f and h for bridge control
4. **Anti-Air Classification** - In HEAVY_PIECES set for terrain restrictions
   only

### Stack System Special Cases

1. **Combination Rules** - Complex piece compatibility matrix
2. **Carrying Capacity** - Limitations on stack size and composition
3. **Deploy Edge Cases** - Single piece, all pieces move, partial deployment
   scenarios
4. **Recombine Limitation** - Cannot rejoin already-deployed stacks (critical
   missing feature)

### Terrain Special Cases

1. **Mixed Zones** - Allow both navy and land pieces (d6, e6, d7, e7)
2. **Pure Water Zones** - Navy only (a-b files)
3. **Pure Land Zones** - Land pieces only (c-k files)
4. **Bridge Squares** - Special terrain features for heavy piece crossing

## Known Issues and Bugs

### Critical Bugs

1. **Navy Land Placement** - Navy can be placed on land during deploy
   (game-breaking)
2. **Recombine Missing** - Pieces cannot rejoin stacks during deployment
3. **Intermediate Validation** - No validation of remaining pieces after partial
   deploy
4. **State Mutation** - Board mutated during deploy instead of virtual overlay

### High Priority Issues

1. **Virtual State Architecture** - Deprecated due to multiple bugs and
   complexity
2. **Extended FEN Format** - Cannot serialize deploy state properly
3. **Transaction History** - Deploy stored as multiple entries instead of single
   transaction
4. **Performance Bottlenecks** - Memory usage and caching issues

### Medium Priority Issues

1. **Test Coverage Gaps** - Missing tests for edge cases and boundary conditions
2. **Commander Validation** - Incomplete implementations and TODOs
3. **Terrain Validation** - Gaps in validation logic
4. **Error Handling** - Inconsistent error reporting and exception management

### Low Priority Issues

1. **Documentation Redundancy** - 126 files with significant overlap
2. **Cross-Reference Maintenance** - Broken links and outdated references
3. **Code Comments** - Inconsistent documentation in code
4. **Performance Optimization** - Caching and memory management improvements

## Undocumented Behaviors

### Implicit Rules

1. **Navy Water Restriction** - Navy can ONLY be placed on water squares (not
   documented in main rules)
2. **Air Force Terrain Freedom** - Can be placed anywhere despite terrain
   restrictions
3. **Tank Shoot-Over Priority** - Special rule overrides normal blocking
   behavior
4. **Commander Capture Override** - Ignores normal range and blocking for
   commander vs commander
5. **Stay Capture Terrain** - Terrain compatibility affects stay capture
   decisions

### Hidden Assumptions

1. **Singleton Pattern** - Game state managed by single instance
2. **0x88 Boundary Checking** - Implicit board representation assumptions
3. **Move Validation Cycles** - Complex interdependencies in legal move
   filtering
4. **State Management** - History tracking and undo operation assumptions
5. **Performance Characteristics** - Memory usage patterns and optimization
   strategies

### Implementation-Specific Behaviors

1. **Command Pattern Usage** - Move execution and undo operations
2. **Circular Dependencies** - Singleton pattern creates complex dependencies
3. **State Restoration** - Undo operations and state validation
4. **Error Propagation** - Exception handling and error reporting patterns
5. **Memory Lifecycle** - Object creation and cleanup patterns

## Limitations and Constraints

### Current Architecture Limitations

1. **0x88 Representation** - Boundary checking and coordinate conversion
   overhead
2. **Singleton Dependencies** - Circular references and tight coupling
3. **State Mutation** - Direct board modification during operations
4. **Memory Usage** - Inefficient storage patterns
5. **Performance Bottlenecks** - Move generation and validation overhead

### Game Rule Limitations

1. **Stack Complexity** - Complex combination rules limit strategic options
2. **Terrain Restrictions** - Piece placement and movement constraints
3. **Deploy Mechanics** - Current implementation missing key features
4. **Air Defense Zones** - Calculation complexity affects performance
5. **Commander Exposure** - Complex validation affects move generation speed

### Implementation Constraints

1. **TypeScript Specific** - Current implementation tied to language features
2. **Test Coverage** - Missing tests for edge cases and boundary conditions
3. **Documentation Maintenance** - 126 files difficult to keep synchronized
4. **Cross-Platform** - Porting challenges due to implementation specifics
5. **Performance Scaling** - Current approach may not scale to larger boards or
   variants

## Recommendations

### Immediate Actions Required

1. **Fix Critical Bugs** - Navy placement and recombine move generation
2. **Implement Missing Validation** - Intermediate state validation during
   deploy
3. **Complete Test Coverage** - Add tests for identified edge cases
4. **Document Undocumented Behaviors** - Make implicit rules explicit
5. **Consolidate Documentation** - Reduce redundancy and improve maintainability

### Medium-Term Improvements

1. **Architecture Review** - Consider alternatives to current singleton pattern
2. **Performance Optimization** - Address identified bottlenecks
3. **Error Handling** - Standardize exception management
4. **State Management** - Improve history tracking and undo operations
5. **Cross-Platform Support** - Design for easier porting to other languages

### Long-Term Considerations

1. **Alternative Architectures** - Explore bitboard and other modern approaches
2. **Scalability** - Design for potential game variants and extensions
3. **Maintainability** - Reduce complexity and improve code organization
4. **Performance** - Consider high-performance implementations for competitive
   play
5. **Documentation** - Create comprehensive, maintainable documentation
   structure
