# CoTuLenh Quick Reference

## Quick Reference Cards for Piece Movements and Special Rules

### Piece Movement Quick Reference

#### Basic Pieces

| Piece         | Symbol | Movement     | Range    | Special Rules                            |
| ------------- | ------ | ------------ | -------- | ---------------------------------------- |
| **Commander** | C      | 8 directions | 1 square | Cannot be stay-captured, triggers heroic |
| **Infantry**  | I      | Orthogonal   | 1 square | Basic combat unit, stackable             |
| **Militia**   | ML     | Orthogonal   | 1 square | Defensive bonuses                        |
| **Engineer**  | E      | Orthogonal   | 1 square | Can modify terrain                       |

#### Heavy Pieces (Require bridges for river crossing)

| Piece         | Symbol | Movement   | Range    | Special Rules                  |
| ------------- | ------ | ---------- | -------- | ------------------------------ |
| **Tank**      | T      | Orthogonal | Multiple | Can shoot over blocking pieces |
| **Artillery** | A      | Orthogonal | Multiple | Long-range attacks             |
| **Missile**   | M      | Diagonal   | Limited  | Unique diagonal movement       |

#### Special Movement Pieces

| Piece         | Symbol | Movement      | Range    | Special Rules                              |
| ------------- | ------ | ------------- | -------- | ------------------------------------------ |
| **Navy**      | N      | Any direction | Multiple | Water zones only                           |
| **Air Force** | F      | Any direction | Multiple | Ignores terrain, restricted by air defense |
| **Anti-Air**  | AA     | Orthogonal    | 1 square | Creates air defense zones                  |

#### Fixed Pieces

| Piece            | Symbol | Movement | Range | Special Rules                          |
| ---------------- | ------ | -------- | ----- | -------------------------------------- |
| **Headquarters** | HQ     | None     | 0     | Victory condition, defensive structure |

### Heroic Enhancement Quick Reference

| Piece            | Normal Ability         | Heroic Enhancement              |
| ---------------- | ---------------------- | ------------------------------- |
| **Commander**    | 1 square, 8 directions | Extended movement range         |
| **Infantry**     | Orthogonal only        | Gains diagonal movement         |
| **Tank**         | Shoot over pieces      | Enhanced range and power        |
| **Artillery**    | Long-range orthogonal  | Increased range and area damage |
| **Navy**         | Water movement         | Enhanced movement and attack    |
| **Air Force**    | Terrain-free movement  | Reduced air defense effects     |
| **Missile**      | Diagonal movement      | Extended range, multi-target    |
| **Engineer**     | Basic construction     | Enhanced terrain abilities      |
| **Anti-Air**     | Standard air defense   | Larger, more effective zones    |
| **Militia**      | Basic defense          | Enhanced defensive capabilities |
| **Headquarters** | Static defense         | Enhanced support abilities      |

### Terrain System Quick Reference

#### Terrain Types

| Zone Type           | Valid Pieces        | Movement Rules                |
| ------------------- | ------------------- | ----------------------------- |
| **Water**           | Navy only           | Full movement for Navy        |
| **Land**            | All except Navy     | Standard movement rules       |
| **Mixed (Bridges)** | All including Heavy | Heavy pieces can cross rivers |

#### Heavy Piece River Crossing

```
HEAVY_PIECES = [Tank, Artillery, Missile]

River Crossing Rules:
- Heavy pieces CANNOT cross rivers normally
- Heavy pieces CAN cross at bridge squares (mixed terrain)
- Bridge squares are marked in terrain system
- Other pieces cross rivers freely
```

### Stack System Quick Reference

#### Carrying Capacity Rules

| Carrier Piece | Can Carry           | Max Stack Size |
| ------------- | ------------------- | -------------- |
| **Tank**      | Infantry, Militia   | 3 total pieces |
| **Artillery** | Infantry, Engineer  | 3 total pieces |
| **Navy**      | Air Force, Infantry | 4 total pieces |
| **Air Force** | Infantry only       | 2 total pieces |
| **Commander** | Any 1 piece         | 2 total pieces |

#### Stack Notation

```
FEN Stack Notation:
(NFT) = Navy + Air Force + Tank stack
(I+ML) = Infantry + heroic Militia stack
C+(I) = heroic Commander carrying Infantry

SAN Deploy Notation:
Ra8-a7(NF) = Deploy Navy+Air Force from a8 to a7
Ta1-b1(I) = Deploy Infantry from Tank stack
```

### Capture Types Quick Reference

#### Normal Capture

- **Notation**: `Nf3xe5`
- **Effect**: Move to target square, remove enemy piece
- **Usage**: Standard combat

#### Stay Capture

- **Notation**: `Nf3*e5`
- **Effect**: Attack without moving, both pieces remain
- **Restriction**: Cannot stay-capture Commanders

#### Suicide Capture (Kamikaze)

- **Notation**: `Ff3xe5!`
- **Effect**: Both attacking and defending pieces destroyed
- **Usage**: Air Force vs air defense, desperate attacks

### Air Defense System Quick Reference

#### Air Defense Zones

