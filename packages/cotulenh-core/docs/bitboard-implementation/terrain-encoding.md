# Terrain Encoding with Bitboards

## CoTuLenh Terrain System

CoTuLenh's terrain is **perfect** for bitboard encoding because it's based on
**file positions** and **static rules**. Once computed, terrain bitboards never
change during the game.

### Terrain Types

```
Files a-b:  Pure Water    (Navy only)
File c:     Mixed Terrain (All pieces)
Files d-k:  Pure Land     (Land pieces only)
File l:     Pure Land     (Land pieces only)

Special: Rivers and bridges create mixed terrain in land files
```

## Terrain Bitboard Encoding

### Basic Terrain Bitboards

```typescript
interface TerrainBitboards {
  // Primary terrain types
  pureWater: Bitboard // Files a-b only
  pureLand: Bitboard // Files d-k, l only
  mixedTerrain: Bitboard // File c + rivers + bridges

  // Derived accessibility masks
  navyAccessible: Bitboard // pureWater | mixedTerrain
  landAccessible: Bitboard // pureLand | mixedTerrain
  allAccessible: Bitboard // All valid squares (for Air Force)

  // Special terrain features
  rivers: Bitboard // River squares in land files
  bridges: Bitboard // Bridge squares
  fortresses: Bitboard // Fortress squares (if any)
}
```

### Terrain Initialization

```typescript
class TerrainEncoder {
  static initializeTerrain(): TerrainBitboards {
    let pureWater = 0n
    let pureLand = 0n
    let mixedTerrain = 0n
    let rivers = 0n
    let bridges = 0n

    // Process each square on the 12x12 board
    for (let rank = 0; rank < 12; rank++) {
      for (let file = 0; file < 12; file++) {
        const bit = 1n << BigInt(squareToBit(file, rank))

        if (file <= 1) {
          // Files a-b: Pure water
          pureWater |= bit
        } else if (file === 2) {
          // File c: Mixed terrain
          mixedTerrain |= bit
        } else if (file >= 3 && file <= 10) {
          // Files d-k: Pure land (with possible rivers)
          if (this.isRiverSquare(file, rank)) {
            rivers |= bit
            mixedTerrain |= bit // Rivers are mixed terrain
          } else if (this.isBridgeSquare(file, rank)) {
            bridges |= bit
            mixedTerrain |= bit // Bridges are mixed terrain
          } else {
            pureLand |= bit
          }
        } else if (file === 11) {
          // File l: Pure land
          pureLand |= bit
        }
      }
    }

    // Compute derived masks
    const navyAccessible = pureWater | mixedTerrain
    const landAccessible = pureLand | mixedTerrain
    const allAccessible = pureWater | pureLand | mixedTerrain

    return {
      pureWater,
      pureLand,
      mixedTerrain,
      navyAccessible,
      landAccessible,
      allAccessible,
      rivers,
      bridges,
      fortresses: 0n, // No fortresses in basic CoTuLenh
    }
  }

  private static isRiverSquare(file: number, rank: number): boolean {
    // Define river squares in land files
    // Example: Rivers at ranks 3 and 8 in files d-k
    return (rank === 3 || rank === 8) && file >= 3 && file <= 10
  }

  private static isBridgeSquare(file: number, rank: number): boolean {
    // Define bridge squares (cross rivers)
    // Example: Bridges at e3, f3, g3, e8, f8, g8
    return (rank === 3 || rank === 8) && file >= 4 && file <= 6
  }
}
```

## Piece Movement Restrictions

### Movement Masks by Piece Type

```typescript
class MovementMasks {
  private terrain: TerrainBitboards

  constructor(terrain: TerrainBitboards) {
    this.terrain = terrain
  }

  // Get movement mask for piece type
  getMovementMask(pieceType: PieceSymbol): Bitboard {
    switch (pieceType) {
      case NAVY:
        // Navy can only move on water and mixed terrain
        return this.terrain.navyAccessible

      case AIR_FORCE:
        // Air Force can move anywhere
        return this.terrain.allAccessible

      case TANK:
      case ARTILLERY:
      case INFANTRY:
      case MILITIA:
      case COMMANDER:
      case HEADQUARTER:
        // Land pieces can move on land and mixed terrain
        return this.terrain.landAccessible

      default:
        return 0n
    }
  }

  // Get attack mask for piece type (usually broader than movement)
  getAttackMask(pieceType: PieceSymbol): Bitboard {
    switch (pieceType) {
      case NAVY:
        // Navy can attack anywhere (including pure land via stay-capture)
        return this.terrain.allAccessible

      case ARTILLERY:
        // Artillery can attack anywhere (including sea via stay-capture)
        return this.terrain.allAccessible

      case AIR_FORCE:
      case TANK:
      case INFANTRY:
      case MILITIA:
      case COMMANDER:
      case HEADQUARTER:
        // Most pieces can attack anywhere they can move
        return this.getMovementMask(pieceType)

      default:
        return 0n
    }
  }
}
```

