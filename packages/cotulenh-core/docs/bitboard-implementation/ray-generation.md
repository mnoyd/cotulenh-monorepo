# Ray Generation for CoTuLenh Bitboards

## The Core Insight

Every piece in CoTuLenh moves in **rays** - straight lines in one or more
directions. This is exactly what bitboards excel at! We pre-compute all possible
rays and use bitwise operations to find valid moves.

## Ray Types by Piece

### Horizontal/Vertical Rays (Orthogonal)

- **Tank:** 4 directions, range 1-2
- **Artillery:** 4 directions, range 1-3
- **Navy:** 4 directions, range 1-3
- **Commander:** 4 directions, range 1 (8 directions when heroic)

### All 8 Directions (Omnidirectional)

- **Air Force:** 8 directions, range 1-4
- **Infantry:** 8 directions, range 1
- **Militia:** 8 directions, range 1
- **HEADQUARTER:** 8 directions, range 1 (heroic only)

### Special Cases

- **HEADQUARTER (base):** No movement (range 0)
- **Heroic pieces:** Extended ranges (Tank 1-4, Artillery 1-6, etc.)

## Ray Table Structure

### Pre-computed Ray Tables

```typescript
interface RayTables {
  // Individual direction rays
  north: Bitboard[] // [square] -> ray going north
  south: Bitboard[] // [square] -> ray going south
  east: Bitboard[] // [square] -> ray going east
  west: Bitboard[] // [square] -> ray going west
  northEast: Bitboard[] // [square] -> ray going northeast
  northWest: Bitboard[] // [square] -> ray going northwest
  southEast: Bitboard[] // [square] -> ray going southeast
  southWest: Bitboard[] // [square] -> ray going southwest

  // Combined rays by piece type
  tankRays: Bitboard[][] // [square][direction] -> ray
  artilleryRays: Bitboard[][] // [square][direction] -> ray
  navyRays: Bitboard[][] // [square][direction] -> ray
  airForceRays: Bitboard[][] // [square][direction] -> ray
  infantryRays: Bitboard[][] // [square][direction] -> ray
  militiaRays: Bitboard[][] // [square][direction] -> ray
  commanderRays: Bitboard[][] // [square][direction] -> ray

  // Range-limited rays
  range1Rays: Bitboard[][] // [square][direction] -> 1-square ray
  range2Rays: Bitboard[][] // [square][direction] -> 2-square ray
  range3Rays: Bitboard[][] // [square][direction] -> 3-square ray
  range4Rays: Bitboard[][] // [square][direction] -> 4-square ray
}
```

### Ray Generation Algorithm

