# Air Defense Zones with Bitboards

## The Air Defense Challenge

Air defense zones in CoTuLenh are **circular areas** around air defense pieces
that force Air Force to make suicide attacks. The key insights:

- ✅ **Circular zones** with radius 1, 2, or 3
- ✅ **Pre-computed masks** for each radius
- ✅ **Slide masks** to air defense piece positions
- ✅ **Combine all zones** into unified air defense bitboard
- ✅ **Edge handling** for board boundaries

## Air Defense Piece Types

### Air Defense Capabilities

```typescript
interface AirDefenseCapability {
  radius: number
  pieceType: PieceSymbol
  isHeroic: boolean
}

const AIR_DEFENSE_RANGES = {
  // Base air defense pieces
  [TANK]: { base: 1, heroic: 2 },
  [ARTILLERY]: { base: 2, heroic: 3 },
  [NAVY]: { base: 1, heroic: 2 },
  [INFANTRY]: { base: 1, heroic: 1 }, // No heroic bonus
  [MILITIA]: { base: 1, heroic: 1 }, // No heroic bonus

  // Special case: Heroic Missile (rare, maximum range)
  [MISSILE]: { base: 3, heroic: 3 }, // Always radius 3
}
```

## Pre-computed Circle Masks

### Circle Bitboard Generation

```typescript
class AirDefenseCircles {
  // Pre-computed circle masks for each radius
  private static readonly CIRCLE_MASKS = {
    radius1: AirDefenseCircles.generateCircleMask(1),
    radius2: AirDefenseCircles.generateCircleMask(2),
    radius3: AirDefenseCircles.generateCircleMask(3),
  }

  // Generate circle mask centered at origin (0,0)
  private static generateCircleMask(radius: number): Bitboard {
    let mask = 0n

    // Generate circle using distance formula
    for (let deltaFile = -radius; deltaFile <= radius; deltaFile++) {
      for (let deltaRank = -radius; deltaRank <= radius; deltaRank++) {
        // Calculate distance from center
        const distance = Math.sqrt(
          deltaFile * deltaFile + deltaRank * deltaRank,
        )

        // Include square if within radius
        if (distance <= radius) {
          // Convert relative position to bit position
          // We use a large enough space to handle sliding
          const file = 6 + deltaFile // Center at (6,6) in 16x16 space
          const rank = 6 + deltaRank

          if (file >= 0 && file < 16 && rank >= 0 && rank < 16) {
            const bit = rank * 16 + file
            mask |= 1n << BigInt(bit)
          }
        }
      }
    }

    return mask
  }

  // Get pre-computed circle mask for radius
  static getCircleMask(radius: number): Bitboard {
    switch (radius) {
      case 1:
        return this.CIRCLE_MASKS.radius1
      case 2:
        return this.CIRCLE_MASKS.radius2
      case 3:
        return this.CIRCLE_MASKS.radius3
      default:
        return 0n
    }
  }
}
```

### Circle Mask Visualization

```typescript
class CircleDebug {
  // Visualize circle masks
  static printCircleMask(radius: number): void {
    const mask = AirDefenseCircles.getCircleMask(radius)

    console.log(`\nAir Defense Circle - Radius ${radius}:`)
    console.log('   0 1 2 3 4 5 6 7 8 9 A B C D E F')

    for (let rank = 15; rank >= 0; rank--) {
      let line = `${rank.toString(16).toUpperCase()}: `

      for (let file = 0; file < 16; file++) {
        const bit = rank * 16 + file
        const isSet = (mask & (1n << BigInt(bit))) !== 0n

        if (file === 6 && rank === 6) {
          line += 'X ' // Center piece
        } else {
          line += isSet ? '● ' : '. '
        }
      }

      console.log(line)
    }
  }
}

// Example output for radius 2:
//    0 1 2 3 4 5 6 7 8 9 A B C D E F
// F: . . . . . . . . . . . . . . . .
// E: . . . . . . . . . . . . . . . .
// 9: . . . . . . . . . . . . . . . .
// 8: . . . . . ● ● ● . . . . . . . .
// 7: . . . . ● ● ● ● ● . . . . . . .
// 6: . . . . ● ● X ● ● . . . . . . .
// 5: . . . . ● ● ● ● ● . . . . . . .
// 4: . . . . . ● ● ● . . . . . . . .
// 3: . . . . . . . . . . . . . . . .
```

