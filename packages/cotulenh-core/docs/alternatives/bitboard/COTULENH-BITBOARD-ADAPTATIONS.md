# CoTuLenh-Specific Bitboard Adaptations

## Overview

This document analyzes the unique challenges that CoTuLenh presents for bitboard
implementation and provides specific solutions for each complex system. Unlike
standard chess engines, CoTuLenh requires specialized adaptations to handle its
stack system, terrain zones, air defense mechanics, and 11 distinct piece types.

## Stack System Representation Challenge

### The Core Problem

The stack system is CoTuLenh's most complex feature and presents the greatest
challenge for pure bitboard implementation:

- **Multiple pieces per square**: Standard bitboards assume one piece per square
- **Dynamic composition**: Stacks can be split and recombined during gameplay
- **Hierarchical relationships**: Carrier piece determines movement, carried
  pieces have different properties
- **Complex interactions**: Stack deployment, recombination, and terrain
  validation

### Hybrid Solution Architecture

**Primary Approach: Bitboard + Hash Map Hybrid**

```typescript
interface CoTulenhBitboardPosition {
  // Pure bitboards for fast operations
  occupancy: {
    allPieces: Bitboard // All occupied squares
    redPieces: Bitboard // All red pieces (carriers only)
    bluePieces: Bitboard // All blue pieces (carriers only)
    stackSquares: Bitboard // Squares containing stacks (>1 piece)
  }

  // Piece type bitboards (carriers only for stacks)
  pieces: PieceBitboards

  // Stack details in separate data structure
  stacks: Map<number, StackComposition>

  // Special status tracking
  heroicPieces: Bitboard // All heroic pieces
  airDefenseZones: Bitboard // Computed air defense coverage
}

interface StackComposition {
  carrier: {
    type: PieceType
    heroic: boolean
  }
  carried: Array<{
    type: PieceType
    heroic: boolean
  }>
  color: Color
}
```

**Stack Operations**

```typescript
class StackManager {
  private stacks: Map<number, StackComposition>
  private position: CoTulenhBitboardPosition

  // Get complete piece information at square
  getPieceAt(square: number): CompleteStackInfo | null {
    if (!testBit(this.position.occupancy.allPieces, square)) {
      return null
    }

    const stackInfo = this.stacks.get(square)
    if (stackInfo) {
      return {
        carrier: stackInfo.carrier,
        carried: stackInfo.carried,
        color: stackInfo.color,
        isStack: stackInfo.carried.length > 0,
      }
    }

    // Single piece - determine type from bitboards
    return this.getSinglePieceAt(square)
  }

  // Deploy piece from stack
  deployPiece(
    fromSquare: number,
    toSquare: number,
    pieceType: PieceType,
  ): boolean {
    const stackInfo = this.stacks.get(fromSquare)
    if (!stackInfo) return false

    // Find and remove piece from stack
    const pieceIndex = stackInfo.carried.findIndex((p) => p.type === pieceType)
    if (pieceIndex === -1 && stackInfo.carrier.type !== pieceType) {
      return false
    }

    let deployedPiece: PieceInfo
    if (stackInfo.carrier.type === pieceType) {
      // Deploying carrier
      deployedPiece = stackInfo.carrier
      if (stackInfo.carried.length > 0) {
        // Promote first carried piece to carrier
        stackInfo.carrier = stackInfo.carried.shift()!
      } else {
        // Stack becomes empty
        this.stacks.delete(fromSquare)
        clearBit(this.position.occupancy.allPieces, fromSquare)
        clearBit(this.position.occupancy.stackSquares, fromSquare)
      }
    } else {
      // Deploying carried piece
      deployedPiece = stackInfo.carried.splice(pieceIndex, 1)[0]
      if (stackInfo.carried.length === 0) {
        // No longer a stack
        clearBit(this.position.occupancy.stackSquares, fromSquare)
      }
    }

    // Place deployed piece at target square
    this.placePiece(toSquare, deployedPiece, stackInfo.color)

    return true
  }

  // Recombine pieces into stack
  recombinePieces(stackSquare: number, pieceSquare: number): boolean {
    const stackInfo = this.stacks.get(stackSquare)
    const pieceInfo = this.getPieceAt(pieceSquare)

    if (!stackInfo || !pieceInfo || stackInfo.color !== pieceInfo.color) {
      return false
    }

    // Validate combination rules
    if (!this.canCombine(stackInfo, pieceInfo)) {
      return false
    }

    // Add piece to stack
    if (pieceInfo.isStack) {
      // Combining two stacks
      stackInfo.carried.push(pieceInfo.carrier)
      stackInfo.carried.push(...pieceInfo.carried)
    } else {
      // Adding single piece to stack
      stackInfo.carried.push({
        type: pieceInfo.type,
        heroic: pieceInfo.heroic,
      })
    }

    // Remove piece from original square
    this.removePiece(pieceSquare)

    return true
  }
}
```

