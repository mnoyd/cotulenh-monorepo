# Known Issues and Bug Catalog

## Overview

This document catalogs all known issues, bugs, problems, limitations, and gaps
identified across the 126 documentation files. Issues are categorized by
severity and impact on gameplay and implementation.

## Critical Bugs (Game-Breaking)

### 1. Deploy System Critical Bugs

#### Navy Land Placement Bug

- **Issue**: Navy can be placed on land during deploy phase
- **Impact**: Game-breaking - violates fundamental terrain rules
- **Root Cause**: Missing intermediate state validation during deploy
- **Scenario**: Navy can move first, leaving land pieces on water (invalid
  state)
- **Status**: Identified but not fixed
- **Files Affected**: Deploy system, terrain validation
- **Priority**: Critical - immediate fix required

#### Intermediate State Validation Missing

- **Issue**: No validation of remaining pieces after partial deploy
- **Impact**: Game-breaking - allows impossible board states
- **Scenario**: After piece deploys from stack, no check if remaining pieces can
  legally stay
- **Example**: Navy moves from water stack, leaving Tank on water (illegal)
- **Status**: Critical gap in validation logic
- **Priority**: Critical - blocks proper deploy functionality

### 2. Recombine Move Generation (Missing Feature)

#### Recombine Moves Not Implemented

- **Issue**: Pieces cannot rejoin already-deployed stacks during deployment
- **Impact**: Major tactical limitation - reduces strategic depth
- **Expected Behavior**: Deployed pieces should be able to recombine with
  existing stacks
- **Current State**: Feature completely missing from implementation
- **UI Impact**: Cannot show recombine options to players
- **Status**: Critical missing feature
- **Priority**: Critical - fundamental deploy mechanic missing

#### Recombine Move Generation Problems

- **Issue**: Move generation doesn't include recombine possibilities
- **Impact**: Breaks expected game behavior documented in specs
- **Technical Gap**: Algorithm doesn't consider rejoining stacks
- **Status**: Implementation gap
- **Priority**: High - affects game completeness

### 3. State Mutation During Deploy

#### Board Mutation Instead of Virtual Overlay

- **Issue**: Board mutated during deploy instead of using virtual state
- **Impact**: State corruption, undo problems, validation issues
- **Expected**: Virtual state overlay for deploy operations
- **Current**: Direct board modification during deploy session
- **Status**: Architectural issue
- **Priority**: High - affects state integrity

## High Priority Issues

### 1. Virtual State Architecture (Deprecated)

#### Multiple Virtual State Bugs

- **Issue**: Virtual state architecture had multiple critical bugs
- **Impact**: Architecture deprecated due to complexity and bugs
- **Problems Identified**:
  - Context staleness (ghost pieces bug)
  - State synchronization issues
  - Complex debugging and maintenance
  - Performance overhead
- **Status**: Deprecated - replaced by action-based architecture
- **Reference**: `DEPLOY-CRITICAL-LEARNINGS.md` for complete bug analysis

#### Legacy Virtual State Issues

- **Issue**: Historical virtual state implementation had fundamental flaws
- **Impact**: Led to complete architecture redesign
- **Lessons Learned**: Virtual overlays too complex for CoTuLenh's needs
- **Status**: Historical - documented for reference
- **Priority**: N/A - architecture superseded

### 2. Extended FEN Format Issues

#### Deploy State Serialization

- **Issue**: Cannot properly serialize deploy state in FEN format
- **Impact**: Save/load functionality incomplete during deploy
- **Expected**: FEN should include deploy state markers
- **Current**: Limited deploy state representation
- **Status**: Implementation gap
- **Priority**: High - affects game persistence

#### FEN Round-Trip Problems

- **Issue**: FEN round-trip doesn't work mid-deploy
- **Impact**: Cannot save/restore games during deploy phase
- **Technical Issue**: Deploy state not fully captured in FEN
- **Status**: Known limitation
- **Priority**: High - affects user experience

### 3. Transaction History Issues

#### Deploy History Storage

- **Issue**: Deploy stored as multiple entries instead of single transaction
- **Impact**: History tracking inconsistent, undo/redo problems
- **Expected**: Single transaction for entire deploy operation
- **Current**: Each deploy move creates separate history entry
- **Status**: Design issue
- **Priority**: High - affects game history integrity

