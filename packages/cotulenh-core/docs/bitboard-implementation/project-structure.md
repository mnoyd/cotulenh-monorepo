# CoTuLenh Bitboard Implementation: Project Structure

## Overview

The bitboard implementation requires a **fundamentally different architecture**
from traditional square-by-square approaches. The project structure reflects the
core bitboard concepts: pre-computed tables, magic bitboards, dual normal/heroic
systems, and bitwise operations.

## Core Architecture Principles

1. **Bitboard-First Design** - Everything built around 256-bit integers
2. **Pre-computed Tables** - All rays, magic tables, terrain masks computed at
   startup
3. **Dual Normal/Heroic System** - Separate bitboards for normal vs heroic
   pieces
4. **Magic Bitboard Optimization** - Ultra-fast lookups for all major operations
5. **Unified Bitwise Operations** - All game logic uses bitwise operations

---

## Project Structure

```
src/
├── core/
│   ├── bitboard/
│   │   ├── BitboardUtils.ts           # Core bitboard manipulation utilities
│   │   ├── BitboardConstants.ts       # Masks, shifts, file/rank constants
│   │   ├── BitboardDebug.ts          # Visualization and debugging tools
│   │   └── BitboardMath.ts           # Advanced bit manipulation operations
│   │
│   ├── game-state/
│   │   ├── GameState.ts              # Main game state with dual bitboards
│   │   ├── PieceBitboards.ts         # Normal/heroic piece bitboard management
│   │   ├── TerrainBitboards.ts       # Static terrain masks
│   │   ├── GameStateFactory.ts       # Create game states from FEN, positions
│   │   └── GameStateValidator.ts     # Validate game state consistency
│   │
│   ├── pieces/
│   │   ├── PieceTypes.ts             # Piece type definitions and constants
│   │   ├── PieceRanges.ts            # Normal/heroic range definitions
│   │   ├── PieceCapabilities.ts      # Movement patterns, terrain access
│   │   └── HeroicPromotion.ts        # Heroic promotion rules and logic
│   │
│   └── squares/
│       ├── SquareUtils.ts            # Square ↔ bitboard conversion
│       ├── CoordinateSystem.ts       # File/rank coordinate handling
│       └── SquareConstants.ts        # Pre-computed square masks
│
├── tables/
│   ├── ray-tables/
│   │   ├── RayTableGenerator.ts      # Generate all ray tables at startup
│   │   ├── DirectionalRays.ts        # North, south, east, west rays
│   │   ├── DiagonalRays.ts          # NE, NW, SE, SW rays
│   │   ├── RangeLimitedRays.ts      # Range 1-5 ray tables
│   │   └── PieceSpecificRays.ts     # Tank rays, artillery rays, etc.
│   │
│   ├── magic-tables/
│   │   ├── MagicBitboards.ts         # Core magic bitboard implementation
│   │   ├── MagicTableGenerator.ts   # Generate magic tables at startup
│   │   ├── SlidingPieceMagic.ts     # Magic tables for sliding pieces
│   │   ├── HeroicPromotionMagic.ts  # Magic tables for promotion detection
│   │   ├── AirDefenseMagic.ts       # Magic tables for air defense zones
│   │   └── TerrainAwareMagic.ts     # Magic tables with terrain restrictions
│   │
│   ├── terrain-tables/
│   │   ├── TerrainEncoder.ts         # Generate terrain bitboards
│   │   ├── MovementMasks.ts          # Piece-specific terrain masks
│   │   ├── RiverCrossing.ts          # River/bridge crossing tables
│   │   └── AirDefenseZones.ts        # Pre-computed air defense circles
│   │
│   └── lookup-tables/
│       ├── AttackTables.ts           # Pre-computed attack patterns
│       ├── MovementTables.ts         # Pre-computed movement patterns
│       ├── CombinationTables.ts      # Stack combination possibilities
│       └── PromotionTables.ts        # Heroic promotion lookup tables
│
├── move-generation/
│   ├── generators/
│   │   ├── MoveGenerator.ts          # Main move generation coordinator
│   │   ├── NormalPieceGenerator.ts   # Move generation for normal pieces
│   │   ├── HeroicPieceGenerator.ts   # Move generation for heroic pieces
│   │   ├── DeployMoveGenerator.ts    # Deploy session move generation
│   │   ├── AirForceGenerator.ts      # Air Force with air defense awareness
│   │   └── SpecialMoveGenerator.ts   # Stay-capture, combine moves
│   │
│   ├── filters/
│   │   ├── LegalMoveFilter.ts        # Filter legal moves (commander safety)
│   │   ├── CommanderSafetyFilter.ts  # Flying general, commander attacks
│   │   ├── TerrainFilter.ts          # Terrain-based move filtering
│   │   └── AirDefenseFilter.ts       # Air defense zone filtering
│   │
│   └── patterns/
│       ├── AttackPatterns.ts         # Attack pattern generation
│       ├── MovementPatterns.ts       # Movement pattern generation
│       ├── BlockingPatterns.ts       # Piece blocking calculations
│       └── RangePatterns.ts          # Variable range pattern handling
│
├── move-application/
│   ├── applicators/
│   │   ├── MoveApplicator.ts         # Main move application coordinator
│   │   ├── NormalMoveApplicator.ts   # Apply normal moves
│   │   ├── CaptureMoveApplicator.ts  # Apply capture moves
│   │   ├── CombineMoveApplicator.ts  # Apply combine moves
│   │   ├── DeployMoveApplicator.ts   # Apply deploy moves
│   │   └── SpecialMoveApplicator.ts  # Apply special moves
│   │
│   ├── promotion/
│   │   ├── HeroicPromotionDetector.ts # Detect pieces needing promotion
│   │   ├── PromotionApplicator.ts     # Apply heroic promotions
│   │   ├── CommanderAttackDetector.ts # Detect commander attacks
│   │   └── LastPieceDetector.ts       # Detect last piece promotion
│   │
│   └── state-updates/
│       ├── BitboardUpdater.ts        # Update piece bitboards
│       ├── TurnManager.ts            # Handle turn switching
│       ├── CounterUpdater.ts         # Update move/half-move counters
│       └── DeploySessionManager.ts   # Manage deploy session state
│
├── deploy-sessions/
│   ├── DeploySession.ts              # Deploy session state management
│   ├── DeployMoveTracker.ts          # Track deployed/remaining pieces
│   ├── DeployValidator.ts            # Validate deploy moves
│   ├── DeployCompletion.ts           # Handle deploy completion
│   └── StackManagement.ts            # Manage stack composition
│
├── air-defense/
│   ├── AirDefenseCalculator.ts       # Calculate air defense coverage
│   ├── AirDefenseZones.ts            # Air defense zone management
│   ├── CircleMasks.ts                # Pre-computed circle masks
│   ├── AirForceMovement.ts           # Air Force movement with air defense
│   └── KamikazeDetector.ts           # Detect kamikaze attacks
│
├── terrain/
│   ├── TerrainSystem.ts              # Main terrain system
│   ├── TerrainQueries.ts             # Fast terrain queries
│   ├── MovementRestrictions.ts       # Terrain-based movement restrictions
│   ├── RiverCrossing.ts              # River crossing for heavy pieces
│   └── StayCaptureDetector.ts        # Terrain-based stay-capture detection
│
├── validation/
│   ├── GameStateValidator.ts         # Validate complete game state
│   ├── MoveValidator.ts              # Validate individual moves
│   ├── CommanderSafety.ts            # Commander safety validation
│   ├── FlyingGeneralDetector.ts      # Flying general rule validation
│   └── BitboardConsistency.ts        # Ensure bitboard consistency
│
├── serialization/
│   ├── FENParser.ts                  # Parse FEN strings to game state
│   ├── FENGenerator.ts               # Generate FEN from game state
│   ├── ExtendedFEN.ts                # Handle deploy session FEN extensions
│   ├── MoveNotation.ts               # Parse/generate move notation
│   └── GameStateSerializer.ts        # Serialize/deserialize game states
│
├── performance/
│   ├── Profiler.ts                   # Performance profiling tools
│   ├── Benchmarks.ts                # Benchmark different operations
│   ├── MemoryManager.ts              # Memory optimization utilities
│   └── CacheManager.ts               # Cache frequently used computations
│
├── debug/
│   ├── BitboardVisualizer.ts         # Visualize bitboards
│   ├── MoveTracer.ts                 # Trace move generation/application
│   ├── StateInspector.ts             # Inspect game state details
│   ├── PerformanceMonitor.ts         # Monitor performance metrics
│   └── TestPositions.ts              # Standard test positions
│
└── api/
    ├── CoTuLenhEngine.ts             # Main engine API
    ├── GameInterface.ts              # Public game interface
    ├── MoveInterface.ts              # Move-related API
    ├── AnalysisInterface.ts          # Position analysis API
    └── ConfigurationInterface.ts     # Engine configuration API
```