## Sliding Circle Masks

### Positioning Circles on the Board

```typescript
class AirDefensePositioning {
  // Slide circle mask to specific board position
  static slideCircleToPosition(
    circleMask: Bitboard,
    targetFile: number,
    targetRank: number,
  ): Bitboard {
    // Calculate offset from circle center (6,6) to target position
    const fileOffset = targetFile - 6
    const rankOffset = targetRank - 6

    // Slide the mask
    let slidMask = circleMask

    // Handle file offset
    if (fileOffset > 0) {
      // Slide east
      for (let i = 0; i < fileOffset; i++) {
        slidMask = BitboardShifts.shiftEast(slidMask)
      }
    } else if (fileOffset < 0) {
      // Slide west
      for (let i = 0; i < -fileOffset; i++) {
        slidMask = BitboardShifts.shiftWest(slidMask)
      }
    }

    // Handle rank offset
    if (rankOffset > 0) {
      // Slide north
      for (let i = 0; i < rankOffset; i++) {
        slidMask = BitboardShifts.shiftNorth(slidMask)
      }
    } else if (rankOffset < 0) {
      // Slide south
      for (let i = 0; i < -rankOffset; i++) {
        slidMask = BitboardShifts.shiftSouth(slidMask)
      }
    }

    // Clip to valid board area (12x12)
    return slidMask & VALID_BOARD_MASK
  }

  // Optimized sliding using bit shifts
  static slideCircleOptimized(
    circleMask: Bitboard,
    targetFile: number,
    targetRank: number,
  ): Bitboard {
    const fileOffset = targetFile - 6
    const rankOffset = targetRank - 6

    // Calculate total bit shift
    const totalShift = rankOffset * 16 + fileOffset

    let result: Bitboard
    if (totalShift >= 0) {
      result = circleMask << BigInt(totalShift)
    } else {
      result = circleMask >> BigInt(-totalShift)
    }

    // Apply edge masks to prevent wrap-around
    result = this.applyEdgeMasks(result, fileOffset)

    // Clip to valid board
    return result & VALID_BOARD_MASK
  }

  private static applyEdgeMasks(
    bitboard: Bitboard,
    fileOffset: number,
  ): Bitboard {
    if (fileOffset > 0) {
      // Sliding east - clear western files that wrapped
      const clearMask = this.generateWestFileClearMask(fileOffset)
      return bitboard & ~clearMask
    } else if (fileOffset < 0) {
      // Sliding west - clear eastern files that wrapped
      const clearMask = this.generateEastFileClearMask(-fileOffset)
      return bitboard & ~clearMask
    }

    return bitboard
  }
}

// Valid board mask (12x12 area)
const VALID_BOARD_MASK = (() => {
  let mask = 0n
  for (let rank = 0; rank < 12; rank++) {
    for (let file = 0; file < 12; file++) {
      mask |= 1n << BigInt(rank * 16 + file)
    }
  }
  return mask
})()
```

## Air Defense Zone Calculation

### Building Complete Air Defense Coverage

