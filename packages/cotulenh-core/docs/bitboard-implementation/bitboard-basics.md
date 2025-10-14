# Bitboard Basics for CoTuLenh

## What Are Bitboards?

A bitboard is a **256-bit integer** where each bit represents a square on the
CoTuLenh board. If a bit is set (1), it means something is present at that
square. If it's clear (0), the square is empty or doesn't have that property.

```typescript
type Bitboard = bigint // 256-bit integer in JavaScript/TypeScript

// Example: Red Tank at e5
const redTankBitboard = 1n << 69n // Bit 69 represents square e5
```

## CoTuLenh Board Mapping

### 12x12 Board to 256-bit Space

CoTuLenh uses a 12x12 board (144 squares), but we map it to a 256-bit space for
CPU alignment and efficiency:

```
Rank 11: a11 b11 c11 d11 e11 f11 g11 h11 i11 j11 k11 l11 --- --- --- ---
Rank 10: a10 b10 c10 d10 e10 f10 g10 h10 i10 j10 k10 l10 --- --- --- ---
...
Rank  1: a1  b1  c1  d1  e1  f1  g1  h1  i1  j1  k1  l1  --- --- --- ---
Rank  0: a0  b0  c0  d0  e0  f0  g0  h0  i0  j0  k0  l0  --- --- --- ---

Bit positions: 0-255 (16 bits per rank, 12 used + 4 padding)
```

### Square to Bit Conversion

```typescript
// Convert file/rank to bit position
function squareToBit(file: number, rank: number): number {
  return rank * 16 + file // Row-major order with padding
}

// Convert bit position back to file/rank
function bitToSquare(bit: number): [number, number] {
  const rank = Math.floor(bit / 16)
  const file = bit % 16
  return [file, rank]
}

// Create bitboard with single bit set
function singleBit(file: number, rank: number): Bitboard {
  return 1n << BigInt(squareToBit(file, rank))
}

// Check if square is occupied in bitboard
function isSet(bitboard: Bitboard, file: number, rank: number): boolean {
  return (bitboard & singleBit(file, rank)) !== 0n
}

// Set a square in bitboard
function setBit(bitboard: Bitboard, file: number, rank: number): Bitboard {
  return bitboard | singleBit(file, rank)
}

// Clear a square in bitboard
function clearBit(bitboard: Bitboard, file: number, rank: number): Bitboard {
  return bitboard & ~singleBit(file, rank)
}
```

## Essential Bitboard Operations

### Basic Bit Manipulation

```typescript
class BitboardUtils {
  // Count number of pieces (population count)
  static popCount(bitboard: Bitboard): number {
    let count = 0
    let temp = bitboard

    while (temp !== 0n) {
      count++
      temp &= temp - 1n // Clear lowest set bit
    }

    return count
  }

  // Find lowest set bit (first piece)
  static getLowestSetBit(bitboard: Bitboard): number {
    if (bitboard === 0n) return -1

    let count = 0
    let temp = bitboard

    while ((temp & 1n) === 0n) {
      temp >>= 1n
      count++
    }

    return count
  }

  // Get all set bit positions
  static getBitPositions(bitboard: Bitboard): number[] {
    const positions: number[] = []
    let temp = bitboard

    while (temp !== 0n) {
      const pos = this.getLowestSetBit(temp)
      positions.push(pos)
      temp &= temp - 1n // Clear lowest bit
    }

    return positions
  }

  // Check if exactly one bit is set
  static isOneBitSet(bitboard: Bitboard): boolean {
    return bitboard !== 0n && (bitboard & (bitboard - 1n)) === 0n
  }

  // Check if bitboard is empty
  static isEmpty(bitboard: Bitboard): boolean {
    return bitboard === 0n
  }
}
```

### Bitboard Shifts (for ray generation)

```typescript
class BitboardShifts {
  // File masks to prevent wrap-around
  private static readonly FILE_A_MASK =
    0x0001000100010001000100010001000100010001000100010001000100010001n
  private static readonly FILE_L_MASK =
    0x0800080008000800080008000800080008000800080008000800080008000800n

  // Shift one rank north (up)
  static shiftNorth(bitboard: Bitboard): Bitboard {
    return bitboard << 16n
  }

  // Shift one rank south (down)
  static shiftSouth(bitboard: Bitboard): Bitboard {
    return bitboard >> 16n
  }

  // Shift one file east (right)
  static shiftEast(bitboard: Bitboard): Bitboard {
    return (bitboard << 1n) & ~this.FILE_A_MASK
  }

  // Shift one file west (left)
  static shiftWest(bitboard: Bitboard): Bitboard {
    return (bitboard >> 1n) & ~this.FILE_L_MASK
  }

  // Diagonal shifts
  static shiftNorthEast(bitboard: Bitboard): Bitboard {
    return this.shiftNorth(this.shiftEast(bitboard))
  }

  static shiftNorthWest(bitboard: Bitboard): Bitboard {
    return this.shiftNorth(this.shiftWest(bitboard))
  }

  static shiftSouthEast(bitboard: Bitboard): Bitboard {
    return this.shiftSouth(this.shiftEast(bitboard))
  }

  static shiftSouthWest(bitboard: Bitboard): Bitboard {
    return this.shiftSouth(this.shiftWest(bitboard))
  }
}
```

