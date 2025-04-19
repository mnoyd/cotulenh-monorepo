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
    terrainBlockedMovement = checkTerrainBlocking(
      gameInstance,
      from,
      to,
      pieceData,
    )

    // Target square analysis
    if (targetPiece) {
      // Capture logic
      if (targetPiece.color === them && currentRange <= config.captureRange) {
        handleCaptureLogic(
          gameInstance,
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
      // Move to empty square logic
      if (
        currentRange <= config.moveRange &&
        !terrainBlockedMovement &&
        !pieceBlockedMovement
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
  gameInstance: CoTuLenh,
  from: number,
  to: number,
  pieceData: Piece,
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
      return isBridgeCrossing(from, to)
    }
  }

  return false
}

/**
 * Handle capture logic for a piece
 */
function handleCaptureLogic(
  gameInstance: CoTuLenh,
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
  gameInstance: any,
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

function isBridgeCrossing(from: number, to: number): boolean {
  const path = getPath(from, to)

  // Check if both squares of either bridge are present in the path
  const hasF6 = path.includes(SQUARE_MAP.f6)
  const hasF7 = path.includes(SQUARE_MAP.f7)
  const hasH6 = path.includes(SQUARE_MAP.h6)
  const hasH7 = path.includes(SQUARE_MAP.h7)

  // Valid crossing requires both squares of either bridge
  return (hasF6 && hasF7) || (hasH6 && hasH7)
}

function getPath(from: number, to: number): number[] {
  const path: number[] = []
  const dx = file(to) - file(from)
  const dy = rank(to) - rank(from)
  const dirX = dx && (dx > 0 ? 1 : -1) // Horizontal direction
  const dirY = dy && (dy > 0 ? 1 : -1) // Vertical direction

  // Handle orthogonal moves
  if (dx === 0 || dy === 0) {
    const steps = Math.max(Math.abs(dx), Math.abs(dy))
    const offset = dx ? dirX : dirY * 16

    for (let i = 1; i <= steps; i++) {
      const sq = from + offset * i
      if (isSquareOnBoard(sq)) path.push(sq)
    }
  }
  // Handle diagonal moves
  else if (Math.abs(dx) === Math.abs(dy)) {
    const offset = dirX + dirY * 16

    for (let i = 1; i <= Math.abs(dx); i++) {
      const sq = from + offset * i
      if (isSquareOnBoard(sq)) path.push(sq)
    }
  }
  // Handle knight-like moves (for Missile/Militia)
  else if (Math.abs(dx) + Math.abs(dy) === 3 && Math.abs(dx) !== 3) {
    // No intermediate squares for leaping pieces
    return []
  }

  return path.filter((sq) => sq !== from) // Exclude starting square
}