### Stack Move Generation

**Efficient Stack Move Generation**

```typescript
function generateStackMoves(
  position: CoTulenhBitboardPosition,
  stackManager: StackManager,
  square: number,
): Move[] {
  const moves: Move[] = []
  const stackInfo = stackManager.getPieceAt(square)

  if (!stackInfo || !stackInfo.isStack) {
    return generateSinglePieceMoves(position, square)
  }

  // Generate moves for carrier (normal movement)
  const carrierMoves = generateMovesForPieceType(
    position,
    square,
    stackInfo.carrier.type,
    stackInfo.carrier.heroic,
  )
  moves.push(...carrierMoves)

  // Generate deploy moves for all pieces in stack
  const allPieces = [stackInfo.carrier, ...stackInfo.carried]

  for (const piece of allPieces) {
    const deployMoves = generateDeployMovesForPiece(
      position,
      stackManager,
      square,
      piece,
    )
    moves.push(...deployMoves)
  }

  return moves
}

function generateDeployMovesForPiece(
  position: CoTulenhBitboardPosition,
  stackManager: StackManager,
  fromSquare: number,
  piece: PieceInfo,
): Move[] {
  const moves: Move[] = []

  // Generate all possible moves for this piece type
  const possibleMoves = generateMovesForPieceType(
    position,
    fromSquare,
    piece.type,
    piece.heroic,
  )

  // Filter by terrain compatibility
  for (const move of possibleMoves) {
    if (canPieceStayOnTerrain(move.to, piece.type)) {
      moves.push({
        ...move,
        flags: move.flags | MoveFlags.DEPLOY,
        deployedPiece: piece,
      })
    }
  }

  return moves
}
```

## Terrain Zone Handling with Bitboard Masks

### Terrain Representation Strategy

**Efficient Terrain Masks**

```typescript
interface TerrainSystem {
  // Base terrain types
  waterSquares: Bitboard // Pure water (a-b files)
  landSquares: Bitboard // Pure land (c-k files)
  mixedSquares: Bitboard // Mixed zones (d6,e6,d7,e7 + bridges)

  // Derived masks for piece validation
  navyMask: Bitboard // waterSquares | mixedSquares
  landMask: Bitboard // landSquares | mixedSquares

  // Heavy piece zones
  heavyZoneUpper: Bitboard // Ranks 7-12 (upper half)
  heavyZoneLower: Bitboard // Ranks 1-6 (lower half)
  bridgeSquares: Bitboard // f6,f7,h6,h7 (crossing points)

  // Air Force special terrain (can go anywhere)
  allValidSquares: Bitboard // All 132 valid squares
}

// Initialize terrain masks at startup
function initializeTerrainSystem(): TerrainSystem {
  const terrain: TerrainSystem = {
    waterSquares: createEmptyBitboard(),
    landSquares: createEmptyBitboard(),
    mixedSquares: createEmptyBitboard(),
    navyMask: createEmptyBitboard(),
    landMask: createEmptyBitboard(),
    heavyZoneUpper: createEmptyBitboard(),
    heavyZoneLower: createEmptyBitboard(),
    bridgeSquares: createEmptyBitboard(),
    allValidSquares: createEmptyBitboard(),
  }

  // Generate water squares (files a-b, ranks 1-12)
  for (let rank = 0; rank < 12; rank++) {
    for (let file = 0; file < 2; file++) {
      const square = rank * 11 + file
      setBit(terrain.waterSquares, square)
      setBit(terrain.allValidSquares, square)
    }
  }

  // Generate land squares (files c-k, ranks 1-12)
  for (let rank = 0; rank < 12; rank++) {
    for (let file = 2; file < 11; file++) {
      const square = rank * 11 + file
      setBit(terrain.landSquares, square)
      setBit(terrain.allValidSquares, square)

      // Heavy piece zones
      if (rank < 6) {
        setBit(terrain.heavyZoneLower, square)
      } else {
        setBit(terrain.heavyZoneUpper, square)
      }
    }
  }

  // Mixed zones: d6, e6, d7, e7
  const mixedCoords = [
    { file: 3, rank: 5 }, // d6
    { file: 4, rank: 5 }, // e6
    { file: 3, rank: 6 }, // d7
    { file: 4, rank: 6 }, // e7
  ]

  for (const coord of mixedCoords) {
    const square = coord.rank * 11 + coord.file
    setBit(terrain.mixedSquares, square)
  }

  // Bridge squares: f6, f7, h6, h7
  const bridgeCoords = [
    { file: 5, rank: 5 }, // f6
    { file: 5, rank: 6 }, // f7
    { file: 7, rank: 5 }, // h6
    { file: 7, rank: 6 }, // h7
  ]

  for (const coord of bridgeCoords) {
    const square = coord.rank * 11 + coord.file
    setBit(terrain.bridgeSquares, square)
    setBit(terrain.mixedSquares, square)
  }

  // Generate derived masks
  terrain.navyMask = bitwiseOr(terrain.waterSquares, terrain.mixedSquares)
  terrain.landMask = bitwiseOr(terrain.landSquares, terrain.mixedSquares)

  return terrain
}
```

