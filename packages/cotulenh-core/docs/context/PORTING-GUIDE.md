# CoTuLenh Cross-Language Porting Guide

## Purpose

This guide enables full implementation of CoTuLenh in **any programming
language** while maintaining 100% game rule fidelity. Whether you choose **OOP,
functional, or hybrid approaches**, this documentation provides everything
needed.

---

## 🎯 CRITICAL: Deploy Architecture (Updated October 22, 2025)

> **IMPORTANT FOR NEW IMPLEMENTATIONS**
>
> Before porting, understand that CoTuLenh has **two architectures**:
>
> 1. **Current (Action-Based)** - Recommended for new implementations ✅
> 2. **Legacy (Virtual State)** - TypeScript reference implementation ⚠️
>
> **Read First**:
>
> - **[../ARCHITECTURE-MIGRATION.md](../ARCHITECTURE-MIGRATION.md)** - Complete
>   architecture comparison
> - **[../deploy-action-based-architecture/FINAL-STATUS.md](../deploy-action-based-architecture/FINAL-STATUS.md)** -
>   Current specification
>
> **Why This Matters**: The action-based architecture is **simpler, more
> correct, and bug-free**. If porting, use action-based. If studying TypeScript
> code, understand it uses virtual state (being migrated).

---

## Quick Start for AI Agents

### Phase 0: Deploy Architecture (30 minutes) ⭐ NEW

**Understand the deploy system architecture:**

0a. **[../ARCHITECTURE-MIGRATION.md](../ARCHITECTURE-MIGRATION.md)** - Why
action-based is better  
0b. **[../deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md](../deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md)** -
How to implement it

### Phase 1: Understanding (30-60 minutes)

**Read in this exact order:**

1. **[PORTING-GUIDE.md](PORTING-GUIDE.md)** ← You are here
2. **[complete-game-mechanics-reference.md](complete-game-mechanics-reference.md)** -
   Complete rules overview
3. **[internal-game-state-representation.md](internal-game-state-representation.md)** -
   State architecture
4. **[data-flow-analysis.md](data-flow-analysis.md)** - How data moves through
   the system

### Phase 2: Deep Dive (2-4 hours)

**Study by category:**

5. **Board System:**

   - [terrain-board-layout.md](terrain-board-layout.md)
   - [terrain-zones-masks.md](terrain-zones-masks.md)

6. **All 11 Piece Types:**

   - [piece-mechanics-commander.md](piece-mechanics-commander.md)
   - [piece-mechanics-infantry-engineer-antiair.md](piece-mechanics-infantry-engineer-antiair.md)
   - [piece-mechanics-militia.md](piece-mechanics-militia.md)
   - [piece-mechanics-tank.md](piece-mechanics-tank.md)
   - [piece-mechanics-artillery.md](piece-mechanics-artillery.md)
   - [piece-mechanics-missile.md](piece-mechanics-missile.md)
   - [piece-mechanics-airforce.md](piece-mechanics-airforce.md)
   - [piece-mechanics-navy.md](piece-mechanics-navy.md)
   - [piece-mechanics-headquarter.md](piece-mechanics-headquarter.md)

7. **Advanced Mechanics:**

   - [stack-combination-rules.md](stack-combination-rules.md)
   - [deployment-mechanics.md](deployment-mechanics.md) ⚠️ (historical - see
     action-based architecture above)
   - **[../deploy-action-based-architecture/](../deploy-action-based-architecture/)**
     ⭐ **CURRENT DEPLOY ARCHITECTURE**
   - [stack-splitting-movement.md](stack-splitting-movement.md)
   - [heroic-promotion-system.md](heroic-promotion-system.md)
   - [air-defense-system.md](air-defense-system.md)
   - [commander-exposure-rules.md](commander-exposure-rules.md)
   - [capture-types-mechanics.md](capture-types-mechanics.md)

8. **Data Formats:**
   - [fen-format-construction.md](fen-format-construction.md)
   - [san-notation-construction.md](san-notation-construction.md)

### Phase 3: Implementation Planning (1-2 hours)

**Design your architecture:**

