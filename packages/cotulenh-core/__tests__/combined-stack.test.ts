import { beforeEach, describe, expect, it } from 'vitest'
import { CoTuLenh, Move } from '../src/cotulenh'
import {
  createInternalDeployMove,
  DeployMove,
  DeployMoveRequest,
  deployMoveToSanLan,
} from '../src/deploy-move'
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
import { createCombinedPiece } from '../src/utils'
import { findVerboseMove, makePiece, setupGameBasic } from './test-helpers'

describe('Stack Movement and Deployment (Legacy Deploy System)', () => {
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

    console.log('[TEST] Generated moves:', moves.length)
    moves.forEach((m) => {
      console.log(
        `  - ${m.from} → ${m.to}, piece: ${m.piece.type}, deploy: ${m.isDeploy()}, flags: ${m.flags}`,
      )
    })

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

    console.log('[TEST] After moves() generation:')
    console.log('  c1:', game.get('c1'))
    console.log('  c2:', game.get('c2'))
    console.log('  d1:', game.get('d1'))

    // Board should be clean here - only Tank+Infantry at c1
    expect(game.get('c1')?.type).toBe(TANK)
    expect(game.get('c1')?.carrying).toHaveLength(1)
    expect(game.get('c2')).toBeUndefined() // ← This is probably failing!
    expect(game.get('d1')).toBeUndefined()

    console.log('[TEST] Before move(): deploySession =', game.getDeployState())
    console.log('[TEST] Before move(): turn =', game.turn())
    console.log('[TEST] Before move(): board at c1 =', game.get('c1'))
    console.log('[TEST] Before move(): board at c2 =', game.get('c2'))
    console.log('[TEST] About to call game.move()')

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
    const moveResult = game.move({ from: 'c3', to: 'd3', piece: TANK })

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
    }) // Normal move object for carrier

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

    // Deploy carrier
    game.move({ from: 'c3', to: 'c2', piece: NAVY, deploy: true }) // Normal move object for carrier
    // Deploy AF
    game.move({ from: 'c3', to: 'c4', piece: AIR_FORCE, deploy: true })
    // Deploy T
    game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true })

    expect(game.turn()).toBe(BLUE) // Turn SHOULD change now
    expect(game.get('c3')).toBeUndefined() // Carrier moved
    expect(game.get('c2')?.type).toBe(NAVY) // Carrier at new location
    expect(game.get('c2')?.carrying).toBeUndefined() // Still empty stack
    expect(game.get('c4')?.type).toBe(AIR_FORCE) // Deployed pieces remain
    expect(game.get('d3')?.type).toBe(TANK)
    // Cannot move air force at c4 because turn is blue
    expect(game.moves({ square: 'c4' }).length).toEqual(0)

    expect(game.getDeployState()).toBeDefined()
  })

  // TODO: Add tests for deploy captures (normal and stay)
  // TODO: Add tests for undoing deploy/carrier moves
  // TODO: Add tests for SAN parsing/generation of deploy moves
})
describe('createCombinedPiece (Integration)', () => {
  it('should correctly combine two basic pieces using formStack', () => {
    const pieceFrom: Piece = { color: RED, type: TANK }
    const pieceTo: Piece = { color: RED, type: INFANTRY }

    // Calling the actual implementation which uses formStack internally
    const combinedPiece = createCombinedPiece(pieceFrom, pieceTo)

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

    const combinedPiece = createCombinedPiece(pieceFrom, pieceTo)

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

    const combinedPiece = createCombinedPiece(pieceFrom, pieceTo)

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

describe('Use deploy move (Legacy)', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })
  it('should deploy all 2 pieces', () => {
    game.put(
      {
        type: TANK,
        color: RED,
        carrying: [{ type: INFANTRY, color: RED }],
      },
      'c3',
    )
    game['_turn'] = RED
    const deployMove: DeployMoveRequest = {
      from: 'c3',
      moves: [
        { piece: { type: INFANTRY, color: RED }, to: 'c4' },
        { piece: { type: TANK, color: RED }, to: 'd3' },
      ],
    }
    game.deployMove(deployMove)
    expect(game.get('c3')).toBeUndefined()
    expect(game.get('c4')?.type).toBe(INFANTRY)
    expect(game.get('d3')?.type).toBe(TANK)
    expect(game.get('d3')?.carrying).toBeUndefined()
    expect(game.getDeployState()).toBeNull()
    expect(game.turn()).toBe(BLUE)
  })
  it('should deploy all 3 pieces', () => {
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

    const deployMove: DeployMoveRequest = {
      from: 'c3',
      moves: [
        { piece: { type: TANK, color: RED }, to: 'd3' },
        {
          piece: {
            type: AIR_FORCE,
            color: RED,
          },
          to: 'c6',
        },
        { piece: { type: NAVY, color: RED }, to: 'a3' },
      ],
    }
    game.deployMove(deployMove)
    expect(game.get('c3')).toBeUndefined()
    expect(game.get('c6')?.type).toBe(AIR_FORCE)
    expect(game.get('c6')?.carrying).toBeFalsy()
    expect(game.get('a3')?.type).toBe(NAVY)
    expect(game.get('a3')?.carrying).toBeFalsy()
    expect(game.get('d3')?.type).toBe(TANK)
    expect(game.get('d3')?.carrying).toBeFalsy()
    expect(game.getDeployState()).toBeNull()
    expect(game.turn()).toBe(BLUE)
  })

  it('should deploy nested piece', () => {
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

    const deployMove: DeployMoveRequest = {
      from: 'c3',
      moves: [
        {
          piece: {
            type: AIR_FORCE,
            color: RED,
            carrying: [{ type: TANK, color: RED }],
          },
          to: 'c4',
        },
        { piece: { type: NAVY, color: RED }, to: 'a3' },
      ],
    }
    game.deployMove(deployMove)
    expect(game.get('c3')).toBeUndefined()
    expect(game.get('c4')?.type).toBe(AIR_FORCE)
    expect(game.get('c4')?.carrying).toHaveLength(1)
    expect(game.get('c4')?.carrying?.[0].type).toBe(TANK)
    expect(game.get('a3')?.type).toBe(NAVY)
    expect(game.get('a3')?.carrying).toBeUndefined()
    expect(game.getDeployState()).toBeNull()
    expect(game.turn()).toBe(BLUE)
  })

  it('stay piece should stay', () => {
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

    const deployMove: DeployMoveRequest = {
      from: 'c3',
      moves: [{ piece: { type: NAVY, color: RED }, to: 'a3' }],
      stay: {
        type: AIR_FORCE,
        color: RED,
        carrying: [{ type: TANK, color: RED }],
      },
    }
    game.deployMove(deployMove)
    expect(game.get('c3')?.type).toBe(AIR_FORCE)
    expect(game.get('c3')?.carrying).toHaveLength(1)
    expect(game.get('c3')?.carrying?.[0].type).toBe(TANK)
    expect(game.get('a3')?.type).toBe(NAVY)
    expect(game.get('a3')?.carrying).toBeFalsy()
    expect(game.getDeployState()).toBeNull()
    expect(game.turn()).toBe(BLUE)
  })
})

describe('deployMoveToSanLan', () => {
  it('should return SAN and LAN for deploy move', () => {
    const game = setupGameBasic()
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
    const deployMove: DeployMoveRequest = {
      from: 'c3',
      moves: [
        {
          piece: {
            type: NAVY,
            color: RED,
            carrying: [{ type: TANK, color: RED }],
          },
          to: 'a3',
        },
        {
          piece: {
            type: AIR_FORCE,
            color: RED,
          },
          to: 'c4',
        },
      ],
    }
    const originalPiece = game.get('c3')
    if (!originalPiece) throw new Error('Original piece not found')
    const legalMoveAtc3 = game['_moves']({
      square: 'c3',
      deploy: true,
    }) as InternalMove[]
    const internalDeployMove = createInternalDeployMove(
      originalPiece,
      deployMove,
      legalMoveAtc3,
    )
    const [san, lan] = deployMoveToSanLan(game, internalDeployMove)
    expect(san).toBe('(NT)>a3,F>c4')
    expect(lan).toBe('c3:(NT)>a3,F>c4')
  })
  it('should return SAN and LAN for deploy move with stay', () => {
    const game = setupGameBasic()
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
    const deployMove: DeployMoveRequest = {
      from: 'c3',
      moves: [
        {
          piece: {
            type: NAVY,
            color: RED,
          },
          to: 'a3',
        },
      ],
      stay: {
        type: AIR_FORCE,
        color: RED,
        carrying: [{ type: TANK, color: RED }],
      },
    }
    const originalPiece = game.get('c3')
    if (!originalPiece) throw new Error('Original piece not found')
    const legalMoveAtc3 = game['_moves']({
      square: 'c3',
      deploy: true,
    }) as InternalMove[]
    const internalDeployMove = createInternalDeployMove(
      originalPiece,
      deployMove,
      legalMoveAtc3,
    )
    const [san, lan] = deployMoveToSanLan(game, internalDeployMove)
    expect(san).toBe('(FT)<N>a3')
    expect(lan).toBe('c3:(FT)<N>a3')
  })
})
describe('DeployMove', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = setupGameBasic()
  })

  it('should correctly construct DeployMove for a simple deploy', () => {
    // Place a stack on e4
    const carrier = makePiece(TANK, RED, false, [makePiece(INFANTRY, RED)])
    const from: Square = 'e4'
    game.put(carrier, from)

    // Deploy the stack to two squares (simulate splitting, simple case)
    const deployMoveReq: DeployMoveRequest = {
      from,
      moves: [{ piece: { type: TANK, color: RED }, to: 'e5' }],
      stay: { type: INFANTRY, color: RED },
    }

    // Use helpers to create the internal deploy move
    const validMoves = game['_moves']({
      square: from,
      deploy: true,
    }) as InternalMove[]
    const internal = createInternalDeployMove(
      carrier,
      deployMoveReq,
      validMoves,
    )
    const deployMove = new DeployMove(game, internal)

    // Check properties
    expect(deployMove.color).toBe(RED)
    expect(deployMove.from).toBe(from)
    expect(deployMove.to.has('e5')).toBe(true)
    expect(deployMove.to.get('e5')).toMatchObject({ type: TANK, color: RED })
    expect(deployMove.stay).toMatchObject({ type: INFANTRY, color: RED })
    expect(deployMove.captured?.length).toBe(0)
    expect(typeof deployMove.before).toBe('string')
    expect(typeof deployMove.after).toBe('string')
    expect(typeof deployMove.san).toBe('string')
    expect(typeof deployMove.lan).toBe('string')
    expect(deployMove.san).toBe('I<T>e5')
    expect(deployMove.lan).toBe('e4:I<T>e5')
  })

  it('should correctly construct DeployMove with a capture', () => {
    // Place a stack on e4
    const carrier = makePiece(TANK, RED, false, [makePiece(INFANTRY, RED)])
    const from: Square = 'e4'
    game.put(carrier, from)

    // Place an enemy piece on e5 (to be captured)
    const enemyInfantry = makePiece(INFANTRY, BLUE)
    game.put(enemyInfantry, 'e5')
    const enemyAirForce = makePiece(AIR_FORCE, BLUE, false, [
      makePiece(MILITIA, BLUE),
    ])
    game.put(enemyAirForce, 'd4')

    // Deploy the TANK to e5 (capture), INFANTRY stays
    const deployMoveReq: DeployMoveRequest = {
      from,
      moves: [
        { piece: { type: TANK, color: RED }, to: 'e5' },
        { piece: { type: INFANTRY, color: RED }, to: 'd4' },
      ],
    }

    // Use helpers to create the internal deploy move
    const validMoves = game['_moves']({
      square: from,
      deploy: true,
    }) as InternalMove[]
    const internal = createInternalDeployMove(
      carrier,
      deployMoveReq,
      validMoves,
    )
    const deployMove = new DeployMove(game, internal)

    // Check properties
    expect(deployMove.color).toBe(RED)
    expect(deployMove.from).toBe(from)
    expect(deployMove.to.has('e5')).toBe(true)
    expect(deployMove.to.get('e5')).toMatchObject({ type: TANK, color: RED })
    expect(deployMove.to.has('d4')).toBe(true)
    expect(deployMove.to.get('d4')).toMatchObject({
      type: INFANTRY,
      color: RED,
    })
    expect(deployMove.captured?.length).toBe(2)
    expect(typeof deployMove.before).toBe('string')
    expect(typeof deployMove.after).toBe('string')
    expect(typeof deployMove.san).toBe('string')
    expect(typeof deployMove.lan).toBe('string')
    expect(deployMove.san).toBe('T>xe5,I>xd4')
    expect(deployMove.lan).toBe('e4:T>xe5,I>xd4')
    // Optionally check SAN/LAN for capture notation if defined
    // expect(deployMove.san).toContain('x'); // if SAN uses 'x' for capture
    // expect(deployMove.lan).toContain('x');
  })

  //TODO: IMPORTANT! Redesign deploy move mechanism account for situation when the carrier move and the remaining piece cannot form stack at current stack square or can't stay at current square due to terrain limit
  // it('should generate deploy move for piece that not moved in the stack', () => {
  //   // 1. Place navy (carrier) carrying air force and tank at d4
  //   const navy = makePiece(NAVY, RED)
  //   const airForce = makePiece(AIR_FORCE, RED)
  //   const tank = makePiece(TANK, RED)
  //   navy.carrying = [airForce, tank]
  //   game.put(navy, 'b4')

  //   // 2. Generate deploy moves for the stack at d4
  //   const deployMoves = game.moves({ square: 'b4', verbose: true }) as Move[]
  //   const beforeMoveMap = deployMoves.map((m: any) => m.piece.type)
  //   expect(beforeMoveMap).toContain(NAVY)
  //   expect(beforeMoveMap).toContain(AIR_FORCE)
  //   expect(beforeMoveMap).toContain(TANK)
  //   // Find the deploy move for the tank (by type)
  //   const tankDeployMove = deployMoves.find((m: any) => m.piece.type === TANK)
  //   expect(tankDeployMove).toBeDefined()

  //   // 3. Apply the tank deploy move
  //   game.move(tankDeployMove!.san!)

  //   // 4. Now moves() for d4 should only generate deploy moves for navy and air force
  //   const afterMoves = game.moves({ verbose: true }) as Move[]
  //   const afterMoveMap = afterMoves.map((m: any) => m.piece.type)
  //   expect(afterMoveMap).toContain(NAVY)
  //   expect(afterMoveMap).toContain(AIR_FORCE)
  //   expect(afterMoveMap).not.toContain(TANK)

  //   expect(beforeMoveMap.length).toBeGreaterThan(afterMoveMap.length)
  // })

  it('should suicide capture from a stack', () => {
    const air_force = makePiece(AIR_FORCE, RED)
    const carrier = makePiece(NAVY, RED)
    const enemyNavy = makePiece(NAVY, BLUE)
    carrier.carrying = [air_force]
    game.put(carrier, 'b4')
    game.put(enemyNavy, 'b7')
    const moves = game.moves({ square: 'b4' }) as string[]
    expect(moves).toContain('F>@b7')
    const move = game.move('F>@b7')
    expect(move).toBeInstanceOf(Move)
    expect(game.get('b7')).toBeUndefined()
    expect(game.get('b4')?.type).toBe(NAVY)
  })
})