### Terrain-Aware Move Generation

**Fast Terrain Validation**

```typescript
function applyTerrainRestrictions(
  moves: Bitboard,
  pieceType: PieceType,
  terrain: TerrainSystem,
): Bitboard {
  switch (pieceType) {
    case PieceType.NAVY:
      return bitwiseAnd(moves, terrain.navyMask)

    case PieceType.AIR_FORCE:
      return bitwiseAnd(moves, terrain.allValidSquares) // Can go anywhere

    default:
      return bitwiseAnd(moves, terrain.landMask)
  }
}

function validateHeavyPieceCrossing(
  fromSquare: number,
  toSquare: number,
  pieceType: PieceType,
  terrain: TerrainSystem,
): boolean {
  if (!HEAVY_PIECES.has(pieceType)) {
    return true // Not a heavy piece
  }

  const fromUpper = testBit(terrain.heavyZoneUpper, fromSquare)
  const fromLower = testBit(terrain.heavyZoneLower, fromSquare)
  const toUpper = testBit(terrain.heavyZoneUpper, toSquare)
  const toLower = testBit(terrain.heavyZoneLower, toSquare)

  // If crossing zones, must use bridge
  if ((fromUpper && toLower) || (fromLower && toUpper)) {
    const direction = getDirection(fromSquare, toSquare)

    // Check if path goes through bridge squares
    if (direction === Direction.HORIZONTAL) {
      const bridgePath = getBridgeSquaresBetween(fromSquare, toSquare)
      return bridgePath.length > 0
    }

    return false // Vertical crossing not allowed for heavy pieces
  }

  return true
}
```

## Air Defense Zone Calculations and Optimization

### Bitboard-Based Air Defense System

**Efficient Zone Calculation**

