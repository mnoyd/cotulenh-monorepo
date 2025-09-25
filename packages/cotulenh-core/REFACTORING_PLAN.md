# CoTuLenh Class Refactoring Plan

## Overview

This document outlines the plan to refactor the monolithic `CoTuLenh` class
(1462 lines) into smaller, maintainable modules while preserving all existing
functionality and maintaining backward compatibility.

## Current State Analysis

### Problems with Current Architecture

- **Monolithic Class**: Single class with 1462 lines handling multiple
  responsibilities
- **Tight Coupling**: All functionality tightly coupled within one class
- **Testing Complexity**: Difficult to unit test individual components
- **Maintenance Burden**: Large class makes debugging and feature addition
  challenging
- **Code Navigation**: Hard to locate specific functionality within the large
  class

### Existing Strengths to Preserve

- **Command Pattern**: Already uses atomic actions (RemovePieceAction,
  PlacePieceAction)
- **Two-Function Pattern**: Origin/destination separation already implemented
- **Incremental Deploy System**: Recently migrated to step-by-step execution
- **Comprehensive API**: Rich public interface for game operations
- **Robust Testing**: 213 tests covering all functionality

## Proposed Module Architecture

### 1. Core Game State Module (`src/modules/game-state.ts`)

**Responsibilities:**

- Manage core game state (board, turn, counters)
- Provide state access and mutation methods
- Handle state validation and consistency

**Interface:**

```typescript
export interface IGameState {
  // Board state
  getBoard(): (Piece | undefined)[]
  setBoard(board: (Piece | undefined)[]): void

  // Turn management
  getTurn(): Color
  setTurn(color: Color): void

  // Move counters
  getMoveNumber(): number
  setMoveNumber(num: number): void
  getHalfMoves(): number
  setHalfMoves(num: number): void

  // Commander positions
  getCommanderPosition(color: Color): number
  setCommanderPosition(color: Color, position: number): void

  // Deploy state
  getDeployState(): DeployState | null
  setDeployState(state: DeployState | null): void

  // Air defense
  getAirDefense(): AirDefense
  setAirDefense(defense: AirDefense): void

  // Position tracking
  getPositionCount(): Record<string, number>
  updatePositionCount(fen: string): void
}
```

### 2. Board Operations Module (`src/modules/board-operations.ts`)

**Responsibilities:**

- Handle piece placement, removal, and retrieval
- Validate board operations and terrain constraints
- Manage heroic status and piece combinations

**Interface:**

```typescript
export interface IBoardOperations {
  // Piece operations
  getPiece(square: Square | number, pieceType?: PieceSymbol): Piece | undefined
  putPiece(piece: Piece, square: Square, allowCombine?: boolean): boolean
  removePiece(square: Square): Piece | undefined

  // Heroic status
  getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean
  setHeroicStatus(
    square: Square | number,
    pieceType: PieceSymbol | undefined,
    heroic: boolean,
  ): boolean

  // Board validation
  validatePiecePlacement(piece: Piece, square: number): boolean
  isSquareOccupied(square: number): boolean

  // Commander tracking
  updateCommanderPosition(square: number, color: Color): void
}
```

### 3. Move Execution Module (`src/modules/move-executor.ts`)

**Responsibilities:**

- Execute and undo moves using command pattern
- Manage move history and state snapshots
- Coordinate with other modules during move execution

**Interface:**

```typescript
export interface IMoveExecutor {
  // Move execution
  executeMove(move: InternalMove | InternalDeployMove): void
  undoLastMove(): InternalMove | InternalDeployMove | null

  // History management
  getHistory(): History[]
  clearHistory(): void

  // State management
  saveGameState(): GameStateSnapshot
  restoreGameState(snapshot: GameStateSnapshot): void
}
```

### 4. Move Validation Module (`src/modules/move-validator.ts`)

**Responsibilities:**

- Validate move legality and game rules
- Detect check, checkmate, and other game states
- Calculate piece attacks and threats

**Interface:**

```typescript
export interface IMoveValidator {
  // Legal move validation
  filterLegalMoves(moves: InternalMove[], color: Color): InternalMove[]
  isMoveLegal(move: InternalMove): boolean

  // Check detection
  isCommanderAttacked(color: Color): boolean
  isCommanderExposed(color: Color): boolean

  // Attack calculation
  getAttackers(
    square: number,
    attackerColor: Color,
  ): { square: number; type: PieceSymbol }[]

  // Game state analysis
  isCheck(): boolean
  isCheckmate(): boolean
  isDraw(): boolean
  isGameOver(): boolean
}
```

### 5. Move Interface Module (`src/modules/move-interface.ts`)

**Responsibilities:**

- Provide public API for move operations
- Handle SAN/LAN parsing and generation
- Manage move caching for performance

**Interface:**

```typescript
export interface IMoveInterface {
  // Public move API
  move(move: string | MoveObject, options?: MoveOptions): Move | null
  deployMove(deployMove: DeployMoveRequest): DeployMove
  moves(options?: MovesOptions): string[] | Move[]

  // Move generation
  generateMoves(options: MoveGenerationOptions): InternalMove[]

  // SAN/LAN operations
  moveFromSan(san: string, strict?: boolean): InternalMove | null
  moveToSanLan(move: InternalMove, allMoves: InternalMove[]): [string, string]

  // Caching
  clearMoveCache(): void
  getMovesCacheKey(args: MoveCacheArgs): string
}
```

### 6. Game Analysis Module (`src/modules/game-analysis.ts`)

**Responsibilities:**

- Analyze game positions and states
- Detect draw conditions and game termination
- Provide game state queries

**Interface:**

