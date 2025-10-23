# Legal Move Validation: Chessops Analysis & CoTuLenh Strategy

## 🔍 Critical Discovery: How Chessops Validates Legal Moves

### The Revelation: NO Make/Undo Required!

**Question:** How does chessops know if a move is legal without playing it and
checking if the king is attacked?

**Answer:** They use **pre-computed context + bitboard filtering** instead of
make/undo!

---

## Chessops' Approach: Context-Based Filtering

### Step 1: Compute Context (Once Per Position)

```typescript
interface Context {
  king: Square | undefined;
  blockers: SquareSet;   // Pinned pieces
  checkers: SquareSet;   // Pieces attacking the king
  variantEnd: boolean;
  mustCapture: boolean;
}

ctx(): Context {
  const king = this.board.kingOf(this.turn);

  // Find "snipers" - enemy sliding pieces that could pin our pieces
  const snipers = rookAttacks(king, SquareSet.empty())
    .intersect(this.board.rooksAndQueens())
    .union(bishopAttacks(king, SquareSet.empty())
      .intersect(this.board.bishopsAndQueens()))
    .intersect(this.board[opposite(this.turn)]);

  // Find blockers (pinned pieces)
  let blockers = SquareSet.empty();
  for (const sniper of snipers) {
    const between = between(king, sniper).intersect(this.board.occupied);
    if (!between.moreThanOne()) {  // Exactly one piece between
      blockers = blockers.union(between);  // This piece is pinned!
    }
  }

  // Find pieces currently checking the king
  const checkers = this.kingAttackers(king, opposite(this.turn), this.board.occupied);

  return { king, blockers, checkers, variantEnd: false, mustCapture: false };
}
```

**Key Insight:** By finding **all pinned pieces** once, we can filter moves for
ALL pieces without simulation!

---

### Step 2: Filter Moves Using Context

```typescript
dests(square: Square, ctx?: Context): SquareSet {
  ctx = ctx || this.ctx();
  const piece = this.board.get(square);

  // Generate pseudo-legal moves (attacks)
  let pseudo = attacks(piece, square, this.board.occupied);
  pseudo = pseudo.diff(this.board[this.turn]);  // Remove friendly pieces

  if (!defined(ctx.king)) return pseudo;

  // === FILTERING LOGIC (NO MAKE/UNDO!) ===

  // A) If piece is pinned, it can ONLY move along the pin ray
  if (ctx.blockers.has(square)) {
    pseudo = pseudo.intersect(ray(square, ctx.king));
  }

  // B) If king is in check, must block or capture checker
  if (ctx.checkers.nonEmpty()) {
    const checker = ctx.checkers.singleSquare();
    if (!defined(checker)) return SquareSet.empty();  // Double check
    pseudo = pseudo.intersect(between(checker, ctx.king).with(checker));
  }

  return pseudo;
}
```

**No board mutation!** Just bitboard intersections.

---

### Step 3: King Moves (Special Case)

King moves require checking each destination:

```typescript
if (piece.role === 'king') {
  const occ = this.board.occupied.without(square) // Remove king

  for (const to of pseudo) {
    // Check if king would be attacked at destination
    if (this.kingAttackers(to, opposite(this.turn), occ).nonEmpty()) {
      pseudo = pseudo.without(to) // Remove illegal destination
    }
  }

  return pseudo
    .union(castlingDest(this, 'a', ctx))
    .union(castlingDest(this, 'h', ctx))
}
```

**Still no make/undo!** Just:

1. Compute hypothetical occupancy
2. Check if destination is attacked
3. Filter using bitboard operations

---

## Performance Comparison

### Traditional Make/Undo Approach (Current CoTuLenh):

```typescript
private _filterLegalMoves(moves, us) {
  for (const move of moves) {
    this._makeMove(move)      // Mutate: board, state, history
    if (!this._isCommanderAttacked(us)) {
      legalMoves.push(move)
    }
    this._undoMove()          // Restore everything
  }
}
```

**Cost:** ~50-100μs per move × 50 moves = **2.5-5ms per position**

### Chessops Context-Based Approach:

```typescript
// Compute context once
const ctx = this.ctx() // ~10-20μs

// Filter each piece
for (const square of ourPieces) {
  const dests = this.dests(square, ctx) // ~2-3μs per piece
}
```

**Cost:** ~20μs context + ~2μs × 16 pieces = **~50μs per position**

**Speedup: 50-100x faster!** 🚀

---

## 🎯 CoTuLenh's Challenge: Non-Blocking Attacks