9. **API Patterns:**

   - [game-initialization-pattern.md](game-initialization-pattern.md)
   - [move-validation-execution-cycle.md](move-validation-execution-cycle.md)
   - [game-state-query-interface.md](game-state-query-interface.md)

10. **Validation:**
    - [complete-request-response-examples.md](complete-request-response-examples.md)
    - [piece-mechanics-validation.md](piece-mechanics-validation.md)

---

## Architecture Flexibility

### The TypeScript Implementation Uses:

- **Pattern:** OOP with singleton pattern
- **Board:** 0x88 array representation (256-element array)
- **Commands:** Command pattern with atomic actions
- **State:** Mutable singleton with history stack
- **Caching:** LRU cache for move generation

### Your Implementation Can Use:

#### Option 1: Functional + Immutable (Rust/Haskell style)

```
✓ Pure functions for move generation
✓ Immutable game state (copy on write)
✓ Algebraic data types for pieces/moves
✓ Pattern matching for move types
✓ Result/Option types for error handling
```

#### Option 2: OOP + Mutable (Java/C# style)

```
✓ Game class with mutable state
✓ Piece class hierarchy
✓ Move class hierarchy
✓ Builder patterns for complex moves
✓ Observer pattern for state changes
```

#### Option 3: Data-Oriented (C/Zig style)

```
✓ Bitboards for piece positions
✓ Flat arrays for game state
✓ Struct-of-arrays for pieces
✓ Lookup tables for move generation
✓ Memory pools for allocation
```

#### Option 4: Hybrid (Go/Rust modern style)

```
✓ Immutable core state with builder
✓ Traits/interfaces for extensibility
✓ Composition over inheritance
✓ Functional move generation
✓ Efficient memory representation
```

---

## Critical Invariants (MUST PRESERVE)

Regardless of your architectural choices, these **game rules are absolute:**

### Board & Terrain

1. **11×12 board** (files a-k, ranks 1-12)
2. **Terrain zones:**
   - Pure water: files a-b (navy only)
   - Mixed zone: file c + river squares (d6, e6, d7, e7)
   - Pure land: files d-k excluding river squares
3. **Heavy piece river crossing** blocked between zones 1↔2 except at files f,
   h

### Piece Movement (All 11 Types)

Each piece has **exact movement rules** documented in piece-mechanics-\*.md
files:

- Base movement range (orthogonal/diagonal)
- Capture range (may differ from move range)
- Special abilities (shoot-over, ignore-blocking, etc.)
- Terrain restrictions
- Heroic enhancement (+1 range, +diagonal for most)

### Stack System

1. **Combination rules:** Enforced by `@repo/cotulenh-combine-piece` logic
2. **Carrier determines movement:** Stack moves by carrier's rules
3. **Deployment mechanics:** All pieces must be accounted for (moved or stayed)
4. **Terrain validation:** Each deployed piece must satisfy terrain requirements

### Special Mechanics

1. **Heroic Promotion:**
   - Any piece attacking commander becomes heroic
   - Applies immediately after move
   - Persistent until captured
2. **Air Defense System:**
   - MISSILE: Level 2→3 (heroic)
   - NAVY: Level 1→2 (heroic)
   - ANTI_AIR: Level 1→2 (heroic)
   - Circular zones using distance formula
3. **Commander Exposure (Flying General):**
   - Orthogonal line-of-sight check
   - Both commanders cannot face each other with clear path
4. **Three Capture Types:**
   - Normal: Move to target square
   - Stay: Attack without moving (terrain-based)
   - Suicide: Both pieces destroyed (air force in defense zones)

### Game Ending

1. **Checkmate:** Commander attacked with no legal escape
2. **Commander Capture:** Direct capture (position = -1)
3. **Fifty-Move Rule:** 100 half-moves without capture/commander move
4. **Threefold Repetition:** Same position (FEN) occurs 3 times
5. **Stalemate:** No legal moves, not in check (rare)

---

## Implementation-Agnostic Data Structures

### Minimum Required State

