# Board and Piece Representation for CoTuLenh

## Executive Summary

**IMPORTANT: CoTuLenh does NOT use "0x88" representation!**

- ✅ **Actually uses:** 16x16 Mailbox Array (256 squares)
- ✅ **Valid squares:** 11x12 = 132 squares
- ✅ **Terminology:** "16x16 Mailbox" or "Offset Board Representation"
- ❌ **NOT "0x88":** That term is specific to 8x8 chess boards

---

## Why "0x88" is Wrong for CoTuLenh

### What "0x88" Actually Means (Chess Only)

In chess, the "0x88" technique uses a **16x8 array (128 squares)** with a
special validation mask:

```typescript
// Chess (8x8 board)
// 16x8 array layout:
a8=0x00, b8=0x01, c8=0x02, ..., h8=0x07, [invalid]=0x08-0x0F
a7=0x10, b7=0x11, c7=0x12, ..., h7=0x17, [invalid]=0x18-0x1F
...
a1=0x70, b1=0x71, c1=0x72, ..., h1=0x77, [invalid]=0x78-0x7F

// Validation using 0x88 mask:
function isValid(square: number): boolean {
  return (square & 0x88) === 0
}

// Why this works:
// 0x88 in binary = 10001000
// Valid squares: bit 3 and bit 7 are both 0
// Invalid squares: bit 3 OR bit 7 is set
```

**This ONLY works for 8x8 boards with 8 files!**

For 11x12 boards, the mask `0x88` doesn't validate correctly.

---

## CoTuLenh's Actual Representation

### 16x16 Mailbox Array

```typescript
// CoTuLenh (11x12 board)
// 16x16 array layout (256 squares total):

// Rank 12 (top):
a12=0x00, b12=0x01, ..., k12=0x0A, [invalid]=0x0B-0x0F

// Rank 11:
a11=0x10, b11=0x11, ..., k11=0x1A, [invalid]=0x1B-0x1F

// ... (ranks 10-2)

// Rank 1 (bottom):
a1=0xB0, b1=0xB1, ..., k1=0xBA, [invalid]=0xBB-0xBF

// Invalid ranks (12-15):
[all invalid] = 0xC0-0xFF

// Validation (NOT using 0x88):
function isValid(square: number): boolean {
  const file = square & 0x0F  // Extract file (0-15)
  const rank = square >> 4     // Extract rank (0-15)
  return file < 11 && rank < 12
}
```

### Square Encoding

```
Square index = rank * 16 + file

Examples:
  a12 → rank=0,  file=0  → 0*16 + 0  = 0x00
  k12 → rank=0,  file=10 → 0*16 + 10 = 0x0A
  a11 → rank=1,  file=0  → 1*16 + 0  = 0x10
  e5  → rank=7,  file=4  → 7*16 + 4  = 0x74
  k1  → rank=11, file=10 → 11*16 + 10 = 0xBA
```

---

## Piece Representation

### Piece Type Definition

```typescript
// src/core/Piece.ts
export type Piece = {
  color: Color // 'r' (red) | 'b' (blue)
  type: PieceSymbol // Piece type symbol
  carrying?: Piece[] // Optional: carried pieces (for stacks)
  heroic?: boolean // Optional: heroic status
}

export type Color = 'r' | 'b'

export type PieceSymbol =
  | 'c' // Commander
  | 'i' // Infantry
  | 't' // Tank
  | 'm' // Militia
  | 'e' // Engineer
  | 'a' // Artillery
  | 'g' // Anti-Air (Guard)
  | 's' // Missile (Special weapon)
  | 'f' // Air Force (Fighter)
  | 'n' // Navy
  | 'h' // Headquarter
```

### Piece Examples

```typescript
// 1. Simple piece (no stack, not heroic)
const infantry: Piece = {
  color: 'r',
  type: 'i',
}

// 2. Heroic piece
const heroicTank: Piece = {
  color: 'b',
  type: 't',
  heroic: true,
}

// 3. Stack (2 pieces)
const tankStack: Piece = {
  color: 'r',
  type: 't', // Tank is the carrier
  carrying: [
    { color: 'r', type: 'i' }, // Infantry is carried
  ],
}

// 4. Large stack (3 pieces)
const navyStack: Piece = {
  color: 'b',
  type: 'n', // Navy is the carrier
  carrying: [
    { color: 'b', type: 't' }, // Tank
    { color: 'b', type: 'i' }, // Infantry
  ],
}

// 5. Heroic stack
const heroicStack: Piece = {
  color: 'r',
  type: 'f', // Air Force (carrier)
  heroic: true, // Heroic status
  carrying: [
    { color: 'r', type: 't' }, // Tank (NOT heroic)
  ],
}

// Note: Only the CARRIER has heroic status, not carried pieces!
```