### The Problem: Artillery & Air Force Break Standard Pin Logic

#### Example 1: Air Force Ignores Blocking

```
Position:
  e5: Red Commander
  e6: Red Infantry (appears to block)
  e8: Blue Air Force

Chessops logic:
  - Infantry is between Commander and Air Force
  - Infantry is "pinned" (can only move on ray)

CoTuLenh reality:
  - Air Force IGNORES Infantry!
  - Infantry is NOT pinned by Air Force
  - Infantry CAN move anywhere (if no other threats)
```

#### Example 2: Artillery Stay-Capture

```
Position:
  e5: Red Artillery (on land)
  f7: Blue Navy (on water)

Standard chess:
  - Artillery attacks all squares in range
  - Artillery moves to any square in range

CoTuLenh reality:
  - Artillery attacks f7 (within range 3)
  - Artillery CANNOT move to f7 (water terrain)
  - Result: Stay-capture move (attack without moving)
```

---

## CoTuLenh-Specific Context Requirements

### Enhanced Context Structure:

```typescript
interface CoTuLenhContext {
  commander: Square

  // Standard pins (Tank, Artillery, Navy, Missile with blocking)
  standardBlockers: SquareSet

  // Air Force threats (ignore ALL blocking)
  airForceThreats: {
    squares: SquareSet // All squares Air Force can attack
    sources: Map<Square, Square> // destination -> Air Force source
  }

  // Current checkers
  checkers: SquareSet
  checkSources: {
    standard: SquareSet // Checkers that can be blocked
    airForce: SquareSet // Checkers that CANNOT be blocked
  }

  // Air defense zones (CoTuLenh-specific)
  airDefenseZones: SquareSet

  // Flying general check
  exposedByFlying: boolean
}
```

---

## Implementation Strategy for CoTuLenh

### Phase 1: Compute Enhanced Context

```typescript
computeContext(): CoTuLenhContext {
  const commander = this.getCommanderSquare(this.turn);

  // 1. Find standard pins (pieces that respect blocking)
  const standardBlockers = this.computeStandardPins(commander);

  // 2. Find Air Force threats (ignore blocking)
  const airForceThreats = this.computeAirForceThreats(commander);

  // 3. Find current checkers
  const standardCheckers = this.computeStandardCheckers(commander);
  const airForceCheckers = this.computeAirForceCheckers(commander);

  // 4. Compute air defense zones
  const airDefenseZones = this.computeAirDefenseZones(this.oppositeColor);

  // 5. Check flying general
  const exposedByFlying = this.checkFlyingGeneral(commander);

  return {
    commander,
    standardBlockers,
    airForceThreats,
    checkers: standardCheckers.union(airForceCheckers),
    checkSources: { standard: standardCheckers, airForce: airForceCheckers },
    airDefenseZones,
    exposedByFlying
  };
}
```

---

### Phase 2: Context Computation Details

#### A) Standard Pin Detection (Same as Chessops)

```typescript
computeStandardPins(commander: Square): SquareSet {
  let blockers = SquareSet.empty();

  // Get enemy sliding pieces (Tank, Artillery, Navy, Missile)
  const standardSnipers = this.getTanks(enemyColor)
    .union(this.getArtillery(enemyColor))
    .union(this.getNavy(enemyColor))
    .union(this.getMissiles(enemyColor));

  for (const sniper of standardSnipers) {
    // Check if there's exactly one piece between sniper and commander
    const betweenSquares = between(sniper, commander);
    const blockingPieces = betweenSquares.intersect(this.occupied);

    if (blockingPieces.size() === 1) {
      // This piece is pinned by this sniper
      blockers = blockers.union(blockingPieces);
    }
  }

  return blockers;
}
```

#### B) Air Force Threat Detection (CoTuLenh-Specific)

```typescript
computeAirForceThreats(commander: Square): AirForceThreats {
  const enemyAirForces = this.getAirForce(enemyColor);
  let threatenedSquares = SquareSet.empty();
  const sources = new Map<Square, Square>();

  for (const airForce of enemyAirForces) {
    // Air Force ignores blocking - just check range and direction
    const airForceRay = this.getAirForceRay(airForce, commander);

    if (airForceRay.has(commander)) {
      // Commander is threatened by this Air Force
      threatenedSquares = threatenedSquares.union(airForceRay);
      sources.set(commander, airForce);
    }
  }

  return { squares: threatenedSquares, sources };
}
```

#### C) Terrain-Aware Attack vs Movement

