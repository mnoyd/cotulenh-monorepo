# CoTuLenh Troubleshooting Guide

## Common Issues and Solutions

### Critical Known Issues

#### 1. Navy Placement on Land (CRITICAL BUG)

**Symptoms:**

- Navy pieces appear on land squares in FEN
- Navy pieces can be deployed to land terrain
- Game state becomes invalid

**Root Cause:**

- Deploy system doesn't validate terrain restrictions for Navy pieces
- Terrain validation bypassed during stack deployment

**Immediate Workaround:**

```typescript
// Validate Navy placement before applying moves
function validateNavyPlacement(game, move) {
  if (move.piece === 'n' || (move.pieces && move.pieces.includes('n'))) {
    const targetSquare = move.to
    if (!game.isWaterZone(targetSquare)) {
      throw new Error('Navy pieces can only be placed in water zones')
    }
  }
  return true
}

// Use before applying moves
try {
  validateNavyPlacement(game, move)
  game.move(move)
} catch (error) {
  console.error('Navy placement error:', error.message)
}
```

**Long-term Fix:**

- Implement terrain validation in deploy system
- Add comprehensive terrain checking for all piece types
- Update FEN loading to reject invalid Navy positions

#### 2. Recombine Move Generation Incomplete

**Symptoms:**

- Recombine moves not generated in move list
- Cannot merge adjacent stacks
- Missing tactical options

**Root Cause:**

- Recombine move generation not fully implemented
- Edge cases in stack merging logic not handled

**Workaround:**

```typescript
// Manual recombine move creation
function createRecombineMove(from, to) {
  return {
    type: 'recombine',
    from: from,
    to: to,
    san: `${from}+${to}`, // + indicates recombine
  }
}

// Check if recombine is valid
function canRecombine(game, from, to) {
  const fromStack = game.get(from)
  const toStack = game.get(to)

  if (!fromStack || !toStack) return false
  if (fromStack.color !== toStack.color) return false

  // Check carrying capacity
  const totalPieces = fromStack.pieces.length + toStack.pieces.length
  return totalPieces <= getMaxStackSize(fromStack, toStack)
}
```

#### 3. Commander Validation TODOs

**Symptoms:**

- Incomplete commander exposure detection
- Missing edge cases in flying general rule
- Inconsistent commander protection

**Root Cause:**

- TODO items in commander validation code
- Edge cases not fully implemented

**Workaround:**

```typescript
// Enhanced commander exposure check
function isCommanderExposed(game) {
  const commanders = game.getCommanders()
  const whiteCommander = commanders.white
  const blackCommander = commanders.black

  if (!whiteCommander || !blackCommander) return false

  // Check same rank
  if (whiteCommander.rank === blackCommander.rank) {
    return !hasInterveningPieces(game, whiteCommander, blackCommander, 'rank')
  }

  // Check same file
  if (whiteCommander.file === blackCommander.file) {
    return !hasInterveningPieces(game, whiteCommander, blackCommander, 'file')
  }

  return false
}
```

### Move Validation Issues

#### Invalid Move Rejection

**Symptoms:**

- Legal moves rejected as invalid
- Inconsistent move validation results
- Moves work in some positions but not others

**Diagnosis Steps:**

```typescript
// Step 1: Check move format
const isValidFormat = game.isValidMoveFormat(moveString)
console.log('Valid format:', isValidFormat)

// Step 2: Get detailed validation
const validation = game.validateMove(moveString)
console.log('Validation result:', validation)

// Step 3: Check specific constraints
const constraints = game.getMoveConstraints(moveString)
console.log('Move constraints:', constraints)

// Step 4: Test in isolation
const testResult = game.testMove(moveString)
console.log('Test result:', testResult)
```

**Common Solutions:**

1. **Terrain Restrictions**: Check if piece can move to target terrain
2. **Stack Rules**: Verify carrying capacity and combination rules
3. **Air Defense**: Check if air force movement is restricted
4. **Commander Exposure**: Ensure move doesn't expose commander

#### Deploy Move Problems

**Symptoms:**

- Deploy moves not working
- Stack splitting fails
- Invalid deploy notation