```
Anti-Air Piece Creates:
- Circular zone around AA piece
- Radius varies by piece type and heroic status
- Multiple zones can overlap
- Higher defense level = more restrictions

Air Force Movement:
- Can move anywhere normally
- Restricted movement in air defense zones
- Can perform kamikaze attacks in zones
- Heroic Air Force has reduced restrictions
```

#### Defense Level Effects

| Defense Level | Air Force Effect         |
| ------------- | ------------------------ |
| **0**         | Free movement            |
| **1**         | Reduced movement options |
| **2**         | Severely restricted      |
| **3+**        | Kamikaze attacks only    |

### Special Rules Quick Reference

#### Commander Exposure (Flying General)

```
Rule: Commanders cannot face each other on same rank/file
      without intervening pieces

Check: Before each move, verify commanders not exposed
Effect: Move is illegal if it creates exposure
```

#### Heroic Promotion Trigger

```
Trigger: Any piece attacks enemy Commander
Effect: Attacking piece becomes heroic (gains + marker)
Persistence: Heroic status maintained through stacks/deploys
```

#### Deploy Move Rules

```
Requirements:
- Source square must contain stack (2+ pieces)
- Target square must be adjacent to source
- Target square must be empty or contain friendly stack

Effect:
- Split stack between source and target squares
- Player chooses which pieces move
- Remaining pieces stay at source
```

### Common Move Patterns

#### Opening Principles

1. Deploy stacks early for flexibility
2. Control water zones with Navy
3. Establish air defense networks
4. Protect Commander from exposure

#### Tactical Patterns

1. **Stack Splitting**: Deploy for positional advantage
2. **Heroic Triggers**: Attack enemy Commander for enhancements
3. **Air Defense Setup**: Create overlapping zones
4. **Heavy Piece Positioning**: Control bridge squares

#### Endgame Principles

1. Commander safety paramount
2. Use heroic pieces effectively
3. Control key terrain features
4. Coordinate stack movements

### Error Prevention Checklist

#### Before Each Move

- [ ] Check Commander exposure
- [ ] Verify terrain restrictions
- [ ] Confirm air defense zone effects
- [ ] Validate stack combination rules
- [ ] Check capture type appropriateness

#### Common Mistakes

1. **Navy on Land**: Navy cannot move to land squares
2. **Heavy River Crossing**: Must use bridge squares
3. **Commander Stay Capture**: Not allowed
4. **Air Defense Violations**: Check zone restrictions
5. **Invalid Stack Combinations**: Verify carrying capacity

### Debugging Quick Checks

#### Position Validation

```typescript
// Check position validity
game.isValidPosition()

// Get validation errors
game.getPositionErrors()

// Verify FEN format
game.isValidFEN(fenString)
```

#### Move Validation

```typescript
// Check move legality
game.isLegal(moveString)

// Get detailed validation
game.validateMove(moveString)

// Test move without applying
game.testMove(moveString)
```

### Performance Tips

#### Optimization Guidelines

1. **Disable Verbose Mode**: For production use
2. **Cache Move Generation**: For repeated analysis
3. **Limit History**: Clear old moves periodically
4. **Use Specific Queries**: Filter moves by piece/square

#### Memory Management

```typescript
// Clear history to free memory
game.clearHistory()

// Disable debug mode
game.setDebug(false)

// Use efficient move filtering
game.moves({ piece: 'n', square: 'f3' })
```

### Integration Patterns

#### Web Application

```typescript
// React state management
const [game] = useState(new CoTuLenh())
const [position, setPosition] = useState(game.fen())

// Move handling
const handleMove = (move) => {
  if (game.move(move)) {
    setPosition(game.fen())
  }
}
```

#### Server API

```typescript
// Express endpoint pattern
app.post('/move', (req, res) => {
  const move = game.move(req.body.move)
  if (move) {
    res.json({ success: true, fen: game.fen() })
  } else {
    res.status(400).json({ error: 'Invalid move' })
  }
})
```

### Troubleshooting Guide

#### Common Issues and Solutions

| Issue                  | Symptoms                                | Solution                             |
| ---------------------- | --------------------------------------- | ------------------------------------ |
| **Navy on Land**       | Navy piece on land square               | Check terrain validation             |
| **Invalid Deploy**     | Deploy move rejected                    | Verify stack rules and adjacency     |
| **Commander Exposure** | Move rejected unexpectedly              | Check flying general rule            |
| **Air Defense Error**  | Air Force move restricted               | Verify air defense zones             |
| **Stack Overflow**     | Cannot combine pieces                   | Check carrying capacity              |
| **Heroic Not Applied** | Piece not heroic after Commander attack | Verify attack actually hit Commander |

#### Debug Commands

```typescript
// Get detailed position info
game.getPositionInfo()

// Trace move generation
game.traceMoveGeneration(square)

// Check internal consistency
game.validateInternalState()

// Get performance stats
game.getPerformanceStats()
```

### References

- **Complete Rules**: See GAME-RULES.md
- **API Reference**: See API-GUIDE.md
- **Implementation Details**: See IMPLEMENTATION-GUIDE.md
- **Code Examples**: See EXAMPLES.md
- **Testing Guide**: See TESTING-GUIDE.md
