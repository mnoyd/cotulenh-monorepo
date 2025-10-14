# CoTuLenh Implementation Checklist

Use this checklist to verify you have complete knowledge before starting
implementation.

---

## ✅ Phase 1: Core Understanding

### Board & Coordinates

- [ ] I understand the 11×12 board dimensions (files a-k, ranks 1-12)
- [ ] I know how to convert between algebraic notation (e.g., "e5") and internal
      representation
- [ ] I understand boundary checking for valid squares
- [ ] I can explain the 0x88 board representation (optional - can use
      alternative)

### Terrain System

- [ ] I know the three terrain zones: pure water (a-b), mixed (c + river), pure
      land (d-k)
- [ ] I understand which pieces can access which zones
- [ ] I know the special river squares: d6, e6, d7, e7
- [ ] I understand bridge squares: f6, f7, h6, h7
- [ ] I can implement heavy piece river crossing rules (ARTILLERY, ANTI_AIR,
      MISSILE)

### Game State

- [ ] I know what minimum state must be tracked
- [ ] I understand turn management (RED/BLUE)
- [ ] I know how to track commander positions
- [ ] I understand move counters (halfMoves for 50-move rule, moveNumber for
      game notation)
- [ ] I can implement position counting for threefold repetition

---

## ✅ Phase 2: All 11 Piece Types

### Basic Pieces

- [ ] **COMMANDER (C):** Infinite orthogonal, +1 diagonal when heroic
- [ ] **INFANTRY (I):** 1 square orthogonal, +1 range when heroic
- [ ] **ENGINEER (E):** 1 square orthogonal, +1 range when heroic
- [ ] **ANTI_AIR (A):** 1 square orthogonal, +1 range when heroic, air defense
      level 1→2
- [ ] **MILITIA (M):** 1 square all directions, +1 range when heroic

### Medium Range Pieces

- [ ] **TANK (T):** 2 square orthogonal, shoot-over blocking, +1 range when
      heroic
- [ ] **ARTILLERY (G):** 3 square with diagonal, ignore-blocking capture,
      stay-capture, +1 range when heroic

### Advanced Pieces

- [ ] **MISSILE (S):** 2-orthogonal/1-diagonal L-shape, ignore-blocking, air
      defense level 2→3
- [ ] **AIR_FORCE (F):** 4 square all directions, ignore-blocking, air defense
      interactions
- [ ] **NAVY (N):** 4 square all directions, water-only, dual attack, air
      defense level 1→2
- [ ] **HEADQUARTER (H):** Immobile base, becomes mobile (range 1) when heroic

### Piece Mechanics Verification

For each piece type, can you answer:

- [ ] What is its base movement range?
- [ ] What is its base capture range (if different)?
- [ ] Does it move diagonally? Orthogonally? Both?
- [ ] Does it have any special abilities (shoot-over, ignore-blocking, etc.)?
- [ ] What terrain zones can it access?
- [ ] How does heroic status change it?

---

## ✅ Phase 3: Advanced Mechanics

### Stack System

- [ ] I understand stack structure: carrier + carrying array
- [ ] I know that stacks move by **carrier's** rules (not carried pieces)
- [ ] I can determine which pieces can combine (external library rules)
- [ ] I understand stack splitting/deployment mechanics
- [ ] I know how to validate terrain for each piece in a stack deployment
- [ ] I can generate all possible stack split configurations

### Heroic Promotion System

- [ ] I know the trigger: **any piece that attacks the enemy commander becomes
      heroic**
- [ ] I understand it happens **after** move execution
- [ ] I know the effects: +1 range, +diagonal movement (for most pieces)
- [ ] I understand COMMANDER only gains diagonal (already infinite range)
- [ ] I understand HEADQUARTER transforms from immobile to mobile (0→1 range)
- [ ] I know heroic status is permanent until captured

### Air Defense System

- [ ] I know the three air defense piece types and their levels
- [ ] I can calculate circular defense zones using distance formula
- [ ] I understand the three air force states: SAFE_PASS, KAMIKAZE, DESTROYED
- [ ] I know how to track air force path through zones
- [ ] I understand suicide capture mechanics (both pieces destroyed)