**Debugging Process:**

```typescript
// Check deploy move requirements
function debugDeployMove(game, move) {
  console.log('Deploy move debug:')

  // 1. Source square validation
  const sourceStack = game.get(move.from)
  console.log('Source stack:', sourceStack)

  if (!sourceStack || sourceStack.pieces.length < 2) {
    console.log('ERROR: Source must contain stack with 2+ pieces')
    return false
  }

  // 2. Target square validation
  const targetSquare = game.get(move.to)
  console.log('Target square:', targetSquare)

  if (targetSquare && targetSquare.color !== sourceStack.color) {
    console.log('ERROR: Target square contains enemy pieces')
    return false
  }

  // 3. Adjacency check
  const isAdjacent = game.areAdjacent(move.from, move.to)
  console.log('Squares adjacent:', isAdjacent)

  if (!isAdjacent) {
    console.log('ERROR: Deploy target must be adjacent')
    return false
  }

  // 4. Piece selection validation
  if (!move.pieces || move.pieces.length === 0) {
    console.log('ERROR: Must specify pieces to deploy')
    return false
  }

  console.log('Deploy move appears valid')
  return true
}
```

### Performance Issues

#### Verbose Mode Performance

**Symptoms:**

- Slow move generation
- High memory usage
- UI freezing during analysis

**Root Cause:**

- Verbose mode creates detailed move objects
- Excessive logging and validation
- Memory not released properly

**Solutions:**

```typescript
// Disable verbose mode for production
game.setVerbose(false)

// Use selective verbose mode
const moves = game.moves({ verbose: false })
const detailedMove = game.moves({ verbose: true, square: 'e4' })

// Clear history periodically
if (game.history().length > 100) {
  game.clearHistory()
}

// Monitor memory usage
const memoryBefore = process.memoryUsage().heapUsed
game.moves()
const memoryAfter = process.memoryUsage().heapUsed
console.log('Memory delta:', memoryAfter - memoryBefore)
```

#### Move Generation Bottlenecks

**Symptoms:**

- Slow response times
- CPU usage spikes
- Timeout errors

**Optimization Strategies:**

```typescript
// 1. Use move filtering
const knightMoves = game.moves({ piece: 'n' }) // Only knight moves
const capturesOnly = game.moves({ capturesOnly: true }) // Only captures

// 2. Cache results for repeated positions
const positionHash = game.getPositionHash()
if (moveCache.has(positionHash)) {
  return moveCache.get(positionHash)
}

// 3. Limit search depth
const moves = game.moves({ maxDepth: 3 })

// 4. Use incremental updates
game.enableIncrementalUpdates(true)
```

### Stack System Issues

#### Invalid Stack Combinations

**Symptoms:**

- Cannot combine certain pieces
- Stack size limits exceeded
- Carrying capacity errors

**Debugging:**

```typescript
function debugStackCombination(game, pieces) {
  console.log('Stack combination debug:')

  // Check individual piece compatibility
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const compatible = game.areCompatible(pieces[i], pieces[j])
      console.log(`${pieces[i]} + ${pieces[j]}: ${compatible}`)
    }
  }

  // Check total carrying capacity
  const maxSize = game.getMaxStackSize(pieces)
  console.log(`Max stack size: ${maxSize}, Requested: ${pieces.length}`)

  // Check specific restrictions
  const restrictions = game.getStackRestrictions(pieces)
  console.log('Stack restrictions:', restrictions)
}
```

#### Stack Notation Parsing

**Symptoms:**

- FEN with stacks not loading
- Invalid stack notation errors
- Parsing failures

**Solutions:**

```typescript
// Validate stack notation before parsing
function validateStackNotation(notation) {
  const stackPattern = /\([A-Z+]+\)/g
  const matches = notation.match(stackPattern)

  if (matches) {
    for (const match of matches) {
      const pieces = match.slice(1, -1) // Remove parentheses
      if (!isValidPieceCombination(pieces)) {
        throw new Error(`Invalid stack combination: ${match}`)
      }
    }
  }

  return true
}

// Enhanced FEN loading with validation
function loadFENSafely(game, fen) {
  try {
    validateStackNotation(fen)
    return game.load(fen)
  } catch (error) {
    console.error('FEN loading error:', error.message)
    return false
  }
}
```