```typescript
interface AirDefenseSystem {
  // Defense zones by level
  level1Zones: Bitboard // Anti-Air base, Navy
  level2Zones: Bitboard // Missile base, Anti-Air heroic
  level3Zones: Bitboard // Missile heroic (maximum)

  // Combined zones for quick lookup
  allDefenseZones: Bitboard // Union of all defense zones

  // Source tracking for zone updates
  defenseSourceSquares: Map<number, DefenseInfo>
}

interface DefenseInfo {
  pieceType: PieceType
  level: number
  isHeroic: boolean
}

class AirDefenseManager {
  private defenseSystem: AirDefenseSystem
  private terrain: TerrainSystem

  // Precomputed circular zone patterns
  private static ZONE_PATTERNS: Map<number, Bitboard> = new Map()

  static {
    // Precompute circular patterns for each defense level
    for (let level = 1; level <= 3; level++) {
      AirDefenseManager.ZONE_PATTERNS.set(
        level,
        this.generateCircularPattern(level),
      )
    }
  }

  updateAirDefense(position: CoTulenhBitboardPosition): void {
    // Clear existing zones
    this.defenseSystem.level1Zones = createEmptyBitboard()
    this.defenseSystem.level2Zones = createEmptyBitboard()
    this.defenseSystem.level3Zones = createEmptyBitboard()
    this.defenseSystem.defenseSourceSquares.clear()

    // Process Anti-Air pieces
    this.processDefensePieces(
      position.pieces.redAntiAir,
      position.pieces.blueAntiAir,
      PieceType.ANTI_AIR,
      position.heroicPieces,
    )

    // Process Missile pieces
    this.processDefensePieces(
      position.pieces.redMissile,
      position.pieces.blueMissile,
      PieceType.MISSILE,
      position.heroicPieces,
    )

    // Process Navy pieces
    this.processDefensePieces(
      position.pieces.redNavy,
      position.pieces.blueNavy,
      PieceType.NAVY,
      position.heroicPieces,
    )

    // Update combined zones
    this.defenseSystem.allDefenseZones = bitwiseOr(
      this.defenseSystem.level1Zones,
      bitwiseOr(this.defenseSystem.level2Zones, this.defenseSystem.level3Zones),
    )
  }

  private processDefensePieces(
    redPieces: Bitboard,
    bluePieces: Bitboard,
    pieceType: PieceType,
    heroicPieces: Bitboard,
  ): void {
    const allPieces = bitwiseOr(redPieces, bluePieces)

    let square = -1
    let tempPieces = { ...allPieces }

    while ((square = findFirstBit(tempPieces)) !== -1) {
      clearBit(tempPieces, square)

      const isHeroic = testBit(heroicPieces, square)
      const baseLevel = this.getBaseDefenseLevel(pieceType)
      const defenseLevel = isHeroic ? baseLevel + 1 : baseLevel

      // Add zone around this piece
      const zonePattern = AirDefenseManager.ZONE_PATTERNS.get(defenseLevel)!
      const actualZone = this.translateZoneToSquare(zonePattern, square)

      // Add to appropriate level
      switch (defenseLevel) {
        case 1:
          this.defenseSystem.level1Zones = bitwiseOr(
            this.defenseSystem.level1Zones,
            actualZone,
          )
          break
        case 2:
          this.defenseSystem.level2Zones = bitwiseOr(
            this.defenseSystem.level2Zones,
            actualZone,
          )
          break
        case 3:
          this.defenseSystem.level3Zones = bitwiseOr(
            this.defenseSystem.level3Zones,
            actualZone,
          )
          break
      }

      // Track source
      this.defenseSystem.defenseSourceSquares.set(square, {
        pieceType,
        level: defenseLevel,
        isHeroic,
      })
    }
  }

  private static generateCircularPattern(radius: number): Bitboard {
    let pattern = createEmptyBitboard()

    // Generate pattern centered at square 0 (will be translated later)
    for (let dr = -radius; dr <= radius; dr++) {
      for (let df = -radius; df <= radius; df++) {
        if (dr * dr + df * df <= radius * radius) {
          // Convert relative position to square index
          const relativeSquare = dr * 11 + df
          if (relativeSquare >= 0 && relativeSquare < 132) {
            setBit(pattern, relativeSquare)
          }
        }
      }
    }

    return pattern
  }

  private translateZoneToSquare(
    pattern: Bitboard,
    centerSquare: number,
  ): Bitboard {
    // Translate precomputed pattern to actual square position
    // This is a simplified version - actual implementation would need
    // proper coordinate transformation
    const centerFile = centerSquare % 11
    const centerRank = Math.floor(centerSquare / 11)

    let translatedZone = createEmptyBitboard()

    // For each bit in pattern, translate to actual board position
    let patternSquare = -1
    let tempPattern = { ...pattern }

    while ((patternSquare = findFirstBit(tempPattern)) !== -1) {
      clearBit(tempPattern, patternSquare)

      const patternFile = patternSquare % 11
      const patternRank = Math.floor(patternSquare / 11)

      // Calculate offset from center
      const fileOffset = patternFile - 5 // Assuming pattern centered at (5,5)
      const rankOffset = patternRank - 5

      const actualFile = centerFile + fileOffset
      const actualRank = centerRank + rankOffset

      // Check bounds
      if (
        actualFile >= 0 &&
        actualFile < 11 &&
        actualRank >= 0 &&
        actualRank < 12
      ) {
        const actualSquare = actualRank * 11 + actualFile
        setBit(translatedZone, actualSquare)
      }
    }

    return translatedZone
  }

  // Check if Air Force can move to square
  canAirForceMoveTo(square: number): AirForceResult {
    if (!testBit(this.defenseSystem.allDefenseZones, square)) {
      return AirForceResult.SAFE_MOVE
    }

    // Determine defense level at square
    if (testBit(this.defenseSystem.level3Zones, square)) {
      return AirForceResult.DESTROYED
    } else if (testBit(this.defenseSystem.level2Zones, square)) {
      return AirForceResult.KAMIKAZE
    } else {
      return AirForceResult.KAMIKAZE // Level 1 zone
    }
  }
}

enum AirForceResult {
  SAFE_MOVE, // Can move normally
  KAMIKAZE, // Can move but will be destroyed (suicide attack)
  DESTROYED, // Cannot move to this square
}
```

### Air Defense Optimization Strategies

**Incremental Updates**

