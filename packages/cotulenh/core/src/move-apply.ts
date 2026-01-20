// src/move.ts

import { BLUE, Color, CoTuLenh, PieceSymbol, RED } from './cotulenh.js'
import {
  swapColor,
  algebraic,
  InternalMove,
  BITS,
  Piece,
  VALID_SQUARES,
  COMMANDER,
  GameStateMetadata,
} from './type.js'
import { combinePieces, clonePiece } from './utils.js'
import { createError, ErrorCode } from '@cotulenh/common'

/**
 * Represents an atomic board action that can be executed and undone
 */
export interface CTLAtomicMoveAction {
  execute(): void
  undo(): void
}

/**
 * Removes a piece from a square.
 * Can remove the entire piece or a specific piece from a stack.
 */
export class RemovePieceAction implements CTLAtomicMoveAction {
  private originalPiece?: Piece
  constructor(
    protected game: CoTuLenh,
    private square: number,
    private pieceToRemove?: Piece,
  ) {}

  execute(): void {
    const piece = this.game.get(this.square)
    if (!piece) {
      if (this.pieceToRemove) {
        const msg = `No piece at ${algebraic(this.square)} to remove from`
        throw createError(ErrorCode.MOVE_PIECE_NOT_FOUND, msg, {
          square: algebraic(this.square),
        })
      }
      return
    }

    // Store original piece for undo
    this.originalPiece = clonePiece(piece)

    // Remove either the specific piece from stack or the entire piece
    this.game.remove(algebraic(this.square), this.pieceToRemove)
  }

  undo(): void {
    if (!this.originalPiece) return

    const result = this.game.put(this.originalPiece, algebraic(this.square))
    if (!result) {
      const msg = `Failed to restore piece at ${algebraic(this.square)}`
      throw createError(ErrorCode.INTERNAL_INCONSISTENCY, msg, {
        square: algebraic(this.square),
        piece: this.originalPiece,
      })
    }
  }
}

/**
 * Places a piece on a square
 */
export class PlacePieceAction implements CTLAtomicMoveAction {
  private existingPiece?: Piece
  constructor(
    protected game: CoTuLenh,
    private square: number,
    private piece: Piece,
  ) {}

  execute(): void {
    const piece = this.game.get(this.square)
    if (piece) {
      this.existingPiece = { ...piece }
    }
    const result = this.game.put(this.piece, algebraic(this.square))
    if (!result) {
      throw createError(
        ErrorCode.BOARD_INVALID_SQUARE,
        'Place piece fail:' + algebraic(this.square),
        {
          piece: this.piece,
          square: algebraic(this.square),
        },
      )
    }
  }

  undo(): void {
    if (this.existingPiece) {
      // There was an existing piece - restore it
      // First remove current piece, then place the existing one
      this.game.remove(algebraic(this.square))
      const result = this.game.put(this.existingPiece, algebraic(this.square))
      if (!result) {
        throw createError(
          ErrorCode.BOARD_INVALID_SQUARE,
          'Place piece fail (undo):' + algebraic(this.square),
          {
            piece: this.existingPiece,
            square: algebraic(this.square),
          },
        )
      }
    } else {
      // No existing piece - just remove what we placed
      this.game.remove(algebraic(this.square))
    }
  }
}

/**
 * Updates game state (turn, halfMoves, moveNumber) after a move.
 * This action encapsulates state changes so they can be executed/undone atomically.
 */
export class StateUpdateAction implements CTLAtomicMoveAction {
  private readonly oldState: GameStateMetadata
  private addedFen: string | null = null

  constructor(
    private game: CoTuLenh,
    private readonly move: InternalMove,
    private readonly preCalculatedFen?: string,
  ) {
    this.oldState = game.getMetadata()
  }

  execute(): void {
    const us = this.oldState.turn
    const them = swapColor(us)
    const hasCapture = !!(this.move.flags & BITS.CAPTURE)

    // Optimization: Cache FEN to avoid re-calculation on redo
    const fen = this.addedFen ?? this.preCalculatedFen ?? this.game.fen()
    this.addedFen = fen

    // Update game state via memento
    this.game.setMetadata({
      halfMoves: hasCapture ? 0 : this.oldState.halfMoves + 1,
      turn: them,
      moveNumber:
        us === 'b' ? this.oldState.moveNumber + 1 : this.oldState.moveNumber,
      fen: fen,
    })

    this.game.incrementPositionCount(fen)
  }