```
GameState {
    board: BoardRepresentation           // Your choice: array, bitboards, hashmap
    turn: Color                          // RED or BLUE
    commanders: {RED: Position, BLUE: Position}
    moveNumber: Integer
    halfMoves: Integer                   // For fifty-move rule

    // Optional but recommended:
    deployState: DeployState?            // Active deployment tracking
    positionHistory: Map<Position, Count> // For threefold repetition
    moveHistory: List<Move>              // For undo/analysis
    airDefense: AirDefenseState          // For air force movement
}
```

### Core Data Types

```
Color = RED | BLUE

PieceType = COMMANDER | INFANTRY | TANK | MILITIA | ENGINEER |
            ARTILLERY | ANTI_AIR | MISSILE | AIR_FORCE | NAVY | HEADQUARTER

Piece {
    type: PieceType
    color: Color
    heroic: Boolean
    carrying: List<Piece>?               // For stacks
}

Move {
    from: Square
    to: Square
    piece: Piece
    moveType: NORMAL | CAPTURE | STAY_CAPTURE | SUICIDE_CAPTURE | DEPLOY | COMBINATION
    captured: Piece?
}

DeployMove {
    from: Square                         // Original stack position
    moves: List<Move>                    // Individual piece movements
    stay: Piece?                         // Pieces remaining
}
```

---

## Board Representation Options

### Option 1: 0x88 Board (TypeScript implementation)

```
✓ 256-element array (16×16 grid)
✓ Fast boundary checking: (square & 0x88) === 0
✓ Simple indexing: rank * 16 + file
✓ Used by many chess engines
✓ Good for move generation
```

### Option 2: Bitboards

```
✓ One 256-bit integer per piece type per color
✓ Very fast for piece queries
✓ Efficient for multiple piece checks
✓ Good for parallel processing
✗ More complex for stacks
```

### Option 3: HashMap/Dictionary

```
✓ Only store occupied squares
✓ Natural for sparse boards
✓ Easy to clone/copy
✓ Simple stack representation
✗ Slower iteration
```

### Option 4: 2D Array

```
✓ Most intuitive representation
✓ Direct [file][rank] indexing
✓ Easy to visualize
✗ Slower boundary checking
```

**Recommendation:** Start with what's natural in your language. Optimize later.

---

## Move Generation Strategies

### Core Algorithm (Implementation-Agnostic)

```
1. For each piece of current color:
   a. Generate pseudo-legal moves (piece movement rules)
   b. Apply terrain restrictions
   c. Apply heavy piece river crossing
   d. Handle air defense for air force pieces

2. For each pseudo-legal move:
   a. Apply move to temporary state
   b. Check if own commander is attacked
   c. Check if own commander is exposed (flying general)
   d. If both pass, move is legal

3. Handle deploy moves separately:
   a. Generate all possible stack splits
   b. For each split configuration:
      - Validate each piece's destination terrain
      - Ensure all pieces accounted for
      - Check legality as above
```

### Performance Considerations

**TypeScript Approach:**

- Generate all moves, cache with LRU
- Validate by actually executing moves temporarily
- Full undo/redo via command pattern

**Alternative Approaches:**

- **Incremental Update:** Maintain attack/defense maps
- **Copy-on-Write:** Cheap state snapshots for validation
- **Lazy Evaluation:** Generate moves only when needed
- **Parallel:** Check move legality in parallel

---

## Testing Your Implementation

### Phase 1: Basic Functionality

1. ✓ Load starting position FEN
2. ✓ Place and remove pieces
3. ✓ Generate moves for each piece type
4. ✓ Execute normal moves
5. ✓ Track commander positions

### Phase 2: Special Mechanics

6. ✓ Stack combination
7. ✓ Stack deployment
8. ✓ Heroic promotion
9. ✓ Air defense zones
10. ✓ Commander exposure rule
11. ✓ Three capture types

### Phase 3: Game Logic

12. ✓ Check detection
13. ✓ Legal move filtering
14. ✓ Checkmate detection
15. ✓ Draw conditions
16. ✓ Move history and undo

### Phase 4: Data Formats

17. ✓ FEN import/export with stacks
18. ✓ SAN notation parsing
19. ✓ SAN notation generation

### Validation Dataset