```typescript
class AirDefenseZones {
  private pieces: GameBitboards
  private heroicPieces: Bitboard

  constructor(pieces: GameBitboards, heroicPieces: Bitboard) {
    this.pieces = pieces
    this.heroicPieces = heroicPieces
  }

  // Calculate complete air defense coverage for a color
  calculateAirDefense(color: Color): Bitboard {
    let totalCoverage = 0n

    // Check each piece type that provides air defense
    const airDefensePieces = [TANK, ARTILLERY, NAVY, INFANTRY, MILITIA]

    for (const pieceType of airDefensePieces) {
      const pieceBitboard = this.pieces.getPieceBitboard(pieceType, color)

      if (pieceBitboard === 0n) continue

      // Process each piece of this type
      let pieces = pieceBitboard
      while (pieces !== 0n) {
        const square = BitboardUtils.getLowestSetBit(pieces)
        pieces &= pieces - 1n

        // Get air defense radius for this piece
        const isHeroic = (this.heroicPieces & (1n << BigInt(square))) !== 0n
        const radius = this.getAirDefenseRadius(pieceType, isHeroic)

        if (radius > 0) {
          // Get circle mask and slide to piece position
          const [file, rank] = bitToSquare(square)
          const circleMask = AirDefenseCircles.getCircleMask(radius)
          const positionedCircle = AirDefensePositioning.slideCircleToPosition(
            circleMask,
            file,
            rank,
          )

          // Add to total coverage
          totalCoverage |= positionedCircle
        }
      }
    }

    // Handle special case: Heroic Missile (if present)
    const missileBitboard = this.pieces.getPieceBitboard(MISSILE, color)
    if (missileBitboard !== 0n) {
      let missiles = missileBitboard
      while (missiles !== 0n) {
        const square = BitboardUtils.getLowestSetBit(missiles)
        missiles &= missiles - 1n

        // Missile always has radius 3
        const [file, rank] = bitToSquare(square)
        const circleMask = AirDefenseCircles.getCircleMask(3)
        const positionedCircle = AirDefensePositioning.slideCircleToPosition(
          circleMask,
          file,
          rank,
        )

        totalCoverage |= positionedCircle
      }
    }

    return totalCoverage
  }

  private getAirDefenseRadius(
    pieceType: PieceSymbol,
    isHeroic: boolean,
  ): number {
    const ranges = AIR_DEFENSE_RANGES[pieceType]
    if (!ranges) return 0

    return isHeroic ? ranges.heroic : ranges.base
  }

  // Check if Air Force move is suicide (enters air defense zone)
  isSuicideMove(
    airForceSquare: number,
    targetSquare: number,
    enemyColor: Color,
  ): boolean {
    const enemyAirDefense = this.calculateAirDefense(enemyColor)
    const targetBit = 1n << BigInt(targetSquare)

    return (enemyAirDefense & targetBit) !== 0n
  }

  // Get all squares Air Force cannot safely move to
  getRestrictedSquares(enemyColor: Color): Bitboard {
    return this.calculateAirDefense(enemyColor)
  }
}
```

## Air Force Move Generation Integration

### Special Air Force Movement Rules

Air Force movement through air defense zones has **special rules**:

1. **Kamikaze Capture:** Air Force can capture enemy pieces inside air defense
   zones (suicide attack)
2. **Flight Blocking:** Air Force **cannot pass through** air defense zones to
   reach squares beyond
3. **Range Limitation:** If path is blocked by air defense, Air Force cannot
   reach further squares even if within range

### Air Defense Aware Move Generation