### Commander Exposure (Flying General)

- [ ] I understand the rule: commanders cannot face each other on clear
      orthogonal line
- [ ] I can detect orthogonal line-of-sight between commanders
- [ ] I know this is checked **in addition to** normal check detection
- [ ] I understand all moves must pass both checks: not attacked AND not exposed

### Capture Types

- [ ] **Normal Capture:** Move to target square, replace piece
- [ ] **Stay Capture:** Attack without moving (notation: `_`)
- [ ] **Suicide Capture:** Both pieces destroyed (notation: `@`)
- [ ] I understand when each type is used (terrain, air defense, etc.)

---

## ✅ Phase 4: Move Processing

### Move Generation

- [ ] I can generate pseudo-legal moves for each piece type
- [ ] I understand how to apply terrain restrictions
- [ ] I can handle air defense restrictions for air force
- [ ] I know how to apply heavy piece river crossing rules
- [ ] I can generate deploy moves from stacks

### Move Validation

- [ ] I understand pseudo-legal vs legal moves
- [ ] I can detect if commander is under attack
- [ ] I can detect if commander is exposed (flying general)
- [ ] I know moves must pass both checks to be legal
- [ ] I can filter illegal moves from pseudo-legal list

### Move Execution

- [ ] I can update board state atomically
- [ ] I know how to handle captures (remove captured piece)
- [ ] I can update commander position tracking
- [ ] I understand turn switching (except during deploy)
- [ ] I can update move counters correctly
- [ ] I know when to reset halfMoves counter (captures, commander moves)
- [ ] I can update position history for repetition detection

### Deploy State Management

- [ ] I understand when deploy state is created (first piece deployed from
      stack)
- [ ] I know that turn is **preserved** during deployment
- [ ] I understand deploy completion (all pieces accounted for)
- [ ] I know when to clear deploy state and switch turn

---

## ✅ Phase 5: Game Logic

### Check & Checkmate

- [ ] I can detect if a specific commander is under attack
- [ ] I understand checkmate: in check + no legal moves
- [ ] I can generate all legal moves to test for checkmate

### Draw Conditions

- [ ] **Fifty-Move Rule:** halfMoves >= 100 (50 full moves)
- [ ] **Threefold Repetition:** Same position (FEN) occurs 3 times
- [ ] **Stalemate:** No legal moves, not in check (rare in CoTuLenh)

### Game Over Detection

- [ ] Checkmate
- [ ] Commander captured (position = -1)
- [ ] Draw conditions
- [ ] I can determine the winner/outcome

---

## ✅ Phase 6: Data Formats

### FEN Format

- [ ] I understand standard FEN structure (6 components)
- [ ] I can parse piece placement with stacks: `(NFT)` notation
- [ ] I can handle heroic markers: `+C` for heroic commander
- [ ] I can parse empty squares (numbers 1-11)
- [ ] I understand 12 ranks separated by `/`
- [ ] I can generate FEN from game state
- [ ] I can load game state from FEN

### SAN Notation

- [ ] I know piece symbols: C, I, T, M, E, A, B, S, F, N, H (uppercase = RED,
      lowercase = BLUE)
- [ ] I understand heroic prefix: `+T`
- [ ] I can parse stack notation: `(NI)`
- [ ] I know capture symbols: `x` (normal), `_` (stay), `@` (suicide)
- [ ] I understand deploy separator: `>`
- [ ] I can parse combination notation: `&`
- [ ] I can generate SAN from moves
- [ ] I can parse SAN to moves

---

## ✅ Phase 7: Implementation Strategy

### Architecture Decisions

- [ ] I have chosen my board representation (0x88, bitboards, hashmap, 2D array)
- [ ] I have decided on mutability strategy (immutable, mutable, hybrid)
- [ ] I have chosen error handling approach (exceptions, Result types, etc.)
- [ ] I have decided on move generation strategy (eager, lazy, cached)
- [ ] I have planned my testing approach