## Stay-Capture Detection

### Terrain-Based Stay-Capture Logic

```typescript
class StayCaptureDetector {
  private terrain: TerrainBitboards
  private movementMasks: MovementMasks

  constructor(terrain: TerrainBitboards) {
    this.terrain = terrain
    this.movementMasks = new MovementMasks(terrain)
  }

  // Check if attack must be stay-capture due to terrain
  isStayCapture(
    attackerSquare: number,
    targetSquare: number,
    attackerType: PieceSymbol,
    targetType: PieceSymbol,
  ): boolean {
    const targetBit = 1n << BigInt(targetSquare)

    // Get movement mask for attacker
    const movementMask = this.movementMasks.getMovementMask(attackerType)

    // If attacker can't move to target square, it's stay-capture
    const canMoveTo = (movementMask & targetBit) !== 0n

    if (!canMoveTo) {
      // Verify this is a valid stay-capture scenario
      return this.isValidStayCapture(attackerType, targetType, targetSquare)
    }

    return false
  }

  private isValidStayCapture(
    attackerType: PieceSymbol,
    targetType: PieceSymbol,
    targetSquare: number,
  ): boolean {
    const targetBit = 1n << BigInt(targetSquare)

    // Artillery can stay-capture Navy in water
    if (attackerType === ARTILLERY && targetType === NAVY) {
      return (this.terrain.pureWater & targetBit) !== 0n
    }

    // Navy can stay-capture land pieces on pure land
    if (attackerType === NAVY) {
      return (this.terrain.pureLand & targetBit) !== 0n
    }

    // Air Force never needs stay-capture (can move anywhere)
    if (attackerType === AIR_FORCE) {
      return false
    }

    return false
  }

  // Get all squares where piece must use stay-capture
  getStayCaptureSquares(attackerType: PieceSymbol): Bitboard {
    const movementMask = this.movementMasks.getMovementMask(attackerType)
    const attackMask = this.movementMasks.getAttackMask(attackerType)

    // Stay-capture squares = can attack but can't move to
    return attackMask & ~movementMask
  }
}
```

## Terrain Queries

### Fast Terrain Lookups

```typescript
class TerrainQueries {
  private terrain: TerrainBitboards

  constructor(terrain: TerrainBitboards) {
    this.terrain = terrain
  }

  // Get terrain type at square
  getTerrainType(square: number): 'water' | 'land' | 'mixed' {
    const bit = 1n << BigInt(square)

    if (this.terrain.pureWater & bit) return 'water'
    if (this.terrain.pureLand & bit) return 'land'
    if (this.terrain.mixedTerrain & bit) return 'mixed'

    throw new Error(`Invalid square: ${square}`)
  }

  // Check if square is accessible to piece type
  isAccessible(square: number, pieceType: PieceSymbol): boolean {
    const bit = 1n << BigInt(square)
    const movementMask = this.getMovementMask(pieceType)

    return (movementMask & bit) !== 0n
  }

  // Check if square is water
  isWater(square: number): boolean {
    const bit = 1n << BigInt(square)
    return (this.terrain.pureWater & bit) !== 0n
  }

  // Check if square is land
  isLand(square: number): boolean {
    const bit = 1n << BigInt(square)
    return (this.terrain.pureLand & bit) !== 0n
  }

  // Check if square is mixed terrain
  isMixed(square: number): boolean {
    const bit = 1n << BigInt(square)
    return (this.terrain.mixedTerrain & bit) !== 0n
  }

  // Check if square is a river
  isRiver(square: number): boolean {
    const bit = 1n << BigInt(square)
    return (this.terrain.rivers & bit) !== 0n
  }

  // Check if square is a bridge
  isBridge(square: number): boolean {
    const bit = 1n << BigInt(square)
    return (this.terrain.bridges & bit) !== 0n
  }

  // Get all squares of specific terrain type
  getSquaresByTerrain(terrainType: 'water' | 'land' | 'mixed'): number[] {
    let bitboard: Bitboard

    switch (terrainType) {
      case 'water':
        bitboard = this.terrain.pureWater
        break
      case 'land':
        bitboard = this.terrain.pureLand
        break
      case 'mixed':
        bitboard = this.terrain.mixedTerrain
        break
    }

    return BitboardUtils.getBitPositions(bitboard)
  }
}
```

## Terrain Visualization

### Debug Terrain Display