```typescript
class IncrementalAirDefenseManager extends AirDefenseManager {
  private lastPosition: CoTulenhBitboardPosition | null = null

  updateAirDefenseIncremental(
    position: CoTulenhBitboardPosition,
    changedSquares: number[],
  ): void {
    if (!this.lastPosition) {
      // First update - do full calculation
      this.updateAirDefense(position)
      this.lastPosition = this.clonePosition(position)
      return
    }

    // Incremental update - only recalculate affected zones
    for (const square of changedSquares) {
      this.removeDefenseFromSquare(square)
      this.addDefenseFromSquare(square, position)
    }

    // Update combined zones
    this.rebuildCombinedZones()
    this.lastPosition = this.clonePosition(position)
  }

  private removeDefenseFromSquare(square: number): void {
    const defenseInfo = this.defenseSystem.defenseSourceSquares.get(square)
    if (!defenseInfo) return

    // Remove this square's contribution to defense zones
    const zonePattern = AirDefenseManager.ZONE_PATTERNS.get(defenseInfo.level)!
    const actualZone = this.translateZoneToSquare(zonePattern, square)

    // Subtract from appropriate level (this is complex - need reference counting)
    // Simplified version: mark for full recalculation
    this.markForRecalculation(square, defenseInfo.level)
  }
}
```

## Deploy Mechanics Implementation with Bitboard State

### Deploy Session Management

**Bitboard-Aware Deploy System**

```typescript
interface DeploySession {
  // Original state
  originalPosition: CoTulenhBitboardPosition
  stackSquare: number
  originalStack: StackComposition

  // Current state during deploy
  currentPosition: CoTulenhBitboardPosition
  deployedPieces: Map<number, PieceInfo> // square -> deployed piece
  remainingPieces: PieceInfo[] // pieces still in stack

  // Move history for undo
  deployMoves: DeployMove[]

  // Validation state
  isComplete: boolean
  canCommit: boolean
}

interface DeployMove {
  fromSquare: number
  toSquare: number
  piece: PieceInfo
  moveType: 'deploy' | 'recombine'
  terrainValid: boolean
}

class BitboardDeployManager {
  private activeSession: DeploySession | null = null

  startDeploySession(
    position: CoTulenhBitboardPosition,
    stackManager: StackManager,
    stackSquare: number,
  ): boolean {
    const stackInfo = stackManager.getPieceAt(stackSquare)
    if (!stackInfo || !stackInfo.isStack) {
      return false
    }

    this.activeSession = {
      originalPosition: this.clonePosition(position),
      stackSquare,
      originalStack: this.cloneStack(stackInfo),
      currentPosition: this.clonePosition(position),
      deployedPieces: new Map(),
      remainingPieces: [stackInfo.carrier, ...stackInfo.carried],
      deployMoves: [],
      isComplete: false,
      canCommit: false,
    }

    return true
  }

  deployPiece(
    pieceType: PieceType,
    toSquare: number,
    stackManager: StackManager,
  ): boolean {
    if (!this.activeSession) return false

    // Find piece in remaining pieces
    const pieceIndex = this.activeSession.remainingPieces.findIndex(
      (p) => p.type === pieceType,
    )
    if (pieceIndex === -1) return false

    const piece = this.activeSession.remainingPieces[pieceIndex]

    // Validate terrain compatibility
    if (!this.validateTerrainForDeploy(piece.type, toSquare)) {
      return false
    }

    // Validate square is empty or can recombine
    const existingPiece = stackManager.getPieceAt(toSquare)
    if (existingPiece && !this.canRecombineWith(piece, existingPiece)) {
      return false
    }

    // Execute deploy move
    const deployMove: DeployMove = {
      fromSquare: this.activeSession.stackSquare,
      toSquare,
      piece,
      moveType: existingPiece ? 'recombine' : 'deploy',
      terrainValid: true,
    }

    // Update position
    if (existingPiece) {
      // Recombine with existing piece
      this.recombinePieces(toSquare, piece, existingPiece, stackManager)
    } else {
      // Deploy to empty square
      this.placePieceOnBoard(toSquare, piece)
    }

    // Update session state
    this.activeSession.remainingPieces.splice(pieceIndex, 1)
    this.activeSession.deployedPieces.set(toSquare, piece)
    this.activeSession.deployMoves.push(deployMove)

    // Check if deploy is complete
    this.updateSessionStatus()

    return true
  }

  private validateTerrainForDeploy(
    pieceType: PieceType,
    square: number,
  ): boolean {
    const terrain = this.getTerrainSystem()

    switch (pieceType) {
      case PieceType.NAVY:
        return testBit(terrain.navyMask, square)
      case PieceType.AIR_FORCE:
        return testBit(terrain.allValidSquares, square)
      default:
        return testBit(terrain.landMask, square)
    }
  }

  private updateSessionStatus(): void {
    if (!this.activeSession) return

    // Session is complete when all pieces are deployed or staying
    this.activeSession.isComplete =
      this.activeSession.remainingPieces.length === 0

    // Can commit if complete and no terrain violations
    this.activeSession.canCommit =
      this.activeSession.isComplete && this.validateAllDeployedPieces()
  }

  private validateAllDeployedPieces(): boolean {
    if (!this.activeSession) return false

    // Validate each deployed piece's terrain compatibility
    for (const [square, piece] of this.activeSession.deployedPieces) {
      if (!this.validateTerrainForDeploy(piece.type, square)) {
        return false
      }
    }

    return true
  }

  commitDeploySession(
    position: CoTulenhBitboardPosition,
    stackManager: StackManager,
  ): boolean {
    if (!this.activeSession || !this.activeSession.canCommit) {
      return false
    }

    // Final validation - check commander safety
    if (!this.validateCommanderSafety(position)) {
      return false
    }

    // Commit is successful - session changes are already applied
    // Just need to clean up session state
    this.activeSession = null

    return true
  }

  cancelDeploySession(
    position: CoTulenhBitboardPosition,
    stackManager: StackManager,
  ): void {
    if (!this.activeSession) return

    // Restore original position
    this.restorePosition(position, this.activeSession.originalPosition)
    this.restoreStack(
      stackManager,
      this.activeSession.stackSquare,
      this.activeSession.originalStack,
    )

    this.activeSession = null
  }
}
```

