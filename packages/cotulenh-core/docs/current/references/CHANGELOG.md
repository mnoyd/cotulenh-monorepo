# CoTuLenh Changelog

## Version History and Major Changes

### Current Version (TypeScript Implementation)

#### Major Features

- **0x88 Board Representation**: Efficient 11×12 board with boundary checking
- **Stack System**: Complex piece combination and deployment mechanics
- **Heroic Promotion**: Commander-triggered piece enhancements
- **Air Defense Zones**: Multi-layered air force restrictions
- **Extended FEN/SAN**: Stack notation `(NFT)` and special move symbols
- **Deploy Mechanics**: Stack splitting and piece deployment
- **Terrain System**: Water/land/mixed zones with movement restrictions

#### Known Issues and Limitations

- **Deploy System Bugs**: Navy placement on land terrain (critical)
- **Recombine Move Generation**: Incomplete implementation
- **Virtual State Architecture**: Deprecated due to complexity
- **Commander Validation**: Incomplete TODO items
- **Performance Bottlenecks**: Verbose mode and memory usage
- **Test Coverage Gaps**: Missing edge case validation

#### Architecture Decisions

- **Singleton Pattern**: Used for game state management
- **Command Pattern**: Move execution and undo operations
- **0x88 Representation**: Chosen over bitboard for stack support
- **Action-Based Deploy**: Replaced virtual state overlay

### Historical Context

#### Early Development

- Initial focus on game rule implementation
- Basic piece movement and capture mechanics
- Simple board representation

#### Stack System Evolution

- Added piece combination rules
- Implemented carrying capacity logic
- Developed deploy mechanics (ongoing issues)

#### Air Defense Implementation

- Circular zone calculations
- Multi-level defense interactions
- Kamikaze (suicide capture) mechanics

#### Heroic Promotion System

- Commander attack triggers
- Piece-specific enhancements
- Stack inheritance rules

#### Deploy System Iterations

1. **Virtual State Overlay**: Complex state management (deprecated)
2. **Action-Based Deploy**: Current implementation (has bugs)
3. **Future Improvements**: Planned incremental fixes

### Breaking Changes

#### Deploy System Refactoring

- Removed virtual state overlay architecture
- Introduced action-based deploy moves
- Changed internal state representation

#### FEN Format Extensions

- Added stack notation `(NFT)` for piece combinations
- Introduced heroic markers `+` for enhanced pieces
- Extended SAN notation for deploy moves

#### API Changes

- Modified move validation interface
- Updated game state query methods
- Changed deploy move representation

### Bug Fixes and Improvements

#### Critical Fixes Needed

- Navy placement validation on terrain
- Recombine move generation completion
- Commander exposure detection edge cases
- Air defense zone boundary calculations

#### Performance Improvements

- Optimized move generation for common cases
- Reduced memory allocation in hot paths
- Improved caching for expensive calculations

#### Test Coverage Enhancements

- Added edge case validation
- Improved boundary condition testing
- Enhanced integration test coverage

### Future Roadmap

#### Short-term Improvements

- Fix critical deploy system bugs
- Complete recombine move implementation
- Improve test coverage for edge cases
- Optimize performance bottlenecks

#### Medium-term Enhancements

- Incremental architecture improvements
- Enhanced error handling and validation
- Better debugging and diagnostic tools
- Improved documentation and examples

#### Long-term Considerations

- Alternative architecture exploration (bitboard)
- Cross-language porting support
- Advanced optimization techniques
- Modern chess engine integration

### Migration Notes

#### For Developers

- Current codebase uses 0x88 representation
- Singleton pattern creates circular dependencies
- Command pattern enables undo functionality
- Deploy system has known critical bugs

#### For Porters

- Game rules are stable and well-documented
- Implementation details are TypeScript-specific
- Alternative architectures are being explored
- Incremental migration strategies available

### References

- **Requirements**: See requirements.md for detailed specifications
- **Design**: See design.md for architectural decisions
- **Implementation**: See IMPLEMENTATION-GUIDE.md for current details
- **Testing**: See TESTING-GUIDE.md for validation strategies
- **Migration**: See MIGRATION-GUIDE.md for improvement paths