```typescript
class TerrainVisualizer {
  static printTerrain(terrain: TerrainBitboards): void {
    console.log('\nCoTuLenh Terrain Map:')
    console.log('W = Water, L = Land, M = Mixed, R = River, B = Bridge')
    console.log('   a b c d e f g h i j k l')

    for (let rank = 11; rank >= 0; rank--) {
      let line = `${rank.toString().padStart(2)}: `

      for (let file = 0; file < 12; file++) {
        const bit = 1n << BigInt(squareToBit(file, rank))

        let symbol = '.'
        if (terrain.bridges & bit) symbol = 'B'
        else if (terrain.rivers & bit) symbol = 'R'
        else if (terrain.pureWater & bit) symbol = 'W'
        else if (terrain.pureLand & bit) symbol = 'L'
        else if (terrain.mixedTerrain & bit) symbol = 'M'

        line += symbol + ' '
      }

      console.log(line)
    }
  }

  static printAccessibilityMask(
    terrain: TerrainBitboards,
    pieceType: PieceSymbol,
  ): void {
    const masks = new MovementMasks(terrain)
    const movementMask = masks.getMovementMask(pieceType)
    const attackMask = masks.getAttackMask(pieceType)

    console.log(`\n${pieceType} Accessibility:`)
    console.log('M = Can Move, A = Can Attack (stay-capture), . = Blocked')
    console.log('   a b c d e f g h i j k l')

    for (let rank = 11; rank >= 0; rank--) {
      let line = `${rank.toString().padStart(2)}: `

      for (let file = 0; file < 12; file++) {
        const bit = 1n << BigInt(squareToBit(file, rank))

        let symbol = '.'
        if (movementMask & bit) symbol = 'M'
        else if (attackMask & bit) symbol = 'A'

        line += symbol + ' '
      }

      console.log(line)
    }
  }
}
```

## Performance Optimizations

### Pre-computed Terrain Masks

```typescript
class OptimizedTerrain {
  // Pre-compute all terrain masks at startup
  private static readonly TERRAIN_MASKS = TerrainEncoder.initializeTerrain()

  // Pre-compute movement masks for all piece types
  private static readonly MOVEMENT_MASKS = {
    [NAVY]: this.TERRAIN_MASKS.navyAccessible,
    [AIR_FORCE]: this.TERRAIN_MASKS.allAccessible,
    [TANK]: this.TERRAIN_MASKS.landAccessible,
    [ARTILLERY]: this.TERRAIN_MASKS.landAccessible,
    [INFANTRY]: this.TERRAIN_MASKS.landAccessible,
    [MILITIA]: this.TERRAIN_MASKS.landAccessible,
    [COMMANDER]: this.TERRAIN_MASKS.landAccessible,
    [HEADQUARTER]: this.TERRAIN_MASKS.landAccessible,
  }

  // Pre-compute attack masks for all piece types
  private static readonly ATTACK_MASKS = {
    [NAVY]: this.TERRAIN_MASKS.allAccessible,
    [ARTILLERY]: this.TERRAIN_MASKS.allAccessible,
    [AIR_FORCE]: this.TERRAIN_MASKS.allAccessible,
    [TANK]: this.TERRAIN_MASKS.landAccessible,
    [INFANTRY]: this.TERRAIN_MASKS.landAccessible,
    [MILITIA]: this.TERRAIN_MASKS.landAccessible,
    [COMMANDER]: this.TERRAIN_MASKS.landAccessible,
    [HEADQUARTER]: this.TERRAIN_MASKS.landAccessible,
  }

  // Ultra-fast terrain queries (single array lookup)
  static getMovementMask(pieceType: PieceSymbol): Bitboard {
    return this.MOVEMENT_MASKS[pieceType]
  }

  static getAttackMask(pieceType: PieceSymbol): Bitboard {
    return this.ATTACK_MASKS[pieceType]
  }

  static getTerrain(): TerrainBitboards {
    return this.TERRAIN_MASKS
  }
}
```

## Integration Example

### Using Terrain in Move Generation

```typescript
// Example: Generate Tank moves with terrain restrictions
function generateTankMoves(
  square: number,
  occupancy: Bitboard,
  friendlyPieces: Bitboard,
): Bitboard {
  // Get raw movement rays for Tank
  const rawMoves = generateTankRays(square, occupancy)

  // Apply terrain restrictions (Tank needs land-accessible terrain)
  const terrainFiltered = rawMoves & OptimizedTerrain.getMovementMask(TANK)

  // Remove friendly pieces
  const validMoves = terrainFiltered & ~friendlyPieces

  return validMoves
}

// Example: Check for stay-capture
function checkStayCapture(
  attackerSquare: number,
  targetSquare: number,
  attackerType: PieceSymbol,
): boolean {
  const targetBit = 1n << BigInt(targetSquare)

  // Can attack this square?
  const attackMask = OptimizedTerrain.getAttackMask(attackerType)
  const canAttack = (attackMask & targetBit) !== 0n

  // Can move to this square?
  const movementMask = OptimizedTerrain.getMovementMask(attackerType)
  const canMoveTo = (movementMask & targetBit) !== 0n

  // Stay-capture if can attack but can't move to
  return canAttack && !canMoveTo
}
```

This terrain encoding system makes CoTuLenh's complex terrain rules **blazingly
fast** to evaluate! 🚀
