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
 *
 * Optimized version with pre-computed flags outside the loop.
 * Key optimizations:
 * - Pre-compute piece type flags to avoid repeated comparisons in hot loop
 * - Cache blocking behavior and range flags
 * - Use direct offset comparison instead of array.includes()
 * - Use fast 0x88 board boundary check
 */
export function generateMovesInDirection(
  gameInstance: CoTuLenh,
  moves: InternalMove[],
  from: number,
  pieceData: Piece,
  config: PieceMovementConfig,
  offset: number,
  isDeployMove: boolean,
  them: Color,
): void {
  const us = pieceData.color
  const pieceType = pieceData.type

  // Pre-compute piece type flags (avoid repeated checks in hot loop)
  const isCommander = pieceType === COMMANDER
  const isAirForce = pieceType === AIR_FORCE
  const isNavy = pieceType === NAVY
  const isMissile = pieceType === MISSILE

  // Pre-compute movement behavior flags
  // Direct comparison is faster than array.includes()
  const isOrthogonal =
    offset === -16 || offset === 1 || offset === 16 || offset === -1
  const isDiagonal = !isOrthogonal
  const isHorizontal = offset === 16 || offset === -16
  const moveIgnoresBlocking = config.moveIgnoresBlocking
  const captureIgnoresPieceBlocking = config.captureIgnoresPieceBlocking
  const { moveRange, captureRange } = config

  // Air defense check setup (only for non-heroic AIR_FORCE)
  const shouldCheckAirDefense = isAirForce && !pieceData.heroic
  const checkAirforceState = shouldCheckAirDefense
    ? getCheckAirDefenseZone(gameInstance, from, them, offset)
    : null

  let currentRange = 0
  let to = from
  let pieceBlockedMovement = false
  let terrainBlockedMovement = false

  while (true) {
    to += offset
    currentRange++

    // Board boundary check - must use isSquareOnBoard for 11x12 board
    // Note: Standard 0x88 trick doesn't work here because we have 11 files (0-10)
    if (!isSquareOnBoard(to)) break

    // Air defense check for non-heroic AIR_FORCE
    let airDefenseResult = -1
    if (shouldCheckAirDefense) {
      airDefenseResult = checkAirforceState!()
      if (airDefenseResult === AirDefenseResult.DESTROYED) break
    }

    // Missile diagonal movement limit
    if (isMissile && isDiagonal && currentRange > moveRange - 1) break

    // Range limit for non-commander pieces
    if (!isCommander && currentRange > moveRange && currentRange > captureRange)
      break

    const targetPiece = gameInstance.get(to)

    // Terrain blocking check (only evaluated once per direction)
    if (!terrainBlockedMovement) {
      terrainBlockedMovement = checkTerrainBlocking(
        from,
        to,
        pieceType,
        isHorizontal,
      )
    }

    if (targetPiece) {
      const targetType = targetPiece.type
      const targetColor = targetPiece.color

      // === COMMANDER SPECIAL RULE ===
      // Commander sees enemy commander orthogonally - immediate capture at any range
      if (
        isCommander &&
        targetType === COMMANDER &&
        targetColor === them &&
        isOrthogonal
      ) {
        addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE)
        break
      }

      // Normal capture logic
      if (targetColor === them && currentRange <= captureRange) {
        // Avoid double-adding commander vs commander capture
        if (!(isCommander && targetType === COMMANDER)) {
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
      } else if (targetColor === us) {
        // Friendly combination
        const combinedPiece = combinePieces([pieceData, targetPiece])
        if (
          !isDeployMove &&
          combinedPiece?.carrying?.length &&
          currentRange <= moveRange &&
          !terrainBlockedMovement &&
          !pieceBlockedMovement &&
          canStayOnSquare(to, combinedPiece.type)
        ) {
          addMove(moves, us, from, to, pieceData, targetPiece, BITS.COMBINATION)
        }
      }

      // Piece blocking logic
      if (!moveIgnoresBlocking) {
        // Navy can move past any piece except other navy
        if (!(isNavy && targetType !== NAVY)) {
          pieceBlockedMovement = true
        }
      }

      // Commander cannot slide past blocking pieces
      // (except for enemy commander captured above)
      if (
        isCommander &&
        !(targetType === COMMANDER && targetColor === them && isOrthogonal)
      ) {
        break
      }
    } else {
      // Empty square - potential movement destination
      if (
        currentRange <= moveRange &&
        !terrainBlockedMovement &&
        !pieceBlockedMovement &&
        canStayOnSquare(to, pieceType) &&
        (!shouldCheckAirDefense ||
          airDefenseResult === AirDefenseResult.SAFE_PASS)
      ) {
        // Commander special rule: cannot slide past where enemy commander would be captured
        if (isCommander && isOrthogonal) {
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
              break
            }
            lookAheadSq += offset
          }
          if (!enemyCommanderFound) {
            addMove(moves, us, from, to, pieceData)
          }
        } else {
          addMove(moves, us, from, to, pieceData)
        }
      }
    }

    // Stop if blocked (for pieces that don't ignore blocking)
    if (
      pieceBlockedMovement &&
      !captureIgnoresPieceBlocking &&
      !moveIgnoresBlocking &&
      !(
        isCommander &&
        targetPiece?.type === COMMANDER &&
        targetPiece?.color === them &&
        isOrthogonal
      )
    ) {
      break
    }

    // Commander range limit (maximum board dimension)
    if (isCommander && currentRange >= 11) break
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

export function canStayOnSquare(
  square: number,
  pieceType: PieceSymbol,
): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}
