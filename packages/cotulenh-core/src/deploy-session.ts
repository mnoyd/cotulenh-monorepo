// src/deploy-session.ts

import {
  Color,
  Piece,
  InternalMove,
  BITS,
  algebraic,
  swapColor,
} from './type.js'
import { flattenPiece, combinePieces } from './utils.js'
import type { CTLMoveCommandInteface } from './move-apply.js'
import type { CoTuLenh } from './cotulenh.js'

import { InternalDeployMove } from './deploy-move.js'
import { DeployMoveCommand } from './move-apply.js'
import { RecombineManager } from './recombine-manager.js'

/**
 * Result of processing a deploy move
 */
export interface DeploySessionResult {
  isComplete: boolean // Is the deployment sequence finished?
  session?: DeploySession // The session (for commit if complete, or for continuation if incomplete)
}

/**
 * Instruction to recombine a piece with a deployed piece
 * This is NOT a move - it's a session modification
 */
export interface RecombineInstruction {
  piece: Piece
  fromSquare: number
  toSquare: number
  timestamp: number // Preserves order (index when instruction was added)
}

/**
 * A recombine option available to the player
 */
export interface RecombineOption {
  piece: Piece // Piece to recombine
  targetSquare: number // Where it will recombine
  targetPiece: Piece // Piece it will combine with
  resultPiece: Piece // Combined result
  isSafe: boolean // Commander safety check
}

/**
 * Result of commit validation
 */
export interface CommitValidation {
  canCommit: boolean
  reason?: string
  suggestion?: string
}

/**
 * Result of session commit
 */
export interface CommitResult {
  success: boolean
  reason?: string
  suggestion?: string
}

/**
 * DeploySession tracks the state of an active deployment sequence.
 *
 * Stores the actual move commands (not just moves) so they can be:
 * - Undone individually during active session
 * - Combined into one DeployMoveCommand when committed
 * - Used for SAN generation (including partial "..." notation)
 *
 * Benefits:
 * - Clean history (no entries until commit)
 * - Proper undo during deployment
 * - Support for partial deploy display
 */
export class DeploySession {
  stackSquare: number
  turn: Color
  originalPiece: Piece
  private originalFlat: Piece[] // Cache flattened original pieces
  commands: CTLMoveCommandInteface[] = [] // Store commands, not moves!
  startFEN: string
  stayPieces?: Piece[] // Pieces explicitly marked to stay
  recombineInstructions: RecombineInstruction[] = [] // Recombine instructions
  private recombineManager = new RecombineManager() // Manages recombine logic

  constructor(data: {
    stackSquare: number
    turn: Color
    originalPiece: Piece
    startFEN: string
    commands?: CTLMoveCommandInteface[]
    stayPieces?: Piece[]
    recombineInstructions?: RecombineInstruction[]
  }) {
    this.stackSquare = data.stackSquare
    this.turn = data.turn
    this.originalPiece = data.originalPiece
    this.originalFlat = flattenPiece(data.originalPiece)
    this.startFEN = data.startFEN
    this.commands = data.commands || []
    this.stayPieces = data.stayPieces
    this.recombineInstructions = data.recombineInstructions || []
  }

  /**
   * Get the InternalMove objects from commands
   * Deploy sessions only contain single deploy moves, never batch InternalDeployMove
   */
  getActions(): InternalMove[] {
    return this.commands.map((cmd) => {
      const move = cmd.move
      // Deploy sessions should only have InternalMove, but type-guard for safety
      if ('moves' in move) {
        throw new Error(
          'Deploy session should not contain batch InternalDeployMove',
        )
      }
      return move
    })
  }

  /**
   * Calculate remaining pieces by subtracting moved pieces from original.
   * This is the core method that replaces the old movedPieces array.
   *
   * @returns The piece (potentially a stack) remaining at the stack square,
   *          or null if all pieces have been deployed
   */
  getRemainingPieces(): Piece | null {
    // Start with all original pieces (cached)
    const remainingPieces = [...this.originalFlat]

    // Remove pieces that have been deployed
    for (const command of this.commands) {
      const move = command.move
      if ('moves' in move) continue // Type guard

      // Only count moves FROM the stack square with DEPLOY flag
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        const deployedPieces = flattenPiece(move.piece)

        // Remove each deployed piece from remaining
        for (const deployedPiece of deployedPieces) {
          const index = remainingPieces.findIndex(
            (p) => p.type === deployedPiece.type,
          )
          if (index !== -1) {
            remainingPieces.splice(index, 1)
          }
        }
      }
    }