```typescript
export interface IGameAnalysis {
  // Game state queries
  isCheck(): boolean
  isCheckmate(): boolean
  isDraw(): boolean
  isGameOver(): boolean

  // Draw conditions
  isDrawByFiftyMoves(): boolean
  isThreefoldRepetition(): boolean
  isInsufficientMaterial(): boolean

  // Position analysis
  evaluatePosition(): PositionEvaluation
  getGamePhase(): GamePhase
}
```

### 7. Serialization Module (`src/modules/serialization.ts`)

**Responsibilities:**

- Handle FEN generation and parsing
- Manage game serialization and deserialization
- Provide board representation formats

**Interface:**

```typescript
export interface ISerialization {
  // FEN operations
  generateFen(): string
  loadFromFen(fen: string, options?: LoadOptions): void
  validateFen(fen: string): boolean

  // History serialization
  getHistory(options?: HistoryOptions): string[] | (Move | DeployMove)[]

  // Board representation
  getBoardArray(): BoardSquare[][]

  // Comments
  getComment(): string | undefined
  setComment(comment: string): void
  removeComment(): string | undefined
}
```

## Migration Strategy

### Phase 1: Extract Core Modules (Week 1-2)

1. **Create module interfaces** - Define TypeScript interfaces for all modules
2. **Extract GameState module** - Move state management to separate module
3. **Extract BoardOperations module** - Move piece operations to separate module
4. **Update tests** - Ensure all existing tests pass with new structure

### Phase 2: Extract Execution and Validation (Week 3-4)

1. **Extract MoveExecutor module** - Move command execution logic
2. **Extract MoveValidator module** - Move validation and analysis logic
3. **Refactor internal dependencies** - Update cross-module communication
4. **Performance testing** - Ensure no performance regression

### Phase 3: Extract Interface and Analysis (Week 5-6)

1. **Extract MoveInterface module** - Move public API and parsing
2. **Extract GameAnalysis module** - Move game state analysis
3. **Extract Serialization module** - Move FEN and serialization logic
4. **Integration testing** - Comprehensive testing of modular system

### Phase 4: Optimization and Documentation (Week 7-8)

1. **Optimize module interactions** - Minimize cross-module calls
2. **Update documentation** - Document new architecture
3. **Performance benchmarking** - Compare with original implementation
4. **Final integration** - Ensure seamless backward compatibility

## Implementation Guidelines

### Module Communication Patterns

- **Dependency Injection**: Modules receive dependencies through constructor
- **Event-Driven**: Use events for loose coupling between modules
- **Shared State**: GameState module acts as single source of truth
- **Interface Contracts**: All modules implement well-defined interfaces

### Backward Compatibility

- **Facade Pattern**: Main CoTuLenh class becomes a facade over modules
- **API Preservation**: All existing public methods remain unchanged
- **Gradual Migration**: Internal refactoring without external API changes
- **Test Coverage**: Maintain 100% test compatibility

### Performance Considerations

- **Lazy Loading**: Load modules only when needed
- **Caching Strategy**: Maintain existing caching mechanisms
- **Memory Management**: Optimize cross-module data sharing
- **Benchmarking**: Regular performance comparison with baseline

## Benefits of Modular Architecture

### Development Benefits

- **Separation of Concerns**: Each module has single responsibility
- **Easier Testing**: Unit test modules in isolation
- **Parallel Development**: Multiple developers can work on different modules
- **Code Reusability**: Modules can be reused in other projects

### Maintenance Benefits

- **Reduced Complexity**: Smaller, focused codebases
- **Easier Debugging**: Isolate issues to specific modules
- **Flexible Updates**: Update individual modules without affecting others
- **Better Documentation**: Module-specific documentation

### Performance Benefits

- **Tree Shaking**: Better dead code elimination
- **Code Splitting**: Load only required modules
- **Optimized Bundling**: Smaller bundle sizes for specific use cases
- **Memory Efficiency**: Better memory management per module

## Risk Mitigation

### Technical Risks

- **Performance Regression**: Mitigate with comprehensive benchmarking
- **Breaking Changes**: Maintain facade pattern for backward compatibility
- **Complexity Increase**: Use clear interfaces and documentation
- **Integration Issues**: Extensive integration testing

### Project Risks

- **Timeline Overrun**: Phased approach with clear milestones
- **Resource Allocation**: Clear task division and ownership
- **Quality Assurance**: Maintain existing test coverage throughout
- **Rollback Plan**: Keep original implementation as fallback

## Success Metrics

### Code Quality Metrics

- **Lines of Code**: Reduce average module size to <300 lines
- **Cyclomatic Complexity**: Reduce complexity per module
- **Test Coverage**: Maintain 100% test coverage
- **Documentation**: 100% interface documentation

### Performance Metrics

- **Execution Time**: No more than 5% performance degradation
- **Memory Usage**: Maintain or improve memory efficiency
- **Bundle Size**: Reduce bundle size for specific use cases
- **Load Time**: Improve initial load time with code splitting

### Development Metrics

- **Build Time**: Maintain or improve build performance
- **Developer Experience**: Improved code navigation and debugging
- **Maintenance Effort**: Reduce time to implement new features
- **Bug Resolution**: Faster issue identification and resolution

## Conclusion

This refactoring plan transforms the monolithic CoTuLenh class into a modular,
maintainable architecture while preserving all existing functionality. The
phased approach ensures minimal risk and maintains backward compatibility
throughout the migration process.

The resulting architecture will be more testable, maintainable, and scalable,
enabling faster development and easier debugging while providing a solid
foundation for future enhancements to the CoTuLenh chess variant engine.
