import { createAllPieceSubsets, makeSanPiece } from '../src/utils'
import { makePiece } from './test-helpers'
import {
  INFANTRY,
  TANK,
  NAVY,
  RED,
  Piece,
  AIR_FORCE,
  MILITIA,
} from '../src/type'

// Helper function to check if a piece with specific properties exists in the subsets
const hasSubsetWithTypes = (
  subsets: Piece[],
  mainType: string,
  carryingTypes: string[] = [],
) => {
  const found = subsets.some((piece) => {
    // Check main piece type
    if (piece.type !== mainType) return false

    // Check carrying pieces
    const carrying = piece.carrying || []
    if (carrying.length !== carryingTypes.length) return false

    // Check if all expected carrying types are present
    return carryingTypes.every((type) => carrying.some((p) => p.type === type))
  })

  if (!found) {
    console.log(
      `Missing subset: ${mainType} with carrying [${carryingTypes.join(', ')}]`,
    )
  }

  return found
}

describe('createAllPieceSubsets', () => {
  it('should return just the piece itself for a single piece', () => {
    const piece = makePiece(INFANTRY, RED)
    const subsets = createAllPieceSubsets(piece)

    expect(subsets).toHaveLength(1)
    expect(subsets[0]).toEqual(piece)
  })

  it('should return all possible subsets for a piece with one carried piece', () => {
    const carriedPiece = makePiece(INFANTRY, RED)
    const carrierPiece = makePiece(TANK, RED, false, [carriedPiece])

    const subsets = createAllPieceSubsets(carrierPiece)

    // Should have 3 subsets: (T|I), (T), (I)
    expect(subsets).toHaveLength(3)

    // Check if the original piece is included
    expect(subsets).toContainEqual(carrierPiece)

    // Check if individual pieces are included
    const tankOnly = makePiece(TANK, RED)
    const infantryOnly = makePiece(INFANTRY, RED)

    expect(subsets).toContainEqual(tankOnly)
    expect(subsets).toContainEqual(infantryOnly)
  })

  it('should return all possible subsets for a piece with two carried pieces', () => {
    const infantry = makePiece(INFANTRY, RED)
    const tank = makePiece(TANK, RED)
    const navy = makePiece(NAVY, RED, false, [infantry, tank])

    // Log the original piece structure
    console.log('Original piece:', JSON.stringify(navy, null, 2))
    console.log('Original piece as string:', makeSanPiece(navy, true))

    const subsets = createAllPieceSubsets(navy)

    // Expected subsets: (N|IT), (N|I), (N|T), (I|T), (N), (I), (T)
    // We'll check each one individually

    // Check each expected subset
    const expectations = [
      { main: NAVY, carrying: [INFANTRY, TANK] }, // (N|IT)
      { main: NAVY, carrying: [INFANTRY] }, // (N|I)
      { main: NAVY, carrying: [TANK] }, // (N|T)
      { main: TANK, carrying: [INFANTRY] }, // (T|I)
      { main: NAVY, carrying: [] }, // (N)
      { main: INFANTRY, carrying: [] }, // (I)
      { main: TANK, carrying: [] }, // (T)
    ]

    expectations.forEach((exp) => {
      expect(hasSubsetWithTypes(subsets, exp.main, exp.carrying)).toBe(true)
    })

    // Verify we have exactly the expected number of subsets
    expect(subsets).toHaveLength(expectations.length)
  })

  it('should return correctly when carrying piece cannot combined', () => {
    const carriedPieceInfatry = makePiece(INFANTRY, RED)
    const carriedPieceMilitia = makePiece(MILITIA, RED)
    const carrierPiece = makePiece(AIR_FORCE, RED, false, [
      carriedPieceInfatry,
      carriedPieceMilitia,
    ])

    const subsets = createAllPieceSubsets(carrierPiece)

    // Expected subsets: (F|IM), (F|I), (F|M), (F), (I), (M)

    const expectations = [
      { main: AIR_FORCE, carrying: [INFANTRY, MILITIA] }, // (F|IM)
      { main: AIR_FORCE, carrying: [INFANTRY] }, // (F|I)
      { main: AIR_FORCE, carrying: [MILITIA] }, // (F|M)
      { main: AIR_FORCE, carrying: [] }, // (F)
      { main: INFANTRY, carrying: [] }, // (I)
      { main: MILITIA, carrying: [] }, // (M)
    ]

    expectations.forEach((exp) => {
      expect(hasSubsetWithTypes(subsets, exp.main, exp.carrying)).toBe(true)
    })

    // Verify we have exactly the expected number of subsets
    expect(subsets).toHaveLength(expectations.length)
  })
})
