// src/move.ts

import type { Color, CoTuLenh, PieceSymbol } from './cotulenh.js'
import { swapColor, algebraic, InternalMove, BITS, Piece } from './type.js'
import { combinePieces, clonePiece } from './utils.js'

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
        throw new Error(`No piece at ${algebraic(this.square)} to remove from`)
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
      throw new Error(
        `Failed to restore piece at ${algebraic(this.square)}: ${JSON.stringify(this.originalPiece)}`,
      )
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
      throw new Error(
        'Place piece fail:' +
          JSON.stringify(this.piece) +
          algebraic(this.square),
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
        throw new Error(
          'Place piece fail:' +
            JSON.stringify(this.existingPiece) +
            algebraic(this.square),
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
  private readonly oldTurn: Color
  private readonly oldHalfMoves: number
  private readonly oldMoveNumber: number
  private addedFen: string | null = null

  constructor(
    private game: CoTuLenh,
    private readonly move: InternalMove,
    private readonly preCalculatedFen?: string,
  ) {
    // Capture current state before execution (or before update)
    // Note: StateUpdateAction is usually created AFTER move execution but BEFORE flag update.
    this.oldTurn = game.turn()
    this.oldHalfMoves = game['_halfMoves']
    this.oldMoveNumber = game['_moveNumber']
  }

  execute(): void {
    const us = this.oldTurn
    const them = swapColor(us)
    const hasCapture = !!(this.move.flags & BITS.CAPTURE)

    // Update game state
    this.game['_halfMoves'] = hasCapture ? 0 : this.oldHalfMoves + 1
    this.game['_turn'] = them
    if (us === 'b') {
      this.game['_moveNumber']++
    }
    this.game['_movesCache'].clear()

    // Update position counts
    // Optimization: Cache FEN to avoid re-calculation on redo
    // and avoid double calculation (once in _updatePositionCounts, once for storage)
    if (this.addedFen) {
      // Redo path: Use cached FEN
      const fen = this.addedFen
      if (!this.game['_positionCount'][fen]) {
        this.game['_positionCount'][fen] = 0
      }
      this.game['_positionCount'][fen]++
      this.game['_header']['SetUp'] = '1'
      this.game['_header']['FEN'] = fen
    } else {
      // First execution: Generate FEN once (or use provided)
      const fen = this.preCalculatedFen ?? this.game.fen()
      this.addedFen = fen

      if (!this.game['_positionCount'][fen]) {
        this.game['_positionCount'][fen] = 0
      }
      this.game['_positionCount'][fen]++
      this.game['_header']['SetUp'] = '1'
      this.game['_header']['FEN'] = fen
    }
  }

  undo(): void {
    // Decrement position count for the state we are leaving
    if (this.addedFen) {
      if (this.game['_positionCount'][this.addedFen] > 0) {
        this.game['_positionCount'][this.addedFen]--
        if (this.game['_positionCount'][this.addedFen] === 0) {
          delete this.game['_positionCount'][this.addedFen]
        }
      }
    }

    // Restore previous state
    this.game['_turn'] = this.oldTurn
    this.game['_halfMoves'] = this.oldHalfMoves
    this.game['_moveNumber'] = this.oldMoveNumber

    // Setup/FEN header updates handled by _updatePositionCounts usually,
    // but on undo we might just clear cache. Headers will be fixed next forward move.

    this.game['_movesCache'].clear()
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
    this.buildActions()
    const defaultPostMoveActions = [
      new LazyAction(() => checkAndPromoteAttackers(this.game, this.move)),
    ]
    this.actions.push(...defaultPostMoveActions)
  }

  protected abstract buildActions(): void

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
      throw new Error(
        `Build CaptureMove Error: Capture target invalid ${algebraic(
          this.move.to,
        )}`,
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
      throw new Error(
        `Invalid state for combination move: ${JSON.stringify(this.move)}`,
      )
    }

    // Create the combined piece
    const combinedPiece = combinePieces([movingPieceData, targetPieceData])
    if (!combinedPiece) {
      throw new Error(
        `Failed to create combined piece: ${JSON.stringify(this.move)}`,
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
    const pieceAtFrom = this.game.get(this.move.from)
    if (!pieceAtFrom) {
      throw new Error(
        `Build StayCapture Error: No piece to move at ${algebraic(this.move.from)}`,
      )
    }

    const capturedPiece = this.game.get(targetSq)
    if (!capturedPiece || capturedPiece.color !== them) {
      throw new Error(
        `Build StayCapture Error: Target invalid ${algebraic(targetSq)}`,
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
    if (!pieceAtFrom) {
      throw new Error(
        `Build StayCapture Error: No piece to move at ${algebraic(this.move.from)}`,
      )
    }

    const capturedPiece = this.game.get(targetSq)
    if (!capturedPiece || capturedPiece.color !== them) {
      throw new Error(
        `Build StayCapture Error: Target invalid ${algebraic(targetSq)}`,
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
export class DeployMoveSequenceCommand
  implements CTLMoveSequenceCommandInterface
{
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
 * Checks if the opponent's commander is attacked after a move
 * and promotes the attacking pieces to heroic.
 */
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