```typescript
class RayGenerator {
  // Generate all rays at initialization
  static generateAllRays(): RayTables {
    const rays: RayTables = {
      north: new Array(256),
      south: new Array(256),
      east: new Array(256),
      west: new Array(256),
      northEast: new Array(256),
      northWest: new Array(256),
      southEast: new Array(256),
      southWest: new Array(256),

      tankRays: new Array(256).fill(null).map(() => new Array(4)),
      artilleryRays: new Array(256).fill(null).map(() => new Array(4)),
      navyRays: new Array(256).fill(null).map(() => new Array(4)),
      airForceRays: new Array(256).fill(null).map(() => new Array(8)),
      infantryRays: new Array(256).fill(null).map(() => new Array(8)),
      militiaRays: new Array(256).fill(null).map(() => new Array(8)),
      commanderRays: new Array(256).fill(null).map(() => new Array(8)),

      range1Rays: new Array(256).fill(null).map(() => new Array(8)),
      range2Rays: new Array(256).fill(null).map(() => new Array(8)),
      range3Rays: new Array(256).fill(null).map(() => new Array(8)),
      range4Rays: new Array(256).fill(null).map(() => new Array(8)),
    }

    // Generate rays for each square
    for (let square = 0; square < 256; square++) {
      const [file, rank] = bitToSquare(square)

      // Skip invalid squares (outside 12x12 board)
      if (file >= 12 || rank >= 12) continue

      // Generate basic direction rays
      rays.north[square] = this.generateNorthRay(file, rank)
      rays.south[square] = this.generateSouthRay(file, rank)
      rays.east[square] = this.generateEastRay(file, rank)
      rays.west[square] = this.generateWestRay(file, rank)
      rays.northEast[square] = this.generateNorthEastRay(file, rank)
      rays.northWest[square] = this.generateNorthWestRay(file, rank)
      rays.southEast[square] = this.generateSouthEastRay(file, rank)
      rays.southWest[square] = this.generateSouthWestRay(file, rank)

      // Generate range-limited rays
      this.generateRangeLimitedRays(rays, square, file, rank)

      // Generate piece-specific rays
      this.generatePieceRays(rays, square)
    }

    return rays
  }

  // Generate ray going north (increasing rank)
  private static generateNorthRay(file: number, rank: number): Bitboard {
    let ray = 0n

    for (let r = rank + 1; r < 12; r++) {
      ray |= singleBit(file, r)
    }

    return ray
  }

  // Generate ray going south (decreasing rank)
  private static generateSouthRay(file: number, rank: number): Bitboard {
    let ray = 0n

    for (let r = rank - 1; r >= 0; r--) {
      ray |= singleBit(file, r)
    }

    return ray
  }

  // Generate ray going east (increasing file)
  private static generateEastRay(file: number, rank: number): Bitboard {
    let ray = 0n

    for (let f = file + 1; f < 12; f++) {
      ray |= singleBit(f, rank)
    }

    return ray
  }

  // Generate ray going west (decreasing file)
  private static generateWestRay(file: number, rank: number): Bitboard {
    let ray = 0n

    for (let f = file - 1; f >= 0; f--) {
      ray |= singleBit(f, rank)
    }

    return ray
  }

  // Generate diagonal rays
  private static generateNorthEastRay(file: number, rank: number): Bitboard {
    let ray = 0n

    for (let i = 1; file + i < 12 && rank + i < 12; i++) {
      ray |= singleBit(file + i, rank + i)
    }

    return ray
  }

  private static generateNorthWestRay(file: number, rank: number): Bitboard {
    let ray = 0n

    for (let i = 1; file - i >= 0 && rank + i < 12; i++) {
      ray |= singleBit(file - i, rank + i)
    }

    return ray
  }

  private static generateSouthEastRay(file: number, rank: number): Bitboard {
    let ray = 0n

    for (let i = 1; file + i < 12 && rank - i >= 0; i++) {
      ray |= singleBit(file + i, rank - i)
    }

    return ray
  }

  private static generateSouthWestRay(file: number, rank: number): Bitboard {
    let ray = 0n

    for (let i = 1; file - i >= 0 && rank - i >= 0; i++) {
      ray |= singleBit(file - i, rank - i)
    }

    return ray
  }
}
```

## Range-Limited Ray Generation

### Generating Rays with Maximum Range

```typescript
class RangeLimitedRays {
  // Generate ray with maximum range limit
  static generateRangedRay(
    file: number,
    rank: number,
    direction: Direction,
    maxRange: number,
  ): Bitboard {
    let ray = 0n

    const [deltaFile, deltaRank] = this.getDirectionDeltas(direction)

    for (let i = 1; i <= maxRange; i++) {
      const newFile = file + deltaFile * i
      const newRank = rank + deltaRank * i

      // Check bounds
      if (newFile < 0 || newFile >= 12 || newRank < 0 || newRank >= 12) {
        break
      }

      ray |= singleBit(newFile, newRank)
    }

    return ray
  }

  private static getDirectionDeltas(direction: Direction): [number, number] {
    switch (direction) {
      case Direction.NORTH:
        return [0, 1]
      case Direction.SOUTH:
        return [0, -1]
      case Direction.EAST:
        return [1, 0]
      case Direction.WEST:
        return [-1, 0]
      case Direction.NORTH_EAST:
        return [1, 1]
      case Direction.NORTH_WEST:
        return [-1, 1]
      case Direction.SOUTH_EAST:
        return [1, -1]
      case Direction.SOUTH_WEST:
        return [-1, -1]
    }
  }

  // Generate all range-limited rays for a square
  static generateRangeLimitedRays(
    rays: RayTables,
    square: number,
    file: number,
    rank: number,
  ): void {
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
      const direction = directions[dirIndex]

      // Generate rays for different ranges
      rays.range1Rays[square][dirIndex] = this.generateRangedRay(
        file,
        rank,
        direction,
        1,
      )
      rays.range2Rays[square][dirIndex] = this.generateRangedRay(
        file,
        rank,
        direction,
        2,
      )
      rays.range3Rays[square][dirIndex] = this.generateRangedRay(
        file,
        rank,
        direction,
        3,
      )
      rays.range4Rays[square][dirIndex] = this.generateRangedRay(
        file,
        rank,
        direction,
        4,
      )
    }
  }
}

enum Direction {
  NORTH = 0,
  SOUTH = 1,
  EAST = 2,
  WEST = 3,
  NORTH_EAST = 4,
  NORTH_WEST = 5,
  SOUTH_EAST = 6,
  SOUTH_WEST = 7,
}
```