### Core Data Structures

- [ ] I have designed my Piece structure
- [ ] I have designed my Move structure
- [ ] I have designed my GameState structure
- [ ] I have designed my DeployMove structure (if applicable)

### Testing Plan

- [ ] I know which test cases to implement first
- [ ] I have identified reference examples to validate against
- [ ] I have a plan for incremental testing (piece by piece)

---

## ✅ Phase 8: Knowledge Validation

### Can you answer these questions?

1. **How many piece types are there, and what makes each unique?**

   - [ ] I can list all 11 and describe each

2. **What are the three terrain zones and their access rules?**

   - [ ] I can explain water, mixed, and land zones with file ranges

3. **How does the heroic promotion system work?**

   - [ ] I can explain trigger, timing, and effects

4. **What is the flying general rule (commander exposure)?**

   - [ ] I can explain orthogonal line-of-sight check

5. **How do stacks move - by carrier or carried piece rules?**

   - [ ] I know it's always carrier rules

6. **What triggers the creation of a deploy state?**

   - [ ] First piece deployed from a stack

7. **How do air defense zones affect air force movement?**

   - [ ] I can explain the three states and suicide mechanics

8. **What are the three capture types and when is each used?**

   - [ ] I can explain normal, stay, and suicide captures

9. **How is FEN extended for CoTuLenh?**

   - [ ] I know stack notation and heroic markers

10. **What are the five game ending conditions?**
    - [ ] Checkmate, commander capture, 50-move, threefold, stalemate

### Code Challenges

Can you mentally implement:

- [ ] Function to check if square is on board
- [ ] Function to generate moves for COMMANDER piece
- [ ] Function to detect if commander is attacked
- [ ] Function to parse simple FEN (no stacks)
- [ ] Function to determine terrain zone for a square

---

## 📊 Completeness Score

**Count your checkmarks:**

- [ ] **Phase 1 (Board & State):** \_\_\_ / 13
- [ ] **Phase 2 (All Pieces):** \_\_\_ / 16
- [ ] **Phase 3 (Advanced Mechanics):** \_\_\_ / 22
- [ ] **Phase 4 (Move Processing):** \_\_\_ / 21
- [ ] **Phase 5 (Game Logic):** \_\_\_ / 8
- [ ] **Phase 6 (Data Formats):** \_\_\_ / 14
- [ ] **Phase 7 (Implementation):** \_\_\_ / 9
- [ ] **Phase 8 (Validation):** \_\_\_ / 15

**Total:** \_\_\_ / 118

### Readiness Assessment

- **100+ checks:** ✅ Ready to implement
- **85-99 checks:** ⚠️ Review unclear areas
- **< 85 checks:** ❌ Study documentation more

---

## 🎯 Quick Reference: Critical Invariants

These are **non-negotiable** - any implementation MUST preserve these:

1. **Board:** 11×12 (a-k files, 1-12 ranks)
2. **Pieces:** Exactly 11 types with documented movement rules
3. **Terrain:** Water/mixed/land zones with access restrictions
4. **Stacks:** Carrier determines movement
5. **Heroic:** Triggered by attacking enemy commander
6. **Air Defense:** Circular zones, three states for air force
7. **Commander Exposure:** Flying general rule in addition to check
8. **Captures:** Three types (normal, stay, suicide)
9. **River Crossing:** Heavy pieces blocked between zones (except captures and
   bridges)
10. **Game End:** Five conditions (checkmate, capture, 50-move, threefold,
    stalemate)

---

## 📚 Document Reference Quick Links

- **[PORTING-GUIDE.md](PORTING-GUIDE.md)** - Main porting guide
- **[complete-game-mechanics-reference.md](complete-game-mechanics-reference.md)** -
  All rules
- **[internal-game-state-representation.md](internal-game-state-representation.md)** -
  State design
- **piece-mechanics-\*.md** - Individual piece rules (9 files)
- **[complete-request-response-examples.md](complete-request-response-examples.md)** -
  Test cases

Ready to implement? Start with basic board and piece placement, then add one
piece type at a time!