  undo(): void {
    if (this.addedFen) {
      this.game.decrementPositionCount(this.addedFen)
    }

    // Restore previous state
    this.game.setMetadata(this.oldState)
  }
}

// SetDeployStateAction removed - deploy state tracking now handled by DeploySession

export interface CTLMoveCommandInteface extends CTLAtomicMoveAction {
  move: InternalMove
  addPostAction(action: CTLAtomicMoveAction): void
}

/**
 * Interface for commands that represent a sequence of moves (e.g., deploy sequences)
 */
export interface CTLMoveSequenceCommandInterface extends CTLAtomicMoveAction {
  moves: InternalMove[]
  addPostAction(action: CTLAtomicMoveAction): void
}

/**
 * Abstract base class for all move commands.
 * Each command knows how to execute and undo itself.
 */
export abstract class CTLMoveCommand implements CTLMoveCommandInteface {
  public readonly move: InternalMove
  protected actions: CTLAtomicMoveAction[] = []

  constructor(
    protected game: CoTuLenh,
    moveData: InternalMove,
  ) {
    this.move = { ...moveData }
    this.validate()
    this.buildActions()
    this.injectDefaultPostActions()
  }

  /**
   * Optional validation step before building actions
   */
  protected validate(): void {
    if (!this.game.get(this.move.from)) {
      throw createError(
        ErrorCode.MOVE_PIECE_NOT_FOUND,
        `Build Move Error: No piece to move at ${algebraic(this.move.from)}`,
        { move: this.move },
      )
    }
  }

  protected abstract buildActions(): void

  private injectDefaultPostActions(): void {
    const defaultPostMoveActions: CTLAtomicMoveAction[] = [
      new LazyAction(() => checkAndPromoteAttackers(this.game, this.move)),
    ]
    // Only add Last Guard promotion if not skipped in game options
    if (!this.game.getOptions().skipLastGuardPromotion) {
      defaultPostMoveActions.push(
        new LazyAction(() => checkAndPromoteLastGuard(this.game)),
      )
    }
    this.actions.push(...defaultPostMoveActions)
  }

  execute(): void {
    for (const action of this.actions) {
      action.execute()
    }
  }

  undo(): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo()
    }
  }

  addPostAction(action: CTLAtomicMoveAction): void {
    this.actions.push(action)
  }
}

// --- Concrete Command Implementations ---

export class NormalMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const pieceThatMoved = clonePiece(this.move.piece) as Piece

    // Add actions for the normal move
    this.actions.push(
      new RemovePieceAction(this.game, this.move.from, pieceThatMoved),
    )
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, pieceThatMoved),
    )
  }
}

export class CaptureMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const pieceThatMoved = clonePiece(this.move.piece) as Piece

    const capturedPieceData = this.game.get(this.move.to)
    if (!capturedPieceData || capturedPieceData.color !== them) {
      throw createError(
        ErrorCode.CAPTURE_INVALID_TARGET,
        `Build CaptureMove Error: Capture target invalid ${algebraic(this.move.to)}`,
        { move: this.move },
      )
    }

    // Add actions for the capture move
    this.move.captured = capturedPieceData // Populate captured piece for history
    this.actions.push(
      new RemovePieceAction(this.game, this.move.from, pieceThatMoved),
      new RemovePieceAction(this.game, this.move.to),
      new PlacePieceAction(this.game, this.move.to, pieceThatMoved),
    )
  }
}

/**
 * Command for combining two friendly pieces.
 */
class CombinationMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const movingPieceData = clonePiece(this.move.piece) as Piece
    const targetPieceData = this.game.get(this.move.to)

    if (
      !movingPieceData ||
      !targetPieceData ||
      !(this.move.flags & BITS.COMBINATION) ||
      !this.move.combined // Sanity check
    ) {
      throw createError(
        ErrorCode.SESSION_INVALID_OPERATION,
        `Invalid state for combination move`,
        { move: this.move },
      )
    }

    // Create the combined piece
    const combinedPiece = combinePieces([movingPieceData, targetPieceData])
    if (!combinedPiece) {
      throw createError(
        ErrorCode.COMBINATION_FAILED,
        `Failed to create combined piece`,
        { move: this.move },
      )
    }
    this.move.combined = combinedPiece // Populate combined piece

    // 1. Remove the moving piece from the 'from' square
    this.actions.push(
      new RemovePieceAction(this.game, this.move.from, movingPieceData),
      new PlacePieceAction(this.game, this.move.to, combinedPiece),
    )
  }
}

export class StayCaptureMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const targetSq = this.move.to

    const capturedPiece = this.game.get(targetSq)
    if (!capturedPiece || capturedPiece.color !== them) {
      throw createError(
        ErrorCode.CAPTURE_INVALID_TARGET,
        `Build StayCapture Error: Target invalid ${algebraic(targetSq)}`,
        { move: this.move, targetSq: algebraic(targetSq) },
      )
    }

    // Only action is to remove the captured piece
    this.move.captured = capturedPiece
    this.actions.push(new RemovePieceAction(this.game, targetSq))
  }
}

/**
 * Command for suicide capture moves where both the attacking piece and target are destroyed.
 * For deploy moves, only the deployed air force piece (and its carrying pieces) are destroyed,
 * while the remainder stays on the original square.
 */
export class SuicideCaptureMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const targetSq = this.move.to
    const pieceAtFrom = clonePiece(this.move.piece) as Piece

    const capturedPiece = this.game.get(targetSq)
    if (!capturedPiece || capturedPiece.color !== them) {
      throw createError(
        ErrorCode.CAPTURE_INVALID_TARGET,
        `Build SuicideCapture Error: Target invalid ${algebraic(targetSq)}`,
        { move: this.move, targetSq: algebraic(targetSq) },
      )
    }

    this.move.captured = capturedPiece

    this.actions.push(
      new RemovePieceAction(this.game, this.move.from, pieceAtFrom),
      new RemovePieceAction(this.game, targetSq),
    )
  }
}

/**
 * Represents a sequence of moves that make up a full deployment
 * Used for history management to treat the entire sequence as one atomic operation
 */
export class DeployMoveSequenceCommand implements CTLMoveSequenceCommandInterface {
  public readonly moves: InternalMove[]
  private readonly commands: CTLAtomicMoveAction[] = []

  private constructor(moves: InternalMove[], commands: CTLAtomicMoveAction[]) {
    this.moves = moves
    this.commands = commands
  }

  static create(commands: CTLAtomicMoveAction[], moves: InternalMove[]) {
    return new DeployMoveSequenceCommand(moves, commands)
  }

  execute(): void {
    for (const command of this.commands) {
      command.execute()
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo()
    }
  }

  addPostAction(action: CTLAtomicMoveAction): void {
    this.commands.push(action)
  }
}

// Factory function to create the appropriate command
export function createMoveCommand(
  game: CoTuLenh,
  move: InternalMove,
): CTLMoveCommand {
  // Check flags in order of precedence (if applicable)
  // BITS.DEPLOY removed from precedence - deploy moves are now handled by generic commands
  if (move.flags & BITS.SUICIDE_CAPTURE) {
    return new SuicideCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.STAY_CAPTURE) {
    return new StayCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.COMBINATION) {
    // Add combination check
    return new CombinationMoveCommand(game, move)
  } else if (move.flags & BITS.CAPTURE) {
    return new CaptureMoveCommand(game, move)
  } else {
    // Default to NormalMove if no other specific flags are set
    return new NormalMoveCommand(game, move)
  }
}

/**
 * Sets or unsets the heroic status of a piece
 */
class SetHeroicAction implements CTLAtomicMoveAction {
  private wasHeroic?: boolean
  constructor(
    protected game: CoTuLenh,
    private square: number,
    private type: PieceSymbol,
    private setHeroic: boolean = true,
  ) {}