### Stack Rules

1. **Carrier:** The top piece (the `type` field)
2. **Carried:** Pieces in the `carrying` array
3. **Flatten:** To get all pieces in a stack:

   ```typescript
   function flattenStack(piece: Piece): Piece[] {
     const result = [
       { color: piece.color, type: piece.type, heroic: piece.heroic },
     ]
     if (piece.carrying) {
       result.push(...piece.carrying)
     }
     return result
   }
   ```

4. **Heroic:** Only the carrier can be heroic
5. **Movement:** Stack moves as the carrier piece type
6. **Deploy:** Stack can be split into individual pieces

---

## Board Class Implementation

```typescript
// src/core/Board.ts
export class Board {
  // Primary storage: 16x16 array
  private squares: (Piece | null)[] = new Array(256).fill(null)

  // Auxiliary: Piece lists for fast iteration
  private redPieces: Set<number> = new Set()
  private bluePieces: Set<number> = new Set()

  /**
   * Get piece at square.
   * @param square - Square index (0x00 to 0xBA for valid squares)
   */
  get(square: number): Piece | null {
    return this.squares[square]
  }

  /**
   * Set piece at square.
   * Automatically updates piece lists.
   */
  set(square: number, piece: Piece | null): void {
    // Remove from old lists
    this.redPieces.delete(square)
    this.bluePieces.delete(square)

    // Set piece
    this.squares[square] = piece

    // Add to new list
    if (piece !== null) {
      if (piece.color === 'r') {
        this.redPieces.add(square)
      } else {
        this.bluePieces.add(square)
      }
    }
  }

  /**
   * Iterate over pieces efficiently.
   * Uses piece lists (O(pieces) not O(squares)).
   */
  *pieces(color?: Color): Generator<[number, Piece]> {
    const squares =
      color === 'r'
        ? this.redPieces
        : color === 'b'
          ? this.bluePieces
          : new Set([...this.redPieces, ...this.bluePieces])

    for (const square of squares) {
      const piece = this.squares[square]
      if (piece !== null) {
        yield [square, piece]
      }
    }
  }

  /**
   * Check if square index is valid.
   * Valid: files 0-10, ranks 0-11
   */
  isValid(square: number): boolean {
    const file = square & 0x0f // Last 4 bits
    const rank = square >> 4 // First 4 bits
    return file < 11 && rank < 12
  }

  /**
   * Initialize board with starting position.
   */
  static initial(): Board {
    const board = new Board()
    // ... parse DEFAULT_POSITION FEN and populate
    return board
  }

  /**
   * Clone board (deep copy).
   */
  clone(): Board {
    const cloned = new Board()
    cloned.squares = [...this.squares]
    cloned.redPieces = new Set(this.redPieces)
    cloned.bluePieces = new Set(this.bluePieces)
    return cloned
  }

  /**
   * Flatten stack into array of individual pieces.
   */
  flattenStack(piece: Piece): Piece[] {
    const result: Piece[] = [
      { color: piece.color, type: piece.type, heroic: piece.heroic },
    ]

    if (piece.carrying) {
      for (const carried of piece.carrying) {
        result.push(...this.flattenStack(carried))
      }
    }

    return result
  }

  /**
   * Count total pieces in stack.
   */
  getStackSize(piece: Piece): number {
    return 1 + (piece.carrying?.length || 0)
  }

  /**
   * Check if piece is a stack.
   */
  isStack(piece: Piece): boolean {
    return piece.carrying !== undefined && piece.carrying.length > 0
  }
}
```

---

## Square Utilities