---

## Key Architectural Components

### 1. Dual Bitboard System

```typescript
// src/core/game-state/PieceBitboards.ts
export class PieceBitboards {
  // Normal pieces
  private normalTanks: ColorBitboards
  private normalArtillery: ColorBitboards
  private normalNavy: ColorBitboards
  private normalAirForce: ColorBitboards
  private normalInfantry: ColorBitboards
  private normalMilitia: ColorBitboards
  private normalCommander: ColorBitboards
  private normalHeadquarter: ColorBitboards

  // Heroic pieces (separate bitboards!)
  private heroicTanks: ColorBitboards
  private heroicArtillery: ColorBitboards
  private heroicNavy: ColorBitboards
  private heroicAirForce: ColorBitboards
  private heroicInfantry: ColorBitboards
  private heroicMilitia: ColorBitboards
  private heroicCommander: ColorBitboards
  private heroicHeadquarter: ColorBitboards

  // Aggregates for fast queries
  private allNormalPieces: ColorBitboards
  private allHeroicPieces: ColorBitboards
  private allPieces: Bitboard
}
```

### 2. Pre-computed Table System

```typescript
// src/tables/TableManager.ts
export class TableManager {
  private rayTables: RayTables
  private magicTables: MagicTables
  private terrainTables: TerrainTables
  private lookupTables: LookupTables

  // Initialize all tables at startup
  async initialize(): Promise<void> {
    console.log('Generating ray tables...')
    this.rayTables = await RayTableGenerator.generateAll()

    console.log('Generating magic tables...')
    this.magicTables = await MagicTableGenerator.generateAll()

    console.log('Generating terrain tables...')
    this.terrainTables = await TerrainEncoder.generateAll()

    console.log('Generating lookup tables...')
    this.lookupTables = await LookupTableGenerator.generateAll()

    console.log('All tables initialized!')
  }
}
```