## Piece Representation

### Individual Piece Bitboards

```typescript
interface PieceTypeBitboards {
  commander: Bitboard
  tank: Bitboard
  artillery: Bitboard
  navy: Bitboard
  airForce: Bitboard
  infantry: Bitboard
  militia: Bitboard
  headquarter: Bitboard
}

interface ColorBitboards {
  red: PieceTypeBitboards
  blue: PieceTypeBitboards
}

class GameBitboards {
  private pieces: ColorBitboards
  private heroicPieces: Bitboard = 0n

  // Get all pieces of a color
  getColorBitboard(color: Color): Bitboard {
    const colorPieces = this.pieces[color]
    return (
      colorPieces.commander |
      colorPieces.tank |
      colorPieces.artillery |
      colorPieces.navy |
      colorPieces.airForce |
      colorPieces.infantry |
      colorPieces.militia |
      colorPieces.headquarter
    )
  }

  // Get all occupied squares
  getAllPieces(): Bitboard {
    return this.getColorBitboard('red') | this.getColorBitboard('blue')
  }

  // Get piece type at square
  getPieceTypeAt(square: number): PieceSymbol | null {
    const bit = 1n << BigInt(square)

    // Check red pieces
    if (this.pieces.red.commander & bit) return COMMANDER
    if (this.pieces.red.tank & bit) return TANK
    if (this.pieces.red.artillery & bit) return ARTILLERY
    if (this.pieces.red.navy & bit) return NAVY
    if (this.pieces.red.airForce & bit) return AIR_FORCE
    if (this.pieces.red.infantry & bit) return INFANTRY
    if (this.pieces.red.militia & bit) return MILITIA
    if (this.pieces.red.headquarter & bit) return HEADQUARTER

    // Check blue pieces
    if (this.pieces.blue.commander & bit) return COMMANDER
    if (this.pieces.blue.tank & bit) return TANK
    if (this.pieces.blue.artillery & bit) return ARTILLERY
    if (this.pieces.blue.navy & bit) return NAVY
    if (this.pieces.blue.airForce & bit) return AIR_FORCE
    if (this.pieces.blue.infantry & bit) return INFANTRY
    if (this.pieces.blue.militia & bit) return MILITIA
    if (this.pieces.blue.headquarter & bit) return HEADQUARTER

    return null
  }

  // Check if piece is heroic
  isHeroic(square: number): boolean {
    const bit = 1n << BigInt(square)
    return (this.heroicPieces & bit) !== 0n
  }

  // Set piece as heroic
  setHeroic(square: number): void {
    const bit = 1n << BigInt(square)
    this.heroicPieces |= bit
  }

  // Remove heroic status
  clearHeroic(square: number): void {
    const bit = 1n << BigInt(square)
    this.heroicPieces &= ~bit
  }
}
```

## Bitboard Visualization

### Debug Printing

