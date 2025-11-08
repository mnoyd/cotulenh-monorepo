// src/recombine-manager.ts

import { Piece, InternalMove, NAVY_MASK, LAND_MASK, swapColor } from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import type { CTLMoveCommandInteface } from './move-apply.js'
import type { CoTuLenh } from './cotulenh.js'
import type {
  DeploySession,
  RecombineInstruction,
  RecombineOption,
} from './deploy-session.js'
import { createMoveCommand } from './move-apply.js'

/**
 * RecombineManager handles all recombine logic for deploy sessions
 *
 * Responsibilities:
 * 1. Generate all possible recombine options
 * 2. Filter out illegal options (terrain, commander safety)
 * 3. Apply recombines by reconstructing command history
 */
export class RecombineManager {
  /**
   * Public API: Get all legal recombine options
   *
   * @param session - The deploy session
   * @param game - The game instance
   * @returns Array of legal recombine options
   */
  recombineOptions(session: DeploySession, game: CoTuLenh): RecombineOption[] {
    // Step 1: Generate all possibilities
    const allOptions = this.generateAllOptions(session, game)

    // Step 2: Filter out illegal ones
    const legalOptions = this.filterIllegalOptions(allOptions, game, session)

    return legalOptions
  }

  /**
   * Public API: Apply a recombine instruction
   *
   * Validates the instruction is legal, then queues it
   *
   * @param instruction - The recombine instruction to apply
   * @param session - The deploy session
   * @param game - The game instance
   * @returns true if legal and queued, false if illegal
   */
  recombine(
    instruction: RecombineInstruction,
    session: DeploySession,
    game: CoTuLenh,
  ): boolean {
    // Validate: Check if this instruction matches a legal option
    const legalOptions = this.recombineOptions(session, game)

    const isLegal = legalOptions.some(
      (opt) =>
        opt.piece.type === instruction.piece.type &&
        opt.targetSquare === instruction.toSquare,
    )

    if (!isLegal) {
      return false // Reject illegal recombine
    }

    // Legal - instruction already added by caller
    return true
  }

  /**
   * Public API: Apply all queued recombine instructions
   *
   * Called at commit time
   * Algorithm: Undo all → Reconstruct with recombines → Re-execute
   *
   * @param session - The deploy session
   * @param game - The game instance
   */
  applyRecombines(session: DeploySession, game: CoTuLenh): void {
    if (session.recombineInstructions.length === 0) {
      return // Nothing to do
    }

    // Step 1: Undo all commands in reverse order
    const originalCommands = [...session.commands]
    for (let i = originalCommands.length - 1; i >= 0; i--) {
      originalCommands[i].undo()
    }

    // Step 2: Reconstruct command sequence with recombines integrated
    const newCommands = this.reconstructCommands(
      originalCommands,
      session.recombineInstructions,
      session,
      game,
    )

    // Step 3: Clear and re-execute in order
    session.commands = []
    for (const cmd of newCommands) {
      cmd.execute()
      session.commands.push(cmd)
    }
  }

  // ========================================================================
  // PRIVATE: Generation
  // ========================================================================

  /**
   * Generate all possible recombine options (no filtering)
   *
   * @param session - The deploy session
   * @param game - The game instance
   * @returns All possible options (including illegal ones)
   */
  private generateAllOptions(
    session: DeploySession,
    game: CoTuLenh,
  ): RecombineOption[] {
    const options: RecombineOption[] = []
    const remaining = session.getRemainingPieces()

    if (!remaining) return options

    const remainingFlat = flattenPiece(remaining)
    const deployedSquares = session.getDeployedSquares()

    // For each remaining piece
    for (const piece of remainingFlat) {
      // For each deployed square
      for (const targetSquare of deployedSquares) {
        const targetPiece = game.get(targetSquare)
        if (!targetPiece) continue

        // Try to combine
        const combined = combinePieces([piece, targetPiece])
        if (!combined) continue // Cannot combine (not compatible pieces)

        options.push({
          piece,
          targetSquare,
          targetPiece,
          resultPiece: combined,
          isSafe: false, // Will be determined in filter
        })
      }
    }

    return options
  }

  // ========================================================================
  // PRIVATE: Filtering
  // ========================================================================

  /**
   * Filter out illegal options
   *
   * Two types of illegal:
   * 1. Terrain incompatibility (Navy carrier on land, Land carrier on water)
   * 2. Commander danger (Commander on attacked square)
   *
   * @param options - All generated options
   * @param game - The game instance
   * @param session - The deploy session
   * @returns Only legal options
   */
  private filterIllegalOptions(
    options: RecombineOption[],
    game: CoTuLenh,
    session: DeploySession,
  ): RecombineOption[] {
    const legal: RecombineOption[] = []

    for (const option of options) {
      // Check 1: Terrain compatibility
      if (!this.isTerrainLegal(option)) {
        continue
      }

      // Check 2: Commander safety
      if (!this.isCommanderSafe(option, game)) {
        continue
      }

      // Legal option
      option.isSafe = true
      legal.push(option)
    }

    return legal
  }