```typescript
class AirForceMovement {
  private airDefenseZones: AirDefenseZones

  constructor(airDefenseZones: AirDefenseZones) {
    this.airDefenseZones = airDefenseZones
  }

  // Generate Air Force moves considering air defense blocking
  generateAirForceMoves(
    square: number,
    friendlyPieces: Bitboard,
    enemyPieces: Bitboard,
    enemyColor: Color,
  ): { normalMoves: Bitboard; kamikazeMoves: Bitboard } {
    // Get enemy air defense coverage
    const enemyAirDefense = this.airDefenseZones.calculateAirDefense(enemyColor)

    // Generate moves for each direction, considering air defense blocking
    const { normalMoves, kamikazeMoves } = this.generateDirectionalMoves(
      square,
      friendlyPieces,
      enemyPieces,
      enemyAirDefense,
    )

    return { normalMoves, kamikazeMoves }
  }

  private generateDirectionalMoves(
    square: number,
    friendlyPieces: Bitboard,
    enemyPieces: Bitboard,
    airDefense: Bitboard,
  ): { normalMoves: Bitboard; kamikazeMoves: Bitboard } {
    let normalMoves = 0n
    let kamikazeMoves = 0n

    // Air Force moves in 8 directions
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

    for (const direction of directions) {
      const { normal, kamikaze } = this.generateMovesInDirection(
        square,
        direction,
        friendlyPieces,
        enemyPieces,
        airDefense,
      )

      normalMoves |= normal
      kamikazeMoves |= kamikaze
    }

    return { normalMoves, kamikazeMoves }
  }

  private generateMovesInDirection(
    fromSquare: number,
    direction: Direction,
    friendlyPieces: Bitboard,
    enemyPieces: Bitboard,
    airDefense: Bitboard,
  ): { normal: Bitboard; kamikaze: Bitboard } {
    let normalMoves = 0n
    let kamikazeMoves = 0n

    const [startFile, startRank] = bitToSquare(fromSquare)
    const [deltaFile, deltaRank] = this.getDirectionDeltas(direction)

    // Check each square in direction up to Air Force max range (4)
    for (let range = 1; range <= 4; range++) {
      const file = startFile + deltaFile * range
      const rank = startRank + deltaRank * range

      // Check bounds
      if (file < 0 || file >= 12 || rank < 0 || rank >= 12) {
        break // Out of board
      }

      const targetSquare = squareToBit(file, rank)
      const targetBit = 1n << BigInt(targetSquare)

      // Check if square is occupied by friendly piece
      if (friendlyPieces & targetBit) {
        break // Blocked by friendly piece
      }

      // Check if square is in air defense zone
      const inAirDefense = (airDefense & targetBit) !== 0n
      const hasEnemyPiece = (enemyPieces & targetBit) !== 0n

      if (inAirDefense) {
        // In air defense zone
        if (hasEnemyPiece) {
          // Can capture enemy piece (kamikaze attack)
          kamikazeMoves |= targetBit
        }
        // Cannot pass through air defense zone - stop here
        break
      } else {
        // Not in air defense zone
        if (hasEnemyPiece) {
          // Normal capture
          normalMoves |= targetBit
          break // Cannot move further after capture
        } else {
          // Normal move to empty square
          normalMoves |= targetBit
          // Continue to next square in direction
        }
      }
    }

    return { normal: normalMoves, kamikaze: kamikazeMoves }
  }

  // Generate all Air Force moves (including kamikaze attacks)
  generateAllAirForceMoves(
    square: number,
    friendlyPieces: Bitboard,
    enemyPieces: Bitboard,
    enemyColor: Color,
  ): Move[] {
    const moves: Move[] = []
    const { normalMoves, kamikazeMoves } = this.generateAirForceMoves(
      square,
      friendlyPieces,
      enemyPieces,
      enemyColor,
    )

    // Add normal moves
    let normals = normalMoves
    while (normals !== 0n) {
      const dest = BitboardUtils.getLowestSetBit(normals)
      normals &= normals - 1n

      const destBit = 1n << BigInt(dest)
      const isCapture = (enemyPieces & destBit) !== 0n

      moves.push({
        type: isCapture ? 'capture' : 'normal',
        from: square,
        to: dest,
        piece: { type: AIR_FORCE, color: 'r', heroic: false }, // Example
      })
    }

    // Add kamikaze moves (captures in air defense zones)
    let kamikazes = kamikazeMoves
    while (kamikazes !== 0n) {
      const dest = BitboardUtils.getLowestSetBit(kamikazes)
      kamikazes &= kamikazes - 1n

      // Kamikaze moves are always captures (can't move to empty air defense squares)
      moves.push({
        type: 'kamikaze-capture',
        from: square,
        to: dest,
        piece: { type: AIR_FORCE, color: 'r', heroic: false }, // Example
      })
    }

    return moves
  }

  private getDirectionDeltas(direction: Direction): [number, number] {
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
}
```

## Edge Case Handling

### Board Boundary Management

