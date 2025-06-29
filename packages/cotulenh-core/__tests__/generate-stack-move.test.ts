import { createAllPieceSplits, makeSanPiece } from '../src/utils'
import { makePiece, setupGameBasic } from './test-helpers'
import {
  INFANTRY,
  TANK,
  NAVY,
  RED,
  Piece,
  AIR_FORCE,
  MILITIA,
  BITS,
  SQUARE_MAP,
  algebraic,
  COMMANDER,
  BLUE,
} from '../src/type'
import { generateStackSplitMoves, InternalDeployMove } from '../src/deploy-move'
import { CoTuLenh } from '../src/cotulenh'

// Helper function to extract all unique subsets from the splits
const extractSubsetsFromSplits = (splits: Piece[][]): Piece[] => {
  // Use a Set to store unique pieces (by their string representation)
  const uniquePiecesMap = new Map<string, Piece>()

  // Flatten all splits and add each piece to the set
  splits.forEach((split) => {
    split.forEach((piece) => {
      const pieceKey = makeSanPiece(piece, true)
      if (!uniquePiecesMap.has(pieceKey)) {
        uniquePiecesMap.set(pieceKey, piece)
      }
    })
  })

  // Convert the set back to an array
  return Array.from(uniquePiecesMap.values())
}

// Helper function to get all subsets of a piece using the new combined function
const createAllPieceSubsets = (piece: Piece): Piece[] => {
  const splits = createAllPieceSplits(piece)
  return extractSubsetsFromSplits(splits)
}

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

    // // Log the original piece structure
    // console.log('Original piece:', JSON.stringify(navy, null, 2))
    // console.log('Original piece as string:', makeSanPiece(navy, true))

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

// Helper function to check if a specific split exists in the result
const hasSplitWithTypes = (
  splits: Piece[][],
  expectedSplit: Array<{ main: string; carrying: string[] }>,
) => {
  const found = splits.some((split) => {
    // Check if the split has the same length as the expected split
    if (split.length !== expectedSplit.length) return false

    // For each expected piece in the split, check if there's a matching piece in the actual split
    return expectedSplit.every((expectedPiece) => {
      return split.some((actualPiece) => {
        // Check main piece type
        if (actualPiece.type !== expectedPiece.main) return false

        // Check carrying pieces
        const carrying = actualPiece.carrying || []
        if (carrying.length !== expectedPiece.carrying.length) return false

        // Check if all expected carrying types are present
        return expectedPiece.carrying.every((type) =>
          carrying.some((p) => p.type === type),
        )
      })
    })
  })

  if (!found) {
    console.log(
      `Missing split: [${expectedSplit
        .map(
          (p) =>
            `${p.main}${p.carrying.length > 0 ? `|${p.carrying.join('')}` : ''}`,
        )
        .join(', ')}]`,
    )
  }

  return found
}

describe('createAllPieceSplits', () => {
  it('should return just the piece itself for a single piece', () => {
    const piece = makePiece(INFANTRY, RED)
    const splits = createAllPieceSplits(piece)

    expect(splits).toHaveLength(1)
    expect(splits[0]).toHaveLength(1)
    expect(splits[0][0]).toEqual(piece)
  })

  it('should return all possible splits for a piece with one carried piece', () => {
    const carriedPiece = makePiece(INFANTRY, RED)
    const carrierPiece = makePiece(TANK, RED, false, [carriedPiece])

    const splits = createAllPieceSplits(carrierPiece)

    // Expected splits: [(T|I)], [(T), (I)]
    const expectations = [
      [{ main: TANK, carrying: [INFANTRY] }], // [(T|I)]
      [
        { main: TANK, carrying: [] },
        { main: INFANTRY, carrying: [] },
      ], // [(T), (I)]
    ]

    expectations.forEach((exp) => {
      expect(hasSplitWithTypes(splits, exp)).toBe(true)
    })

    // Verify we have exactly the expected number of splits
    expect(splits).toHaveLength(expectations.length)
  })

  it('should return all possible splits for a piece with two carried pieces', () => {
    const infantry = makePiece(INFANTRY, RED)
    const tank = makePiece(TANK, RED)
    const navy = makePiece(NAVY, RED, false, [infantry, tank])

    const splits = createAllPieceSplits(navy)

    // Expected splits:
    // [(N|IT)],
    // [(N|I), (T)],
    // [(N|T), (I)],
    // [(N), (I|T)],
    // [(N), (I), (T)]
    const expectations = [
      [{ main: NAVY, carrying: [INFANTRY, TANK] }], // [(N|IT)]
      [
        { main: NAVY, carrying: [INFANTRY] },
        { main: TANK, carrying: [] },
      ], // [(N|I), (T)]
      [
        { main: NAVY, carrying: [TANK] },
        { main: INFANTRY, carrying: [] },
      ], // [(N|T), (I)]
      [
        { main: NAVY, carrying: [] },
        { main: TANK, carrying: [INFANTRY] },
      ], // [(N), (T|I)]
      [
        { main: NAVY, carrying: [] },
        { main: INFANTRY, carrying: [] },
        { main: TANK, carrying: [] },
      ], // [(N), (I), (T)]
    ]

    expectations.forEach((exp) => {
      expect(hasSplitWithTypes(splits, exp)).toBe(true)
    })

    // Verify we have exactly the expected number of splits
    expect(splits).toHaveLength(expectations.length)
  })
})