  /**
   * Check terrain compatibility
   *
   * Rule: The carrier type must match the square terrain
   * - Navy carrier requires water square
   * - Land carrier requires land square
   *
   * @param option - The recombine option to check
   * @returns true if terrain is compatible
   */
  private isTerrainLegal(option: RecombineOption): boolean {
    const carrierType = option.resultPiece.type // The carrier after combine
    const square = option.targetSquare

    if (carrierType === 'n') {
      // Navy carrier - needs water
      return NAVY_MASK[square] === 1
    } else {
      // Land carrier - needs land
      return LAND_MASK[square] === 1
    }
  }

  /**
   * Check commander safety
   *
   * If commander is involved (being recombined or already at target),
   * the target square must not be under attack
   *
   * @param option - The recombine option to check
   * @param game - The game instance
   * @returns true if commander is safe (or not involved)
   */
  private isCommanderSafe(option: RecombineOption, game: CoTuLenh): boolean {
    const isCommanderRecombining = option.piece.type === 'c'
    const targetHasCommander =
      option.targetPiece.type === 'c' ||
      option.targetPiece.carrying?.some((p) => p.type === 'c')

    // No commander involved - always safe
    if (!isCommanderRecombining && !targetHasCommander) {
      return true
    }

    // Commander involved - check if square is attacked
    const us = game.turn()
    const them = swapColor(us)
    const attackers = game.getAttackers(option.targetSquare, them)

    return attackers.length === 0
  }

  // ========================================================================
  // PRIVATE: Command Reconstruction
  // ========================================================================

  /**
   * Reconstruct command sequence with recombines integrated
   *
   * This is the core algorithm that respects move order:
   * 1. Build a map of which pieces join which targets
   * 2. Walk through original commands in order
   * 3. For each command, check if its destination receives recombined pieces
   * 4. If yes, create new command with combined piece
   * 5. If no, keep original command
   * 6. Skip commands for pieces that were absorbed
   *
   * Example:
   * Original: [Tank→A5, Air→B3, Infantry→A5]
   * Recombine: Infantry joins Tank at A5
   * Result: [Tank(Infantry)→A5, Air→B3]
   *
   * @param originalCommands - The original command sequence
   * @param instructions - The recombine instructions to apply
   * @param session - The deploy session
   * @param game - The game instance
   * @returns New command sequence with recombines integrated
   */
  private reconstructCommands(
    originalCommands: CTLMoveCommandInteface[],
    instructions: RecombineInstruction[],
    session: DeploySession,
    game: CoTuLenh,
  ): CTLMoveCommandInteface[] {
    // Build map: targetSquare → pieces to add as cargo
    const recombineMap = new Map<number, Piece[]>()

    for (const inst of instructions) {
      if (!recombineMap.has(inst.toSquare)) {
        recombineMap.set(inst.toSquare, [])
      }
      recombineMap.get(inst.toSquare)!.push(inst.piece)
    }

    // Track which pieces are absorbed (so we skip their original commands)
    const absorbedPieces = new Set<string>()
    for (const inst of instructions) {
      absorbedPieces.add(`${inst.piece.type}`)
    }

    // Rebuild commands in original order
    const newCommands: CTLMoveCommandInteface[] = []

    for (const cmd of originalCommands) {
      const move = cmd.move
      if ('moves' in move) continue // Skip batch moves (shouldn't happen)

      // Skip if this piece was absorbed into an earlier move
      const pieceKey = `${move.piece.type}`
      if (absorbedPieces.has(pieceKey)) {
        // This piece is now carried by another piece
        // Don't create a command for it
        absorbedPieces.delete(pieceKey) // Remove so we only skip once
        continue
      }

      // Check if this destination receives recombined pieces
      const piecesToCarry = recombineMap.get(move.to)

      if (piecesToCarry && piecesToCarry.length > 0) {
        // Recreate move with carried pieces
        const allPieces = [move.piece, ...piecesToCarry]
        const combinedPiece = combinePieces(allPieces)

        if (!combinedPiece) {
          // Shouldn't happen (we validated), but handle gracefully
          console.error('Failed to combine pieces during reconstruction')
          continue
        }

        const newMove: InternalMove = {
          ...move,
          piece: combinedPiece,
        }

        // Create fresh command
        const newCmd = this.createDeployCommand(game, newMove)
        newCommands.push(newCmd)
      } else {
        // No recombines for this destination - keep original
        // Recreate command for clean state
        const newCmd = this.createDeployCommand(game, move)
        newCommands.push(newCmd)
      }
    }

    return newCommands
  }

  /**
   * Create a fresh deploy command for a move
   *
   * @param game - The game instance
   * @param move - The move to create command for
   * @returns A new move command (SingleDeployMoveCommand for deploy moves)
   */
  private createDeployCommand(
    game: CoTuLenh,
    move: InternalMove,
  ): CTLMoveCommandInteface {
    // Use the factory function to create the appropriate command type
    // For deploy moves, this will create a SingleDeployMoveCommand
    return createMoveCommand(game, move)
  }
}
