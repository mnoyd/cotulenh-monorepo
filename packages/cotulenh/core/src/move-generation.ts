/**
 * Piece movement configuration and logic for CoTuLenh chess variant
 *
 * ORGANIZATION BY DOMAIN:
 *
 * 1. CONFIGURATION & TYPES
 *    - Movement offsets, piece configs, heroic modifications
 *
 * 2. COMMANDER RULES
 *    - Flying General constraints & sight blocking
 *    - Commander-specific capture/movement rules
 *
 * 3. TERRAIN & BLOCKING
 *    - Water/land terrain validation
 *    - Heavy piece river crossing
 *    - Navy diagonal obstacles
 *
 * 4. PIECE-SPECIFIC CAPTURE RULES
 *    - Navy torpedo vs naval gun attacks
 *    - Air Force dual capture options
 *    - Capture validation logic
 *
 * 5. MOVEMENT & BLOCKING LOGIC
 *    - Ray casting helpers
 *    - Range limit checks
 *    - Piece blocking behavior
 *
 * 6. CORE MOVE GENERATION
 *    - Main ray-casting loop (generateMovesInDirection)
 *    - Per-piece move generation
 *    - Deploy and normal move orchestration
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

// ========================================================================
// COMMANDER RULES - Flying General & Special Movement
// ========================================================================

/**
 * Constraints for Commander movement to avoid "Flying General" exposure.
 */
export type CommanderConstraints = Set<number>

/**
 * Calculates squares that the Commander cannot step into because they are
 * exposed to the Enemy Commander (Flying General Sight Block).
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

/**
 * Check if Commander can see enemy Commander orthogonally for immediate capture
 */
function canCommanderCaptureEnemyCommander(
  isCommander: boolean,
  targetPiece: Piece | null,
  them: Color,
  isOrthogonal: boolean,
): boolean {
  return (
    isCommander &&
    targetPiece !== null &&
    targetPiece.type === COMMANDER &&
    targetPiece.color === them &&
    isOrthogonal
  )
}

/**
 * Check if Commander can capture at given range
 */
function canCommanderCaptureAt(currentRange: number): boolean {
  return currentRange <= 1 // Adjacent only
}

/**
 * Check if Commander should be blocked from sliding past enemy commander
 * Returns true if enemy commander is found ahead (should NOT add this move)
 */
function shouldBlockCommanderSlide(
  gameInstance: CoTuLenh,
  from: number,
  to: number,
  offset: number,
  them: Color,
  isCommander: boolean,
  isOrthogonal: boolean,
): boolean {
  if (!isCommander || !isOrthogonal) return false

  // Look ahead to see if enemy commander is in line of sight
  let lookAheadSq = to + offset
  while (isSquareOnBoard(lookAheadSq)) {
    const lookAheadPiece = gameInstance.get(lookAheadSq)
    if (lookAheadPiece) {
      return lookAheadPiece.type === COMMANDER && lookAheadPiece.color === them
    }
    lookAheadSq += offset
  }
  return false
}

// ========================================================================
// TERRAIN & BLOCKING - Water, Heavy Pieces, Navy Obstacles
// ========================================================================

/**
 * Determine if a piece blocks further movement in this direction
 */
function isPieceBlocking(
  targetPiece: Piece,
  pieceType: PieceSymbol,
  moveIgnoresBlocking: boolean,
): boolean {
  if (moveIgnoresBlocking) return false

  // Navy can move past any piece except other navy
  if (pieceType === NAVY && targetPiece.type !== NAVY) {
    return false
  }

  return true
}

/**
 * Check if ray should stop after encountering a piece
 * This is checked AFTER move/capture generation to handle Artillery correctly
 */
function shouldStopRayAtPiece(
  targetPiece: Piece,
  pieceType: PieceSymbol,
  them: Color,
  isOrthogonal: boolean,
  pieceBlockedMovement: boolean,
  captureIgnoresPieceBlocking: boolean,
  moveIgnoresBlocking: boolean,
): boolean {
  // Commander stops at any piece except enemy commander on orthogonal
  if (pieceType === COMMANDER) {
    const canCaptureEnemyCommander =
      targetPiece.type === COMMANDER &&
      targetPiece.color === them &&
      isOrthogonal
    return !canCaptureEnemyCommander
  }

  // Stop if movement is blocked and piece doesn't ignore blocking
  if (
    pieceBlockedMovement &&
    !captureIgnoresPieceBlocking &&
    !moveIgnoresBlocking
  ) {
    return true
  }

  return false
}