```typescript
// Artillery example: Can attack anywhere, but can only move on land
getAttackSquares(piece: Piece, square: Square): SquareSet {
  // Get all squares piece can attack (based on range)
  return this.getRangeAttacks(piece.type, square, piece.isHeroic);
}

getMovementSquares(piece: Piece, square: Square): SquareSet {
  // Get all squares piece can move to (attack squares + terrain filter)
  const attacks = this.getAttackSquares(piece, square);
  const terrainMask = this.getTerrainMask(piece.type);
  return attacks.intersect(terrainMask);
}

getStayCaptureSquares(piece: Piece, square: Square): SquareSet {
  // Squares piece can attack but not move to
  const attacks = this.getAttackSquares(piece, square);
  const moves = this.getMovementSquares(piece, square);
  return attacks.diff(moves).intersect(this.enemyPieces);
}
```

---

### Phase 3: Move Generation with Context

```typescript
generateLegalMoves(square: Square, ctx: CoTuLenhContext): Move[] {
  const piece = this.getPieceAt(square);
  const moves: Move[] = [];

  // === Commander moves (always need special handling) ===
  if (piece.type === COMMANDER) {
    return this.generateCommanderMoves(square, ctx);
  }

  // === Air Force (special: air defense zones) ===
  if (piece.type === AIR_FORCE) {
    const attacks = this.getAirForceAttacks(square);  // Ignores blocking!

    const safeSquares = attacks.diff(ctx.airDefenseZones);
    const kamikazeSquares = attacks
      .intersect(ctx.airDefenseZones)
      .intersect(this.enemyPieces);

    moves.push(...this.convertToMoves(square, safeSquares));
    moves.push(...this.convertToKamikazeMoves(square, kamikazeSquares));
    return moves;
  }

  // === Standard pieces with context filtering ===

  // Get basic movement squares
  let destinations = this.getMovementSquares(piece, square);

  // Filter by standard pins
  if (ctx.standardBlockers.has(square)) {
    const pinRay = ray(square, ctx.commander);
    destinations = destinations.intersect(pinRay);
  }

  // Filter by check (must block or capture)
  if (ctx.checkers.nonEmpty()) {
    if (ctx.checkSources.airForce.nonEmpty()) {
      // Air Force check cannot be blocked - must capture Air Force
      destinations = destinations.intersect(ctx.checkSources.airForce);
    } else {
      // Standard check - can block or capture
      const blockSquares = this.getBlockSquares(ctx);
      destinations = destinations.intersect(blockSquares);
    }
  }

  // Add stay-capture moves (Artillery/Navy)
  if (piece.type === ARTILLERY || piece.type === NAVY) {
    const stayCaptureSquares = this.getStayCaptureSquares(piece, square);
    moves.push(...this.convertToStayCaptures(square, stayCaptureSquares));
  }

  moves.push(...this.convertToMoves(square, destinations));
  return moves;
}
```

---

## When Simulation is STILL Required

### Cases That Need Make/Undo:

#### 1. **Air Force Exposure Validation**

```typescript
// Example: Moving a piece might expose commander to Air Force
Position:
  e5: Red Commander
  e6: Red Infantry
  f8: Blue Air Force

Question: Can Infantry move from e6 to d6?

Problem:
  - Infantry is NOT pinned by standard pieces
  - But moving Infantry might expose Commander to Air Force
  - Air Force threat calculation is complex (ignores all blocking)

Solution: MUST simulate the move
```

```typescript
function isMoveLegalWithAirForce(move: Move, ctx: Context): boolean {
  // Quick check: If no Air Force threats nearby, use fast path
  if (!ctx.airForceThreats.squares.has(ctx.commander)) {
    return quickValidation(move, ctx)
  }

  // Slow path: Simulate move
  const snapshot = this.clonePosition()
  snapshot.applyMove(move)

  // Check if commander is now exposed to Air Force
  return !snapshot.isCommanderAttackedByAirForce()
}
```

---

#### 2. **Complex Multi-Threat Scenarios**

```typescript
Position:
  e5: Red Commander
  e6: Red Tank
  e8: Blue Artillery
  f6: Blue Air Force
  d4: Blue Infantry

If Tank moves from e6:
  - Exposed to Artillery? (standard check)
  - Exposed to Air Force? (ignores blocking)
  - Can Infantry now attack? (standard check)

This requires checking MULTIPLE threat types after the move.
```

---

#### 3. **Deploy Moves (Multi-Step Sequences)**