## Piece-Specific Ray Tables

### Optimized Ray Tables for Each Piece Type

```typescript
class PieceRayGenerator {
  static generatePieceRays(rays: RayTables, square: number): void {
    // Tank: Horizontal/vertical, range 1-2
    rays.tankRays[square] = [
      rays.range2Rays[square][Direction.NORTH], // North, max 2
      rays.range2Rays[square][Direction.SOUTH], // South, max 2
      rays.range2Rays[square][Direction.EAST], // East, max 2
      rays.range2Rays[square][Direction.WEST], // West, max 2
    ]

    // Artillery: Horizontal/vertical, range 1-3
    rays.artilleryRays[square] = [
      rays.range3Rays[square][Direction.NORTH],
      rays.range3Rays[square][Direction.SOUTH],
      rays.range3Rays[square][Direction.EAST],
      rays.range3Rays[square][Direction.WEST],
    ]

    // Navy: Horizontal/vertical, range 1-3
    rays.navyRays[square] = [
      rays.range3Rays[square][Direction.NORTH],
      rays.range3Rays[square][Direction.SOUTH],
      rays.range3Rays[square][Direction.EAST],
      rays.range3Rays[square][Direction.WEST],
    ]

    // Air Force: All 8 directions, range 1-4
    rays.airForceRays[square] = [
      rays.range4Rays[square][Direction.NORTH],
      rays.range4Rays[square][Direction.SOUTH],
      rays.range4Rays[square][Direction.EAST],
      rays.range4Rays[square][Direction.WEST],
      rays.range4Rays[square][Direction.NORTH_EAST],
      rays.range4Rays[square][Direction.NORTH_WEST],
      rays.range4Rays[square][Direction.SOUTH_EAST],
      rays.range4Rays[square][Direction.SOUTH_WEST],
    ]

    // Infantry: All 8 directions, range 1
    rays.infantryRays[square] = [
      rays.range1Rays[square][Direction.NORTH],
      rays.range1Rays[square][Direction.SOUTH],
      rays.range1Rays[square][Direction.EAST],
      rays.range1Rays[square][Direction.WEST],
      rays.range1Rays[square][Direction.NORTH_EAST],
      rays.range1Rays[square][Direction.NORTH_WEST],
      rays.range1Rays[square][Direction.SOUTH_EAST],
      rays.range1Rays[square][Direction.SOUTH_WEST],
    ]

    // Militia: All 8 directions, range 1
    rays.militiaRays[square] = [...rays.infantryRays[square]]

    // Commander: All 8 directions, range 1 (base form)
    rays.commanderRays[square] = [...rays.infantryRays[square]]
  }
}
```

## Heroic Ray Tables

### Extended Ranges for Heroic Pieces