```typescript
class AirDefenseBoundaries {
  // Handle air defense circles that extend beyond board edges
  static clipCircleToBoard(
    circleMask: Bitboard,
    centerFile: number,
    centerRank: number,
    radius: number,
  ): Bitboard {
    // Calculate which parts of circle are off-board
    const minFile = Math.max(0, centerFile - radius)
    const maxFile = Math.min(11, centerFile + radius)
    const minRank = Math.max(0, centerRank - radius)
    const maxRank = Math.min(11, centerRank + radius)

    // Create clipping mask
    let clipMask = 0n
    for (let rank = minRank; rank <= maxRank; rank++) {
      for (let file = minFile; file <= maxFile; file++) {
        clipMask |= singleBit(file, rank)
      }
    }

    return circleMask & clipMask
  }

  // Pre-compute clipped circles for edge positions
  static generateEdgeCircles(): Map<string, Bitboard> {
    const edgeCircles = new Map<string, Bitboard>()

    for (let radius = 1; radius <= 3; radius++) {
      const baseMask = AirDefenseCircles.getCircleMask(radius)

      // Generate for all board positions
      for (let rank = 0; rank < 12; rank++) {
        for (let file = 0; file < 12; file++) {
          const key = `${file},${rank},${radius}`

          // Slide and clip circle
          const slidCircle = AirDefensePositioning.slideCircleToPosition(
            baseMask,
            file,
            rank,
          )
          const clippedCircle = this.clipCircleToBoard(
            slidCircle,
            file,
            rank,
            radius,
          )

          edgeCircles.set(key, clippedCircle)
        }
      }
    }

    return edgeCircles
  }
}
```

## Performance Optimizations

### Cached Air Defense Calculation

```typescript
class OptimizedAirDefense {
  private airDefenseCache = new Map<string, Bitboard>()
  private lastBoardHash = ''

  // Calculate air defense with caching
  calculateAirDefenseOptimized(
    pieces: GameBitboards,
    heroicPieces: Bitboard,
    color: Color,
  ): Bitboard {
    // Create hash of current board state
    const boardHash = this.createBoardHash(pieces, heroicPieces, color)

    // Check cache
    if (this.airDefenseCache.has(boardHash)) {
      return this.airDefenseCache.get(boardHash)!
    }

    // Calculate air defense
    const zones = new AirDefenseZones(pieces, heroicPieces)
    const coverage = zones.calculateAirDefense(color)

    // Cache result
    this.airDefenseCache.set(boardHash, coverage)

    // Limit cache size
    if (this.airDefenseCache.size > 1000) {
      this.airDefenseCache.clear()
    }

    return coverage
  }

  private createBoardHash(
    pieces: GameBitboards,
    heroicPieces: Bitboard,
    color: Color,
  ): string {
    // Simple hash based on air defense piece positions
    const airDefensePieces = [TANK, ARTILLERY, NAVY, INFANTRY, MILITIA]
    let hash = `${color}:`

    for (const pieceType of airDefensePieces) {
      const pieceBitboard = pieces.getPieceBitboard(pieceType, color)
      hash += `${pieceType}:${pieceBitboard.toString(16)}:`
    }

    hash += `heroic:${heroicPieces.toString(16)}`

    return hash
  }

  // Incremental air defense updates
  updateAirDefenseAfterMove(
    oldCoverage: Bitboard,
    move: Move,
    pieces: GameBitboards,
    heroicPieces: Bitboard,
  ): Bitboard {
    // If move doesn't involve air defense pieces, coverage unchanged
    if (!this.isAirDefensePiece(move.piece.type)) {
      return oldCoverage
    }

    // Remove old coverage from moved piece
    const oldRadius = this.getAirDefenseRadius(
      move.piece.type,
      move.piece.heroic,
    )
    if (oldRadius > 0) {
      const [oldFile, oldRank] = bitToSquare(move.from)
      const oldCircle = this.getPositionedCircle(oldFile, oldRank, oldRadius)
      oldCoverage &= ~oldCircle
    }

    // Add new coverage at destination
    const newRadius = this.getAirDefenseRadius(
      move.piece.type,
      move.piece.heroic,
    )
    if (newRadius > 0) {
      const [newFile, newRank] = bitToSquare(move.to)
      const newCircle = this.getPositionedCircle(newFile, newRank, newRadius)
      oldCoverage |= newCircle
    }

    return oldCoverage
  }
}
```