### 3. Magic Bitboard Integration

```typescript
// src/move-generation/generators/MoveGenerator.ts
export class MoveGenerator {
  constructor(
    private magicTables: MagicTables,
    private pieceBitboards: PieceBitboards,
    private terrainSystem: TerrainSystem,
  ) {}

  generateLegalMoves(): Move[] {
    const occupancy = this.pieceBitboards.getAllPieces()
    const friendlyPieces = this.pieceBitboards.getCurrentPlayerPieces()

    let moves: Move[] = []

    // Generate moves for normal pieces
    moves.push(...this.generateNormalPieceMoves(occupancy, friendlyPieces))

    // Generate moves for heroic pieces (different magic tables!)
    moves.push(...this.generateHeroicPieceMoves(occupancy, friendlyPieces))

    return this.filterLegalMoves(moves)
  }
}
```

### 4. Deploy Session Integration

```typescript
// src/deploy-sessions/DeploySession.ts
export class DeploySession {
  private originSquare: number
  private originalPieces: PieceSymbol[]
  private remainingPieces: PieceSymbol[]
  private deployedPieces: DeployedPiece[]

  // Deploy moves use same move generation, just from origin square
  generateDeployMoves(
    moveGenerator: MoveGenerator,
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
  ): Move[] {
    const moves: Move[] = []

    for (const pieceType of this.remainingPieces) {
      // Use normal move generation from origin square
      const pieceMoves = moveGenerator.generatePieceMovesFromSquare(
        pieceType,
        this.originSquare,
        occupancy,
        friendlyPieces,
      )

      // Convert to deploy moves
      moves.push(
        ...pieceMoves.map((m) => this.convertToDeployMove(m, pieceType)),
      )
    }

    return moves
  }
}
```