### Deploy Move Generation

**Efficient Deploy Move Generation**

```typescript
function generateDeployMoves(
  position: CoTulenhBitboardPosition,
  deployManager: BitboardDeployManager,
  stackManager: StackManager,
  stackSquare: number,
): Move[] {
  const moves: Move[] = []
  const session = deployManager.getActiveSession()

  if (!session) {
    // No active session - generate initial deploy moves
    return generateInitialDeployMoves(position, stackManager, stackSquare)
  }

  // Active session - generate moves for remaining pieces
  for (const piece of session.remainingPieces) {
    const pieceMoves = generateMovesForPieceInDeploy(
      position,
      stackSquare,
      piece,
      session,
    )
    moves.push(...pieceMoves)
  }

  return moves
}

function generateMovesForPieceInDeploy(
  position: CoTulenhBitboardPosition,
  fromSquare: number,
  piece: PieceInfo,
  session: DeploySession,
): Move[] {
  const moves: Move[] = []

  // Generate all possible moves for this piece type
  const possibleTargets = generatePossibleTargets(
    position,
    fromSquare,
    piece.type,
    piece.heroic,
  )

  // Filter by terrain and deployment rules
  let targetSquare = -1
  let tempTargets = { ...possibleTargets }

  while ((targetSquare = findFirstBit(tempTargets)) !== -1) {
    clearBit(tempTargets, targetSquare)

    // Check terrain compatibility
    if (!validateTerrainForPiece(targetSquare, piece.type)) {
      continue
    }

    // Check if square is available for deployment
    const existingPiece = session.deployedPieces.get(targetSquare)
    if (existingPiece && !canRecombineWith(piece, existingPiece)) {
      continue
    }

    // Valid deploy move
    moves.push({
      from: fromSquare,
      to: targetSquare,
      piece: piece,
      flags: MoveFlags.DEPLOY | (existingPiece ? MoveFlags.RECOMBINE : 0),
      deployInfo: {
        isRecombine: !!existingPiece,
        targetPiece: existingPiece,
      },
    })
  }

  return moves
}
```

## Heroic Promotion Tracking and Persistence

### Bitboard-Based Heroic System

**Heroic Status Management**

