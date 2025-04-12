import {
  CoTuLenh,
  Move,
  RED,
  BLUE,
  NAVY,
  AIR_FORCE,
  TANK,
  COMMANDER,
  Square,
  PieceSymbol,
} from '../src/cotulenh'

// Helper to find a specific move in the verbose move list
const findVerboseMove = (
  moves: Move[],
  from: Square,
  to: Square, // Destination or Target
  options: {
    piece?: PieceSymbol
    isDeploy?: boolean
    isStayCapture?: boolean // Option parameter
  } = {},
): Move | undefined => {
  return moves.find((m) => {
    // 'm' is an instance of the Move class
    const matchFrom = m.from === from
    const matchPiece = options.piece === undefined || m.piece === options.piece
    const matchDeploy =
      options.isDeploy === undefined || m.isDeploy === options.isDeploy
    // Check stay capture based on properties, not a method call
    const isActuallyStayCapture =
      m.targetSquare !== undefined && m.to === m.from
    const matchStay =
      options.isStayCapture === undefined ||
      isActuallyStayCapture === options.isStayCapture

    // Adjust 'to' matching based on stay capture
    const matchTo = options.isStayCapture
      ? m.to === from && m.targetSquare === to // Stay capture: 'to' is origin, 'targetSquare' is target
      : m.to === to // Normal move/deploy: 'to' is destination

    return matchFrom && matchPiece && matchDeploy && matchStay && matchTo
  })
}

describe('Stack Movement and Deployment', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear() // Start with an empty board for specific setups
    //need to put commander for a legal move (a legal move is a move that don't cause a check)
    game.put({ type: COMMANDER, color: RED }, 'g1')
    game.put({ type: COMMANDER, color: BLUE }, 'g12')
  })

  test('Generate deploy moves for (NFT) stack', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carried: [
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
    expect(deployF_c4?.isDeploy).toBe(true)
    expect(deployF_c4?.piece).toBe(AIR_FORCE)

    expect(deployF_d4).toBeDefined() // Check another direction

    expect(deployT_c4).toBeDefined()
    expect(deployT_c4?.isDeploy).toBe(true)
    expect(deployT_c4?.piece).toBe(TANK)

    expect(deployT_d3).toBeDefined() // Check another direction

    expect(carrierN_c4).toBeDefined()
    expect(carrierN_c4?.isDeploy).toBe(false)
    expect(carrierN_c4?.piece).toBe(NAVY)

    // Check a non-deploy move is not generated for carried pieces
    const nonDeployF = findVerboseMove(moves, 'c3', 'c4', {
      piece: AIR_FORCE,
      isDeploy: false,
    })
    expect(nonDeployF).toBeUndefined()
  })

  test('Execute Air Force deploy move from (NFT) stack', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carried: [
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
    const moveResult = game.move({ from: 'c3', to: 'c4' }) // Hypothetical API

    expect(moveResult).not.toBeNull()
    expect(game.turn()).toBe(RED) // Turn should NOT change
    expect(game.get('c3')?.type).toBe(NAVY) // Carrier remains
    expect(game.get('c3')?.carried?.length).toBe(1) // One piece left
    expect(game.get('c3')?.carried?.[0].type).toBe(TANK) // Tank remains
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
      findVerboseMove(nextMoves, 'c3', 'c2', { piece: NAVY, isDeploy: false }),
    ).toBeDefined() // Carrier move possible
  })

  test('Execute Tank deploy move after Air Force deploy', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carried: [
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
    game.move({ from: 'c3', to: 'c4' })

    expect(game.turn()).toBe(RED) // Still Red's turn

    // Now deploy Tank
    const tankDeployMove = findVerboseMove(
      game.moves({ verbose: true, square: 'c3' }) as Move[],
      'c3',
      'd3',
      { piece: TANK, isDeploy: true },
    )
    expect(tankDeployMove).toBeDefined()
    const moveResult = game.move({ from: 'c3', to: 'd3' })

    expect(moveResult).not.toBeNull()
    expect(game.turn()).toBe(RED) // Turn should still be Red
    expect(game.get('c3')?.type).toBe(NAVY) // Carrier remains
    expect(game.get('c3')?.carried).toBeUndefined() // Stack empty
    expect(game.get('c4')?.type).toBe(AIR_FORCE) // Previous deploy
    expect(game.get('d3')?.type).toBe(TANK) // Tank deployed
    expect(game.get('d3')?.color).toBe(RED)
  })

  test('Check deploy state behavior', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carried: [
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
        .filter((m) => m.piece !== COMMANDER)
        .every((m) => m.from === 'c3'),
    ).toBe(true) // All moves must originate from c3 (except Commander)
    expect(
      findVerboseMove(nextMoves, 'c3', 'c2', { piece: NAVY, isDeploy: false }),
    ).toBeDefined() // Carrier move possible
    expect(
      findVerboseMove(nextMoves, 'c3', 'any', { isDeploy: true }),
    ).toBeUndefined() // No more deploy moves
  })

  test('Execute Carrier move after all deployments', () => {
    // Setup: Red Navy at c3 carrying AirForce and Tank
    game.put(
      {
        type: NAVY,
        color: RED,
        carried: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED },
        ],
      },
      'c3',
    )
    game['_turn'] = RED

    // Deploy AF
    game.move({ from: 'c3', to: 'c4' })
    // Deploy T
    game.move({ from: 'c3', to: 'd3' })

    expect(game.turn()).toBe(RED) // Still Red's turn
    expect(game.get('c3')?.carried).toBeUndefined() // Stack empty

    // Find and execute the carrier move (e.g., Navy c3 to c2)
    const carrierMove = findVerboseMove(
      game.moves({ verbose: true, square: 'c3' }) as Move[],
      'c3',
      'c2',
      { piece: NAVY, isDeploy: false },
    )
    expect(carrierMove).toBeDefined()
    const moveResult = game.move({ from: 'c3', to: 'c2' }) // Normal move object for carrier

    expect(moveResult).not.toBeNull()
    expect(game.turn()).toBe(BLUE) // Turn SHOULD change now
    expect(game.get('c3')).toBeUndefined() // Carrier moved
    expect(game.get('c2')?.type).toBe(NAVY) // Carrier at new location
    expect(game.get('c2')?.carried).toBeUndefined() // Still empty stack
    expect(game.get('c4')?.type).toBe(AIR_FORCE) // Deployed pieces remain
    expect(game.get('d3')?.type).toBe(TANK)
    // Cannot move air force at c4 because turn is blue
    expect(game.moves({ square: 'c4', ignoreSafety: true }).length).toEqual(0)
  })

  // TODO: Add tests for deploy captures (normal and stay)
  // TODO: Add tests for undoing deploy/carrier moves
  // TODO: Add tests for SAN parsing/generation of deploy moves
})