/**
 * Check if current range exceeds piece's movement/capture capabilities
 */
function isRangeExceeded(
  currentRange: number,
  pieceType: PieceSymbol,
  isDiagonal: boolean,
  moveRange: number,
  captureRange: number,
): boolean {
  // Missile has special diagonal range limit
  if (pieceType === MISSILE && isDiagonal && currentRange > moveRange - 1) {
    return true
  }

  // Non-commander pieces have finite ranges
  if (pieceType !== COMMANDER) {
    return currentRange > moveRange && currentRange > captureRange
  }

  // Commander has board-limited range
  return currentRange >= 11
}

// ========================================================================
// CORE MOVE GENERATION - Main Ray-Casting Logic
// ========================================================================

/**
 * Generate moves in a single direction from a square
 * Refactored for clarity - delegates to specialized helper functions
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
  constraints?: CommanderConstraints | null,
): void {
  const us = pieceData.color
  const pieceType = pieceData.type

  // Pre-compute piece type flags for performance
  const isCommander = pieceType === COMMANDER
  const isAirForce = pieceType === AIR_FORCE
  const isNavy = pieceType === NAVY

  // Pre-compute movement behavior flags
  const isOrthogonal =
    offset === -16 || offset === 1 || offset === 16 || offset === -1
  const isDiagonal = !isOrthogonal
  const {
    moveRange,
    captureRange,
    moveIgnoresBlocking,
    captureIgnoresPieceBlocking,
  } = config

  // Pre-compute terrain mask
  const stayMask = getMovementMask(pieceType)

  // Initialize air defense for air force
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

  // Ray-casting loop
  while (true) {
    to += offset
    currentRange++

    // ===== BOUNDARY & CONSTRAINT CHECKS =====
    if (!isSquareOnBoard(to)) break

    // Commander sight block constraints
    if (isCommander && constraints?.has(to)) break

    // Air defense check
    let airDefenseResult = -1
    if (isAirForce) {
      airDefenseResult = checkAirforceState!()
      if (airDefenseResult === AirDefenseResult.DESTROYED) break
    }

    // Range limits
    if (
      isRangeExceeded(
        currentRange,
        pieceType,
        isDiagonal,
        moveRange,
        captureRange,
      )
    ) {
      break
    }

    const targetPiece = gameInstance.get(to)

    // Terrain blocking (evaluated once per direction)
    if (!terrainBlockedMovement) {
      terrainBlockedMovement = checkTerrainBlocking(from, to, pieceType, offset)
    }

    // ===== PIECE INTERACTION =====
    if (targetPiece) {
      const targetColor = targetPiece.color

      // Commander special rule: immediate capture of enemy commander
      if (
        canCommanderCaptureEnemyCommander(
          isCommander,
          targetPiece,
          them,
          isOrthogonal,
        )
      ) {
        addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE)
        break
      }

      // Enemy piece - attempt capture
      if (targetColor === them && currentRange <= captureRange) {
        // Avoid double-adding commander vs commander
        if (!(isCommander && targetPiece.type === COMMANDER)) {
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
      }

      // Friendly piece - potential combination
      if (targetColor === us) {
        const combinedPiece = combinePieces([pieceData, targetPiece])
        if (combinedPiece?.carrying?.length) {
          const combinedMask = getMovementMask(combinedPiece.type)
          if (
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

      // Update blocking state
      if (isPieceBlocking(targetPiece, pieceType, moveIgnoresBlocking)) {
        pieceBlockedMovement = true
      }

      // Determine if ray should stop
      if (
        shouldStopRayAtPiece(
          targetPiece,
          pieceType,
          them,
          isOrthogonal,
          pieceBlockedMovement,
          captureIgnoresPieceBlocking,
          moveIgnoresBlocking,
        )
      ) {
        break
      }
    } else {
      // ===== EMPTY SQUARE - MOVEMENT =====
      const canMove =
        currentRange <= moveRange &&
        !terrainBlockedMovement &&
        !pieceBlockedMovement &&
        !!stayMask[to] &&
        (!isAirForce || airDefenseResult === AirDefenseResult.SAFE_PASS)

      if (canMove) {
        // Commander cannot slide past enemy commander
        if (
          !shouldBlockCommanderSlide(
            gameInstance,
            from,
            to,
            offset,
            them,
            isCommander,
            isOrthogonal,
          )
        ) {
          addMove(moves, us, from, to, pieceData)
        }
      }
    }
  }
}

/**
 * Navy-specific diagonal blocking squares
 * These represent hard-coded terrain obstacles for navy diagonal movement
 */
