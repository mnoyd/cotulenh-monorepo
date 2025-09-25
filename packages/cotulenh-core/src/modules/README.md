# CoTuLenh Modular Architecture

This directory contains the refactored modular implementation of the CoTuLenh
chess variant engine. The monolithic `CoTuLenh` class has been broken down into
focused, maintainable modules.

## Module Overview

### Core Modules

#### 1. `interfaces.ts`

Defines TypeScript interfaces and contracts for all modules. This ensures type
safety and clear communication between modules.

#### 2. `game-state.ts` - Game State Module

**Responsibility**: Centralized game state management

- Board representation and state
- Turn management
- Move counters (half moves, move number)
- Commander positions
- Deploy state tracking
- Air defense state
- Position counting for threefold repetition
- State snapshots for undo/redo

**Key Features**:

- Single source of truth for all game state
- Immutable state access (returns copies)
- State validation and consistency checks
- Snapshot/restore functionality for history management

#### 3. `board-operations.ts` - Board Operations Module

**Responsibility**: Piece placement, removal, and board validation

- Piece operations (get, put, remove)
- Heroic status management
- Board validation and terrain checking
- Commander position tracking
- Stack operations for combined pieces

**Key Features**:

- Terrain constraint validation (navy vs land pieces)
- Piece combination logic for stacks
- Commander limit enforcement (one per color)
- Air defense integration
- Board representation generation

#### 4. `move-executor.ts` - Move Execution Module

**Responsibility**: Move execution and history management

- Move execution using command pattern
- Undo/redo functionality
- History management and state snapshots
- Game state updates after moves

**Key Features**:

- Command pattern integration with existing atomic actions
- Complete history tracking with state snapshots
- Turn switching and move counter management
- Capture detection and half-move clock reset
- Replay functionality for history reconstruction

#### 5. `cotulenh-facade.ts` - Facade Pattern Implementation

**Responsibility**: Backward compatibility and unified API

- Maintains original CoTuLenh class API
- Delegates to appropriate modules
- Provides migration path from monolithic to modular architecture

**Key Features**:

- 100% API compatibility with original class
- Gradual migration support
- Module access for advanced usage
- Debug and validation helpers

## Planned Modules (To Be Implemented)

### 6. Move Validation Module (`move-validator.ts`)

- Legal move filtering and validation
- Check/checkmate detection
- Attack calculation and threat analysis
- Game state analysis (draw conditions, game over)

### 7. Move Interface Module (`move-interface.ts`)

- Public move API (move, deployMove, moves)
- SAN/LAN parsing and generation
- Move caching for performance
- Input validation and error handling

### 8. Game Analysis Module (`game-analysis.ts`)

- Position evaluation and analysis
- Draw condition detection
- Game phase determination
- Advanced position queries

### 9. Serialization Module (`serialization.ts`)

- FEN generation and parsing
- History serialization (PGN-like format)
- Board representation formats
- Comment management

## Architecture Benefits

### Development Benefits

- **Separation of Concerns**: Each module has a single, well-defined
  responsibility
- **Easier Testing**: Modules can be unit tested in isolation
- **Parallel Development**: Multiple developers can work on different modules
- **Code Reusability**: Modules can be reused in other chess variant
  implementations

### Maintenance Benefits

- **Reduced Complexity**: Smaller, focused codebases are easier to understand
- **Easier Debugging**: Issues can be isolated to specific modules
- **Flexible Updates**: Individual modules can be updated without affecting
  others
- **Better Documentation**: Module-specific documentation is more manageable

### Performance Benefits

- **Tree Shaking**: Better dead code elimination in bundlers
- **Code Splitting**: Load only required modules for specific use cases
- **Memory Efficiency**: Better memory management per module
- **Optimized Bundling**: Smaller bundle sizes for specific functionality

## Migration Strategy

The refactoring follows a phased approach to minimize risk and maintain backward
compatibility:

### Phase 1: Core Infrastructure ✅

- [x] Module interfaces and contracts
- [x] Game State module
- [x] Board Operations module
- [x] Move Executor module
- [x] Facade pattern implementation

### Phase 2: Move System (In Progress)

- [ ] Move Validator module
- [ ] Move Interface module
- [ ] Integration with existing move generation
- [ ] Command pattern alignment

### Phase 3: Analysis and Serialization

- [ ] Game Analysis module
- [ ] Serialization module
- [ ] FEN parsing/generation
- [ ] History management

### Phase 4: Optimization and Polish

- [ ] Performance optimization
- [ ] Complete test coverage
- [ ] Documentation updates
- [ ] Migration guide

## Usage Examples

### Using the Facade (Backward Compatible)

```typescript
import { CoTuLenh } from './modules/cotulenh-facade.js'

// Same API as original monolithic class
const game = new CoTuLenh()
game.move('Nc3')
console.log(game.fen())
```

### Using Individual Modules (Advanced)

```typescript
import { GameState } from './modules/game-state.js'
import { BoardOperations } from './modules/board-operations.js'

const gameState = new GameState()
const boardOps = new BoardOperations(gameState)

// Direct module access for specialized use cases
const piece = boardOps.getPiece('e4')
gameState.setTurn('b')
```

### Module Integration

```typescript
import { CoTuLenh } from './modules/cotulenh-facade.js'

const game = new CoTuLenh()

// Access underlying modules for advanced operations
const gameState = game.getGameStateModule()
const boardOps = game.getBoardOperationsModule()
const moveExec = game.getMoveExecutorModule()

// Use modules directly while maintaining game consistency
const snapshot = gameState.createSnapshot()
// ... perform operations ...
gameState.restoreSnapshot(snapshot)
```

## Testing Strategy

### Unit Testing

Each module is designed for isolated unit testing:

- Mock dependencies using interfaces
- Test individual module functionality
- Validate state consistency
- Test error conditions and edge cases

### Integration Testing

Test module interactions:

- Facade pattern functionality
- Cross-module communication
- State synchronization
- Command execution flow

### Compatibility Testing

Ensure backward compatibility:

- Original API behavior preservation
- Existing test suite compatibility
- Performance regression testing
- Migration path validation

## Contributing

When adding new functionality:

1. **Follow Module Boundaries**: Add functionality to the appropriate module
2. **Update Interfaces**: Modify interfaces if adding new methods
3. **Maintain Facade**: Update facade to expose new functionality
4. **Add Tests**: Include unit tests for new module functionality
5. **Update Documentation**: Keep module documentation current

## Performance Considerations

### Memory Management

- Modules use defensive copying to prevent state mutation
- Snapshots are created efficiently for undo/redo
- Cache management is centralized in the facade

### Execution Efficiency

- Command pattern maintains existing performance characteristics
- Module boundaries are designed to minimize cross-module calls
- State access is optimized for common operations

### Bundle Size

- Modules can be imported individually for smaller bundles
- Tree shaking eliminates unused module code
- Code splitting allows lazy loading of advanced features

## Future Enhancements

### Planned Features

- Plugin system for custom piece types
- Multiple game variant support
- Advanced AI integration hooks
- Real-time multiplayer support
- Position database integration

### Extensibility

The modular architecture enables:

- Custom move validation rules
- Alternative board representations
- Specialized analysis modules
- Custom serialization formats
- Third-party integrations