  execute(): void {
    // Get the piece we want to modify (could be direct or nested)
    const piece = this.game.get(this.square, this.type)
    if (!piece) return
    // Store original heroic state for undo
    this.wasHeroic = piece.heroic
    // Use the setHeroicStatus method to update the heroic status
    this.game.setHeroicStatus(this.square, this.type, this.setHeroic)
  }

  undo(): void {
    // Only undo if we have a valid previous state
    // Use the setHeroicStatus method to restore the original heroic status
    this.game.setHeroicStatus(this.square, this.type, this.wasHeroic ?? false)
  }
}

/**
 * A generic action that executes other actions generated on demand.
 */
class LazyAction implements CTLAtomicMoveAction {
  private executedActions: CTLAtomicMoveAction[] | null = null

  constructor(private readonly factory: () => CTLAtomicMoveAction[]) {}

  execute(): void {
    this.executedActions ??= this.factory()
    for (const action of this.executedActions) {
      action.execute()
    }
  }

  undo(): void {
    if (!this.executedActions) return
    for (let i = this.executedActions.length - 1; i >= 0; i--) {
      this.executedActions[i].undo()
    }
  }
}

/**
 * Checks if the opponent's commander is attacked after a move
 * and returns actions to promote the attacking pieces to heroic.
 */
function checkAndPromoteAttackers(
  game: CoTuLenh,
  move: InternalMove,
): CTLAtomicMoveAction[] {
  const actions: CTLAtomicMoveAction[] = []
  const us = move.color
  const them = swapColor(us)
  const themCommanderSq = game.getCommanderSquare(them)

  if (themCommanderSq === -1) return actions

  const attackers = game.getAttackers(themCommanderSq, us)
  if (attackers.length === 0) return actions

  const processedAttackers = new Set<string>()
  for (const { square, type } of attackers) {
    const attackerKey = `${square}:${type}`
    if (processedAttackers.has(attackerKey)) continue
    processedAttackers.add(attackerKey)

    const isHeroic = game.getHeroicStatus(square, type)
    if (!isHeroic) {
      const promoteAction = new SetHeroicAction(game, square, type, true)
      actions.push(promoteAction)
    }
  }

  return actions
}

/**
 * Last Guard rule: When a side is reduced to Commander + 1 piece, promote that piece to Heroic
 */
/**
 * Last Guard rule: When a side is reduced to Commander + 1 piece, promote that piece to Heroic
 */
function checkAndPromoteLastGuard(game: CoTuLenh): CTLAtomicMoveAction[] {
  return ([RED, BLUE] as Color[])
    .filter((color) => isEligibleForLastGuard(game, color))
    .map((color) => {
      const guard = findLastGuard(game, color)
      // findLastGuard returns null if no guard found or multiple guards exist (though filter should catch it)
      return guard && !guard.heroic
        ? new SetHeroicAction(game, guard.square, guard.type, true)
        : null
    })
    .filter((action): action is SetHeroicAction => action !== null)
}

/**
 * Checks if a side has exactly one non-commander piece (and no carrying stacks)
 */
function isEligibleForLastGuard(game: CoTuLenh, color: Color): boolean {
  let nonCommanderCount = 0
  for (const i of VALID_SQUARES) {
    const piece = game.get(i)
    if (!piece || piece.color !== color || piece.type === COMMANDER) continue

    // If any piece is carrying others, it's definitely > 1 piece
    if (piece.carrying && piece.carrying.length > 0) return false

    nonCommanderCount++
    if (nonCommanderCount > 1) return false
  }
  return nonCommanderCount === 1
}

/**
 * Finds the single non-commander piece for a side
 */
function findLastGuard(
  game: CoTuLenh,
  color: Color,
): { square: number; type: PieceSymbol; heroic?: boolean } | null {
  for (const i of VALID_SQUARES) {
    const piece = game.get(i)
    if (piece && piece.color === color && piece.type !== COMMANDER) {
      return {
        square: i,
        type: piece.type,
        heroic: piece.heroic,
      }
    }
  }
  return null
}