## Complete Integration Example

### Air Defense in Game State

```typescript
class BitboardGameState {
  private pieces: GameBitboards
  private heroicPieces: Bitboard
  private airDefenseZones: AirDefenseZones
  private redAirDefense: Bitboard = 0n
  private blueAirDefense: Bitboard = 0n

  constructor() {
    this.pieces = new GameBitboards()
    this.airDefenseZones = new AirDefenseZones(this.pieces, this.heroicPieces)
    this.updateAirDefense()
  }

  // Update air defense coverage after any move
  private updateAirDefense(): void {
    this.redAirDefense = this.airDefenseZones.calculateAirDefense('red')
    this.blueAirDefense = this.airDefenseZones.calculateAirDefense('blue')
  }

  // Generate moves considering air defense
  generateLegalMoves(): Move[] {
    const moves: Move[] = []

    // Generate moves for all piece types
    const pieceTypes = [
      TANK,
      ARTILLERY,
      NAVY,
      AIR_FORCE,
      INFANTRY,
      MILITIA,
      COMMANDER,
    ]

    for (const pieceType of pieceTypes) {
      if (pieceType === AIR_FORCE) {
        // Special handling for Air Force (air defense aware)
        moves.push(...this.generateAirForceMoves())
      } else {
        // Normal piece move generation
        moves.push(...this.generatePieceTypeMoves(pieceType))
      }
    }

    return this.filterLegalMoves(moves)
  }

  private generateAirForceMoves(): Move[] {
    const airForceMovement = new AirForceMovement(this.airDefenseZones)
    const moves: Move[] = []

    const airForceBitboard = this.pieces.getPieceBitboard(AIR_FORCE, this.turn)
    const friendlyPieces = this.pieces.getColorBitboard(this.turn)
    const enemyPieces = this.pieces.getColorBitboard(
      this.turn === 'r' ? 'b' : 'r',
    )
    const enemyColor = this.turn === 'r' ? 'b' : 'r'

    let airForces = airForceBitboard
    while (airForces !== 0n) {
      const square = BitboardUtils.getLowestSetBit(airForces)
      airForces &= airForces - 1n

      const pieceMoves = airForceMovement.generateAllAirForceMoves(
        square,
        friendlyPieces,
        enemyPieces,
        enemyColor,
      )

      moves.push(...pieceMoves)
    }

    return moves
  }

  // Check if Air Force move is legal (considering air defense)
  isAirForceMoveValid(move: Move): boolean {
    if (move.piece.type !== AIR_FORCE) return true

    const enemyColor = move.piece.color === 'r' ? 'b' : 'r'
    const enemyAirDefense =
      enemyColor === 'r' ? this.redAirDefense : this.blueAirDefense
    const targetBit = 1n << BigInt(move.to)

    // Move is valid if:
    // 1. Not entering air defense zone, OR
    // 2. Is a suicide attack (explicitly allowed)
    const enteringAirDefense = (enemyAirDefense & targetBit) !== 0n
    const isSuicideAttack =
      move.type === 'suicide-capture' || move.type === 'suicide-move'

    return !enteringAirDefense || isSuicideAttack
  }
}
```

## Complex Air Force Movement Example

### Scenario: Air Force Navigation Through Air Defense

```
Position:
  e5: Air Force (Red)
  f7: Tank (Blue) - creates radius 1 air defense zone
  h5: Infantry (Blue) - target for capture

Air Defense Zone (Tank at f7):
  e6 e7 e8
  f6 f7 f8  ← Tank with radius 1 air defense
  g6 g7 g8

Air Force at e5 wants to move east toward h5:
```

### Movement Analysis by Direction

```typescript
// Air Force at e5 moving EAST
// Path: e5 → f5 → g5 → h5

// Range 1: f5 (not in air defense) ✅ Normal move
// Range 2: g5 (not in air defense) ✅ Normal move
// Range 3: h5 (not in air defense) ✅ Normal capture

// Air Force at e5 moving NORTH_EAST
// Path: e5 → f6 → g7 → h8

// Range 1: f6 (IN air defense zone) ❌ Cannot pass through
// Range 2: g7 (would be blocked anyway)
// Range 3: h8 (unreachable due to air defense blocking)

// If there was an enemy piece at f6:
// Range 1: f6 (IN air defense + enemy piece) ✅ Kamikaze capture!
```

