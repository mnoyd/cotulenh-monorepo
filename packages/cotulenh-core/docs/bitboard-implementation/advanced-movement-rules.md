# Advanced Movement Rules with Bitboards

## Overview

CoTuLenh has several advanced movement mechanics that need special handling in
bitboard implementation:

1. **Combine Moves** - Merging with friendly pieces
2. **Extended Ranges** - Up to range 5 for heroic Air Force
3. **River Crossing Restrictions** - Heavy pieces cannot cross rivers
4. **Bridge Usage** - Bridges allow river crossing for heavy pieces

## Combine Moves

### Combine Move Mechanics

Combine moves are essentially **normal moves that end on friendly pieces**
instead of empty squares:

```typescript
// Normal capture: move to square with enemy piece
// Normal move: move to empty square
// Combine move: move to square with friendly piece → merge stacks

class CombineMovement {
  // Generate combine moves (moves ending on friendly pieces)
  generateCombineMoves(
    pieceType: PieceSymbol,
    square: number,
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
    isHeroic: boolean = false,
  ): Bitboard {
    // Get all possible destinations for this piece
    const allDestinations = FastMoveGeneration.generatePieceMoves(
      pieceType,
      square,
      occupancy,
      0n,
      isHeroic, // Don't exclude friendly pieces yet
    )

    // Combine moves = destinations that have friendly pieces
    const combineMoves = allDestinations & friendlyPieces

    return combineMoves
  }

  // Check if move is a combine move
  isCombineMove(from: number, to: number, friendlyPieces: Bitboard): boolean {
    const toBit = 1n << BigInt(to)
    return (friendlyPieces & toBit) !== 0n
  }
}
```

### Combine Move Generation Integration

```typescript
class UnifiedMoveGeneration {
  generateAllMoves(
    pieceType: PieceSymbol,
    square: number,
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
    enemyPieces: Bitboard,
    isHeroic: boolean = false,
  ): { normalMoves: Bitboard; captures: Bitboard; combines: Bitboard } {
    // Get all reachable squares (ignoring piece colors)
    const allReachable = FastMoveGeneration.generatePieceMoves(
      pieceType,
      square,
      occupancy,
      0n,
      isHeroic,
    )

    // Separate by destination type
    const normalMoves = allReachable & ~occupancy // Empty squares
    const captures = allReachable & enemyPieces // Enemy pieces
    const combines = allReachable & friendlyPieces // Friendly pieces

    return { normalMoves, captures, combines }
  }
}
```

## Extended Ranges (Up to Range 5)

### Range 5 for Heroic Air Force

You're absolutely right - we need to extend our range tables:

```typescript
interface ExtendedRayTables extends RayTables {
  // Add range 5 for heroic Air Force
  range5Rays: Bitboard[][] // [square][direction] -> 5-square ray

  // Updated heroic ranges
  heroicAirForceRays: Bitboard[][] // Range 1-5 in all 8 directions
}

class ExtendedRayGenerator {
  static generateExtendedRays(): ExtendedRayTables {
    const rays = RayGenerator.generateAllRays() as ExtendedRayTables

    // Add range 5 rays
    rays.range5Rays = new Array(256).fill(null).map(() => new Array(8))

    for (let square = 0; square < 256; square++) {
      const [file, rank] = bitToSquare(square)
      if (file >= 12 || rank >= 12) continue

      const directions = [
        Direction.NORTH,
        Direction.SOUTH,
        Direction.EAST,
        Direction.WEST,
        Direction.NORTH_EAST,
        Direction.NORTH_WEST,
        Direction.SOUTH_EAST,
        Direction.SOUTH_WEST,
      ]

      for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
        rays.range5Rays[square][dirIndex] = RangeLimitedRays.generateRangedRay(
          file,
          rank,
          directions[dirIndex],
          5,
        )
      }
    }

    // Update heroic Air Force to use range 5
    for (let square = 0; square < 256; square++) {
      rays.heroicAirForceRays[square] = rays.range5Rays[square]
    }

    return rays
  }
}

// Updated piece ranges
const EXTENDED_PIECE_RANGES = {
  [TANK]: { base: 2, heroic: 4 },
  [ARTILLERY]: { base: 3, heroic: 6 },
  [NAVY]: { base: 3, heroic: 6 },
  [AIR_FORCE]: { base: 4, heroic: 5 }, // ← Updated to range 5
  [INFANTRY]: { base: 1, heroic: 2 },
  [MILITIA]: { base: 1, heroic: 2 },
  [COMMANDER]: { base: 1, heroic: 2 },
  [HEADQUARTER]: { base: 0, heroic: 1 },
}
```

## River Crossing Restrictions

### Heavy Pieces Cannot Cross Rivers