```typescript
class BitboardDebug {
  // Print bitboard as 12x12 grid
  static printBitboard(bitboard: Bitboard, label: string = ''): void {
    console.log(`\n${label}:`)
    console.log('   a b c d e f g h i j k l')

    for (let rank = 11; rank >= 0; rank--) {
      let line = `${rank.toString().padStart(2)}: `

      for (let file = 0; file < 12; file++) {
        const bit = squareToBit(file, rank)
        const isSet = (bitboard & (1n << BigInt(bit))) !== 0n
        line += isSet ? '1 ' : '. '
      }

      console.log(line)
    }

    console.log(`Population count: ${BitboardUtils.popCount(bitboard)}`)
  }

  // Print multiple bitboards side by side
  static printMultipleBitboards(bitboards: { [key: string]: Bitboard }): void {
    const labels = Object.keys(bitboards)
    const maxLabelLength = Math.max(...labels.map((l) => l.length))

    console.log('\n' + labels.map((l) => l.padEnd(maxLabelLength + 2)).join(''))
    console.log(
      labels
        .map((l) => '   a b c d e f g h i j k l'.padEnd(maxLabelLength + 2))
        .join(''),
    )

    for (let rank = 11; rank >= 0; rank--) {
      let line = ''

      for (const label of labels) {
        const bitboard = bitboards[label]
        let rankLine = `${rank.toString().padStart(2)}: `

        for (let file = 0; file < 12; file++) {
          const bit = squareToBit(file, rank)
          const isSet = (bitboard & (1n << BigInt(bit))) !== 0n
          rankLine += isSet ? '1 ' : '. '
        }

        line += rankLine.padEnd(maxLabelLength + 2)
      }

      console.log(line)
    }
  }

  // Convert bitboard to algebraic notation list
  static bitboardToSquares(bitboard: Bitboard): string[] {
    const squares: string[] = []
    const positions = BitboardUtils.getBitPositions(bitboard)

    for (const pos of positions) {
      const [file, rank] = bitToSquare(pos)
      const fileChar = String.fromCharCode('a'.charCodeAt(0) + file)
      squares.push(`${fileChar}${rank}`)
    }

    return squares.sort()
  }
}
```

## Performance Considerations

### Memory Layout

```typescript
// Efficient bitboard storage
class CompactBitboards {
  // Store all bitboards in a single array for cache efficiency
  private data: BigUint64Array

  // Offsets for different bitboard types
  private static readonly RED_COMMANDER = 0
  private static readonly RED_TANK = 4 // Each bitboard takes 4 64-bit words
  private static readonly RED_ARTILLERY = 8
  // ... etc

  constructor() {
    // Allocate space for all bitboards at once
    this.data = new BigUint64Array(64) // 16 piece types × 4 words each
  }

  getBitboard(type: PieceSymbol, color: Color): Bitboard {
    const offset = this.getOffset(type, color)

    // Reconstruct 256-bit bigint from 4 64-bit words
    return (
      (BigInt(this.data[offset + 3]) << 192n) |
      (BigInt(this.data[offset + 2]) << 128n) |
      (BigInt(this.data[offset + 1]) << 64n) |
      BigInt(this.data[offset])
    )
  }

  setBitboard(type: PieceSymbol, color: Color, bitboard: Bitboard): void {
    const offset = this.getOffset(type, color)

    // Split 256-bit bigint into 4 64-bit words
    this.data[offset] = Number(bitboard & 0xffffffffffffffffn)
    this.data[offset + 1] = Number((bitboard >> 64n) & 0xffffffffffffffffn)
    this.data[offset + 2] = Number((bitboard >> 128n) & 0xffffffffffffffffn)
    this.data[offset + 3] = Number((bitboard >> 192n) & 0xffffffffffffffffn)
  }
}
```

### CPU Optimization

```typescript
// Use native bit manipulation when available
class OptimizedBitboards {
  // Use Math.clz32 for faster bit scanning on some platforms
  static fastGetLowestSetBit(bitboard: Bitboard): number {
    if (bitboard === 0n) return -1

    // Convert to number for platforms with fast bit operations
    const low32 = Number(bitboard & 0xffffffffn)
    if (low32 !== 0) {
      return 31 - Math.clz32(low32 & -low32)
    }

    // Fall back to BigInt operations for higher bits
    return this.slowGetLowestSetBit(bitboard)
  }

  // Batch operations for better performance
  static batchPopCount(bitboards: Bitboard[]): number[] {
    return bitboards.map((bb) => BitboardUtils.popCount(bb))
  }
}
```

## Common Patterns

### Iterating Through Set Bits

```typescript
// Process all pieces in a bitboard
function processPieces(pieceBitboard: Bitboard): void {
  let pieces = pieceBitboard

  while (pieces !== 0n) {
    const square = BitboardUtils.getLowestSetBit(pieces)
    pieces &= pieces - 1n // Clear the bit we just processed

    // Process piece at square
    console.log(`Piece at square ${square}`)
  }
}
```

### Combining Bitboards

```typescript
// Union (OR) - combine multiple bitboards
const allRedPieces = redTanks | redArtillery | redNavy

// Intersection (AND) - find common squares
const attackedSquares = enemyAttacks & friendlyPieces

// Difference (AND NOT) - remove squares
const validMoves = possibleMoves & ~friendlyPieces

// XOR - toggle bits
const afterMove = beforeMove ^ fromBit ^ toBit
```

This foundation gives us everything we need to build the ultra-fast CoTuLenh
engine! 🚀
