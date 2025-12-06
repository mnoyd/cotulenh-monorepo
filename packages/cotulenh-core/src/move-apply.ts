// src/move.ts

import type { Color, CoTuLenh, PieceSymbol } from './cotulenh.js'
import {
  swapColor,
  algebraic,
  InternalMove,
  COMMANDER,
  BITS,
  Piece,
} from './type.js'
import {
  combinePieces,
  flattenPiece,
  removePieceFromStack,
  clonePiece,
} from './utils.js'

/**
 * Represents an atomic board action that can be executed and undone
 */
export interface CTLAtomicMoveAction {
  execute(): void
  undo(): void
}

/**
 * Removes a piece from a square
 */
export class RemovePieceAction implements CTLAtomicMoveAction {
  private removedPiece?: Piece
  constructor(
    protected game: CoTuLenh,
    private square: number,
  ) {}

  execute(): void {
    const piece = this.game.get(this.square)
    if (piece) {
      this.removedPiece = { ...piece }
      this.game.remove(algebraic(this.square))
    }
  }

  undo(): void {
    if (this.removedPiece) {
      const result = this.game.put(this.removedPiece, algebraic(this.square))
      if (!result) {
        throw new Error(
          'Place piece fail:' +
            JSON.stringify(this.removedPiece) +
            algebraic(this.square),
        )
      }
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
 * Removes a piece from a carrier's stack
 */
export class RemoveFromStackAction implements CTLAtomicMoveAction {
  private originalCarrier: Piece | null = null
  constructor(
    protected game: CoTuLenh,
    private carrierSquare: number,
    private piece: Piece,
  ) {}

  execute(): void {
    const carrier = this.game.get(this.carrierSquare)
    if (!carrier) {
      throw new Error(
        `No carrier or carrying pieces at ${algebraic(this.carrierSquare)}`,
      )
    }

    // Store original carrier for undo
    this.originalCarrier = clonePiece(carrier) ?? null

    // Remove piece from stack using utility
    const remainingCarrier = removePieceFromStack(carrier, this.piece)

    if (!remainingCarrier) {
      // No pieces remain after removal
      this.game.remove(algebraic(this.carrierSquare))
    } else {
      // Update the carrier with remaining pieces
      const putResult = this.game.put(
        remainingCarrier,
        algebraic(this.carrierSquare),
      )
      if (!putResult) {
        throw new Error(
          `Failed to update carrier at ${algebraic(this.carrierSquare)}`,
        )
      }
    }

    // Update commander position if commander was moved
    if (flattenPiece(this.piece).some((p) => p.type === COMMANDER)) {
      this.game['_commanders'][this.piece.color] = -1
    }
  }

  undo(): void {
    if (!this.originalCarrier) return

    const result = this.game.put(
      this.originalCarrier,
      algebraic(this.carrierSquare),
    )
    if (!result) {
      throw new Error(
        `Failed to restore carrier at ${algebraic(this.carrierSquare)}`,
      )
    }
  }
}

/**
 * Updates game state (turn, halfMoves, moveNumber) after a move.
 * This action encapsulates state changes so they can be executed/undone atomically.
 */
export class StateUpdateAction implements CTLAtomicMoveAction {
  private oldTurn: Color
  private oldHalfMoves: number
  private oldMoveNumber: number
  private oldCommanders: Record<Color, number>
  private addedFen: string | null = null

  constructor(
    private game: CoTuLenh,
    private move: InternalMove,
  ) {
    // Capture current state before execution (or before update)
    // Note: StateUpdateAction is usually created AFTER move execution but BEFORE flag update.
    this.oldTurn = game.turn()
    this.oldHalfMoves = game['_halfMoves']
    this.oldMoveNumber = game['_moveNumber']
    this.oldCommanders = { ...game['_commanders'] }
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

    // Update position counts (Logic moved from cotulenh.ts)
    // We generate FEN *after* state update to match the new position
    this.game['_updatePositionCounts']()
    this.addedFen = this.game.fen()
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
    this.game['_commanders'] = { ...this.oldCommanders }

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
      new CheckAndPromoteAttackersAction(this.game, this.move),
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
    const pieceThatMoved = getMovingPieceFromInternalMove(this.game, this.move)

    // Add actions for the normal move
    this.actions.push(
      new RemoveFromStackAction(this.game, this.move.from, pieceThatMoved),
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
    const pieceThatMoved = getMovingPieceFromInternalMove(this.game, this.move)

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
      new RemoveFromStackAction(this.game, this.move.from, pieceThatMoved),
    )
    this.actions.push(new RemovePieceAction(this.game, this.move.to))
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, pieceThatMoved),
    )
  }
}

/**
 * Command for combining two friendly pieces.
 */
class CombinationMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const movingPieceData = getMovingPieceFromInternalMove(this.game, this.move)
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
      new RemoveFromStackAction(this.game, this.move.from, movingPieceData),
    )

    // 2. Remove the existing piece from the 'to' square (before placing the combined one)
    //    Using PlacePieceAction with the combined piece handles both removal and placement
    //    and ensures correct undo behavior (restoring the original target piece).
    // this.actions.push(new RemovePieceAction(this.game, this.move.to)) // Redundant if PlacePiece handles existing

    // 3. Place the new combined piece on the 'to' square
    this.actions.push(
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
    const pieceAtFrom = getMovingPieceFromInternalMove(this.game, this.move)
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
      new RemoveFromStackAction(this.game, this.move.from, pieceAtFrom),
    )
    this.actions.push(new RemovePieceAction(this.game, targetSq))
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
  private commands: CTLAtomicMoveAction[] = []

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
class CheckAndPromoteAttackersAction implements CTLAtomicMoveAction {
  private heroicActions: SetHeroicAction[] = []
  private moveColor: Color
  constructor(
    private game: CoTuLenh,
    move: InternalMove,
  ) {
    this.moveColor = move.color
  }