Heavy pieces (Artillery, Missile, Anti-Air) have special river crossing
restrictions:

```typescript
interface HeavyPieceRules {
  // Heavy pieces that cannot cross rivers
  heavyPieces: Set<PieceSymbol>

  // River crossing restrictions
  canCrossRiver(pieceType: PieceSymbol): boolean
}

const HEAVY_PIECES = new Set([ARTILLERY, MISSILE, ANTI_AIR])

class RiverCrossing {
  private terrain: TerrainBitboards

  constructor(terrain: TerrainBitboards) {
    this.terrain = terrain
  }

  // Check if move crosses a river
  crossesRiver(from: number, to: number): boolean {
    // Get all squares between from and to
    const path = this.getPathSquares(from, to)

    // Check if any square in path is a river
    for (const square of path) {
      const squareBit = 1n << BigInt(square)
      if (this.terrain.rivers & squareBit) {
        return true
      }
    }

    return false
  }

  // Check if move crosses river via bridge (allowed)
  crossesRiverViaBridge(from: number, to: number): boolean {
    const path = this.getPathSquares(from, to)

    for (const square of path) {
      const squareBit = 1n << BigInt(square)

      // If path crosses river
      if (this.terrain.rivers & squareBit) {
        // Check if there's a bridge at this river square
        if (this.terrain.bridges & squareBit) {
          continue // Bridge allows crossing
        } else {
          return false // River without bridge blocks heavy pieces
        }
      }
    }

    return true // All river crossings have bridges
  }

  private getPathSquares(from: number, to: number): number[] {
    const [fromFile, fromRank] = bitToSquare(from)
    const [toFile, toRank] = bitToSquare(to)

    const path: number[] = []

    // Calculate direction
    const deltaFile = Math.sign(toFile - fromFile)
    const deltaRank = Math.sign(toRank - fromRank)

    // Generate path squares (excluding start and end)
    let currentFile = fromFile + deltaFile
    let currentRank = fromRank + deltaRank

    while (currentFile !== toFile || currentRank !== toRank) {
      path.push(squareToBit(currentFile, currentRank))
      currentFile += deltaFile
      currentRank += deltaRank
    }

    return path
  }
}
```

### Heavy Piece Move Generation

```typescript
class HeavyPieceMovement {
  private riverCrossing: RiverCrossing

  constructor(terrain: TerrainBitboards) {
    this.riverCrossing = new RiverCrossing(terrain)
  }

  // Generate moves for heavy pieces (considering river restrictions)
  generateHeavyPieceMoves(
    pieceType: PieceSymbol,
    square: number,
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
    isHeroic: boolean = false,
  ): Bitboard {
    // Get all possible moves ignoring river restrictions
    const allMoves = FastMoveGeneration.generatePieceMoves(
      pieceType,
      square,
      occupancy,
      friendlyPieces,
      isHeroic,
    )

    // If not a heavy piece, return all moves
    if (!HEAVY_PIECES.has(pieceType)) {
      return allMoves
    }

    // Filter out moves that cross rivers without bridges
    return this.filterRiverCrossingMoves(allMoves, square)
  }

  private filterRiverCrossingMoves(
    moves: Bitboard,
    fromSquare: number,
  ): Bitboard {
    let validMoves = 0n
    let movesToCheck = moves

    while (movesToCheck !== 0n) {
      const toSquare = BitboardUtils.getLowestSetBit(movesToCheck)
      movesToCheck &= movesToCheck - 1n

      // Check if this move crosses river via bridge
      if (this.riverCrossing.crossesRiverViaBridge(fromSquare, toSquare)) {
        validMoves |= 1n << BigInt(toSquare)
      }
    }

    return validMoves
  }
}
```

## Bridge Usage

### Bridges Enable River Crossing

Bridges are special terrain squares that allow heavy pieces to cross rivers:

```typescript
class BridgeSystem {
  private terrain: TerrainBitboards

  constructor(terrain: TerrainBitboards) {
    this.terrain = terrain
  }

  // Check if square is a bridge
  isBridge(square: number): boolean {
    const squareBit = 1n << BigInt(square)
    return (this.terrain.bridges & squareBit) !== 0n
  }

  // Get all bridge squares
  getAllBridges(): number[] {
    return BitboardUtils.getBitPositions(this.terrain.bridges)
  }

  // Check if path uses bridges for all river crossings
  pathUsesBridgesForRivers(from: number, to: number): boolean {
    const riverCrossing = new RiverCrossing(this.terrain)
    return riverCrossing.crossesRiverViaBridge(from, to)
  }
}
```

### Enhanced Terrain Encoding with Rivers and Bridges