const NAVY_DIAGONAL_BLOCKS = new Map<number, Set<number>>([
  [-15, new Set([0x63])],
  [15, new Set([0x72])],
  [-17, new Set([0x42])],
  [17, new Set([0x53])],
])

/**
 * Check if Navy is blocked on specific diagonal moves
 */
function isNavyBlockedDiagonal(offset: number, to: number): boolean {
  return NAVY_DIAGONAL_BLOCKS.get(offset)?.has(to) ?? false
}

/**
 * Check if heavy piece can cross river between zones
 */
function isHeavyPieceCrossingBlocked(
  from: number,
  to: number,
  offset: number,
): boolean {
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
      return false // Bridge crossing allowed
    }
    return true // Crossing blocked
  }
  return false
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
    if (isHeavyPieceCrossingBlocked(from, to, offset)) {
      return true
    }
  }

  // Navy diagonal blocking
  if (pieceDataType === NAVY) {
    if (isNavyBlockedDiagonal(offset, to)) {
      return true
    }
  }

  return false
}

// ========================================================================
// PIECE-SPECIFIC CAPTURE RULES - Navy, Air Force Mechanics
// ========================================================================

/**
 * Check if Navy can capture target at given range
 */
function canNavyCaptureAt(
  currentRange: number,
  targetType: PieceSymbol,
  captureRange: number,
): boolean {
  if (targetType === NAVY) {
    // Torpedo attack - full range
    return currentRange <= captureRange
  } else {
    // Naval Gun attack - reduced range
    return currentRange <= captureRange - 1
  }
}

/**
 * Determine capture move types for a piece
 */
interface CaptureOptions {
  addNormalCapture: boolean
  addStayCapture: boolean
}

function determineCaptureOptions(
  pieceType: PieceSymbol,
  to: number,
  stayMask: Uint8Array,
  isDeployMove: boolean,
): CaptureOptions {
  const canLand = !!stayMask[to]

  if (!canLand) {
    // Must use stay capture if can't land
    return { addNormalCapture: false, addStayCapture: true }
  }

  // Air Force gets both options (very powerful)
  if (pieceType === AIR_FORCE && !isDeployMove) {
    return { addNormalCapture: true, addStayCapture: true }
  }

  // Normal pieces - standard capture
  return { addNormalCapture: true, addStayCapture: false }
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

  // Suicide moves are handled immediately
  if (isSuicideMove) {
    addMove(moves, us, from, to, pieceData, targetPiece, BITS.SUICIDE_CAPTURE)
    return
  }

  // Validate if capture is allowed based on piece-specific rules
  let captureAllowed = true

  if (isCommander && !canCommanderCaptureAt(currentRange)) {
    captureAllowed = false
  }

  if (
    isNavy &&
    !canNavyCaptureAt(currentRange, targetPiece.type, config.captureRange)
  ) {
    captureAllowed = false
  }

  if (!captureAllowed) return

  // Determine which capture types to add
  const { addNormalCapture, addStayCapture } = determineCaptureOptions(
    pieceData.type,
    to,
    stayMask,
    isDeployMove,
  )

  if (addNormalCapture) {
    addMove(moves, us, from, to, pieceData, targetPiece, BITS.CAPTURE)
  }
  if (addStayCapture) {
    addMove(moves, us, from, to, pieceData, targetPiece, BITS.STAY_CAPTURE)
  }
}

// ========================================================================
// CORE MOVE GENERATION - Main Ray-Casting Logic
// ========================================================================

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
    const candidates = flattenPiece(pieceData)

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
    if (sq === undefined) return []

    const piece = gameInstance.get(sq)
    if (!piece || piece.color !== us) return []

    generateMovesFromSquare(gameInstance, sq, moves, filterPiece)
    return moves
  }

  // Iterate over all valid squares using precomputed array
  for (const from of VALID_SQUARES) {
    generateMovesFromSquare(gameInstance, from, moves, filterPiece)
  }
  return moves
}