```typescript
interface HeroicSystem {
  // Global heroic status
  heroicPieces: Bitboard // All pieces with heroic status

  // Heroic pieces by type for quick lookup
  heroicByType: {
    [PieceType.COMMANDER]: Bitboard
    [PieceType.INFANTRY]: Bitboard
    [PieceType.TANK]: Bitboard
    [PieceType.MILITIA]: Bitboard
    [PieceType.ENGINEER]: Bitboard
    [PieceType.ARTILLERY]: Bitboard
    [PieceType.ANTI_AIR]: Bitboard
    [PieceType.MISSILE]: Bitboard
    [PieceType.AIR_FORCE]: Bitboard
    [PieceType.NAVY]: Bitboard
    [PieceType.HEADQUARTER]: Bitboard
  }

  // Heroic status in stacks (hybrid approach)
  stackHeroicStatus: Map<number, boolean[]> // square -> heroic status per piece
}

class HeroicManager {
  private heroicSystem: HeroicSystem

  // Check and update heroic status after move
  updateHeroicStatus(
    position: CoTulenhBitboardPosition,
    stackManager: StackManager,
    movedSquare: number,
    commanderSquares: { red: number; blue: number },
  ): void {
    const pieceInfo = stackManager.getPieceAt(movedSquare)
    if (!pieceInfo) return

    const enemyCommanderSquare =
      pieceInfo.color === Color.RED
        ? commanderSquares.blue
        : commanderSquares.red

    if (enemyCommanderSquare === -1) return // No enemy commander

    // Check if any piece in the stack threatens enemy commander
    if (pieceInfo.isStack) {
      this.updateStackHeroicStatus(
        position,
        stackManager,
        movedSquare,
        enemyCommanderSquare,
      )
    } else {
      this.updateSinglePieceHeroicStatus(
        position,
        movedSquare,
        pieceInfo,
        enemyCommanderSquare,
      )
    }
  }

  private updateStackHeroicStatus(
    position: CoTulenhBitboardPosition,
    stackManager: StackManager,
    stackSquare: number,
    enemyCommanderSquare: number,
  ): void {
    const stackInfo = stackManager.getPieceAt(stackSquare)
    if (!stackInfo || !stackInfo.isStack) return

    const allPieces = [stackInfo.carrier, ...stackInfo.carried]
    const heroicStatus =
      this.heroicSystem.stackHeroicStatus.get(stackSquare) || []

    for (let i = 0; i < allPieces.length; i++) {
      const piece = allPieces[i]
      const wasHeroic = heroicStatus[i] || false

      // Check if this piece threatens enemy commander
      const threatens = this.checkIfPieceThreatenSquare(
        position,
        stackSquare,
        piece,
        enemyCommanderSquare,
      )

      if (threatens && !wasHeroic) {
        // Grant heroic status
        heroicStatus[i] = true
        this.addHeroicStatus(stackSquare, piece.type)
      } else if (!threatens && wasHeroic) {
        // Remove heroic status (rare case)
        heroicStatus[i] = false
        this.removeHeroicStatus(stackSquare, piece.type)
      }
    }

    this.heroicSystem.stackHeroicStatus.set(stackSquare, heroicStatus)
  }

  private updateSinglePieceHeroicStatus(
    position: CoTulenhBitboardPosition,
    pieceSquare: number,
    piece: PieceInfo,
    enemyCommanderSquare: number,
  ): void {
    const wasHeroic = testBit(this.heroicSystem.heroicPieces, pieceSquare)

    const threatens = this.checkIfPieceThreatenSquare(
      position,
      pieceSquare,
      piece,
      enemyCommanderSquare,
    )

    if (threatens && !wasHeroic) {
      this.addHeroicStatus(pieceSquare, piece.type)
    } else if (!threatens && wasHeroic) {
      this.removeHeroicStatus(pieceSquare, piece.type)
    }
  }

  private checkIfPieceThreatenSquare(
    position: CoTulenhBitboardPosition,
    fromSquare: number,
    piece: PieceInfo,
    targetSquare: number,
  ): boolean {
    // Generate attack pattern for piece
    const attacks = generateAttackPattern(
      position,
      fromSquare,
      piece.type,
      piece.heroic,
    )

    return testBit(attacks, targetSquare)
  }

  private addHeroicStatus(square: number, pieceType: PieceType): void {
    setBit(this.heroicSystem.heroicPieces, square)
    setBit(this.heroicSystem.heroicByType[pieceType], square)
  }

  private removeHeroicStatus(square: number, pieceType: PieceType): void {
    clearBit(this.heroicSystem.heroicPieces, square)
    clearBit(this.heroicSystem.heroicByType[pieceType], square)
  }

  // Handle heroic status during deploy operations
  transferHeroicStatusOnDeploy(
    fromSquare: number,
    toSquare: number,
    piece: PieceInfo,
  ): void {
    // Check if piece was heroic in original stack
    const stackHeroicStatus =
      this.heroicSystem.stackHeroicStatus.get(fromSquare)
    if (!stackHeroicStatus) return

    const stackInfo = this.getStackInfo(fromSquare)
    if (!stackInfo) return

    // Find piece index in original stack
    const allPieces = [stackInfo.carrier, ...stackInfo.carried]
    const pieceIndex = allPieces.findIndex(
      (p) => p.type === piece.type && p.color === piece.color,
    )

    if (pieceIndex !== -1 && stackHeroicStatus[pieceIndex]) {
      // Transfer heroic status to new square
      this.addHeroicStatus(toSquare, piece.type)

      // Remove from original stack status
      stackHeroicStatus[pieceIndex] = false
      if (stackHeroicStatus.every((status) => !status)) {
        // No more heroic pieces in stack
        this.heroicSystem.stackHeroicStatus.delete(fromSquare)
      }
    }
  }
}
```

## Commander Exposure Detection with Bitboard Operations

### Flying General Rule Implementation

**Efficient Commander Exposure Detection**