```typescript
// Deploy moves have complex state transitions
function validateDeployMove(deployMove: DeployMove): boolean {
  // Cannot use static context - state changes between steps

  const session = this.startDeploySession(deployMove.stackSquare)

  for (const step of deployMove.steps) {
    const snapshot = session.cloneState()
    snapshot.applyDeployStep(step)

    if (snapshot.isCommanderAttacked()) {
      return false // Illegal deploy sequence
    }

    session.advanceToNextStep(step)
  }

  return true
}
```

---

## Hybrid Strategy: Best of Both Worlds

### Decision Tree:

```typescript
function validateMove(move: Move, ctx: CoTuLenhContext): boolean {
  // Fast path: ~80% of moves
  if (canUseFastValidation(move, ctx)) {
    return fastBitboardValidation(move, ctx)
  }

  // Slow path: ~20% of moves
  return simulateAndValidate(move, ctx)
}

function canUseFastValidation(move: Move, ctx: Context): boolean {
  return (
    // Not a commander move
    !move.piece.isCommander &&
    // No Air Force threats in vicinity
    !ctx.airForceThreats.squares.intersects(
      getNearbySquares(move.from, move.to),
    ) &&
    // Not a stay-capture (already handled separately)
    !move.isStayCapture &&
    // Not a deploy move
    !move.isDeploy &&
    // At most one checker (not double check)
    ctx.checkers.size() <= 1 &&
    // No flying general complications
    !ctx.exposedByFlying
  )
}
```

---

## Performance Expectations

### Fast Path (Bitboard Filtering):

- **Cost:** ~2-3μs per move
- **Coverage:** ~80% of moves
- **Speedup vs current:** ~30-50x faster

### Slow Path (Simulation):

- **Cost:** ~50-100μs per move
- **Coverage:** ~20% of moves
- **Speedup vs current:** Same (no improvement)

### Overall Improvement:

```
Average cost = 0.8 × 3μs + 0.2 × 75μs = 17.4μs per move

Current cost = 75μs per move

Speedup = 75 / 17.4 ≈ 4.3x faster
```

**Expected overall speedup: 4-5x for legal move generation** 🎯

---

## Implementation Phases

### Phase 1: Context Computation ✅

- Implement standard pin detection
- Implement Air Force threat detection
- Implement air defense zone calculation
- Add terrain masks

### Phase 2: Fast Path Validation ✅

- Implement bitboard filtering for standard pieces
- Add stay-capture detection
- Add Air Force special handling
- Filter by context (pins, checks)

### Phase 3: Hybrid Validation 🔄

- Implement decision tree (fast vs slow path)
- Keep simulation for complex cases
- Optimize fast path coverage

### Phase 4: Optimization 🚀

- Cache context between move generations
- Pre-compute terrain masks
- Optimize ray calculations
- Profile and tune thresholds

---

## Key Learnings from Chessops

### What Works for CoTuLenh:

✅ Context-based pin detection (standard pieces)  
✅ Bitboard filtering for terrain  
✅ Pre-computed attack tables  
✅ Immutable position snapshots  
✅ No Zobrist hashing needed (initially)  
✅ Hyperbola Quintessence over Magic Bitboards

### What Needs Adaptation:

⚠️ Air Force ignores blocking → special threat detection  
⚠️ Stay-captures → separate attack/movement ranges  
⚠️ Air defense zones → additional filtering layer  
⚠️ Deploy moves → still need simulation  
⚠️ Commander moves → always need careful validation

### What We Can't Avoid:

❌ Simulation for Air Force exposure checks  
❌ Simulation for complex multi-threat scenarios  
❌ Simulation for deploy move validation  
❌ Simulation for commander move validation

---

## Conclusion

**The Big Win:** By adopting chessops' context-based approach, we can validate
**80% of moves** using pure bitboard operations, achieving **30-50x speedup**
for those moves.

**The Reality:** CoTuLenh's unique mechanics (non-blocking Air Force,
stay-captures, deploy moves) mean we still need simulation for **20% of moves**.

**Overall Result:** Expected **4-5x improvement** in legal move validation
performance - not as dramatic as standard chess, but still substantial!

**Memory:** By switching to snapshot-based undo (like chessops) instead of
command pattern, we simplify the architecture while maintaining acceptable
memory usage (~400 bytes per position × 100 moves = ~40KB).

---

**Next Steps:**

1. Implement basic context computation
2. Add fast path validation for standard pieces
3. Benchmark against current system
4. Iteratively optimize fast path coverage
5. Profile to identify remaining bottlenecks

The combination of chessops' proven techniques + CoTuLenh-specific adaptations
gives us a clear path to significant performance improvements! 🚀