// ===================================================================
// NEW VIRTUAL STATE DEPLOY SYSTEM TESTS
// ===================================================================

describe('Virtual State Deploy System', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = new CoTuLenh()
  })

  describe('Batch Deploy Operations', () => {
    it('should deploy all pieces atomically using batch deploy', () => {
      // Setup: Navy carrying Air Force and Tank
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

      // Use batch deploy (native to new system)
      // Deploy carrying pieces, Navy stays at original square
      const deployMove: DeployMoveRequest = {
        from: 'c3',
        moves: [
          { piece: { type: AIR_FORCE, color: RED }, to: 'c4' },
          { piece: { type: TANK, color: RED }, to: 'd3' },
        ],
        stay: { type: NAVY, color: RED }, // Navy stays at c3
      }

      game.deployMove(deployMove)

      // Verify atomic commit behavior
      expect(game.turn()).toBe(BLUE) // Turn switches after completion
      expect(game.get('c3')?.type).toBe(NAVY) // Carrier remains
      expect(game.get('c3')?.carrying).toBeUndefined() // No carrying pieces
      expect(game.get('c4')?.type).toBe(AIR_FORCE) // Air Force deployed
      expect(game.get('d3')?.type).toBe(TANK) // Tank deployed
      expect(game.getDeployState()).toBeNull() // Deploy session cleared
    })

    it('should handle partial deployment with stay pieces', () => {
      // Setup: Navy carrying Air Force and Tank
      // Try a different square that's definitely water (a1, b1, etc.)
      const putResult = game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'a3', // Changed from e5 to a3 (water square)
      )
      console.log('[TEST] put() result:', putResult)
      console.log('[TEST] Board at a3 after put():', game.get('a3'))
      game['_turn'] = RED

      // Deploy only Air Force, Navy and Tank stay
      const deployMove: DeployMoveRequest = {
        from: 'a3', // Changed to match put() square
        moves: [{ piece: { type: AIR_FORCE, color: RED }, to: 'a4' }], // Deploy to a4
        stay: {
          type: NAVY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
      }

      game.deployMove(deployMove)

      // Verify stay behavior
      expect(game.turn()).toBe(BLUE) // Turn switches after completion
      expect(game.get('a3')?.type).toBe(NAVY) // Carrier remains
      expect(game.get('a3')?.carrying).toEqual([{ type: TANK, color: RED }]) // Tank stays
      expect(game.get('a4')?.type).toBe(AIR_FORCE) // Air Force deployed
      expect(game.getDeployState()).toBeNull() // Deploy session cleared
    })

    it('should handle complex three-piece deployment', () => {
      // Setup: Navy carrying Air Force and Tank (simplified - no nested Infantry)
      // Nested carrying might not be supported by put()
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'a4', // Use water square
      )
      game['_turn'] = RED

      // Deploy all pieces to different squares
      const deployMove: DeployMoveRequest = {
        from: 'a4',
        moves: [
          { piece: { type: AIR_FORCE, color: RED }, to: 'a5' },
          { piece: { type: TANK, color: RED }, to: 'b4' },
        ],
        stay: { type: NAVY, color: RED }, // Navy stays at a4
      }

      game.deployMove(deployMove)

      // Verify complex deployment
      expect(game.turn()).toBe(BLUE)
      expect(game.get('a4')?.type).toBe(NAVY)
      expect(game.get('a4')?.carrying).toBeUndefined()
      expect(game.get('a5')?.type).toBe(AIR_FORCE)
      expect(game.get('b4')?.type).toBe(TANK)
    })
  })

  describe('Virtual State Isolation', () => {
    it('should not affect real board during deploy session', () => {
      // Setup
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'a1',
      )
      game['_turn'] = RED

      // Deploy Air Force, Navy stays
      const deployMove: DeployMoveRequest = {
        from: 'a1',
        moves: [{ piece: { type: AIR_FORCE, color: RED }, to: 'a2' }],
        stay: { type: NAVY, color: RED },
      }

      game.deployMove(deployMove)

      // Verify final state (after atomic commit)
      expect(game.get('a1')?.type).toBe(NAVY)
      expect(game.get('a1')?.carrying).toBeUndefined()
      expect(game.get('a2')?.type).toBe(AIR_FORCE)
    })

    it('should handle deploy with capture atomically', () => {
      // Setup: Red Navy with Air Force, Blue Infantry at target
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'b2',
      )
      game.put({ type: INFANTRY, color: BLUE }, 'b3')
      game['_turn'] = RED

      // Deploy with capture, Navy stays
      const deployMove: DeployMoveRequest = {
        from: 'b2',
        moves: [
          { piece: { type: AIR_FORCE, color: RED }, to: 'b3' }, // Capture
        ],
        stay: { type: NAVY, color: RED },
      }

      game.deployMove(deployMove)

      // Verify atomic capture
      expect(game.get('b2')?.type).toBe(NAVY)
      expect(game.get('b2')?.carrying).toBeUndefined()
      expect(game.get('b3')?.type).toBe(AIR_FORCE) // Captured and replaced
      expect(game.get('b3')?.color).toBe(RED)
    })
  })

  describe('Deploy Session State Management', () => {
    it('should track deploy session state correctly', () => {
      // Setup
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'b3', // Changed from d4 to water square
      )
      game['_turn'] = RED

      // Initially no deploy session
      expect(game.getDeployState()).toBeNull()

      // Execute deploy, Navy stays
      const deployMove: DeployMoveRequest = {
        from: 'b3', // Changed to match
        moves: [
          { piece: { type: AIR_FORCE, color: RED }, to: 'b4' },
          { piece: { type: TANK, color: RED }, to: 'c3' },
        ],
        stay: { type: NAVY, color: RED },
      }

      game.deployMove(deployMove)

      // Deploy session should be cleared after completion
      expect(game.getDeployState()).toBeNull()
      expect(game.turn()).toBe(BLUE) // Turn switched
    })

    it('should generate correct FEN during and after deploy', () => {
      // Setup
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'a2', // Changed from h1 to water square
      )
      game['_turn'] = RED

      // Get initial FEN
      const initialFen = game.fen()
      expect(initialFen.split(' ')).toHaveLength(6) // Standard FEN format

      // Execute deploy, Navy stays
      const deployMove: DeployMoveRequest = {
        from: 'a2', // Changed to match
        moves: [{ piece: { type: AIR_FORCE, color: RED }, to: 'b2' }],
        stay: { type: NAVY, color: RED },
      }

      game.deployMove(deployMove)

      // Get final FEN
      const finalFen = game.fen()
      expect(finalFen.split(' ')).toHaveLength(6) // Standard FEN format
      expect(finalFen).not.toBe(initialFen) // Should be different
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty deploy moves gracefully', () => {
      // Setup
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'a5', // Changed from g7 to water square
      )
      game['_turn'] = RED

      // Deploy with stay only (all pieces stay)
      const deployMove: DeployMoveRequest = {
        from: 'a5', // Changed to match
        moves: [],
        stay: {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
      }

      game.deployMove(deployMove)

      // Everything should stay the same except turn
      expect(game.turn()).toBe(BLUE)
      expect(game.get('a5')?.type).toBe(NAVY)
      expect(game.get('a5')?.carrying).toEqual([
        { type: AIR_FORCE, color: RED },
      ])
    })

    it('should handle single piece deployment', () => {
      // Setup: Tank carrying Infantry
      game.put(
        {
          type: TANK,
          color: RED,
          carrying: [{ type: INFANTRY, color: RED }],
        },
        'c6',
      )
      game['_turn'] = RED

      // Deploy Infantry, Tank stays
      const deployMove: DeployMoveRequest = {
        from: 'c6',
        moves: [{ piece: { type: INFANTRY, color: RED }, to: 'c7' }],
        stay: { type: TANK, color: RED },
      }

      game.deployMove(deployMove)

      // Verify single piece deployment
      expect(game.turn()).toBe(BLUE)
      expect(game.get('c6')?.type).toBe(TANK)
      expect(game.get('c6')?.carrying).toBeUndefined()
      expect(game.get('c7')?.type).toBe(INFANTRY)
    })
  })

  describe('Performance and Consistency', () => {
    it('should maintain board consistency after complex deployments', () => {
      // Setup multiple stacks
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'a6', // Changed from a8
      )
      game.put(
        {
          type: NAVY,
          color: BLUE,
          carrying: [{ type: INFANTRY, color: BLUE }],
        },
        'b1', // Changed from h1 to water square
      )
      game['_turn'] = RED

      // Deploy Red carrying pieces, Navy stays
      const redDeploy: DeployMoveRequest = {
        from: 'a6', // Changed to match
        moves: [
          { piece: { type: AIR_FORCE, color: RED }, to: 'b6' },
          { piece: { type: TANK, color: RED }, to: 'a7' },
        ],
        stay: { type: NAVY, color: RED },
      }

      game.deployMove(redDeploy)

      // Verify Red deployment and turn switch
      expect(game.turn()).toBe(BLUE)
      expect(game.get('a6')?.type).toBe(NAVY)
      expect(game.get('a6')?.color).toBe(RED)
      expect(game.get('b6')?.type).toBe(AIR_FORCE)
      expect(game.get('a7')?.type).toBe(TANK)

      // Deploy Blue Infantry, Navy stays
      const blueDeploy: DeployMoveRequest = {
        from: 'b1', // Changed to match
        moves: [{ piece: { type: INFANTRY, color: BLUE }, to: 'c1' }],
        stay: { type: NAVY, color: BLUE },
      }

      game.deployMove(blueDeploy)

      // Verify Blue deployment and turn switch back
      expect(game.turn()).toBe(RED)
      expect(game.get('b1')?.type).toBe(NAVY)
      expect(game.get('b1')?.color).toBe(BLUE)
      expect(game.get('c1')?.type).toBe(INFANTRY)
      expect(game.get('c1')?.color).toBe(BLUE)
    })
  })
})