  execute(): void {
    this.heroicActions = []
    const us = this.moveColor
    const them = swapColor(us)
    const themCommanderSq = this.game.getCommanderSquare(them)
    if (themCommanderSq === -1) return
    const attackers = this.game.getAttackers(themCommanderSq, us)
    if (attackers.length === 0) return
    const processedAttackers = new Set<string>()
    for (const { square, type } of attackers) {
      const attackerKey = `${square}:${type}`
      if (processedAttackers.has(attackerKey)) continue
      processedAttackers.add(attackerKey)
      const isHeroic = this.game.getHeroicStatus(square, type)
      if (!isHeroic) {
        const promoteAction = new SetHeroicAction(this.game, square, type, true)
        this.heroicActions.push(promoteAction)
        promoteAction.execute()
      }
    }
  }

  undo(): void {
    for (let i = this.heroicActions.length - 1; i >= 0; i--) {
      this.heroicActions[i].undo()
    }
    this.heroicActions = []
  }
}
// DeployMoveCommand removed - deploy moves now handled by MoveSession.commit()

const getMovingPieceFromInternalMove = (
  game: CoTuLenh,
  move: InternalMove,
): Piece => {
  const pieceAtFrom = game.get(move.from)
  if (!pieceAtFrom) {
    throw new Error(`No piece to move at ${algebraic(move.from)}`)
  }
  const requestMovingPieces = flattenPiece(move.piece)
  const movingPiece: Piece[] = []
  for (const piece of flattenPiece(pieceAtFrom)) {
    const idx = requestMovingPieces.findIndex((p) => p.type === piece.type)
    if (idx !== -1) {
      movingPiece.push({ ...piece })
      requestMovingPieces.splice(idx, 1)
    }
  }
  if (requestMovingPieces.length > 0) {
    throw new Error(`Not enough pieces to move at ${algebraic(move.from)}`)
  }
  const combined = combinePieces(movingPiece)
  if (!combined) {
    throw new Error(`Not enough pieces to move at ${algebraic(move.from)}`)
  }
  return combined
}

const isStackMove = (move: InternalMove): boolean => {
  return !!(move.flags & BITS.DEPLOY)
}
