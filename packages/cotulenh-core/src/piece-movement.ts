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
  CAN_STAY_CAPTURE_WHEN_CARRIED,
  swapColor,
  Square,
} from './type.js'
import { addMove } from './utils.js'
import { BITS } from './type.js'
import { CoTuLenh } from './cotulenh.js'

// Movement direction offsets
export const ORTHOGONAL_OFFSETS = [-16, 1, 16, -1] // N, E, S, W
export const DIAGONAL_OFFSETS = [-17, -15, 17, 15] // NE, NW, SE, SW
export const ALL_OFFSETS = [...ORTHOGONAL_OFFSETS, ...DIAGONAL_OFFSETS]

// Movement configuration interface
export interface PieceMovementConfig {
  moveRange: number
  captureRange: number
  isSliding: boolean
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
    isSliding: true,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
    specialRules: { commanderAdjacentCaptureOnly: true },
  },
  [INFANTRY]: {
    moveRange: 1,
    captureRange: 1,
    isSliding: false,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
  [ENGINEER]: {
    moveRange: 1,
    captureRange: 1,
    isSliding: false,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
  [TANK]: {
    moveRange: 2,
    captureRange: 2,
    isSliding: true,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
    specialRules: { tankShootOverBlocking: true },
  },
  [MILITIA]: {
    moveRange: 1,
    captureRange: 1,
    isSliding: false,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
  [ARTILLERY]: {
    moveRange: 3,
    captureRange: 3,
    isSliding: true,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: false,
  },
  [ANTI_AIR]: {
    moveRange: 1,
    captureRange: 1,
    isSliding: false,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
  },
  [MISSILE]: {
    moveRange: 2,
    captureRange: 2,
    isSliding: true,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: false,
    specialRules: { missileSpecialRange: true },
  },
  [AIR_FORCE]: {
    moveRange: 4,
    captureRange: 4,
    isSliding: true,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: true,
  },
  [NAVY]: {
    moveRange: 4,
    captureRange: 4,
    isSliding: true,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false,
    specialRules: { navyAttackMechanisms: true },
  },
  [HEADQUARTER]: {
    moveRange: 0,
    captureRange: 0,
    isSliding: false,
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
      baseConfig.isSliding = false
    }
  }

  return baseConfig
}

/**
 * Helper function to check if a piece is a heavy piece (for river crossing rules)
 */
export function isHeavyPiece(pieceType: PieceSymbol): boolean {
  return [ARTILLERY, MISSILE, ANTI_AIR].includes(pieceType)
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

  while (true) {
    to += offset
    currentRange++

    // Check if square is on board
    if (!isSquareOnBoard(to)) break

    // Special case for Missile diagonal movement
    if (
      pieceData.type === MISSILE &&
      DIAGONAL_OFFSETS.includes(offset) &&
      currentRange > config.moveRange - 1
    ) {
      break
    }

    // Check if we've exceeded maximum ranges
    if (currentRange > config.moveRange && currentRange > config.captureRange)
      break

    const targetPiece = gameInstance['_board'][to]

    // Terrain blocking check
    if (!terrainBlockedMovement) {
      terrainBlockedMovement = checkTerrainBlocking(
        from,
        to,
        pieceData,
        isHorizontalOffset(offset),
      )
    }

    // Target square analysis
    if (targetPiece) {
      // Capture logic
      if (targetPiece.color === them && currentRange <= config.captureRange) {
        handleCaptureLogic(
          moves,
          from,
          to,
          pieceData,
          targetPiece,
          currentRange,
          config,
          pieceBlockedMovement,
          terrainBlockedMovement,
          isDeployMove,
        )
      }

      // Piece blocking check
      if (!config.moveIgnoresBlocking) {
        // Navy ignores friendly piece blocking
        if (!(pieceData.type === NAVY && targetPiece.color === us)) {
          pieceBlockedMovement = true
        }
      }

      // Check if we should stop looking in this direction
      if (!config.captureIgnoresPieceBlocking && pieceData.type !== TANK) {
        if (pieceBlockedMovement) break
      }
    } else {
      const canLandOnSquare =
        pieceData.type === NAVY ? NAVY_MASK[to] : LAND_MASK[to]
      // Move to empty square logic
      if (
        currentRange <= config.moveRange &&
        !terrainBlockedMovement &&
        !pieceBlockedMovement &&
        canLandOnSquare
      ) {
        addMove(moves, us, from, to, pieceData.type)
      }
    }

    // Loop termination logic
    if (!config.isSliding) break

    if (
      pieceBlockedMovement &&
      !config.captureIgnoresPieceBlocking &&
      !config.moveIgnoresBlocking
    ) {
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
  pieceData: Piece,
  isHorizontalOffset: boolean,
): boolean {
  // Navy can only move on water
  if (pieceData.type === NAVY) {
    return !NAVY_MASK[to]
  }

  // Land pieces can't move on water
  if (!LAND_MASK[to]) {
    return pieceData.type !== AIR_FORCE // Air Force can fly over water
  }

  // Heavy piece river crossing rule
  if (isHeavyPiece(pieceData.type)) {
    const zoneFrom = isHeavyZone(from)
    const zoneTo = isHeavyZone(to)

    if (zoneFrom !== 0 && zoneTo !== 0 && zoneFrom !== zoneTo) {
      if (isHorizontalOffset && (file(from) === 5 || file(to) === 7)) {
        return true
      }
      return false
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
  pieceBlockedMovement: boolean,
  terrainBlockedMovement: boolean,
  isDeployMove: boolean,
): void {
  const us = pieceData.color
  const isHero = pieceData.heroic ?? false

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
      if (currentRange > (isHero ? 5 : 4)) {
        captureAllowed = false
      }
    } else {
      // Naval Gun attack
      if (currentRange > (isHero ? 4 : 3)) {
        captureAllowed = false
      }
    }
  }

  // Check if path is blocked by pieces for capture
  if (
    captureAllowed &&
    !config.captureIgnoresPieceBlocking &&
    pieceBlockedMovement
  ) {
    // Tank special case
    if (pieceData.type === TANK && currentRange === 2) {
      captureAllowed = true
    } else {
      captureAllowed = false
    }
  }

  // Check if normal capture would land on invalid terrain
  if (captureAllowed && addNormalCapture) {
    const isTargetTerrainValidForAttacker =
      pieceData.type === NAVY ? NAVY_MASK[to] : LAND_MASK[to]

    if (!isTargetTerrainValidForAttacker) {
      if (
        isDeployMove &&
        CAN_STAY_CAPTURE_WHEN_CARRIED.includes(pieceData.type)
      ) {
        if (pieceData.type === AIR_FORCE && !LAND_MASK[to]) {
          addNormalCapture = false
          addStayCapture = true
        } else {
          addNormalCapture = true
          addStayCapture = true
        }
      } else if (
        !isDeployMove &&
        pieceData.type === AIR_FORCE &&
        !LAND_MASK[to]
      ) {
        addNormalCapture = false
        addStayCapture = true
      } else {
        addNormalCapture = false
        addStayCapture = true
      }
    }
  }

  if (captureAllowed) {
    if (addNormalCapture) {
      addMove(
        moves,
        us,
        from,
        to,
        pieceData.type,
        targetPiece.type,
        BITS.CAPTURE,
      )
    }
    if (addStayCapture) {
      addMove(
        moves,
        us,
        from,
        to,
        pieceData.type,
        targetPiece.type,
        BITS.CAPTURE | BITS.STAY_CAPTURE,
      )
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
  isHero: boolean,
  isDeployMove = false,
): InternalMove[] {
  const moves: InternalMove[] = []
  const us = pieceData.color
  const them = swapColor(us)

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
 * Generate all moves for a stack in deploy state
 */
export function generateDeployMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const moves: InternalMove[] = []
  const carrierPiece = gameInstance['_board'][stackSquare]
  const us = gameInstance.turn()

  if (!carrierPiece || carrierPiece.color !== us) {
    return []
  }

  // Generate Deploy Moves for remaining carried pieces
  if (carrierPiece.carried) {
    for (const carriedPiece of carrierPiece.carried) {
      if (filterPiece && carriedPiece.type !== filterPiece) continue

      const deployMoves = generateMovesForPiece(
        gameInstance,
        stackSquare,
        carriedPiece,
        false,
        true,
      )
      deployMoves.forEach((m) => {
        m.flags |= BITS.DEPLOY
        moves.push(m)
      })
    }
  }
  // Generate Carrier Moves
  if (!filterPiece || carrierPiece.type === filterPiece) {
    const carrierMoves = generateMovesForPiece(
      gameInstance,
      stackSquare,
      carrierPiece,
      carrierPiece.heroic ?? false,
    )
    moves.push(...carrierMoves)
  }

  return moves
}

/**
 * Generate all moves for a side in normal (non-deploy) state
 */
export function generateNormalMoves(
  gameInstance: CoTuLenh,
  us: Color,
  filterPiece?: PieceSymbol,
  filterSquare?: Square,
): InternalMove[] {
  const moves: InternalMove[] = []
  let startSq = 0
  let endSq = 255

  if (filterSquare) {
    const sq = SQUARE_MAP[filterSquare]
    if (
      sq === undefined ||
      !gameInstance['_board'][sq] ||
      gameInstance['_board'][sq]?.color !== us
    )
      return []
    startSq = endSq = sq
  }

  for (let from = startSq; from <= endSq; from++) {
    if (!isSquareOnBoard(from)) continue

    const pieceData = gameInstance['_board'][from]
    if (!pieceData || pieceData.color !== us) continue
    if (filterPiece && pieceData.type !== filterPiece) continue

    // Check if it's a stack
    if (pieceData.carried && pieceData.carried.length > 0) {
      // Generate Deploy Moves for carried pieces
      for (const carriedPiece of pieceData.carried) {
        const deployMoves = generateMovesForPiece(
          gameInstance,
          from,
          carriedPiece,
          false,
          true,
        )
        deployMoves.forEach((m) => {
          m.flags |= BITS.DEPLOY
          moves.push(m)
        })
      }
      // Generate Carrier Moves (moving the whole stack)
      const carrierMoves = generateMovesForPiece(
        gameInstance,
        from,
        pieceData,
        pieceData.heroic ?? false,
      )
      moves.push(...carrierMoves)
    } else {
      // Generate moves for a single piece
      const singleMoves = generateMovesForPiece(
        gameInstance,
        from,
        pieceData,
        pieceData.heroic ?? false,
      )
      moves.push(...singleMoves)
    }
  }
  return moves
}

function isHorizontalOffset(offset: number): boolean {
  return offset === 16 || offset === -16
}