    // If no pieces remain, return null
    if (remainingPieces.length === 0) {
      return null
    }

    // Combine remaining pieces into a stack
    return combinePieces(remainingPieces)
  }

  /**
   * Get all squares where pieces from this stack were deployed.
   * Used for generating recombine moves.
   *
   * @returns Array of square indices where pieces were deployed
   */
  getDeployedSquares(): number[] {
    const squares = new Set<number>()

    for (const command of this.commands) {
      const move = command.move
      if ('moves' in move) continue // Type guard
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        squares.add(move.to)
      }
    }

    return Array.from(squares)
  }

  /**
   * Add a command to the session.
   * Called when a deploy move is executed.
   *
   * @param command The command to add to the session
   */
  addCommand(command: CTLMoveCommandInteface): void {
    this.commands.push(command)
  }

  /**
   * Remove and return the last command from the session.
   * Used for undo during deployment.
   *
   * @returns The removed command, or null if no commands to undo
   */
  undoLastCommand(): CTLMoveCommandInteface | null {
    return this.commands.pop() || null
  }

  /**
   * Check if the session can be committed.
   * A session can be committed if:
   * - At least one move has been made
   *
   * Remaining pieces will automatically be marked as staying during commit.
   *
   * @returns true if the session can be committed
   */
  canCommit(): boolean {
    // Must have made at least one move
    if (this.commands.length === 0) return false

    // Can always commit if at least one piece has been deployed
    // Remaining pieces will be automatically marked as staying
    return true
  }

  /**
   * Check if the session is complete (all pieces accounted for).
   * A session is complete when:
   * moved pieces + staying pieces = original pieces
   *
   * @returns true if all pieces are accounted for
   */
  isComplete(): boolean {
    const remaining = this.getRemainingPieces()
    const originalFlat = flattenPiece(this.originalPiece)

    // Count moved pieces
    const movedCount = this.commands.reduce(
      (sum: number, command: CTLMoveCommandInteface) => {
        const move = command.move
        if ('moves' in move) return sum // Type guard
        if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
          return sum + flattenPiece(move.piece).length
        }
        return sum
      },
      0,
    )

    const stayCount = this.stayPieces?.length || 0

    return movedCount + stayCount === originalFlat.length
  }

  /**
   * Cancel the session and return moves to undo in reverse order.
   * Used when user wants to abort the deployment.
   *
   * @returns Array of moves in reverse order for undoing
   */
  cancel(): InternalMove[] {
    const movesToUndo: InternalMove[] = []

    // Collect moves in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const command = this.commands[i]
      const move = command.move
      if ('moves' in move) {
        throw new Error(
          'Deploy session should not contain batch InternalDeployMove',
        )
      }
      movesToUndo.push(move)
    }

    return movesToUndo
  }

  // toLegacyDeployState() removed - DeployState type no longer exists

  /**
   * Generate extended FEN format with DEPLOY marker.
   * Format: "base-fen DEPLOY c3:Nc5,Fd4..."
   *
   * This allows saving/loading games mid-deployment.
   *
   * @param baseFEN The FEN before deployment started
   * @returns Extended FEN string with deploy session info
   */
  toExtendedFEN(baseFEN: string): string {
    if (this.commands.length === 0) {
      // No moves yet, just indicate deploy started
      return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:`
    }

    // Generate SAN notation for the moves
    // Format: Nc5,Fd4,Te5 (piece type + destination)
    const moveNotations: string[] = []

    for (const command of this.commands) {
      const move = command.move
      if ('moves' in move) continue // Type guard
      const pieceType = move.piece.type.toUpperCase()
      const dest = algebraic(move.to)
      const capture = move.flags & BITS.CAPTURE ? 'x' : ''

      // Handle carrying pieces (combined moves)
      if (move.piece.carrying && move.piece.carrying.length > 0) {
        const carryingTypes = move.piece.carrying
          .map((p: Piece) => p.type.toUpperCase())
          .join('')
        moveNotations.push(`${pieceType}(${carryingTypes})${capture}${dest}`)
      } else {
        moveNotations.push(`${pieceType}${capture}${dest}`)
      }
    }

    const movesStr = moveNotations.join(',')
    const unfinished = this.isComplete() ? '' : '...'

    return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:${movesStr}${unfinished}`
  }

  /**
   * Get a summary of the session for debugging.
   *
   * @returns Human-readable string representation
   */
  toString(): string {
    const remaining = this.getRemainingPieces()
    const remainingStr = remaining
      ? `${remaining.type}${remaining.carrying ? `(${remaining.carrying.map((p: Piece) => p.type).join('')})` : ''}`
      : 'none'

    return `DeploySession(square=${algebraic(this.stackSquare)}, moves=${this.commands.length}, remaining=${remainingStr})`
  }

  /**
   * Create a deep copy of the session.
   * Used for history snapshots.
   *
   * @returns A new DeploySession with copied data
   */
  clone(): DeploySession {
    return new DeploySession({
      stackSquare: this.stackSquare,
      turn: this.turn,
      originalPiece: { ...this.originalPiece },
      startFEN: this.startFEN,
      commands: [...this.commands], // Create a new array with same commands
      stayPieces: this.stayPieces?.map((p: Piece) => ({ ...p })),
      recombineInstructions: this.recombineInstructions.map((inst) => ({
        ...inst,
      })),
    })
  }

  // ============================================================================
  // DEPLOY MOVE CONSTRUCTION
  // ============================================================================

  /**
   * Convert session to InternalDeployMove representation.
   * Used for history storage and SAN generation.
   *
   * @returns InternalDeployMove object
   */
  toInternalDeployMove(): InternalDeployMove {
    const captured: Piece[] = []

    for (const command of this.commands) {
      const move = command.move
      if ('moves' in move) continue // Type guard
      if (move.captured) {
        captured.push(move.captured)
      }
    }

    return {
      from: this.stackSquare,
      moves: this.getActions(),
      stay: this.stayPieces
        ? combinePieces(this.stayPieces) || undefined
        : undefined,
      captured: captured.length > 0 ? captured : undefined,
    }
  }

  // ============================================================================
  // DEPLOY SESSION MANAGEMENT
  // ============================================================================

  /**
   * Handle an incremental deploy move.
   * This is the main entry point for processing deploy moves with DEPLOY flag.
   *
   * Responsibilities:
   * - Initialize session if needed
   * - Execute the move command
   * - Add command to session (NOT to history)
   * - Auto-commit when all pieces are deployed
   * - NO turn switching
   * - NO move count increment
   *
   * @param game - The game instance
   * @param move - The deploy move to handle
   * @param moveCommand - The command to execute
   * @returns The active session (this or newly created)
   */
  static handleDeployMove(
    game: CoTuLenh,
    move: InternalMove,
    moveCommand: CTLMoveCommandInteface,
  ): DeploySession {
    // Get or create session
    let session = game['_deploySession']

    if (!session) {
      // Initialize new session
      const originalPiece = game['_board'][move.from]
      if (!originalPiece) {
        throw new Error(
          'Cannot start deploy session: no piece at source square',
        )
      }

      session = new DeploySession({
        stackSquare: move.from,
        turn: game.turn(),
        originalPiece: originalPiece,
        startFEN: game.fen(),
      })

      game['_deploySession'] = session
    }

    // Execute the command
    moveCommand.execute()

    // Add to session (NOT to history)
    session.addCommand(moveCommand)

    // Check if session should auto-commit
    if (session.shouldAutoCommit()) {
      try {
        game.commitDeploySession(true)
      } catch (error) {
        console.error('Failed to auto-commit deploy session:', error)
        // Fallback: clear session and switch turn
        game['_deploySession'] = null
        game['_turn'] = swapColor(game.turn())
      }
    }

    return session
  }

  /**
   * Process an incremental deploy move and return the result.
   * This is the new entry point for handling deploy moves with DEPLOY flag.
   *
   * Responsibilities:
   * - Initialize session if needed
   * - Execute the move command
   * - Add command to session (NOT to history)
   * - Check if complete and return session for commit
   * - NO turn switching
   * - NO move count increment
   *
   * @param game - The game instance
   * @param move - The deploy move to process
   * @param moveCommand - The command to execute
   * @returns DeploySessionResult indicating completion status
   */
  static processMove(
    game: CoTuLenh,
    move: InternalMove,
    moveCommand: CTLMoveCommandInteface,
  ): DeploySessionResult {
    // Get or create session
    let session = game['_deploySession']

    if (!session) {
      // Initialize new session
      const originalPiece = game['_board'][move.from]
      if (!originalPiece) {
        throw new Error(
          'Cannot start deploy session: no piece at source square',
        )
      }

      session = new DeploySession({
        stackSquare: move.from,
        turn: game.turn(),
        originalPiece: originalPiece,
        startFEN: game.fen(),
      })

      game['_deploySession'] = session
    }

    // Execute the command
    moveCommand.execute()

    // Add to session (NOT to history)
    session.addCommand(moveCommand)

    // Check if session should auto-commit
    if (session.shouldAutoCommit()) {
      // Clear session state
      game['_deploySession'] = null

      return {
        isComplete: true,
        session: session, // Return session for commit
      }
    }

    // Session incomplete
    return {
      isComplete: false,
      session: session,
    }
  }

  /**
   * Check if a move should trigger auto-commit of the deploy session.
   * Auto-commit happens when all pieces are deployed.
   *
   * @returns true if the session should be auto-committed
   */
  private shouldAutoCommit(): boolean {
    // After this move is added, check if all pieces are deployed
    const remainingPieces = this.getRemainingPieces()
    return remainingPieces === null // All pieces deployed
  }

  /**
   * Commit the deploy session and create the final DeployMoveCommand.
   *
   * Responsibilities:
   * - Validate can commit
   * - Mark remaining pieces as staying
   * - Create DeployMoveCommand with executed commands
   * - Apply recombines (modifies board state)
   *
   * @param game - The game instance
   * @returns DeployMoveCommand ready to be added to history
   * @throws Error if cannot commit
   */
  commit(game: CoTuLenh): DeployMoveCommand {
    // Validate
    if (!this.canCommit()) {
      throw new Error('Cannot commit: no moves made')
    }

    // Mark remaining pieces as staying
    const remaining = this.getRemainingPieces()
    if (remaining && !this.stayPieces) {
      this.stayPieces = flattenPiece(remaining)
    }

    // Build the InternalDeployMove (BEFORE applying recombines)
    const deployMove: InternalDeployMove = {
      from: this.stackSquare,
      moves: this.getActions(),
      stay: this.stayPieces
        ? combinePieces(this.stayPieces) || undefined
        : undefined,
    }

    // Create command with our already-executed commands (BEFORE applying recombines)
    const command = new DeployMoveCommand(
      game,
      deployMove,
      this.commands, // Pass the actual command instances
    )

    // NOW apply recombines (modifies board state)
    this.applyRecombines(game)

    return command
  }

  // ============================================================================
  // RECOMBINE INSTRUCTION SYSTEM
  // ============================================================================

  /**
   * Record a recombine instruction (doesn't execute yet, queues for commit)
   *
   * @param game - The game instance
   * @param stackSquare - Source square (must be the stack square)
   * @param targetSquare - Target square (must be a deployed square)
   * @param pieceToRecombine - Piece to recombine
   * @returns true if instruction was recorded successfully
   */
  recombine(
    game: CoTuLenh,
    stackSquare: number,
    targetSquare: number,
    pieceToRecombine: Piece,
  ): boolean {
    // Validate: must be the stack square
    if (stackSquare !== this.stackSquare) {
      throw new Error('Can only recombine from the stack square')
    }

    // Validate: target must be deployed in this session
    const deployedSquares = this.getDeployedSquares()
    if (!deployedSquares.includes(targetSquare)) {
      throw new Error('Cannot recombine to non-deployed square')
    }

    // Create instruction
    const instruction: RecombineInstruction = {
      piece: pieceToRecombine,
      fromSquare: stackSquare,
      toSquare: targetSquare,
      timestamp: this.commands.length,
    }

    // Validate and queue using RecombineManager
    const success = this.recombineManager.recombine(instruction, this, game)

    if (success) {
      // Add to instructions
      this.recombineInstructions.push(instruction)
    }

    return success
  }

  /**
   * Get available recombine options for remaining pieces
   *
   * @param game - The game instance
   * @param stackSquare - The stack square (unused, kept for backward compatibility)
   * @returns Array of recombine options (filtered for safety)
   */
  getRecombineOptions(game: CoTuLenh, stackSquare?: number): RecombineOption[] {
    return this.recombineManager.recombineOptions(this, game)
  }

  /**
   * Undo the last recombine instruction
   */
  undoLastRecombine(): void {
    if (this.recombineInstructions.length === 0) return
    this.recombineInstructions.pop()
  }

  /**
   * Apply all queued recombine instructions to the board
   * Called at commit time
   *
   * Uses RecombineManager to undo all commands, reconstruct with recombines, and re-execute
   *
   * @param game - The game instance
   */
  private applyRecombines(game: CoTuLenh): void {
    this.recombineManager.applyRecombines(this, game)
  }
}