## Build and Initialization Process

### 1. Startup Sequence

```typescript
// src/CoTuLenhEngine.ts
export class CoTuLenhEngine {
  private tableManager: TableManager
  private gameState: GameState
  private moveGenerator: MoveGenerator

  async initialize(): Promise<void> {
    console.log('Initializing CoTuLenh Bitboard Engine...')

    // 1. Generate all pre-computed tables (takes ~1-2 seconds)
    this.tableManager = new TableManager()
    await this.tableManager.initialize()

    // 2. Initialize game state with dual bitboards
    this.gameState = new GameState(this.tableManager.getTables())

    // 3. Initialize move generator with magic tables
    this.moveGenerator = new MoveGenerator(
      this.tableManager.getMagicTables(),
      this.gameState.getPieceBitboards(),
      this.tableManager.getTerrainSystem(),
    )

    console.log('Engine ready!')
  }
}
```

### 2. Memory Layout

```typescript
// Estimated memory usage:
// - Ray tables: ~2MB (all directions, all ranges)
// - Magic tables: ~50MB (normal + heroic pieces)
// - Terrain tables: ~1MB (static terrain masks)
// - Lookup tables: ~5MB (attack patterns, etc.)
// - Game state: ~1KB (bitboards are very compact)
// Total: ~58MB (mostly pre-computed tables)
```

## Testing Structure

```
tests/
├── unit/
│   ├── bitboard/
│   │   ├── BitboardUtils.test.ts
│   │   ├── SquareConversion.test.ts
│   │   └── BitboardMath.test.ts
│   │
│   ├── tables/
│   │   ├── RayGeneration.test.ts
│   │   ├── MagicTables.test.ts
│   │   ├── TerrainEncoding.test.ts
│   │   └── LookupTables.test.ts
│   │
│   ├── move-generation/
│   │   ├── NormalPieces.test.ts
│   │   ├── HeroicPieces.test.ts
│   │   ├── DeployMoves.test.ts
│   │   └── AirDefense.test.ts
│   │
│   └── game-logic/
│       ├── HeroicPromotion.test.ts
│       ├── CommanderSafety.test.ts
│       ├── FlyingGeneral.test.ts
│       └── DeploySessions.test.ts
│
├── integration/
│   ├── CompleteGames.test.ts
│   ├── PerformanceBenchmarks.test.ts
│   ├── FENRoundTrip.test.ts
│   └── EngineAPI.test.ts
│
└── performance/
    ├── MoveGenerationSpeed.test.ts
    ├── MemoryUsage.test.ts
    ├── TableInitialization.test.ts
    └── BitboardOperations.test.ts
```

## Configuration and Build

### 1. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "ES2021.BigInt"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 2. Build Scripts

```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "benchmark": "node dist/performance/Benchmarks.js",
    "profile": "node --prof dist/performance/Profiler.js",
    "generate-tables": "node dist/tables/TableGenerator.js",
    "validate-tables": "node dist/tables/TableValidator.js"
  }
}
```

## Key Differences from Traditional Structure

### 1. **Table-Driven Architecture**

- Pre-computed tables are the foundation
- Magic bitboards eliminate runtime calculations
- Initialization takes longer but runtime is blazing fast

### 2. **Dual Normal/Heroic System**

- Separate bitboards for normal vs heroic pieces
- Different magic tables for different movement patterns
- No runtime heroic status checking

### 3. **Bitwise Operation Focus**

- All game logic uses bitwise operations
- Union/intersection operations everywhere
- Minimal branching and loops

### 4. **Performance-First Design**

- Memory usage higher (pre-computed tables)
- Runtime performance 10-100x faster
- Optimized for speed over memory

## Summary

The bitboard implementation requires a **completely different project
structure** that reflects the fundamental architectural changes:

✅ **Table-driven architecture** - Pre-computed tables are the foundation ✅
**Dual bitboard system** - Separate normal/heroic piece handling ✅ **Magic
bitboard integration** - Ultra-fast lookups throughout ✅ **Bitwise operation
focus** - All logic uses bitboard operations ✅ **Performance optimization** -
Structure optimized for maximum speed

This structure supports the **10-100x performance improvements** that bitboards
provide while maintaining clean, maintainable code! 🚀