Use `complete-request-response-examples.md` for test cases covering:

- All piece movements
- All special mechanics
- Edge cases and complex scenarios

---

## Common Pitfalls

### 1. Commander Exposure Rule

**WRONG:** Only check if commander is attacked **RIGHT:** Also check flying
general (orthogonal line-of-sight)

### 2. Heroic Promotion

**WRONG:** Check before move execution **RIGHT:** Check after move, mark pieces
attacking enemy commander

### 3. Stack Movement

**WRONG:** Use carried piece movement rules **RIGHT:** Always use carrier's
movement rules

### 4. Air Defense

**WRONG:** Simple range check **RIGHT:** Circular zones using distance formula,
track path through zones

### 5. Terrain Validation

**WRONG:** Only check destination square **RIGHT:** Check each piece in deploy,
handle stay-captures for terrain mismatch

### 6. Heavy Piece River Crossing

**WRONG:** Block all crossing **RIGHT:** Allow captures, allow horizontal at
files f/h

### 7. Deploy State

**WRONG:** Switch turn after each deploy move **RIGHT:** Preserve turn until
deploy complete

---

## Language-Specific Recommendations

### Rust

```rust
// Leverage type system for safety
enum MoveType { Normal, Capture, StayCapture, SuicideCapture, Deploy, Combination }
struct Piece { piece_type: PieceType, color: Color, heroic: bool, carrying: Vec<Piece> }

// Use Result for error handling
fn execute_move(state: &GameState, mv: &Move) -> Result<GameState, MoveError>

// Copy-on-write for immutability
use std::sync::Arc for shared state
```

### Go

```go
// Use composition
type Game struct {
    board      Board
    turn       Color
    commanders map[Color]Square
}

// Value types for immutability
func (g Game) ExecuteMove(m Move) (Game, error) {
    newGame := g.copy()
    // ...
}

// Interfaces for flexibility
type MoveGenerator interface {
    GenerateMoves(g *Game) []Move
}
```

### Python

```python
# Dataclasses for structure
@dataclass(frozen=True)
class Piece:
    type: PieceType
    color: Color
    heroic: bool = False
    carrying: tuple[Piece, ...] = ()

# Immutable game state
class GameState:
    def execute_move(self, move: Move) -> 'GameState':
        return GameState(...) # Return new instance
```

### C++

```cpp
// Modern C++ with smart pointers
class Game {
    std::array<std::optional<Piece>, 256> board;
    std::unordered_map<Color, Square> commanders;
public:
    std::optional<GameState> executeMove(const Move& move);
};

// Move semantics for efficiency
GameState GameState::clone() && { ... }
```

---

## Next Steps

1. **Read the core references** (Phase 1 above)
2. **Choose your architecture** based on language strengths
3. **Implement basic board** and piece placement
4. **Add move generation** for one piece type
5. **Expand to all pieces** gradually
6. **Add special mechanics** one at a time
7. **Test against reference examples**
8. **Optimize** after correctness is proven

---

## Questions to Validate Understanding

After reading the documentation, you should be able to answer:

1. How many piece types are there, and what makes each unique?
2. What are the three terrain zones and their access rules?
3. How does the heroic promotion system work?
4. What is the flying general rule (commander exposure)?
5. How do stacks move - by carrier or carried piece rules?
6. What triggers the creation of a deploy state?
7. How do air defense zones affect air force movement?
8. What are the three capture types and when is each used?
9. How is the 0x88 board representation used for boundary checking?
10. What are the five game ending conditions?

If you can answer all 10 correctly, you're ready to start implementation.

---

## Support Resources

- **Complete Rules:**
  [complete-game-mechanics-reference.md](complete-game-mechanics-reference.md)
- **All Pieces:**
  [complete-piece-behavior-reference.md](complete-piece-behavior-reference.md)
- **API Patterns:** [external-api-usage-guide.md](external-api-usage-guide.md)
- **Test Cases:**
  [complete-request-response-examples.md](complete-request-response-examples.md)
- **Original Implementation:** TypeScript code in `../src/`

---

**Remember:** The game rules are fixed. The architecture is yours to design.