### Air Defense System Issues

#### Air Defense Zone Calculations

**Symptoms:**

- Incorrect air defense zones
- Air force movement not properly restricted
- Zone overlap calculations wrong

**Debugging:**

```typescript
function debugAirDefenseZones(game) {
  const antiAirPieces = game.getPieces('aa')

  antiAirPieces.forEach((piece) => {
    console.log(`Anti-Air at ${piece.square}:`)

    const zone = game.getAirDefenseZone(piece.square)
    console.log('Zone squares:', zone)

    const level = game.getAirDefenseLevel(piece.square)
    console.log('Defense level:', level)

    // Check each square in zone
    zone.forEach((square) => {
      const restrictions = game.getAirForceRestrictions(square)
      console.log(`${square}: ${restrictions}`)
    })
  })
}
```

#### Kamikaze Attack Issues

**Symptoms:**

- Suicide attacks not working
- Both pieces not destroyed
- Invalid kamikaze conditions

**Solutions:**

```typescript
function validateKamikazeAttack(game, move) {
  // Must be air force piece
  if (move.piece !== 'f') {
    throw new Error('Only Air Force can perform kamikaze attacks')
  }

  // Target must be in air defense zone
  const inDefenseZone = game.isInAirDefenseZone(move.to)
  if (!inDefenseZone) {
    throw new Error('Kamikaze attacks only valid in air defense zones')
  }

  // Must have enemy piece at target
  const target = game.get(move.to)
  if (!target || target.color === move.color) {
    throw new Error('Kamikaze requires enemy target')
  }

  return true
}
```

### Terrain System Issues

#### Heavy Piece River Crossing

**Symptoms:**

- Heavy pieces cannot cross rivers
- Bridge squares not recognized
- Invalid terrain validation

**Debugging:**

```typescript
function debugHeavyPieceCrossing(game, from, to) {
  const piece = game.get(from)

  console.log('Heavy piece crossing debug:')
  console.log('Piece:', piece)
  console.log('Is heavy piece:', game.isHeavyPiece(piece.type))

  const fromTerrain = game.getTerrainType(from)
  const toTerrain = game.getTerrainType(to)
  console.log(`Terrain: ${from}(${fromTerrain}) -> ${to}(${toTerrain})`)

  const isBridge = game.isBridgeSquare(to)
  console.log('Target is bridge:', isBridge)

  const canCross = game.canHeavyPieceCross(from, to)
  console.log('Can cross:', canCross)

  if (!canCross) {
    const bridges = game.getNearbyBridges(from)
    console.log('Nearby bridges:', bridges)
  }
}
```

### Integration Issues

#### Web Application Integration

**Symptoms:**

- Game state not updating in UI
- Move events not firing
- Performance issues in browser

**Solutions:**

```typescript
// React integration pattern
function useCoTuLenh() {
    const [game] = useState(() => new CoTuLenh());
    const [position, setPosition] = useState(game.fen());
    const [moves, setMoves] = useState(game.moves());

    const makeMove = useCallback((move) => {
        const result = game.move(move);
        if (result) {
            setPosition(game.fen());
            setMoves(game.moves());
        }
        return result;
    }, [game]);

    return { game, position, moves, makeMove };
}

// Error boundary for game errors
class GameErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return <div>Game Error: {this.state.error.message}</div>;
        }
        return this.props.children;
    }
}
```

#### Server-Side Integration

**Symptoms:**

- Memory leaks in server
- Game state corruption
- Concurrent access issues

**Solutions:**