```typescript
class HeroicRayGenerator {
  // Generate separate ray tables for heroic pieces
  static generateHeroicRays(): RayTables {
    const heroicRays: RayTables = RayGenerator.generateAllRays()

    // Override with heroic ranges
    for (let square = 0; square < 256; square++) {
      const [file, rank] = bitToSquare(square)
      if (file >= 12 || rank >= 12) continue

      // Heroic Tank: range 1-4 (was 1-2)
      heroicRays.tankRays[square] = [
        heroicRays.range4Rays[square][Direction.NORTH],
        heroicRays.range4Rays[square][Direction.SOUTH],
        heroicRays.range4Rays[square][Direction.EAST],
        heroicRays.range4Rays[square][Direction.WEST],
      ]

      // Heroic Artillery: range 1-6 (was 1-3)
      heroicRays.artilleryRays[square] = [
        this.generateRangedRay(file, rank, Direction.NORTH, 6),
        this.generateRangedRay(file, rank, Direction.SOUTH, 6),
        this.generateRangedRay(file, rank, Direction.EAST, 6),
        this.generateRangedRay(file, rank, Direction.WEST, 6),
      ]

      // Heroic Navy: range 1-6 (was 1-3)
      heroicRays.navyRays[square] = [...heroicRays.artilleryRays[square]]

      // Heroic Air Force: range 1-8 (was 1-4)
      heroicRays.airForceRays[square] = [
        this.generateRangedRay(file, rank, Direction.NORTH, 8),
        this.generateRangedRay(file, rank, Direction.SOUTH, 8),
        this.generateRangedRay(file, rank, Direction.EAST, 8),
        this.generateRangedRay(file, rank, Direction.WEST, 8),
        this.generateRangedRay(file, rank, Direction.NORTH_EAST, 8),
        this.generateRangedRay(file, rank, Direction.NORTH_WEST, 8),
        this.generateRangedRay(file, rank, Direction.SOUTH_EAST, 8),
        this.generateRangedRay(file, rank, Direction.SOUTH_WEST, 8),
      ]

      // Heroic Infantry/Militia: range 1-2 (was 1)
      const heroicInfantryRays = [
        heroicRays.range2Rays[square][Direction.NORTH],
        heroicRays.range2Rays[square][Direction.SOUTH],
        heroicRays.range2Rays[square][Direction.EAST],
        heroicRays.range2Rays[square][Direction.WEST],
        heroicRays.range2Rays[square][Direction.NORTH_EAST],
        heroicRays.range2Rays[square][Direction.NORTH_WEST],
        heroicRays.range2Rays[square][Direction.SOUTH_EAST],
        heroicRays.range2Rays[square][Direction.SOUTH_WEST],
      ]

      heroicRays.infantryRays[square] = heroicInfantryRays
      heroicRays.militiaRays[square] = [...heroicInfantryRays]

      // Heroic Commander: range 1-2 (was 1)
      heroicRays.commanderRays[square] = [...heroicInfantryRays]
    }

    return heroicRays
  }

  private static generateRangedRay(
    file: number,
    rank: number,
    direction: Direction,
    maxRange: number,
  ): Bitboard {
    return RangeLimitedRays.generateRangedRay(file, rank, direction, maxRange)
  }
}
```

## Ray Blocking Calculation

### Handling Piece Blocking with Bitboards

```typescript
class RayBlocking {
  // Calculate blocked ray using bit manipulation
  static calculateBlockedRay(
    ray: Bitboard,
    occupancy: Bitboard,
    fromSquare: number,
    direction: Direction,
  ): Bitboard {
    const blockers = ray & occupancy

    if (blockers === 0n) {
      return ray // No blockers, full ray available
    }

    // Find first blocker in ray direction
    const firstBlocker = this.getFirstBlocker(blockers, fromSquare, direction)

    if (firstBlocker === -1) {
      return ray // No valid blocker found
    }

    // Create mask for squares before first blocker
    const blockerBit = 1n << BigInt(firstBlocker)

    // Get all squares between fromSquare and blocker (exclusive)
    const beforeBlocker = this.getSquaresBefore(ray, firstBlocker, direction)

    return beforeBlocker | blockerBit // Include blocker (might be capturable)
  }

  private static getFirstBlocker(
    blockers: Bitboard,
    fromSquare: number,
    direction: Direction,
  ): number {
    if (blockers === 0n) return -1

    // Find closest blocker based on direction
    switch (direction) {
      case Direction.NORTH:
      case Direction.NORTH_EAST:
      case Direction.NORTH_WEST:
        // For northward rays, find lowest rank blocker
        return this.getLowestRankBlocker(blockers)

      case Direction.SOUTH:
      case Direction.SOUTH_EAST:
      case Direction.SOUTH_WEST:
        // For southward rays, find highest rank blocker
        return this.getHighestRankBlocker(blockers)

      case Direction.EAST:
        // For eastward rays, find lowest file blocker
        return this.getLowestFileBlocker(blockers)

      case Direction.WEST:
        // For westward rays, find highest file blocker
        return this.getHighestFileBlocker(blockers)

      default:
        return BitboardUtils.getLowestSetBit(blockers)
    }
  }

  private static getLowestRankBlocker(blockers: Bitboard): number {
    // Find blocker with lowest rank (closest to south)
    let lowestRank = 12
    let result = -1

    let temp = blockers
    while (temp !== 0n) {
      const square = BitboardUtils.getLowestSetBit(temp)
      temp &= temp - 1n

      const [file, rank] = bitToSquare(square)
      if (rank < lowestRank) {
        lowestRank = rank
        result = square
      }
    }

    return result
  }

  // Similar methods for other directions...
}
```

## Ray Table Usage

### Fast Move Generation Using Pre-computed Rays

