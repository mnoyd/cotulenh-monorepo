import { beforeEach, describe, expect, it } from 'vitest'
import { CoTuLenh, Move } from '../src/cotulenh'

import {
  RED,
  BLUE,
  NAVY,
  AIR_FORCE,
  TANK,
  COMMANDER,
  Square,
  INFANTRY,
  Piece,
  MILITIA,
  InternalMove,
} from '../src/type'
import { combinePieces } from '../src/utils'
import { findVerboseMove, makePiece, setupGameBasic } from './test-helpers'

describe('Stack Movement and Deployment', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear() // Start with an empty board for specific setups
    //need to put commander for a legal move (a legal move is a move that don't cause a check)
    game.put({ type: COMMANDER, color: RED }, 'g1')
    game.put({ type: COMMANDER, color: BLUE }, 'h12')
  })

  it('Generate deploy moves for (NFT) stack', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: TANK,
        color: RED,
        carrying: [{ type: INFANTRY, color: RED } as Piece],
      } as Piece,
      'c1',
    )

    game['_turn'] = RED // Set turn for testing

    const moves = game.moves({ verbose: true, square: 'c1' }) as Move[]

    // Expect deploy moves for F and T, plus carrier moves for N
    const deployI_c2 = findVerboseMove(moves, 'c1', 'c2', {
      piece: INFANTRY,
      isDeploy: true,
      isStayCapture: false,
    })

    const deployT_c2 = findVerboseMove(moves, 'c1', 'c2', {
      piece: TANK,
      isDeploy: true,
      isStayCapture: false,
    })

    expect(deployI_c2).toBeDefined()
    expect(deployT_c2).toBeDefined()

    const moveResult = game.move({
      from: 'c1',
      to: 'c2',
      piece: TANK,
      deploy: true,
    })
    expect(moveResult).not.toBeNull()
    expect(game.get('c2')?.type).toBe(TANK)
    expect(game.get('c2')?.color).toBe(RED)
    expect(game.get('c1')?.type).toBe(INFANTRY)
    expect(game.get('c1')?.color).toBe(RED)
    expect(game.get('c1')?.carrying).toBeFalsy()
    expect(game.get('c2')?.carrying).toBeFalsy()
    game.undo()
    expect(game.get('c1')?.type).toBe(TANK)
    expect(game.get('c1')?.color).toBe(RED)
    expect(game.get('c2')).toBeUndefined()
    expect(game.get('c1')?.carrying).toHaveLength(1)
    expect(game.get('c1')?.carrying?.[0].type).toBe(INFANTRY)
    expect(game.get('c1')?.carrying?.[0].color).toBe(RED)
  })

  it('Deploy carrier from (NFT) stack', () => {
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )

    game['_turn'] = RED // Set turn for testing

    const moves = game.moves({ verbose: true, square: 'c3' }) as Move[]

    // Expect deploy moves for F and T, plus carrier moves for N
    const deployF_c4 = findVerboseMove(moves, 'c3', 'c4', {
      piece: AIR_FORCE,
      isDeploy: true,
      isStayCapture: false,
    })
    const deployF_d4 = findVerboseMove(moves, 'c3', 'd4', {
      piece: AIR_FORCE,
      isDeploy: true,
      isStayCapture: false,
    })
    const deployT_c4 = findVerboseMove(moves, 'c3', 'c4', {
      piece: TANK,
      isDeploy: true,
      isStayCapture: false,
    })
    const deployT_d3 = findVerboseMove(moves, 'c3', 'd3', {
      piece: TANK,
      isDeploy: true,
      isStayCapture: false,
    })
    const carrierN_c4 = findVerboseMove(moves, 'c3', 'c4', {
      piece: NAVY,
      isDeploy: false,
      isStayCapture: false,
    })

    expect(deployF_c4).toBeDefined()
    expect(deployF_c4?.isDeploy()).toBe(true)
    expect(deployF_c4?.piece?.type).toBe(AIR_FORCE)

    expect(deployF_d4).toBeDefined() // Check another direction

    expect(deployT_c4).toBeDefined()
    expect(deployT_c4?.isDeploy()).toBe(true)
    expect(deployT_c4?.piece?.type).toBe(TANK)

    expect(deployT_d3).toBeDefined() // Check another direction

    expect(carrierN_c4).toBeDefined()
    expect(carrierN_c4?.isDeploy()).toBe(false)
    expect(carrierN_c4?.piece?.type).toBe(NAVY)

    // Check a non-deploy move is not generated for carrying pieces
    const nonDeployF = findVerboseMove(moves, 'c3', 'c4', {
      piece: AIR_FORCE,
      isDeploy: false,
    })
    expect(nonDeployF).toBeUndefined()
  })

  it('Execute Air Force deploy move from (NFT) stack', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )
    game['_turn'] = RED

    // Find and execute the deploy move for Air Force to c4
    // We need a way to represent deploy moves in the public API.
    // Option 1: Use a special SAN format (requires _moveFromSan update)
    // Option 2: Extend the move object { from, to, piece, isDeploy } (cleaner?)
    // Let's assume we can find the internal move and use the object format for now.

    const deployMove = findVerboseMove(
      game.moves({ verbose: true, square: 'c3' }) as Move[],
      'c3',
      'c4',
      { piece: AIR_FORCE, isDeploy: true },
    )
    expect(deployMove).toBeDefined()

    // Execute using the found Move object (if move() accepts it - needs check)
    // Or construct a simpler object if move() supports it
    const moveResult = game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE }) // Hypothetical API

    expect(moveResult).not.toBeNull()
    expect(game.turn()).toBe(RED) // Turn should NOT change
    expect(game.get('c3')?.type).toBe(NAVY) // Carrier remains
    expect(game.get('c3')?.carrying?.length).toBe(1) // One piece left
    expect(game.get('c3')?.carrying?.[0].type).toBe(TANK) // Tank remains
    expect(game.get('c4')?.type).toBe(AIR_FORCE) // AF deployed
    expect(game.get('c4')?.color).toBe(RED)
    // Cannot check private _deployState directly, check behavior instead
    // After a deploy move, only moves from the stack square should be possible
    const nextMoves = game.moves({ verbose: true }) as Move[]
    expect(nextMoves.every((m) => m.from === 'c3')).toBe(true) // All moves must originate from c3
    expect(
      findVerboseMove(nextMoves, 'c3', 'd3', { piece: TANK, isDeploy: true }),
    ).toBeDefined() // Tank deploy possible
    expect(
      findVerboseMove(nextMoves, 'c3', 'c2', { piece: NAVY, isDeploy: true }),
    ).toBeDefined() // Carrier move possible
  })

  it('Execute Tank deploy move after Air Force deploy', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )
    game['_turn'] = RED

    // Deploy AF first
    const afDeployMove = findVerboseMove(
      game.moves({ verbose: true, square: 'c3' }) as Move[],
      'c3',
      'c4',
      { piece: AIR_FORCE, isDeploy: true },
    )
    expect(afDeployMove).toBeDefined()
    game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })

    expect(game.turn()).toBe(RED) // Still Red's turn

    // Now deploy Tank
    const tankDeployMove = findVerboseMove(
      game.moves({ verbose: true, square: 'c3' }) as Move[],
      'c3',
      'd3',
      { piece: TANK, isDeploy: true },
    )
    expect(tankDeployMove).toBeDefined()
    const moveResult = game.move({
      from: 'c3',
      to: 'd3',
      piece: TANK,
      deploy: true,
    })

    expect(moveResult).not.toBeNull()
    expect(game.turn()).toBe(RED) // Turn should still be Red
    expect(game.get('c3')?.type).toBe(NAVY) // Carrier remains
    expect(game.get('c3')?.carrying).toBeUndefined() // Stack empty
    expect(game.get('c4')?.type).toBe(AIR_FORCE) // Previous deploy
    expect(game.get('d3')?.type).toBe(TANK) // Tank deployed
    expect(game.get('d3')?.color).toBe(RED)
  })

  it('Check deploy state behavior', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )
    game['_turn'] = RED

    // Check deploy state behavior
    const nextMoves = game.moves({ verbose: true }) as Move[]
    expect(
      nextMoves
        .filter((m) => m.piece.type !== COMMANDER)
        .every((m) => m.from === 'c3'),
    ).toBe(true) // All moves must originate from c3 (except Commander)
    expect(
      findVerboseMove(nextMoves, 'c3', 'c2', { piece: NAVY, isDeploy: false }),
    ).toBeDefined() // Carrier move possible
    expect(
      findVerboseMove(nextMoves, 'c3', 'any', { isDeploy: true }),
    ).toBeUndefined() // No more deploy moves
  })

  it('Execute Carrier move after all deployments', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )
    game['_turn'] = RED

    // Deploy AF
    game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE })
    // Deploy T
    game.move({ from: 'c3', to: 'd3', piece: TANK })

    expect(game.turn()).toBe(RED) // Still Red's turn
    expect(game.get('c3')?.carrying).toBeUndefined() // Stack empty

    // Find and execute the carrier move (e.g., Navy c3 to c2)
    const carrierMove = findVerboseMove(
      game.moves({ verbose: true, square: 'c3' }) as Move[],
      'c3',
      'c2',
      { piece: NAVY, isDeploy: true },
    )
    expect(carrierMove).toBeDefined()
    const moveResult = game.move({
      from: 'c3',
      to: 'c2',
      piece: NAVY,
      deploy: true,
    })

    expect(moveResult).not.toBeNull()
    expect(game.turn()).toBe(BLUE) // Turn SHOULD change now
    expect(game.get('c3')).toBeUndefined() // Carrier moved
    expect(game.get('c2')?.type).toBe(NAVY) // Carrier at new location
    expect(game.get('c2')?.carrying).toBeUndefined() // Still empty stack
    expect(game.get('c4')?.type).toBe(AIR_FORCE) // Deployed pieces remain
    expect(game.get('d3')?.type).toBe(TANK)
    // Cannot move air force at c4 because turn is blue
    expect(game.moves({ square: 'c4' }).length).toEqual(0)
  })

  it('check deploy state after all deploy moves', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )
    game['_turn'] = RED

    // Deploy AF
    game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE, deploy: true })
    // Deploy T
    game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true })
    // Deploy carrier (still a deploy move)
    game.move({ from: 'c3', to: 'c2', piece: NAVY, deploy: true })

    expect(game.turn()).toBe(BLUE) // Turn SHOULD change now
    expect(game.get('c3')).toBeUndefined() // Carrier moved
    expect(game.get('c2')?.type).toBe(NAVY) // Carrier at new location
    expect(game.get('c2')?.carrying).toBeUndefined() // Still empty stack
    expect(game.get('c4')?.type).toBe(AIR_FORCE) // Deployed pieces remain
    expect(game.get('d3')?.type).toBe(TANK)
    // Cannot move air force at c4 because turn is blue
    expect(game.moves({ square: 'c4' }).length).toEqual(0)

    expect(game.getSession()).toBeDefined()
  })

  // TODO: Add tests for deploy captures (normal and stay)
  // TODO: Add tests for undoing deploy/carrier moves
  // TODO: Add tests for SAN parsing/generation of deploy moves
})
describe('combinePieces (Integration)', () => {
  it('should correctly combine two basic pieces using formStack', () => {
    const pieceFrom: Piece = { color: RED, type: TANK }
    const pieceTo: Piece = { color: RED, type: INFANTRY }

    // Calling the actual implementation which uses formStack internally
    const combinedPiece = combinePieces([pieceFrom, pieceTo])

    // Assertions based on the expected behavior of formStack:
    // - The resulting piece should likely retain the 'from' piece's core identity (color, type).
    // - The 'to' piece should be added to the 'carrying' array.
    expect(combinedPiece).toBeDefined()
    expect(combinedPiece).not.toBeNull()

    expect(combinedPiece?.color).toBe(RED)
    expect(combinedPiece?.type).toBe(TANK)
    expect(combinedPiece?.carrying).toBeDefined()
    expect(combinedPiece?.carrying).toHaveLength(1)
    expect(combinedPiece?.carrying?.[0]).toMatchObject(pieceTo) // Check if the carried piece matches the 'to' piece
    expect(combinedPiece?.heroic).toBeFalsy() // Should be false or undefined
  })

  it('should correctly add a piece to an existing carrying stack', () => {
    const existingCarriedPiece: Piece = { color: RED, type: MILITIA }
    const pieceFrom: Piece = {
      color: RED,
      type: AIR_FORCE,
      carrying: [existingCarriedPiece],
    }
    const pieceTo: Piece = { color: RED, type: TANK }

    const combinedPiece = combinePieces([pieceFrom, pieceTo])

    expect(combinedPiece).toBeDefined()
    expect(combinedPiece?.color).toBe(RED)
    expect(combinedPiece?.type).toBe(AIR_FORCE)
    expect(combinedPiece?.carrying).toBeDefined()
    expect(combinedPiece?.carrying).toHaveLength(2)
    // The original carried piece should still be there (assuming order is preserved or predictable)
    expect(combinedPiece?.carrying).toContainEqual(existingCarriedPiece)
    // The new 'to' piece should be added
    expect(
      combinedPiece?.carrying?.some(
        (p) => p.type === pieceTo.type && p.color === pieceTo.color,
      ),
    ).toBe(true)
  })

  it('should handle combining heroic pieces if applicable', () => {
    const pieceFrom: Piece = { color: RED, type: TANK, heroic: true }
    const pieceTo: Piece = { color: RED, type: INFANTRY }

    const combinedPiece = combinePieces([pieceFrom, pieceTo])

    expect(combinedPiece).toBeDefined()
    expect(combinedPiece?.color).toBe(RED)
    expect(combinedPiece?.type).toBe(TANK)
    expect(combinedPiece?.heroic).toBe(true) // Assuming heroic status is retained from 'pieceFrom'
    expect(combinedPiece?.carrying).toBeDefined()
    expect(combinedPiece?.carrying).toHaveLength(1)
    expect(combinedPiece?.carrying?.[0]).toMatchObject(pieceTo)
    // Check if the carried piece inherited heroic status (depends on formStack logic)
    // Example: expect(combinedPiece.carrying?.[0].heroic).toBeUndefined(); or toBe(false);
  })

  // Add more test cases for different combinations, colors, etc.
  // Example: combining pieces of the same color (if allowed/handled by formStack)
  // it('should handle combining pieces of the same color', () => { ... });
})