```typescript
// Game instance management
class GameManager {
  constructor() {
    this.games = new Map()
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  createGame(gameId) {
    const game = new CoTuLenh()
    this.games.set(gameId, {
      game,
      lastAccess: Date.now(),
      moveCount: 0,
    })
    return game
  }

  cleanup() {
    const now = Date.now()
    const timeout = 30 * 60 * 1000 // 30 minutes

    for (const [gameId, gameData] of this.games) {
      if (now - gameData.lastAccess > timeout) {
        this.games.delete(gameId)
      }
    }
  }
}

// Thread-safe move handling
const gameLocks = new Map()

async function makeMove(gameId, move) {
  // Acquire lock
  if (gameLocks.has(gameId)) {
    throw new Error('Game is busy')
  }

  gameLocks.set(gameId, true)

  try {
    const game = gameManager.getGame(gameId)
    const result = game.move(move)

    if (result) {
      // Update database
      await saveGameState(gameId, game.fen())
    }

    return result
  } finally {
    gameLocks.delete(gameId)
  }
}
```

### Testing and Validation Issues

#### Test Failures

**Symptoms:**

- Unit tests failing unexpectedly
- Integration tests timing out
- Inconsistent test results

**Debugging Process:**

```typescript
// Test isolation
describe('CoTuLenh Tests', () => {
  let game

  beforeEach(() => {
    game = new CoTuLenh()
    game.setDebug(false) // Disable debug for tests
    game.setVerbose(false) // Disable verbose for performance
  })

  afterEach(() => {
    game.clearHistory() // Clean up memory
  })

  it('should handle edge case', () => {
    // Specific test setup
    const fen = 'test-position-fen'
    game.load(fen)

    // Validate initial state
    expect(game.isValidPosition()).toBe(true)

    // Test specific scenario
    const move = 'test-move'
    const result = game.move(move)

    // Validate result
    expect(result).toBeTruthy()
    expect(game.isValidPosition()).toBe(true)
  })
})
```

### Emergency Recovery Procedures

#### Game State Corruption

**Symptoms:**

- Invalid position errors
- Inconsistent game state
- Crashes during move generation

**Recovery Steps:**

```typescript
function recoverGameState(game) {
  console.log('Attempting game state recovery...')

  // 1. Validate current position
  if (!game.isValidPosition()) {
    console.log('Position invalid, attempting repair...')

    // 2. Try to repair position
    const repaired = game.repairPosition()
    if (repaired) {
      console.log('Position repaired successfully')
      return true
    }

    // 3. Fallback to last valid state
    const history = game.history({ verbose: true })
    for (let i = history.length - 1; i >= 0; i--) {
      game.undo()
      if (game.isValidPosition()) {
        console.log(`Recovered to move ${i}`)
        return true
      }
    }

    // 4. Reset to starting position
    game.reset()
    console.log('Reset to starting position')
    return true
  }

  return false
}
```

#### Performance Emergency

**Symptoms:**

- Application freezing
- Memory exhaustion
- Timeout errors

**Emergency Actions:**

```typescript
function emergencyPerformanceRecovery(game) {
  console.log('Emergency performance recovery...')

  // 1. Disable expensive features
  game.setVerbose(false)
  game.setDebug(false)
  game.disableCaching()

  // 2. Clear memory
  game.clearHistory()
  game.clearCache()

  // 3. Force garbage collection (Node.js)
  if (global.gc) {
    global.gc()
  }

  // 4. Reduce move generation scope
  game.setMoveGenerationLimit(100)

  console.log('Emergency recovery complete')
}
```

### Getting Help

#### Debug Information Collection

```typescript
function collectDebugInfo(game) {
  return {
    version: game.getVersion(),
    position: game.fen(),
    history: game.history(),
    moveCount: game.getMoveCount(),
    memoryUsage: process.memoryUsage(),
    performance: game.getPerformanceStats(),
    validation: game.validateInternalState(),
    errors: game.getErrors(),
  }
}
```

#### Reporting Issues

When reporting issues, include:

1. **Current FEN position**
2. **Move that caused the problem**
3. **Expected vs actual behavior**
4. **Debug information from collectDebugInfo()**
5. **Steps to reproduce**
6. **Environment details (Node.js version, browser, etc.)**

### References

- **API Documentation**: See API-GUIDE.md for interface details
- **Implementation Guide**: See IMPLEMENTATION-GUIDE.md for technical details
- **Testing Guide**: See TESTING-GUIDE.md for validation strategies
- **Examples**: See EXAMPLES.md for code samples