## Medium Priority Issues

### 1. Test Coverage Gaps

#### Critical Missing Test Coverage

- **TANK Shoot-Over-Blocking**: No test validates signature ability
- **Navy Water-Only Movement**: Comprehensive movement tests needed
- **Heavy Piece River Crossing**: Zone-based movement validation missing
- **Stay Capture Mechanics**: Comprehensive testing required
- **Suicide Capture Edge Cases**: Complex scenarios not tested
- **Air Defense Complex Scenarios**: Multi-level defense not fully tested

#### Edge Case Testing Gaps

- **Boundary Conditions**: Edge cases and boundary conditions need validation
- **Complex Interactions**: Scenarios between special mechanics not tested
- **Stack Operations**: Multi-level stacks and deployment edge cases
- **Terrain Transitions**: Captures near terrain boundaries not tested

### 2. Commander Validation Issues

#### Incomplete Implementations

- **Issue**: Commander validation has TODOs and incomplete implementations
- **Impact**: Potential rule violations in commander mechanics
- **Areas Affected**:
  - Flying general rule edge cases
  - Commander exposure detection
  - Special capture validation
  - Checkmate detection completeness
- **Status**: Implementation gaps
- **Priority**: Medium - affects game rule integrity

#### Commander Validation TODOs

- **Issue**: Multiple TODO markers in commander validation code
- **Impact**: Incomplete rule enforcement
- **Technical Debt**: Unfinished validation logic
- **Status**: Development incomplete
- **Priority**: Medium - needs completion

### 3. Terrain Validation Gaps

#### Missing Validation Logic

- **Issue**: Gaps in terrain validation logic
- **Impact**: Potential rule violations in piece placement
- **Areas Affected**:
  - Mixed zone validation
  - Bridge square validation
  - Stack terrain compatibility
  - Deploy terrain checking
- **Status**: Implementation gaps
- **Priority**: Medium - affects rule enforcement

#### Validation Inconsistencies

- **Issue**: Inconsistent validation across different contexts
- **Impact**: Rules applied differently in different situations
- **Technical Issue**: Validation logic not centralized
- **Status**: Design inconsistency
- **Priority**: Medium - affects rule consistency

### 4. Error Handling Issues

#### Inconsistent Error Reporting

- **Issue**: Inconsistent error reporting and exception management
- **Impact**: Difficult debugging, unclear error messages
- **Technical Issue**: No standardized error handling patterns
- **Status**: Code quality issue
- **Priority**: Medium - affects maintainability

#### Exception Management

- **Issue**: Exception handling not standardized across codebase
- **Impact**: Unpredictable error behavior
- **Technical Debt**: Inconsistent error patterns
- **Status**: Code quality issue
- **Priority**: Medium - affects reliability

## Low Priority Issues

### 1. Documentation Issues

#### Documentation Redundancy

- **Issue**: 126 files with significant overlap and redundancy
- **Impact**: Maintenance burden, information overload
- **Scale**: 2MB of documentation with substantial duplication
- **Status**: Organizational issue
- **Priority**: Low - affects maintainability

#### Cross-Reference Maintenance

- **Issue**: Broken links and outdated references
- **Impact**: Navigation difficulties, stale information
- **Technical Debt**: Links not maintained during updates
- **Status**: Maintenance issue
- **Priority**: Low - affects usability

### 2. Code Quality Issues

#### Code Comments Inconsistency

- **Issue**: Inconsistent documentation in code comments
- **Impact**: Difficult code understanding and maintenance
- **Technical Debt**: Comment quality varies significantly
- **Status**: Code quality issue
- **Priority**: Low - affects maintainability

#### Performance Optimization Opportunities

- **Issue**: Caching and memory management improvements needed
- **Impact**: Performance could be better optimized
- **Areas**: Move generation, air defense calculations, state management
- **Status**: Optimization opportunity
- **Priority**: Low - performance acceptable but could improve

## Performance Bottlenecks

### 1. Current Performance Issues

#### Air Defense Zone Calculation Complexity

- **Issue**: Air defense zone calculations affect performance
- **Impact**: Move generation slower with multiple air defense pieces
- **Technical Cause**: Complex circular distance calculations
- **Status**: Performance bottleneck
- **Priority**: Medium - affects gameplay smoothness