```typescript
class FastMoveGeneration {
  private static readonly NORMAL_RAYS = RayGenerator.generateAllRays()
  private static readonly HEROIC_RAYS = HeroicRayGenerator.generateHeroicRays()

  // Generate moves for Tank using pre-computed rays
  static generateTankMoves(
    square: number,
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
    isHeroic: boolean = false,
  ): Bitboard {
    const rayTable = isHeroic ? this.HEROIC_RAYS : this.NORMAL_RAYS
    const pieceRays = rayTable.tankRays[square]

    let validMoves = 0n

    // Process each direction ray
    for (let i = 0; i < pieceRays.length; i++) {
      const ray = pieceRays[i]
      const direction = [
        Direction.NORTH,
        Direction.SOUTH,
        Direction.EAST,
        Direction.WEST,
      ][i]

      // Calculate blocked ray
      const blockedRay = RayBlocking.calculateBlockedRay(
        ray,
        occupancy,
        square,
        direction,
      )

      // Add to valid moves (excluding friendly pieces)
      validMoves |= blockedRay & ~friendlyPieces
    }

    return validMoves
  }

  // Generate moves for Air Force (can jump over pieces)
  static generateAirForceMoves(
    square: number,
    friendlyPieces: Bitboard,
    isHeroic: boolean = false,
  ): Bitboard {
    const rayTable = isHeroic ? this.HEROIC_RAYS : this.NORMAL_RAYS
    const pieceRays = rayTable.airForceRays[square]

    let validMoves = 0n

    // Air Force ignores blocking, just combine all rays
    for (const ray of pieceRays) {
      validMoves |= ray
    }

    // Remove friendly pieces
    return validMoves & ~friendlyPieces
  }

  // Universal move generator for any piece type
  static generatePieceMoves(
    pieceType: PieceSymbol,
    square: number,
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
    isHeroic: boolean = false,
  ): Bitboard {
    const rayTable = isHeroic ? this.HEROIC_RAYS : this.NORMAL_RAYS

    let pieceRays: Bitboard[]
    let canJumpOver = false

    switch (pieceType) {
      case TANK:
        pieceRays = rayTable.tankRays[square]
        break
      case ARTILLERY:
        pieceRays = rayTable.artilleryRays[square]
        break
      case NAVY:
        pieceRays = rayTable.navyRays[square]
        break
      case AIR_FORCE:
        pieceRays = rayTable.airForceRays[square]
        canJumpOver = true // Air Force can jump over pieces
        break
      case INFANTRY:
        pieceRays = rayTable.infantryRays[square]
        break
      case MILITIA:
        pieceRays = rayTable.militiaRays[square]
        break
      case COMMANDER:
        pieceRays = rayTable.commanderRays[square]
        break
      case HEADQUARTER:
        if (!isHeroic) return 0n // Base HEADQUARTER can't move
        pieceRays = rayTable.infantryRays[square] // Heroic HEADQUARTER moves like Infantry
        break
      default:
        return 0n
    }

    let validMoves = 0n

    if (canJumpOver) {
      // Air Force: combine all rays, ignore blocking
      for (const ray of pieceRays) {
        validMoves |= ray
      }
    } else {
      // Other pieces: calculate blocking for each ray
      const directions = this.getDirectionsForPiece(pieceType)

      for (let i = 0; i < pieceRays.length; i++) {
        const ray = pieceRays[i]
        const direction = directions[i]

        const blockedRay = RayBlocking.calculateBlockedRay(
          ray,
          occupancy,
          square,
          direction,
        )
        validMoves |= blockedRay
      }
    }

    // Remove friendly pieces
    return validMoves & ~friendlyPieces
  }

  private static getDirectionsForPiece(pieceType: PieceSymbol): Direction[] {
    switch (pieceType) {
      case TANK:
      case ARTILLERY:
      case NAVY:
        return [
          Direction.NORTH,
          Direction.SOUTH,
          Direction.EAST,
          Direction.WEST,
        ]

      case AIR_FORCE:
      case INFANTRY:
      case MILITIA:
      case COMMANDER:
      case HEADQUARTER:
        return [
          Direction.NORTH,
          Direction.SOUTH,
          Direction.EAST,
          Direction.WEST,
          Direction.NORTH_EAST,
          Direction.NORTH_WEST,
          Direction.SOUTH_EAST,
          Direction.SOUTH_WEST,
        ]

      default:
        return []
    }
  }
}
```

This ray generation system is the **heart** of the bitboard approach - it makes
CoTuLenh move generation **blazingly fast**! 🚀
