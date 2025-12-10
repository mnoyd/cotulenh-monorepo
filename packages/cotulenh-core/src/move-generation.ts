/**
 * Piece movement configuration and logic for CoTuLenh chess variant
 */

import {
  COMMANDER,
  INFANTRY,
  ENGINEER,
  TANK,
  MILITIA,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
  AIR_FORCE,
  NAVY,
  HEADQUARTER,
  PieceSymbol,
  Piece,
  Color,
  InternalMove,
  SQUARE_MAP,
  rank,
  file,
  isSquareOnBoard,
  NAVY_MASK,
  LAND_MASK,
  swapColor,
  Square,
  HEAVY_PIECES,
} from './type.js'
import { addMove, combinePieces, flattenPiece } from './utils.js'
import { BITS } from './type.js'
import { CoTuLenh } from './cotulenh.js'
import { AirDefenseResult, getCheckAirDefenseZone } from './air-defense.js'
import type { MoveSession } from './move-session.js'

// Movement direction offsets
export const ORTHOGONAL_OFFSETS = [-16, 1, 16, -1] // N, E, S, W
export const DIAGONAL_OFFSETS = [-17, -15, 17, 15] // NE, NW, SE, SW
export const ALL_OFFSETS = [...ORTHOGONAL_OFFSETS, ...DIAGONAL_OFFSETS]

export function getOppositeOffset(offset: number): number {
  return offset * -1
}

// Movement configuration interface
export interface PieceMovementConfig {
  moveRange: number
  captureRange: number
  canMoveDiagonal: boolean
  captureIgnoresPieceBlocking: boolean
  moveIgnoresBlocking: boolean
  specialRules?: {
    commanderAdjacentCaptureOnly?: boolean
    navyAttackMechanisms?: boolean
    missileSpecialRange?: boolean
    tankShootOverBlocking?: boolean
  }
}

