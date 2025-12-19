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
  getMovementMask,
  swapColor,
  Square,
  HEAVY_PIECES,
  VALID_SQUARES,
} from './type.js'
import { flattenPiece, combinePieces, addMove } from './utils.js'
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
 * Constraints for Commander movement to avoid "Flying General" exposure.
 * A bitmask-like object or set of invalid squares.
 * For efficiency, we can use an array of booleans or a Set.
 * Since we only check specific squares, a simple Set<number> is clean.
 */
export type CommanderConstraints = Set<number>

/**
 * Calculates squares that the Commander cannot step into because they are
 * exposed to the Enemy Commander (Flying General Sight Block).
 *
 * @param gameInstance The game instance to check board state.
 * @param usCommanderSq The current square of our Commander (moving piece).
 * @param themCommanderSq The square of the enemy Commander.
 * @returns A Set of invalid squares (Danger Zone), or null if no restrictions.
 */
export function getCommanderExposureConstraints(
  gameInstance: CoTuLenh,
  usCommanderSq: number,
  themCommanderSq: number,
): CommanderConstraints | null {
  if (themCommanderSq === -1) return null

  const usRank = rank(usCommanderSq)
  const usFile = file(usCommanderSq)
  const themRank = rank(themCommanderSq)
  const themFile = file(themCommanderSq)

  const constraints: CommanderConstraints = new Set()

  // Vertical Direction from Enemy to Us
  let vOffset = 0
  if (usRank > themRank)
    vOffset = 16 // Us is "north" (higher rank index? Wait, rank 0 is top usually? Let's check type.ts)
  else if (usRank < themRank) vOffset = -16
  else vOffset = 16 // Same rank? Pick one, or both? If same rank, we check Horizontal primarily. But technically vertical is not exposed?

  if (usRank < themRank) vOffset = -16
  else if (usRank > themRank) vOffset = 16

  let hOffset = 0
  if (usFile < themFile) hOffset = -1
  else if (usFile > themFile) hOffset = 1

  const rays = []
  if (vOffset !== 0) rays.push(vOffset)
  if (hOffset !== 0) rays.push(hOffset)

  for (const offset of rays) {
    let sq = themCommanderSq + offset
    while (isSquareOnBoard(sq)) {
      if (sq === usCommanderSq) {
        // We found ourselves. Treating as empty means we continue scan.
        // And 'sq' itself is strictly exposed (we are standing on it).
        constraints.add(sq)
      } else {
        const piece = gameInstance.get(sq)
        if (piece) {
          // Obstruction found BEFORE hitting us (or after passing us)
          // Since we scan FROM enemy, an obstruction here blocks the rest of the ray.
          break
        }
        // Empty square, exposed.
        constraints.add(sq)
      }
      sq += offset
    }
  }

  return constraints
}