#### Move Generation Overhead

- **Issue**: Move generation overhead for complex positions
- **Impact**: Slower response times in complex game states
- **Technical Cause**: Multiple validation passes, complex rule checking
- **Status**: Performance issue
- **Priority**: Medium - affects user experience

#### Memory Usage Patterns

- **Issue**: Inefficient memory usage patterns
- **Technical Issues**:
  - 51.6% utilization of board array (0x88 representation)
  - Redundant state tracking in multiple places
  - History storage grows over time
  - No memory pooling for frequent allocations
- **Status**: Memory inefficiency
- **Priority**: Low - functional but not optimal

### 2. Scalability Issues

#### State Management Overhead

- **Issue**: State management approaches not optimized for scale
- **Impact**: Performance degrades with game length
- **Technical Cause**: History tracking, position counting overhead
- **Status**: Scalability limitation
- **Priority**: Low - affects long games

#### Validation Performance

- **Issue**: Move validation cycles have performance overhead
- **Impact**: Complex positions take longer to validate
- **Technical Cause**: Multiple validation passes, complex interdependencies
- **Status**: Performance issue
- **Priority**: Medium - affects complex positions

## Memory Usage Issues

### 1. Memory Architecture Problems

#### Board Representation Inefficiency

- **Issue**: 0x88 representation uses only 51.6% of allocated memory
- **Impact**: Memory waste, cache inefficiency
- **Technical Cause**: 256-element array for 132 valid squares
- **Alternative**: Bitboard representation could use ~1KB vs ~2KB
- **Status**: Architectural inefficiency
- **Priority**: Low - functional but not optimal

#### Object Lifecycle Management

- **Issue**: Object lifecycle management patterns need improvement
- **Impact**: Memory leaks potential, garbage collection pressure
- **Technical Issues**:
  - Singleton pattern creates long-lived objects
  - Move objects created/destroyed frequently
  - State snapshots for undo functionality
  - No object pooling
- **Status**: Memory management issue
- **Priority**: Low - affects long-term stability

### 2. Memory Optimization Opportunities

#### History Storage Growth

- **Issue**: History storage grows over time without bounds
- **Impact**: Memory usage increases with game length
- **Technical Cause**: Complete state snapshots for undo
- **Optimization**: Compressed history, incremental snapshots
- **Status**: Memory growth issue
- **Priority**: Low - affects very long games

#### Redundant State Tracking

- **Issue**: State tracked in multiple places redundantly
- **Impact**: Memory waste, synchronization complexity
- **Technical Cause**: Multiple singleton state variables
- **Optimization**: Centralized state management
- **Status**: Design inefficiency
- **Priority**: Low - affects memory usage

## Issue Priority Matrix

### Critical (Immediate Action Required)

1. Navy land placement bug (game-breaking)
2. Recombine moves missing (major feature gap)
3. Intermediate state validation missing (rule violations)
4. State mutation during deploy (integrity issues)

### High Priority (Next Release)

1. Extended FEN format issues (save/load problems)
2. Transaction history problems (undo/redo issues)
3. Virtual state architecture cleanup (technical debt)

### Medium Priority (Future Releases)

1. Test coverage gaps (quality assurance)
2. Commander validation TODOs (rule completeness)
3. Terrain validation gaps (rule consistency)
4. Performance bottlenecks (user experience)

### Low Priority (Maintenance)

1. Documentation redundancy (maintainability)
2. Memory usage optimization (efficiency)
3. Code quality improvements (maintainability)

## Recommendations

### Immediate Actions

1. **Fix Navy placement bug** - implement proper terrain validation during
   deploy
2. **Implement recombine moves** - complete missing deploy functionality
3. **Add intermediate validation** - prevent invalid board states
4. **Fix state mutation** - use proper virtual state or action-based approach

### Short-term Improvements

1. **Complete test coverage** - add tests for identified gaps
2. **Finish commander validation** - complete TODO implementations
3. **Standardize error handling** - consistent exception management
4. **Optimize performance** - address identified bottlenecks

### Long-term Considerations

1. **Architecture review** - consider alternatives to singleton pattern
2. **Memory optimization** - implement more efficient representations
3. **Documentation consolidation** - reduce redundancy and improve
   maintainability
4. **Performance scaling** - design for larger games and variants