### Implementation in Action

```typescript
class AirForceMovementExample {
  demonstrateAirDefenseBlocking(): void {
    // Setup position
    const airForceSquare = squareToBit(4, 4) // e5
    const tankSquare = squareToBit(5, 6) // f7
    const infantrySquare = squareToBit(7, 4) // h5

    // Calculate air defense (Tank radius 1 at f7)
    const airDefense = this.calculateTankAirDefense(tankSquare, 1)

    // Generate Air Force moves
    const movement = new AirForceMovement(this.airDefenseZones)
    const { normalMoves, kamikazeMoves } = movement.generateAirForceMoves(
      airForceSquare,
      0n,
      1n << BigInt(infantrySquare),
      'blue',
    )

    console.log('Normal moves from e5:')
    this.printMoves(normalMoves)
    // Output: f5, g5, h5 (east direction)
    //         d5, c5, b5, a5 (west direction)
    //         e4, e3, e2, e1 (south direction)
    //         e6 (north - blocked by air defense at e7)
    //         d4, c3, b2, a1 (southwest)
    //         f4, g3, h2 (southeast)
    //         d6 (northwest - blocked by air defense)
    //         f4, g3, h2 (southeast)

    console.log('Kamikaze moves from e5:')
    this.printMoves(kamikazeMoves)
    // Output: (none - no enemy pieces in air defense zone)

    // If we add enemy piece at f6 (in air defense zone):
    const enemyInDefense = 1n << BigInt(squareToBit(5, 5)) // f6
    const { normalMoves: normal2, kamikazeMoves: kamikaze2 } =
      movement.generateAirForceMoves(airForceSquare, 0n, enemyInDefense, 'blue')

    console.log('Kamikaze moves with enemy at f6:')
    this.printMoves(kamikaze2)
    // Output: f6 (kamikaze capture)
  }

  private calculateTankAirDefense(
    tankSquare: number,
    radius: number,
  ): Bitboard {
    const [file, rank] = bitToSquare(tankSquare)
    const circleMask = AirDefenseCircles.getCircleMask(radius)
    return AirDefensePositioning.slideCircleToPosition(circleMask, file, rank)
  }
}
```

## Key Implementation Features

### 1. Directional Ray Blocking

Unlike other pieces, Air Force rays are **blocked by air defense zones**, not
just pieces:

```typescript
// Traditional piece: blocked by pieces only
const blockedRay = ray & ~(occupancy & ray)

// Air Force: blocked by pieces OR air defense zones
const blockedRay = this.calculateAirDefenseBlockedRay(
  ray,
  occupancy,
  airDefense,
)
```

### 2. Kamikaze-Only Squares

Some squares can **only** be reached via kamikaze attack:

```typescript
// Squares in air defense with enemy pieces = kamikaze only
const kamikazeOnlySquares = airDefense & enemyPieces

// Squares in air defense without pieces = unreachable
const unreachableSquares = airDefense & ~enemyPieces
```

### 3. Range Limitation by Air Defense

Air Force effective range is **reduced** by air defense zones:

```typescript
// Without air defense: Air Force range 4 in all directions
// With air defense: Range limited to first air defense zone encountered
```

This sophisticated air defense system makes Air Force movement **tactically
complex** while remaining **computationally efficient** with bitboards! 🚀

The key advantages:

- ✅ **Pre-computed circles** - no runtime circle calculation
- ✅ **Fast sliding** - bitwise operations to position circles
- ✅ **Unified coverage** - combine all air defense zones with OR operations
- ✅ **Directional blocking** - air defense zones block Air Force rays
- ✅ **Kamikaze detection** - enemy pieces in air defense = kamikaze targets
- ✅ **Edge handling** - automatic clipping to board boundaries
- ✅ **Incremental updates** - only recalculate when air defense pieces move