export function generateMovesInDirection(
  gameInstance: CoTuLenh,
  moves: InternalMove[],
  from: number,
  pieceData: Piece,
  config: PieceMovementConfig,
  offset: number,
  isDeployMove: boolean,
  them: Color,
  constraints?: CommanderConstraints | null,
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
  const moveIgnoresBlocking = config.moveIgnoresBlocking
  const captureIgnoresPieceBlocking = config.captureIgnoresPieceBlocking
  const { moveRange, captureRange } = config

  // Pre-compute terrain mask for canStayOnSquare checks
  const stayMask = getMovementMask(pieceType)

  const checkAirforceState = isAirForce
    ? getCheckAirDefenseZone(
        gameInstance,
        from,
        them,
        offset,
        !!pieceData.heroic,
      )
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

    // === COMMANDER SIGHT BLOCK ===
    // If scanning commander moves, check constraints
    if (isCommander && constraints && constraints.has(to)) {
      break // Cannot enter or pass through exposed square
    }

    // Air defense check
    let airDefenseResult = -1
    if (isAirForce) {
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
      terrainBlockedMovement = checkTerrainBlocking(from, to, pieceType, offset)
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
            isCommander,
            isNavy,
            isAirForce,
            stayMask,
          )
        }
      } else if (targetColor === us) {
        // Friendly combination
        const combinedPiece = combinePieces([pieceData, targetPiece])
        if (combinedPiece) {
          // Check if combined piece can stay on this terrain
          // Note: Must use combinedPiece.type, not moving piece's type
          const combinedMask = getMovementMask(combinedPiece.type)

          if (
            !isDeployMove &&
            combinedPiece?.carrying?.length &&
            currentRange <= moveRange &&
            !terrainBlockedMovement &&
            !pieceBlockedMovement &&
            combinedMask[to]
          ) {
            addMove(
              moves,
              us,
              from,
              to,
              pieceData,
              targetPiece,
              BITS.COMBINATION,
            )
          }
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
        !!stayMask[to] &&
        (!isAirForce || airDefenseResult === AirDefenseResult.SAFE_PASS)
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
  offset: number,
): boolean {
  // Check basic terrain validity using mask
  if (!getMovementMask(pieceDataType)[to]) {
    return pieceDataType !== AIR_FORCE // Air Force can fly over water
  }

  // Heavy piece river crossing rule
  if (HEAVY_PIECES.has(pieceDataType)) {
    const fromFile = file(from)
    const fromRank = rank(from)
    const toFile = file(to)
    const toRank = rank(to)
    const isHorizontalOffset = offset === 16 || offset === -16

    // Determine zones (0 = not in heavy zone, 1 = upper half, 2 = lower half)
    const zoneFrom = fromFile < 2 ? 0 : fromRank <= 5 ? 1 : 2
    const zoneTo = toFile < 2 ? 0 : toRank <= 5 ? 1 : 2

    if (zoneFrom !== 0 && zoneTo !== 0 && zoneFrom !== zoneTo) {
      if (isHorizontalOffset && (fromFile === 5 || toFile === 7)) {
        return false
      }
      return true
    }
  }
  if (pieceDataType === NAVY) {
    if (
      (offset === -15 && to === 0x63) ||
      (offset === 15 && to === 0x72) ||
      (offset === -17 && to === 0x42) ||
      (offset === 17 && to === 0x53)
    ) {
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
  isCommander: boolean,
  isNavy: boolean,
  isAirForce: boolean,
  stayMask: Uint8Array,
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
  if (isCommander && currentRange > 1) {
    captureAllowed = false
  }

  // Navy attack mechanisms
  if (isNavy) {
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

  const canLand = !!stayMask[to]
  if (!canLand) {
    addStayCapture = true
    addNormalCapture = false
  }
  //Air Force is very powerful piece. Add both options whether it can choose to stay captured or move capture
  if (canLand && isAirForce) {
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

  // Optimization: Pre-calculate exposure constraints for Commander
  let exposureConstraints: CommanderConstraints | null = null
  if (pieceData.type === COMMANDER) {
    const themCommanderSq = gameInstance.getCommanderSquare(them)
    exposureConstraints = getCommanderExposureConstraints(
      gameInstance,
      from,
      themCommanderSq,
    )
  }

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
      exposureConstraints,
    )
  }

  return moves
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
 * Helper to generate moves from a single square
 * @private
 */
function generateMovesFromSquare(
  gameInstance: CoTuLenh,
  sq: number,
  moves: InternalMove[],
  filterPiece?: PieceSymbol,
): void {
  const us = gameInstance.turn()
  const pieceData = gameInstance.get(sq)

  if (!pieceData || pieceData.color !== us) return

  if (pieceData.carrying && pieceData.carrying.length > 0) {
    let candidates = flattenPiece(pieceData)

    moves.push(
      ...generateDeployMovesForPieces(
        gameInstance,
        sq,
        candidates,
        filterPiece,
      ),
    )
  }

  // Always generate moves for the piece itself (carrier or not)
  if (!filterPiece || pieceData.type === filterPiece) {
    const singleMoves = generateMovesForPiece(
      gameInstance,
      sq,
      pieceData,
      false,
    )
    moves.push(...singleMoves)
  }
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

  // Handle filterSquare case
  if (filterSquare) {
    const sq = SQUARE_MAP[filterSquare]
    if (
      sq === undefined ||
      !gameInstance.get(sq) ||
      gameInstance.get(sq)?.color !== us
    )
      return []

    generateMovesFromSquare(gameInstance, sq, moves, filterPiece)
    return moves
  }

  // Iterate over all valid squares using precomputed array
  for (const from of VALID_SQUARES) {
    generateMovesFromSquare(gameInstance, from, moves, filterPiece)
  }
  return moves
}