describe('generateStackSplitMoves', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  it('should return empty array for empty square', () => {
    const moves = generateStackSplitMoves(game, SQUARE_MAP.e5)

    expect(moves).toEqual([])
  })

  // it('should generate moves for a single piece', () => {
  //   const infantry = makePiece(INFANTRY, RED)
  //   game.put(infantry, 'e5')

  //   const moves = generateStackSplitMoves(game, SQUARE_MAP.e5)

  //   // Verify we have moves
  //   expect(moves.length).toBeGreaterThan(0)

  //   // Check that all moves have the correct from square
  //   moves.forEach((move) => {
  //     expect(move.from).toBe(square)
  //   })
  // })

  it('should generate moves for a stack with two pieces', () => {
    const infantry = makePiece(INFANTRY, RED)
    const tank = makePiece(TANK, RED, false, [infantry])
    game.put(tank, 'e5')

    const moves = generateStackSplitMoves(game, SQUARE_MAP.e5)

    moves.forEach((move) => {
      console.log(
        move.moves.reduce(
          (acc, m) => acc + ',' + makeSanPiece(m.piece) + ':' + algebraic(m.to),
          'e5-',
        ) +
          '---' +
          (move.stay === undefined ? 'none' : move.stay.type),
      )
    })

    // Verify we have moves
    expect(moves.length).toBe(48)

    // Check that we have moves where pieces stay
    const movesWithStay = moves.filter((move) => move.stay !== undefined)
    expect(movesWithStay.length).toBe(12)

    const setFen = new Set<string>()
    moves.forEach((move) => {
      game['_makeMove'](move)
      setFen.add(game.fen())
      game.undo()
    })
    expect(setFen.size === moves.length).toBe(true)
  })

  it('should generate moves for a complex stack with three pieces', () => {
    // game = setupGameBasic()
    game.put(makePiece(COMMANDER, RED), 'g12')
    game.put(makePiece(COMMANDER, BLUE), 'g1')
    const infantry = makePiece(INFANTRY, RED)
    const militia = makePiece(TANK, RED)
    const airForce = makePiece(AIR_FORCE, RED, false, [infantry, militia])
    game.put(airForce, 'g6')

    const moves = generateStackSplitMoves(game, SQUARE_MAP.g6)

    const cacheKey = (dm: InternalDeployMove): string => {
      return (
        dm.moves.reduce(
          (acc, m) => acc + makeSanPiece(m.piece) + ':' + algebraic(m.to) + ',',
          '',
        ) + (dm.stay ? '---' + makeSanPiece(dm.stay) : '')
      )
    }
    const setKey = new Set<string>()
    moves.forEach((move) => {
      setKey.add(cacheKey(move))
    })
    expect(setKey.size === moves.length).toBe(true)

    const setFen = new Set<string>()
    moves.forEach((move) => {
      game['_makeMove'](move)
      setFen.add(game.fen())
      game.undo()
    })
    expect(setFen.size === moves.length).toBe(true)

    // Verify we have moves
    expect(moves.length).toBeGreaterThan(0)

    // Check that we have different types of moves
    const movesWithOneStay = moves.filter(
      (move) => move.stay !== undefined && move.moves.length > 0,
    )
    expect(movesWithOneStay.length).toBeGreaterThan(0)

    // Check that all moves have the DEPLOY flag set
    moves.forEach((move) => {
      move.moves.forEach((internalMove) => {
        expect(internalMove.flags & BITS.DEPLOY).toBeTruthy()
      })
    })
    console.time('filterLegalMoves')
    const legal = game['_filterLegalMoves'](moves, RED)
    console.timeEnd('filterLegalMoves')
    expect(legal.length).toBeGreaterThan(0)
  })

  it('should handle navy pieces correctly based on terrain', () => {
    // Navy can only stay on water squares
    const infantry = makePiece(INFANTRY, RED)
    const navy = makePiece(NAVY, RED, false, [infantry])

    // Place on water square (assuming 'k5' is a water square in your game)
    game.put(navy, 'b3')

    const moves = generateStackSplitMoves(game, SQUARE_MAP.b3)

    // Check that navy can stay on water
    const movesWithNavyStaying = moves.filter(
      (move) => move.stay !== undefined && move.stay.type === NAVY,
    )
    expect(movesWithNavyStaying.length).toBeGreaterThan(0)

    // Now place on land square
    const landGame = setupGameBasic()
    const landSquare = SQUARE_MAP['e5']
    landGame.put(navy, 'e5')

    const landMoves = generateStackSplitMoves(landGame, landSquare)

    // Check that navy cannot stay on land
    const landMovesWithNavyStaying = landMoves.filter(
      (move) => move.stay !== undefined && move.stay.type === NAVY,
    )
    expect(landMovesWithNavyStaying.length).toBe(0)
  })
})
