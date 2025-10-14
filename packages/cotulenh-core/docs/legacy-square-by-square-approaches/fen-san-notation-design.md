# FEN and SAN Notation Design for CoTuLenh

## Quick Reference

### ✅ Final FEN Format

```
position color halfmoves fullmoves [deploystate]

Examples:
  6c4/... r 0 1                  // Normal
  6c4/... r 0 1 e5:Nd7,Td5...    // During deploy (... = ongoing)
  6c4/... b 0 2                  // After deploy
```

**Key Changes from Chess:**

- ❌ **No castling field** (doesn't exist in CoTuLenh)
- ❌ **No en passant field** (doesn't exist in CoTuLenh)
- ✅ **Halfmoves always 0** (no draw rules)
- ✅ **Deploy state added** as 5th field with `...` suffix

### ✅ Final SAN Format

```
Tc3              // Normal move
Txc3             // Capture
+Cg7             // Heroic piece
(TIM)c3          // Stack move
e5:Nd7,Td5,Ie6   // Deploy (always with origin)
e5:I-,Nd7        // Deploy with stay (dash notation)
```

**Key Decisions:**

- ✅ **Deploy always has origin:** `e5:...`
- ✅ **Stay notation uses dash:** `I-` (not `<`)
- ✅ **Deploy ongoing marker:** `...` suffix (in FEN only)

---

## Overview

CoTuLenh uses **modified FEN** and **extended SAN** notation compared to
standard chess. This document analyzes what's needed vs what chess has, and
documents the final specification.

---

## FEN (Forsyth-Edwards Notation) Comparison

### Chess FEN Format

```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e3 0 1
│                                           │ │    │  │ │
│                                           │ │    │  │ └─ Fullmove number
│                                           │ │    │  └─── Halfmove clock (50-move rule)
│                                           │ │    └────── En passant target square
│                                           │ └─────────── Castling availability
│                                           └───────────── Active color (w/b)
└──────────────────────────────────────────────────────── Piece placement
```

**6 fields:**

1. Piece placement (8 ranks)
2. Active color (w/b)
3. Castling rights (KQkq)
4. En passant square (e3 or -)
5. Halfmove clock (for 50-move rule)
6. Fullmove number

### CoTuLenh FEN Format (Current)

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1
│                                                                                           │ │ │ │ │
│                                                                                           │ │ │ │ └─ Fullmove
│                                                                                           │ │ │ └─── Halfmove
│                                                                                           │ │ └───── INVALID (remove)
│                                                                                           │ └─────── INVALID (remove)
│                                                                                           └───────── Color (r/b)
└───────────────────────────────────────────────────────────────────────────────────────────────────── Position (12 ranks)
```

**Current: 6 fields (WRONG - includes invalid castling/en passant)** **Proposed:
4-5 fields**

1. Piece placement (12 ranks)
2. Active color (r/b for red/blue)
3. Halfmove clock (optional - can be 0 always)
4. Fullmove number
5. Deploy state (optional - only when deploy active)

---

## What CoTuLenh FEN Needs to Encode

### 1. ✅ Piece Placement (Working)

```
// Empty squares: digits 1-11
11        = 11 empty squares
6c4       = 6 empty, commander, 4 empty

// Pieces: letter = type, UPPERCASE = red, lowercase = blue
C = Red Commander
c = Blue Commander
T = Red Tank
t = Blue Tank
```

### 2. ✅ Stacks (Working)

```
// Stacks use parentheses: (carrier+carried)
(TIM)     = Tank carrying Infantry and Militia
(N+TI)    = Navy (heroic) carrying Tank and Infantry
```

**In FEN:**

```
// Red stack at e5: Tank carrying Infantry and Militia
3(TIM)3

// Blue stack at d7: Navy (heroic) carrying Tank and Infantry
2(n+ti)2
```

### 3. ✅ Heroic Status (Working)

```
// Heroic pieces prefixed with +
+T        = Heroic Tank
+C        = Heroic Commander (can move!)
(+TIM)    = Heroic Tank carrying Infantry and Militia
```

### 4. ✅ Active Color (Working)

```
r = Red's turn
b = Blue's turn
```

### 5. ❌ Castling Field (REMOVED)

**Chess:** `KQkq` (king-side, queen-side, both colors)  
**CoTuLenh:** Not applicable - castling doesn't exist

**Decision:** **REMOVE from FEN** - invalid for CoTuLenh

### 6. ❌ En Passant Field (REMOVED)

**Chess:** `e3` or `-` (en passant target square)  
**CoTuLenh:** Not applicable - en passant doesn't exist

**Decision:** **REMOVE from FEN** - invalid for CoTuLenh

### 7. ⚠️ Halfmove Clock (Optional)

**Chess:** Counts half-moves since last capture or pawn move (for 50-move draw
rule)  
**CoTuLenh:** Currently tracked but **not used for draw rules**

**Questions:**

- Do you want 50-move draw rule?
- If not, should we keep tracking it?
- Use field for something else?

**Decision:**

- **Set to `0` always** (you don't care about draw rules)
- Simpler, honest, saves processing

### 8. ✅ Fullmove Number (Working)

**Purpose:** Track move count (increments after blue's move)

### 9. ❌ Deploy Session State (MISSING!)

**Problem:** FEN doesn't encode active deploy session!

```
// During deploy:
- Original square: e5
- Pieces moved: [Navy→d7, Tank→d5]
- Pieces remaining: [Infantry]
- Virtual changes: {...}

// If you save FEN mid-deploy, this info is lost!
```

**Current FEN during deploy shows REAL board (not virtual!):**

```
// Real board (unchanged):
...3(NTI)3... r 0 1

// But virtual state shows:
// e5: Infantry only
// d7: Navy
// d5: Tank
```

**Decision:** Add 5th field for deploy state (with `...` indicator)

---

## Proposed Enhanced FEN Format

### Option 1: Add Deploy Session Field (RECOMMENDED)

```
position color halfmoves fullmoves [deploystate]

// Normal move:
6c4/... r 0 1

// During deploy from e5, moved Navy→d7, Tank→d5:
6c4/... r 0 1 e5:Nd7,Td5...
                  │  └──────────────── Ongoing deploy indicator
                  └──────────────────── Moves made: Navy→d7, Tank→d5
```

**Deploy state encoding:**

```
e5:Nd7,Td5...        = From e5, Navy→d7, Tank→d5 (ongoing)
e5:I-,Nd7,Td5...     = Infantry stays, Navy→d7, Tank→d5 (ongoing)
e5:...               = Deploy started, no moves yet (ongoing)
```

**The `...` suffix indicates deploy is not complete yet!**

**Benefits:**

- ✅ Can save/load mid-deploy
- ✅ Undo works correctly
- ✅ Network sync preserves state
- ✅ Backward compatible (old FEN still works)

**Drawbacks:**

- ❌ Non-standard (but chess FEN has 6 fields, we'd have 7)
- ❌ More complex parsing

### Option 2: Encode Virtual State in Position

**Don't track deploy session, just encode virtual board in FEN!**

```
// During deploy, FEN shows VIRTUAL state:
...3I3... r - - 0 1
// Shows Infantry at e5 (not stack)
```

**Benefits:**

- ✅ Standard 6-field format
- ✅ FEN always shows "truth"

**Drawbacks:**

- ❌ Lose deploy session tracking
- ❌ Can't distinguish "normal Infantry" from "Infantry from stack"
- ❌ Can't undo individual deploy steps

### Option 3: Minimal - Use Comments/PGN Extensions

**Keep FEN standard, use PGN comments for deploy state:**

```
[FEN "6c4/... r - - 0 1"]
[DeployState "e5:Nd7,Td5"]
```

**Benefits:**

- ✅ FEN stays standard
- ✅ Deploy state preserved

**Drawbacks:**

- ❌ Only works in PGN format
- ❌ Not in FEN itself

---

## Recommendation for Halfmove Clock

**You said:** "draw by 50 move rules, draw by stalemate, we don't really care"

**Options:**

### Option A: Remove It (Set to 0 Always)

```
6c4/... r - - 0 1
              │
              └─── Always 0
```

**Benefits:**

- ✅ Simpler
- ✅ Honest (we don't use it)

**Drawbacks:**

- ❌ Lose info if you change mind later
- ❌ Not standard (chess always has 6 fields)

### Option B: Track But Ignore (Current Approach)

```
6c4/... r - - 5 1
              │
              └─── Tracked but unused
```

**Benefits:**

- ✅ Future-proofing
- ✅ Standard format
- ✅ Can add draw rules later

**Drawbacks:**

- ❌ Wastes field
- ❌ Misleading (implies it's used)

### Option C: Repurpose for Something Else

**Use halfmove field for deploy move count?**

```
6c4/... r - - 3 1
              │
              └─── Number of pieces moved in current deploy
```

**Benefits:**

- ✅ Useful information
- ✅ No new field needed

**Drawbacks:**

- ❌ Non-standard interpretation
- ❌ Confusing for chess players

**My Recommendation:** **Option B** (track but ignore) - keeps options open

---

## SAN (Standard Algebraic Notation) Comparison

### Chess SAN Format

```
// Normal move
Nf3         = Knight to f3
e4          = Pawn to e4

// Capture
Nxe5        = Knight captures on e5
exd5        = Pawn captures on d5

// Disambiguation
Nbd2        = Knight from b-file to d2
N1e2        = Knight from rank 1 to e2
Qh4e1       = Queen from h4 to e1

// Special
O-O         = Kingside castle
O-O-O       = Queenside castle
e8=Q        = Pawn promotion to queen

// Check/Checkmate
Nf3+        = Knight to f3, check
Qh5#        = Queen to h5, checkmate
```

### CoTuLenh SAN Format (Current)

```
// Normal move
Tc3         = Tank to c3
Ie5         = Infantry to e5

// Capture
Txc3        = Tank captures at c3
Nxe5        = Navy captures at e5

// Heroic piece
+Tc3        = Heroic Tank to c3
+Cg7        = Heroic Commander to g7

// Stack move
(TIM)c3     = Stack (Tank+Infantry+Militia) to c3
(+NTI)d7    = Stack (Heroic Navy+Tank+Infantry) to d7

// Combination (after capture)
Txc3(TI)    = Tank captures at c3, combines with Infantry

// Stay capture
Aa5         = Artillery attacks a5 (doesn't move)
```

### Deploy Move SAN (Current)

**Format:** `[stay,]move1,move2,...`

```
// Simple deploy (3 pieces)
Nd7,Td5,Ie6         = Navy→d7, Tank→d5, Infantry→e6

// With stay notation
I-,Nd7,Td5          = Infantry stays, Navy→d7, Tank→d5

// With captures
Nxd7,Td5,Ie6        = Navy captures at d7, Tank→d5, Infantry→e6

// Full deploy from e5
e5:I-,Nxd7,Td5      = From e5: Infantry stays, Navy captures d7, Tank→d5
```

---

## SAN Issues and Proposals

### Issue 1: Stay Notation

**Chosen:** `I-` means "Infantry stays on stack"

**Why dash (`-`)?**

- More standard notation (- = no move)
- Clear and compact
- Won't confuse with captures (captures always have `x`)

**Examples:**

```
I-,Nd7,Td5        = Infantry stays, Navy→d7, Tank→d5
I-,M-,Nd7         = Infantry stays, Militia stays, Navy→d7
```

### Issue 2: Deploy Move Origin

**Current:** Deploy notation doesn't always show origin

```
Nd7,Td5,Ie6         // Which square did they come from?
```

**Decision:** Always prefix with origin

```
e5:Nd7,Td5,Ie6      // From e5
e5:I-,Nd7,Td5       // From e5, Infantry stays
```

**Benefits:**

- ✅ Unambiguous
- ✅ Can parse without board state
- ✅ Replay works

### Issue 3: Complete Deploy Sequence

**Question:** How to represent complete deploy in history?

**Option A: Single Notation (Atomic)**

```
(NTI)e5:Nd7,Td5,Ie6     // Complete deploy as one move
```

**Option B: Individual Moves**

```
Nd7                      // Step 1
Td5                      // Step 2
Ie6                      // Step 3
```

**Option C: Hybrid**

```
Deploy e5               // Start marker
Nd7                     // Step 1
Td5                     // Step 2
Ie6                     // Step 3 (auto-completes)
```

**Recommendation:** **Option A** for final history, **Option B** during play

---

## Final CoTuLenh Notation Specification

### FEN Format

```
position color halfmoves fullmoves [deploystate]

// Normal position
6c4/1n2fh1hf2/... r 0 1

// With stacks and heroic
3(+TIM)3/... r 0 1

// During deploy (5th field with ... suffix)
3I3/... r 0 1 e5:Nd7,Td5...
3I3/... r 0 1 e5:I-,Nd7,Td5...
3(NTI)3/... r 0 1 e5:...

// Deploy complete (no 5th field)
3I3/... b 0 2
```

**Key Points:**

- **4 fields normally:** position, color, halfmoves (0), fullmoves
- **5th field during deploy:** `origin:moves...` with `...` suffix
- **No castling or en passant fields** (invalid for CoTuLenh)
- **Halfmoves always 0** (no draw rules)

### SAN Format

```
// Normal moves
Tc3             = Tank to c3
Txc3            = Tank captures at c3
+Cg7            = Heroic Commander to g7

// Stacks
(TIM)c3         = Stack moves to c3
(TIM)xc3        = Stack captures at c3

// Combinations
Txc3(TI)        = Capture and combine

// Deploy (complete with origin)
e5:Nd7,Td5,Ie6  = Deploy from e5

// Deploy with stay (dash notation)
e5:I-,Nd7,Td5   = Infantry stays, Navy→d7, Tank→d5
e5:I-,M-,Nd7    = Infantry stays, Militia stays, Navy→d7

// Stay capture (artillery/navy - no origin)
Aa5             = Artillery attacks a5 (stays)
Na5             = Navy attacks a5 (stays)
```

**Key Points:**

- **Deploy always has origin:** `e5:...`
- **Stay notation uses dash:** `I-` (not `<`)
- **Deploy in progress marked with ...** in FEN only

---

## Implementation Recommendations

### 1. FEN Improvements

```typescript
interface FENComponents {
  position: string // Board state (12 ranks)
  turn: 'r' | 'b' // Active color
  halfmoves: number // Always 0 (no draw rules)
  fullmoves: number // Move counter
  deployState?: string // Optional: "e5:Nd7,Td5..." (with ... suffix)
}

function generateFEN(state: GameState): string {
  const parts = [
    generatePosition(state.board),
    state.turn,
    0, // Always 0 (no draw rules)
    state.moveNumber,
  ]

  // Add deploy state if active (with ... suffix)
  if (state.deploySession) {
    const origin = squareToAlgebraic(state.deploySession.originalSquare)

    // Build move list with stay notation (I-)
    const movesList: string[] = []

    for (const piece of state.deploySession.originalStack) {
      const moved = state.deploySession.movedPieces.find(
        (m) => m.piece === piece,
      )
      const stayed = state.deploySession.stayingPieces.includes(piece)

      if (moved) {
        const notation =
          pieceToSAN(piece) +
          (moved.captured ? 'x' : '') +
          squareToAlgebraic(moved.to)
        movesList.push(notation)
      } else if (stayed) {
        movesList.push(pieceToSAN(piece) + '-') // Stay notation
      }
    }

    const moves = movesList.join(',')
    parts.push(`${origin}:${moves}...`) // Add ... suffix for ongoing
  }

  return parts.join(' ')
}

function parseFEN(fen: string): FENComponents {
  const tokens = fen.split(/\s+/)

  // Basic validation
  if (tokens.length < 4) {
    throw new Error(
      `Invalid FEN: expected at least 4 fields, got ${tokens.length}`,
    )
  }

  const components: FENComponents = {
    position: tokens[0],
    turn: tokens[1] as 'r' | 'b',
    halfmoves: parseInt(tokens[2], 10) || 0,
    fullmoves: parseInt(tokens[3], 10) || 1,
  }

  // Optional deploy state (5th field)
  if (tokens.length >= 5) {
    const deployState = tokens[4]

    // Check for ... suffix (ongoing deploy)
    if (deployState.endsWith('...')) {
      components.deployState = deployState
    } else {
      throw new Error('Deploy state must end with ... suffix')
    }
  }

  return components
}
```

### 2. SAN Improvements

```typescript
interface SANComponents {
  origin?: string // e5 (for deploy)
  piece: string // T, N, (TIM), +C
  disambiguation?: string // For ambiguous moves
  capture: boolean // x
  destination: string // c3
  combination?: string // (TI)
  check?: boolean // +
  checkmate?: boolean // #
}

function moveToSAN(move: Move, state: GameState): string {
  if (state.deploySession) {
    // Deploy move notation
    return deployMoveToSAN(move, state)
  }

  // Normal move notation
  const parts = []

  // Piece (with heroic if applicable)
  parts.push(pieceToSymbol(move.piece))

  // Disambiguation if needed
  if (needsDisambiguation(move, state)) {
    parts.push(getDisambiguator(move, state))
  }

  // Capture
  if (move.capturedPiece) {
    parts.push('x')
  }

  // Destination
  parts.push(squareToAlgebraic(move.to))

  // Combination
  if (move.combined) {
    parts.push('(' + pieceToSymbol(move.combined) + ')')
  }

  return parts.join('')
}
```

---

## Summary

### ✅ Final FEN Format

| Field      | Chess    | CoTuLenh (Final) | Decision             |
| ---------- | -------- | ---------------- | -------------------- |
| Position   | 8 ranks  | 12 ranks         | ✅ Keep              |
| Color      | w/b      | r/b              | ✅ Keep              |
| Castling   | KQkq     | ❌ REMOVED       | Not applicable       |
| En passant | e3/-     | ❌ REMOVED       | Not applicable       |
| Halfmoves  | For draw | Always 0         | ✅ No draw rules     |
| Fullmoves  | Count    | Count            | ✅ Keep              |
| Deploy     | N/A      | `e5:Nd7,Td5...`  | ✅ Added (5th field) |

**Format:** `position color halfmoves fullmoves [deploystate]`

### ✅ Final SAN Format

| Feature        | Final Decision                           |
| -------------- | ---------------------------------------- |
| Normal moves   | `Tc3` ✅                                 |
| Captures       | `Txc3` ✅                                |
| Stacks         | `(TIM)c3` ✅                             |
| Heroic         | `+Cg7` ✅                                |
| Deploy         | `e5:Nd7,Td5,Ie6` ✅ (always with origin) |
| Stay           | `I-` ✅ (dash notation)                  |
| Combination    | `Txc3(TI)` ✅                            |
| Deploy ongoing | `e5:Nd7,Td5...` ✅ (... in FEN only)     |

### Key Decisions Made

1. ✅ **Castling/En passant:** REMOVED (invalid for CoTuLenh)
2. ✅ **Halfmove clock:** Always 0 (no draw rules)
3. ✅ **Deploy state in FEN:** Added as 5th field with `...` suffix
4. ✅ **Deploy SAN:** Always includes origin `e5:...`
5. ✅ **Stay notation:** Dash `I-` (clearer than `<`)
6. ✅ **Deploy ongoing marker:** `...` suffix in FEN

### Examples

```
// Normal position
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r 0 1

// During deploy (stay + moves)
3I3/... r 0 1 e5:I-,Nd7,Td5...

// After deploy completes
3I3/... b 0 2

// SAN moves
Tc3                  // Normal
Txc3                 // Capture
e5:Nd7,Td5,Ie6       // Deploy (complete sequence)
e5:I-,Nd7            // Deploy with stay
```

Specification is now finalized! 🎯