```typescript
class CommanderExposureDetector {
  // Check if commanders are exposed (Flying General rule)
  checkCommanderExposure(
    position: CoTulenhBitboardPosition,
    redCommanderSquare: number,
    blueCommanderSquare: number,
  ): boolean {
    if (redCommanderSquare === -1 || blueCommanderSquare === -1) {
      return false // Can't be exposed if commander is captured
    }

    // Check if commanders are on same file or rank
    const redFile = redCommanderSquare % 11
    const redRank = Math.floor(redCommanderSquare / 11)
    const blueFile = blueCommanderSquare % 11
    const blueRank = Math.floor(blueCommanderSquare / 11)

    if (redFile !== blueFile && redRank !== blueRank) {
      return false // Not on same line
    }

    // Check if path between commanders is clear
    return this.isPathClear(position, redCommanderSquare, blueCommanderSquare)
  }

  private isPathClear(
    position: CoTulenhBitboardPosition,
    square1: number,
    square2: number,
  ): boolean {
    const direction = this.getDirection(square1, square2)
    if (direction === 0) return false // Not on same line

    let currentSquare = square1 + direction

    while (currentSquare !== square2) {
      if (testBit(position.occupancy.allPieces, currentSquare)) {
        return false // Path blocked
      }
      currentSquare += direction
    }

    return true // Path is clear
  }

  private getDirection(from: number, to: number): number {
    const fromFile = from % 11
    const fromRank = Math.floor(from / 11)
    const toFile = to % 11
    const toRank = Math.floor(to / 11)

    if (fromFile === toFile) {
      // Same file - vertical movement
      return fromRank < toRank ? 11 : -11
    } else if (fromRank === toRank) {
      // Same rank - horizontal movement
      return fromFile < toFile ? 1 : -1
    }

    return 0 // Not on same line
  }

  // Generate moves that avoid commander exposure
  filterMovesForCommanderExposure(
    moves: Move[],
    position: CoTulenhBitboardPosition,
    commanderSquares: { red: number; blue: number },
    movingColor: Color,
  ): Move[] {
    const filteredMoves: Move[] = []

    for (const move of moves) {
      // Temporarily apply move
      const testPosition = this.applyMoveTemporarily(position, move)

      // Update commander position if commander moved
      const testCommanderSquares = { ...commanderSquares }
      if (move.piece.type === PieceType.COMMANDER) {
        if (movingColor === Color.RED) {
          testCommanderSquares.red = move.to
        } else {
          testCommanderSquares.blue = move.to
        }
      }

      // Check if move results in commander exposure
      const exposed = this.checkCommanderExposure(
        testPosition,
        testCommanderSquares.red,
        testCommanderSquares.blue,
      )

      if (!exposed) {
        filteredMoves.push(move)
      }
    }

    return filteredMoves
  }
}
```

## Performance Optimization Summary

### Key Optimization Strategies

1. **Precomputed Tables**: Attack patterns, zone patterns, terrain masks
2. **Incremental Updates**: Only recalculate changed zones and status
3. **Hybrid Approach**: Bitboards for fast operations, maps for complex data
4. **Cache-Friendly Layout**: Structure data for optimal memory access
5. **SIMD Opportunities**: Parallel bitboard operations where supported

### Memory Usage Comparison

| Component       | Current (0x88) | Bitboard      | Savings  |
| --------------- | -------------- | ------------- | -------- |
| Board State     | ~2KB           | ~1KB          | 50%      |
| Piece Positions | 256 × 8 bytes  | 22 × 16 bytes | 86%      |
| Air Defense     | Dynamic calc   | Precomputed   | Variable |
| Terrain Masks   | 256 × 2 bytes  | 8 × 16 bytes  | 75%      |

### Implementation Complexity

| System        | Complexity | Bitboard Benefit | Hybrid Recommended |
| ------------- | ---------- | ---------------- | ------------------ |
| Basic Moves   | Low        | High             | No                 |
| Stack System  | Very High  | Low              | Yes                |
| Air Defense   | Medium     | High             | No                 |
| Terrain       | Low        | High             | No                 |
| Heroic Status | Medium     | Medium           | Yes                |

## Conclusion

CoTuLenh's unique mechanics present significant challenges for pure bitboard
implementation, particularly the stack system. The hybrid approach outlined here
provides the best balance of performance benefits and implementation complexity:

1. **Use bitboards** for fast operations: move generation, attack detection,
   zone calculations
2. **Use hybrid approach** for complex systems: stacks, heroic status tracking
3. **Precompute** expensive operations: attack patterns, zone patterns, terrain
   masks
4. **Optimize incrementally**: start with high-impact, low-complexity systems

The resulting architecture should provide substantial performance improvements
while maintaining code clarity and correctness for CoTuLenh's complex game
mechanics.
