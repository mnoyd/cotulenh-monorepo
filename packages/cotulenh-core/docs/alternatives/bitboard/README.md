# Bitboard Architecture for CoTuLenh

## Overview

This directory contains exploration and design documents for implementing
CoTuLenh using bitboard/bitmask techniques commonly used in modern chess
engines. The bitboard approach offers potential performance improvements over
the current 0x88 array representation, particularly for move generation and
position evaluation.

## CoTuLenh-Specific Challenges

CoTuLenh presents unique challenges for bitboard implementation:

1. **11×12 Board**: Non-standard board size requires custom bitboard layouts
2. **Stack System**: Complex piece combinations may require hybrid approaches
3. **Terrain Zones**: Water/land/mixed zones need efficient bitboard
   representation
4. **Air Defense Zones**: Circular zones require specialized bitboard operations
5. **11 Piece Types**: More complex than standard chess (6 piece types)
6. **Heroic Status**: Additional piece state beyond position and type

## Documents in This Directory

- **BITBOARD-ARCHITECTURE.md**: Core bitboard design principles for CoTuLenh
- **COTULENH-BITBOARD-ADAPTATIONS.md**: CoTuLenh-specific implementation
  challenges
- **BITBOARD-PERFORMANCE-ANALYSIS.md**: Performance comparison and analysis
- **BITBOARD-IMPLEMENTATION-STRATEGY.md**: Step-by-step implementation guidance

## Key Considerations

### Advantages of Bitboard Approach

- **Performance**: Faster move generation using bitwise operations
- **Memory Efficiency**: More compact position representation
- **Parallelism**: Natural fit for SIMD operations
- **Modern Techniques**: Leverage proven chess engine optimizations

### Challenges for CoTuLenh

- **Stack Complexity**: May require hybrid approach for piece combinations
- **Non-Standard Board**: 11×12 doesn't fit standard 64-bit patterns
- **Terrain Complexity**: Multiple terrain types need efficient representation
- **Implementation Complexity**: Higher development effort than current approach

## Research Foundation

This exploration builds upon:

- Modern chess engine techniques (Stockfish, Leela Chess Zero)
- Bitboard manipulation algorithms
- SIMD optimization strategies
- Hybrid approaches for complex game mechanics

## Target Audience

- Engine developers considering bitboard implementation
- Performance optimization researchers
- AI agents exploring alternative architectures
- Developers planning new CoTuLenh implementations