```typescript
class EnhancedTerrainEncoder {
  static initializeTerrainWithRivers(): TerrainBitboards {
    const terrain = TerrainEncoder.initializeTerrain()

    // Add specific river and bridge definitions
    terrain.rivers = this.generateRiverBitboard()
    terrain.bridges = this.generateBridgeBitboard()

    // Update mixed terrain to include rivers and bridges
    terrain.mixedTerrain |= terrain.rivers | terrain.bridges

    // Update accessibility masks
    terrain.landAccessible |= terrain.bridges // Bridges accessible to land pieces
    terrain.navyAccessible |= terrain.rivers // Rivers accessible to navy

    return terrain
  }

  private static generateRiverBitboard(): Bitboard {
    let rivers = 0n

    // Example: Rivers at ranks 3 and 8 in files d-k
    for (let file = 3; file <= 10; file++) {
      // Files d-k
      rivers |= singleBit(file, 3) // Rank 3 river
      rivers |= singleBit(file, 8) // Rank 8 river
    }

    return rivers
  }

  private static generateBridgeBitboard(): Bitboard {
    let bridges = 0n

    // Example: Bridges at specific river crossings
    // Bridges at e3, f3, g3 (rank 3 river)
    bridges |= singleBit(4, 3) // e3
    bridges |= singleBit(5, 3) // f3
    bridges |= singleBit(6, 3) // g3

    // Bridges at e8, f8, g8 (rank 8 river)
    bridges |= singleBit(4, 8) // e8
    bridges |= singleBit(5, 8) // f8
    bridges |= singleBit(6, 8) // g8

    return bridges
  }
}
```

## Complete Integration Example

### Unified Move Generation with All Rules

```typescript
class CompleteMoveGeneration {
  private terrain: TerrainBitboards
  private heavyPieceMovement: HeavyPieceMovement
  private combineMovement: CombineMovement

  constructor(terrain: TerrainBitboards) {
    this.terrain = terrain
    this.heavyPieceMovement = new HeavyPieceMovement(terrain)
    this.combineMovement = new CombineMovement()
  }

  // Generate all moves for a piece considering all rules
  generateCompleteMoves(
    pieceType: PieceSymbol,
    square: number,
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
    enemyPieces: Bitboard,
    isHeroic: boolean = false,
  ): Move[] {
    const moves: Move[] = []

    // Generate moves considering heavy piece restrictions
    let validDestinations: Bitboard

    if (HEAVY_PIECES.has(pieceType)) {
      // Heavy piece - consider river crossing restrictions
      validDestinations = this.heavyPieceMovement.generateHeavyPieceMoves(
        pieceType,
        square,
        occupancy,
        friendlyPieces,
        isHeroic,
      )
    } else {
      // Normal piece - no river restrictions
      validDestinations = FastMoveGeneration.generatePieceMoves(
        pieceType,
        square,
        occupancy,
        friendlyPieces,
        isHeroic,
      )
    }

    // Separate moves by type
    const normalMoves = validDestinations & ~occupancy
    const captures = validDestinations & enemyPieces
    const combines = validDestinations & friendlyPieces

    // Convert to Move objects
    moves.push(
      ...this.bitboardToMoves(normalMoves, square, 'normal', pieceType),
    )
    moves.push(...this.bitboardToMoves(captures, square, 'capture', pieceType))
    moves.push(...this.bitboardToMoves(combines, square, 'combine', pieceType))

    return moves
  }

  private bitboardToMoves(
    destinations: Bitboard,
    fromSquare: number,
    moveType: string,
    pieceType: PieceSymbol,
  ): Move[] {
    const moves: Move[] = []
    let dests = destinations

    while (dests !== 0n) {
      const toSquare = BitboardUtils.getLowestSetBit(dests)
      dests &= dests - 1n

      moves.push({
        type: moveType as any,
        from: fromSquare,
        to: toSquare,
        piece: { type: pieceType, color: 'r', heroic: false }, // Example
      })
    }

    return moves
  }
}
```

## Summary

### Key Points Implemented

✅ **Combine Moves** - Simple: moves ending on friendly pieces ✅ **Extended
Ranges** - Up to range 5 for heroic Air Force ✅ **River Crossing** - Heavy
pieces blocked by rivers ✅ **Bridge Usage** - Bridges allow heavy pieces to
cross rivers ✅ **Unified Generation** - All rules integrated seamlessly

### Performance Benefits

- **Pre-computed rays** handle all ranges (1-5) efficiently
- **Bitboard filtering** for river crossing restrictions
- **Path calculation** only when needed for heavy pieces
- **Terrain masks** make bridge/river checks instant

The bitboard approach handles these **complex movement rules elegantly** while
maintaining **blazing performance**! 🚀