// Base movement configurations for each piece type
export const BASE_MOVEMENT_CONFIG: Record<PieceSymbol, PieceMovementConfig> = {
  [COMMANDER]: {
    moveRange: Infinity,
    captureRange: 1,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
    specialRules: { commanderAdjacentCaptureOnly: true },
  },
  [INFANTRY]: {
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
  [ENGINEER]: {
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
  [TANK]: {
    moveRange: 2,
    captureRange: 2,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
    specialRules: { tankShootOverBlocking: true },
  },
  [MILITIA]: {
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
  [ARTILLERY]: {
    moveRange: 3,
    captureRange: 3,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: false,
  },
  [ANTI_AIR]: {
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
  [MISSILE]: {
    moveRange: 2,
    captureRange: 2,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: false,
    specialRules: { missileSpecialRange: true },
  },
  [AIR_FORCE]: {
    moveRange: 4,
    captureRange: 4,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: true,
  },
  [NAVY]: {
    moveRange: 4,
    captureRange: 4,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: false,
    specialRules: { navyAttackMechanisms: true },
  },
  [HEADQUARTER]: {
    moveRange: 0,
    captureRange: 0,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
}

/**
 * Get movement configuration for a piece, applying heroic status modifications
 */
export function getPieceMovementConfig(
  pieceType: PieceSymbol,
  isHero: boolean,
): PieceMovementConfig {
  const baseConfig = { ...BASE_MOVEMENT_CONFIG[pieceType] }

  // Apply heroic modifications
  if (isHero) {
    // Increase ranges (except for infinity)
    baseConfig.moveRange =
      baseConfig.moveRange === Infinity ? Infinity : baseConfig.moveRange + 1
    baseConfig.captureRange++
    baseConfig.canMoveDiagonal = true

    // Special case for Headquarter
    if (pieceType === HEADQUARTER) {
      baseConfig.moveRange = 1
      baseConfig.captureRange = 1
    }
  }

  return baseConfig
}

/**
 * Generate moves for a piece in a specific direction
 */
export function generateMovesInDirection(
  gameInstance: CoTuLenh, // Will be CoTuLenh instance
  moves: InternalMove[],
  from: number,
  pieceData: Piece,
  config: PieceMovementConfig,
  offset: number,
  isDeployMove: boolean,
  them: Color,
): void {
  const us = pieceData.color
  let currentRange = 0
  let to = from
  let pieceBlockedMovement = false
  let terrainBlockedMovement = false
  const isOrthogonal = ORTHOGONAL_OFFSETS.includes(offset) // Check if moving orthogonally
  const shouldCheckAirDefense = pieceData.type === AIR_FORCE
  const checkAirforceState = getCheckAirDefenseZone(
    gameInstance,
    from,
    them,
    offset,
  )

  while (true) {
    to += offset
    currentRange++

    // Check if square is on board
    if (!isSquareOnBoard(to)) break

    // Special handling for AIR_FORCE movement through enemy air defense zones
    let airDefenseResult: number = -1
    if (shouldCheckAirDefense) {
      airDefenseResult = checkAirforceState()
    }
    if (airDefenseResult === AirDefenseResult.DESTROYED) {
      break
    }

    // Special case for Missile diagonal movement (remains unchanged)
    if (
      pieceData.type === MISSILE &&
      DIAGONAL_OFFSETS.includes(offset) &&
      currentRange > config.moveRange - 1
    ) {
      break
    }

    // Check if we've exceeded maximum ranges (for non-commander moves)
    // Commander capture range is handled specially below
    if (
      pieceData.type !== COMMANDER &&
      currentRange > config.moveRange &&
      currentRange > config.captureRange
    )
      break

    const targetPiece = gameInstance.get(to)

    // Terrain blocking check (remains unchanged)
    if (!terrainBlockedMovement) {
      terrainBlockedMovement = checkTerrainBlocking(
        from,
        to,
        pieceData.type,
        isHorizontalOffset(offset),
      )
    }

    // Target square analysis
    if (targetPiece) {
      // *** Special Commander Capture Rule ***
      if (
        pieceData.type === COMMANDER &&
        targetPiece.type === COMMANDER &&
        targetPiece.color === them &&
        isOrthogonal
      ) {
        // Commander sees enemy commander orthogonally - immediate capture regardless of range/blockers
        addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE)
        break // Stop searching in this direction after finding the commander
      }
      // *** End Special Commander Capture Rule ***

      // Normal Capture logic (only if not commander vs commander)
      if (targetPiece.color === them && currentRange <= config.captureRange) {
        // Ensure we don't double-add the commander capture handled above
        if (!(pieceData.type === COMMANDER && targetPiece.type === COMMANDER)) {
          handleCaptureLogic(
            moves,
            from,
            to,
            pieceData,
            targetPiece,
            currentRange,
            config,
            isDeployMove,
            airDefenseResult === AirDefenseResult.KAMIKAZE,
          )
        }
      } else if (targetPiece.color === us) {
        // Combination logic (remains unchanged)
        const combinedPiece = combinePieces([pieceData, targetPiece])
        if (
          !isDeployMove &&
          combinedPiece &&
          combinedPiece.carrying &&
          combinedPiece.carrying.length > 0 &&
          currentRange <= config.moveRange &&
          !terrainBlockedMovement &&
          !pieceBlockedMovement &&
          canStayOnSquare(to, combinedPiece.type)
        ) {
          addMove(moves, us, from, to, pieceData, targetPiece, BITS.COMBINATION)
        }
      }

      // Piece blocking check (remains unchanged)
      if (!config.moveIgnoresBlocking) {
        if (!(pieceData.type === NAVY && targetPiece.color === us)) {
          pieceBlockedMovement = true
        }
      }
      // Commander cannot move *past* a blocking piece (unless capturing enemy commander)
      if (
        pieceData.type === COMMANDER &&
        !(
          targetPiece.type === COMMANDER &&
          targetPiece.color === them &&
          isOrthogonal
        )
      ) {
        break
      }
    } else {
      // Move to empty square logic (remains unchanged)
      if (
        currentRange <= config.moveRange &&
        !terrainBlockedMovement &&
        !pieceBlockedMovement &&
        canStayOnSquare(to, pieceData.type) &&
        (shouldCheckAirDefense
          ? airDefenseResult === AirDefenseResult.SAFE_PASS
          : true)
      ) {
        // Commander cannot slide past where an enemy commander *would* be captured
        if (pieceData.type === COMMANDER && isOrthogonal) {
          // Check if enemy commander is further along this line
          let lookAheadSq = to + offset
          let enemyCommanderFound = false
          while (isSquareOnBoard(lookAheadSq)) {
            const lookAheadPiece = gameInstance.get(lookAheadSq)
            if (lookAheadPiece) {
              if (
                lookAheadPiece.type === COMMANDER &&
                lookAheadPiece.color === them
              ) {
                enemyCommanderFound = true
              }
              break // Path blocked by some piece
            }
            lookAheadSq += offset
          }
          if (!enemyCommanderFound) {
            // Only add move if enemy commander isn't further along
            addMove(moves, us, from, to, pieceData)
          }
        } else {
          addMove(moves, us, from, to, pieceData)
        }
      }
    }

    // Stop if blocked, unless it's a commander seeing another commander orthogonally
    if (
      pieceBlockedMovement &&
      !config.captureIgnoresPieceBlocking &&
      !config.moveIgnoresBlocking &&
      !(
        pieceData.type === COMMANDER &&
        targetPiece?.type === COMMANDER &&
        targetPiece?.color === them &&
        isOrthogonal
      )
    ) {
      break
    }

    // Stop commander sliding if range exceeded (since capture is special)
    if (pieceData.type === COMMANDER && currentRange >= 11) {
      // Max board dimension
      break
    }
  }
}

/**
 * Check if terrain blocks movement for a piece
 */
function checkTerrainBlocking(
  from: number,
  to: number,
  pieceDataType: PieceSymbol,
  isHorizontalOffset: boolean,
): boolean {
  // Navy can only move on water
  if (pieceDataType === NAVY) {
    return !NAVY_MASK[to]
  }

  // Land pieces can't move on water
  if (!LAND_MASK[to]) {
    return pieceDataType !== AIR_FORCE // Air Force can fly over water
  }

  // Heavy piece river crossing rule
  if (HEAVY_PIECES.has(pieceDataType)) {
    const zoneFrom = isHeavyZone(from)
    const zoneTo = isHeavyZone(to)

    if (zoneFrom !== 0 && zoneTo !== 0 && zoneFrom !== zoneTo) {
      if (isHorizontalOffset && (file(from) === 5 || file(to) === 7)) {
        return false
      }
      return true
    }
  }

  return false
}

/**
 * Handle capture logic for a piece
 */
function handleCaptureLogic(
  moves: InternalMove[],
  from: number,
  to: number,
  pieceData: Piece,
  targetPiece: Piece,
  currentRange: number,
  config: PieceMovementConfig,
  isDeployMove: boolean,
  isSuicideMove: boolean,
): void {
  const us = pieceData.color

  if (isSuicideMove) {
    addMove(moves, us, from, to, pieceData, targetPiece, BITS.SUICIDE_CAPTURE)
    return
  }

  let captureAllowed = true
  let addNormalCapture = true
  let addStayCapture = false

  // Commander captures only adjacent
  if (pieceData.type === COMMANDER && currentRange > 1) {
    captureAllowed = false
  }

  // Navy attack mechanisms
  if (pieceData.type === NAVY) {
    if (targetPiece.type === NAVY) {
      // Torpedo attack
      if (currentRange > config.captureRange) {
        captureAllowed = false
      }
    } else {
      // Naval Gun attack
      if (currentRange > config.captureRange - 1) {
        captureAllowed = false
      }
    }
  }

  const canLand = canStayOnSquare(to, pieceData.type)
  if (!canLand) {
    addStayCapture = true
    addNormalCapture = false
  }
  //Air Force is very powerful piece. Add both options whether it can choose to stay captured or move capture
  if (canLand && pieceData.type === AIR_FORCE) {
    if (!isDeployMove) {
      addStayCapture = true
    }
    addNormalCapture = true
  }

  if (captureAllowed) {
    if (addNormalCapture) {
      addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE)
    }
    if (addStayCapture) {
      addMove(moves, us, from, to, pieceData, targetPiece, BITS.STAY_CAPTURE)
    }
  }
}

/**
 * Generate all possible moves for a piece
 */
export function generateMovesForPiece(
  gameInstance: CoTuLenh,
  from: number,
  pieceData: Piece,
  isDeployMove = false,
): InternalMove[] {
  const moves: InternalMove[] = []
  const us = pieceData.color
  const them = swapColor(us)
  const isHero = pieceData.heroic ?? false

  // Get movement configuration
  const config = getPieceMovementConfig(pieceData.type, isHero)

  // Get appropriate offsets
  const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS

  // Generate moves for each direction
  for (const offset of offsets) {
    generateMovesInDirection(
      gameInstance,
      moves,
      from,
      pieceData,
      config,
      offset,
      isDeployMove,
      them,
    )
  }

  return moves
}

function isHeavyZone(sq: number): 0 | 1 | 2 {
  const f = file(sq)
  const r = rank(sq)
  if (f < 2) return 0 // Not in heavy zone

  return r <= 5 ? 1 : 2 // 1 = upper half, 2 = lower half
}

/**
 * Generate deploy moves for a list of pieces from a given square
 * Shared by both generateDeployMoves and generateNormalMoves
 * @private
 */
function generateDeployMovesForPieces(
  gameInstance: CoTuLenh,
  fromSquare: number,
  pieces: Piece[],
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const moves: InternalMove[] = []
  for (const piece of pieces) {
    if (filterPiece && piece.type !== filterPiece) continue
    const pieceMoves = generateMovesForPiece(
      gameInstance,
      fromSquare,
      piece,
      true,
    )
    for (const m of pieceMoves) {
      m.flags |= BITS.DEPLOY
      moves.push(m)
    }
  }
  return moves
}

/**
 * Unified move generation function that intelligently determines whether to generate
 * deploy moves or normal moves based on the current session state.
 *
 * @param gameInstance - The current game instance
 * @param filterSquare - Optional square to filter moves (for deploy mode or specific square)
 * @param filterPiece - Optional piece type to filter moves
 * @returns Array of generated internal moves
 */
export function generateMoves(
  gameInstance: CoTuLenh,
  filterSquare?: Square | number,
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const session = gameInstance.getSession()

  if (session) {
    // Deploy mode - use session's stack square
    return generateDeployMoves(
      gameInstance,
      session.stackSquare,
      filterPiece,
      session,
    )
  } else {
    // Normal mode - scan entire board or specific square
    const squareToFilter =
      typeof filterSquare === 'number'
        ? (Object.keys(SQUARE_MAP).find(
            (key) => SQUARE_MAP[key as Square] === filterSquare,
          ) as Square | undefined)
        : filterSquare
    return generateNormalMoves(gameInstance, filterPiece, squareToFilter)
  }
}

/**
 * Generate all moves for a stack in deploy state
 */
export function generateDeployMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
  filterPiece?: PieceSymbol,
  session?: MoveSession | null,
): InternalMove[] {
  const us = gameInstance.turn()

  // Use provided session or fetch from game instance
  const deploySession = session ?? gameInstance.getSession()

  const carrierPiece =
    deploySession?.originalPiece ?? gameInstance.get(stackSquare)

  if (!carrierPiece || carrierPiece.color !== us) {
    return []
  }
  if (
    (!carrierPiece.carrying || carrierPiece.carrying.length === 0) &&
    (deploySession === null ||
      (deploySession && deploySession.stackSquare !== stackSquare))
  ) {
    return []
  }

  // Generate Deploy Moves for remaining carrying pieces
  const flattenedCarrierPiece = flattenPiece(carrierPiece)

  // Calculate remaining pieces using session
  let deployMoveCandidates: Piece[]
  if (deploySession) {
    const remaining = deploySession.remaining
    deployMoveCandidates = remaining || []
  } else {
    // No session - all pieces available
    deployMoveCandidates = flattenedCarrierPiece
  }

  // Generate deploy moves for all remaining pieces including the carrier
  const moves = generateDeployMovesForPieces(
    gameInstance,
    stackSquare,
    deployMoveCandidates,
    filterPiece,
  )

  // Generate recombine moves if we have a session
  // Only generate recombine moves for carried pieces, not the carrier itself
  if (deploySession && deployMoveCandidates.length > 0) {
    const carriedPiecesOnly = deployMoveCandidates.filter(
      (p) => p.type !== carrierPiece.type,
    )
    if (carriedPiecesOnly.length > 0) {
      const recombineMoves = generateRecombineMoves(
        gameInstance,
        deploySession,
        stackSquare,
        carriedPiecesOnly,
        moves,
        filterPiece,
      )
      moves.push(...recombineMoves)
    }
  }

  return moves
}

/**
 * Generate recombine moves - moves that rejoin deployed pieces
 */
function generateRecombineMoves(
  gameInstance: CoTuLenh,
  session: any, // DeploySession type
  stackSquare: number,
  remainingPieces: Piece[],
  normalMoves: InternalMove[],
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const moves: InternalMove[] = []
  const deployedSquares = session.moves.map((m: InternalMove) => m.to)

  for (const piece of remainingPieces) {
    if (filterPiece && piece.type !== filterPiece) continue

    for (const targetSquare of deployedSquares) {
      // Skip if there's already a normal move to this square for this piece
      const hasNormalMove = normalMoves.some(
        (m) => m.piece.type === piece.type && m.to === targetSquare,
      )

      if (!hasNormalMove) {
        const targetPiece = gameInstance.get(targetSquare)

        // Check if pieces can combine
        if (targetPiece && targetPiece.color === piece.color) {
          const combined = combinePieces([piece, targetPiece])
          if (combined) {
            moves.push({
              from: stackSquare,
              to: targetSquare,
              piece: piece,
              color: piece.color,
              flags: BITS.DEPLOY | BITS.COMBINATION,
              combined: targetPiece, // The piece at the target square (for SAN generation)
            })
          }
        }
      }
    }
  }

  return moves
}

/**
 * Generate all moves for a side in normal (non-deploy) state
 * Internal function - prefer using generateMoves() which handles session detection
 */
export function generateNormalMoves(
  gameInstance: CoTuLenh,
  filterPiece?: PieceSymbol,
  filterSquare?: Square,
): InternalMove[] {
  const us = gameInstance.turn()
  const moves: InternalMove[] = []
  let startSq = SQUARE_MAP.a12
  let endSq = SQUARE_MAP.k1

  if (filterSquare) {
    const sq = SQUARE_MAP[filterSquare]
    if (
      sq === undefined ||
      !gameInstance.get(sq) ||
      gameInstance.get(sq)?.color !== us
    )
      return []
    startSq = endSq = sq
  }

  for (let from = startSq; from <= endSq; from++) {
    if (!isSquareOnBoard(from)) continue

    const pieceData = gameInstance.get(from)
    if (!pieceData || pieceData.color !== us) continue

    if (pieceData.carrying && pieceData.carrying.length > 0) {
      let candidates = flattenPiece(pieceData)
      if (pieceData.type === NAVY && !LAND_MASK[from]) {
        // Remove carrier from the candidates
        candidates = candidates.filter((p) => p.type !== pieceData.type)
      }
      moves.push(
        ...generateDeployMovesForPieces(
          gameInstance,
          from,
          candidates,
          filterPiece,
        ),
      )
    }

    // Always generate moves for the piece itself (carrier or not)
    if (!filterPiece || pieceData.type === filterPiece) {
      const singleMoves = generateMovesForPiece(
        gameInstance,
        from,
        pieceData,
        false,
      )
      moves.push(...singleMoves)
    }
  }
  return moves
}

function isHorizontalOffset(offset: number): boolean {
  return offset === 16 || offset === -16
}

export function canStayOnSquare(
  square: number,
  pieceType: PieceSymbol,
): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}