```typescript
// src/utils/square.ts

/**
 * Convert algebraic notation to square index.
 * @example 'e5' → 0x74
 */
export function algebraicToSquare(notation: string): number {
  const file = notation.charCodeAt(0) - 'a'.charCodeAt(0) // a=0, b=1, ..., k=10
  const rank = 12 - parseInt(notation.substring(1)) // 12=0, 11=1, ..., 1=11
  return (rank << 4) | file
}

/**
 * Convert square index to algebraic notation.
 * @example 0x74 → 'e5'
 */
export function squareToAlgebraic(square: number): string {
  const file = square & 0x0f
  const rank = 12 - (square >> 4)
  return String.fromCharCode('a'.charCodeAt(0) + file) + rank
}

/**
 * Check if square index is valid.
 */
export function isValidSquare(square: number): boolean {
  const file = square & 0x0f
  const rank = square >> 4
  return file < 11 && rank < 12
}

/**
 * Get file (0-10) from square.
 */
export function getFile(square: number): number {
  return square & 0x0f
}

/**
 * Get rank (0-11) from square.
 */
export function getRank(square: number): number {
  return square >> 4
}

/**
 * Get file letter ('a'-'k') from square.
 */
export function getFileLetter(square: number): string {
  return String.fromCharCode('a'.charCodeAt(0) + (square & 0x0f))
}

/**
 * Get rank number (1-12) from square.
 */
export function getRankNumber(square: number): number {
  return 12 - (square >> 4)
}

// Direction offsets for move generation
export const NORTH = -16
export const SOUTH = 16
export const EAST = 1
export const WEST = -1
export const NORTH_EAST = -15
export const NORTH_WEST = -17
export const SOUTH_EAST = 17
export const SOUTH_WEST = 15

export const ORTHOGONAL = [NORTH, SOUTH, EAST, WEST]
export const DIAGONAL = [NORTH_EAST, NORTH_WEST, SOUTH_EAST, SOUTH_WEST]
export const ALL_DIRECTIONS = [...ORTHOGONAL, ...DIAGONAL]
```

---

## Performance Characteristics

### Memory Usage

```
Array size: 256 squares × 8 bytes = 2KB (piece references)
Piece lists: ~38 pieces × 4 bytes = 152 bytes (red + blue sets)
Total: ~2.2KB per board
```

### Time Complexity

| Operation                 | Complexity | Notes                                |
| ------------------------- | ---------- | ------------------------------------ |
| `get(square)`             | O(1)       | Array lookup                         |
| `set(square, piece)`      | O(1)       | Array set + set add/delete           |
| `pieces(color)`           | O(n)       | n = number of pieces (~19 per color) |
| `isValid(square)`         | O(1)       | Bit operations                       |
| Iteration over all pieces | O(38)      | NOT O(132) thanks to piece lists     |

**Key advantage:** Piece lists make iteration O(pieces) instead of O(squares),
which is 3.5x faster (38 vs 132).

---

## Comparison: Mailbox vs Bitboards

### Why NOT Bitboards for CoTuLenh

1. **Stacks:** Can't represent nested pieces in bitboards
2. **Stay captures:** Attack squares ≠ move squares
3. **Variable blocking:** Different rules per piece type
4. **Terrain zones:** Complex access rules (water/land)
5. **Circular ranges:** Air defense uses distance, not rays
6. **Board size:** 11x12 = 132 squares (not power of 2)

### Similar Games Use Mailbox

- **Xiangqi (9x10):** Mailbox + piece lists
- **Shogi (9x9):** Mailbox + piece lists
- **Even top engines** use mailbox for complex variants

**Conclusion:** Mailbox is the right choice for CoTuLenh!

---

## Summary

### Correct Terminology

❌ **WRONG:** "0x88 board representation"  
✅ **RIGHT:** "16x16 mailbox array representation"

### Piece Structure

```typescript
type Piece = {
  color: 'r' | 'b'
  type: PieceSymbol
  carrying?: Piece[] // Optional: for stacks
  heroic?: boolean // Optional: for heroic status
}
```

### Board Structure

```typescript
class Board {
  private squares: (Piece | null)[] // 256-element array
  private redPieces: Set<number> // Red piece squares
  private bluePieces: Set<number> // Blue piece squares

  get(square: number): Piece | null
  set(square: number, piece: Piece | null): void
  pieces(color?: Color): Generator<[number, Piece]>
}
```

### Square Encoding

```
square = rank * 16 + file
file = square & 0x0F
rank = square >> 4

Valid: file < 11 && rank < 12
```

This representation is fast, simple, and perfect for CoTuLenh's complex rules!
🎯
