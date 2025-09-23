// Enhanced history handling for deploy sessions

import { CoTuLenh, Move } from './cotulenh'
import { DeploySession } from './deploy-session'

/**
 * Enhanced history method that handles active deploy sessions
 */
export function getEnhancedHistory(
  game: CoTuLenh,
  options: { verbose?: boolean } = {},
) {
  const { verbose = false } = options

  // Get regular history
  const baseHistory = game.history({ verbose })

  // Check if there's an active deploy session
  const deploySession = game.getDeploySession()

  if (!deploySession?.isActive) {
    return baseHistory
  }

  // If deploy session is active, we have a few options:

  if (verbose) {
    // Option 1: Add deploy session info as a special entry
    const deployInfo = {
      type: 'partial_deploy',
      from: deploySession.stackSquare,
      executedMoves: deploySession.executedMoves,
      movedPieces: deploySession.movedPieces,
      stayPieces: deploySession.stayPieces,
      remainingPieces: deploySession.remainingPieces,
      isComplete: deploySession.isComplete(),
    }

    return [...baseHistory, deployInfo]
  } else {
    // Option 2: Show partial deploy notation
    const executedMoves = deploySession.executedMoves
    const stayPieces = deploySession.stayPieces

    if (executedMoves.length > 0 || stayPieces.length > 0) {
      const moveNotations = executedMoves.map((move) => {
        // Generate SAN for each executed move
        return game['_moveToSanLan'](move, [])[0]
      })

      const stayNotations = stayPieces.map(
        (piece) => `${piece.type.toUpperCase()}<`,
      )

      const partialDeploy = `[${[...moveNotations, ...stayNotations].join(',')}...]`

      return [...baseHistory, partialDeploy]
    }

    return baseHistory
  }
}

/**
 * Alternative: Get deploy session status separately
 */
export function getDeployStatus(game: CoTuLenh) {
  const session = game.getDeploySession()

  if (!session?.isActive) {
    return null
  }

  const executedSans = session.executedMoves.map(
    (move) => game['_moveToSanLan'](move, [])[0],
  )

  const staySans = session.stayPieces.map(
    (piece) => `${piece.type.toUpperCase()}<`,
  )

  return {
    stackSquare: session.stackSquare,
    executedMoves: executedSans,
    stayMoves: staySans,
    remainingPieces: session.remainingPieces.length,
    isComplete: session.isComplete(),
    partialNotation: `${[...executedSans, ...staySans].join(',')}`,
  }
}
