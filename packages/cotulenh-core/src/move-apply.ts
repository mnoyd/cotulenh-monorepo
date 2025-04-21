// src/move.ts

import type { Color, CoTuLenh } from './cotulenh.js'
import {
  swapColor,
  algebraic,
  InternalMove,
  COMMANDER,
  BITS,
  Piece,
} from './type.js'
import { createCombinedPiece } from './utils.js'

/**
 * Represents an atomic board action that can be executed and undone
 */
interface AtomicMoveAction {
  execute(game: CoTuLenh): void
  undo(game: CoTuLenh): void
}

/**
 * Removes a piece from a square
 */
class RemovePieceAction implements AtomicMoveAction {
  private removedPiece?: Piece

  constructor(private square: number) {}

  execute(game: CoTuLenh): void {
    this.removedPiece = game.getPieceAt(this.square)
    game.deletePieceAt(this.square)
  }

  undo(game: CoTuLenh): void {
    if (this.removedPiece) {
      game.setPieceAt(this.square, this.removedPiece)
    }
  }
}

/**
 * Places a piece on a square
 */
class PlacePieceAction implements AtomicMoveAction {
  private existingPiece?: Piece

  constructor(
    private square: number,
    private piece: Piece,
  ) {}

  execute(game: CoTuLenh): void {
    this.existingPiece = game.getPieceAt(this.square)
    game.setPieceAt(this.square, this.piece)
  }

  undo(game: CoTuLenh): void {
    if (this.existingPiece) {
      game.setPieceAt(this.square, this.existingPiece)
    } else {
      game.deletePieceAt(this.square)
    }
  }
}

/**
 * Removes a piece from a carrier's stack
 */
class RemoveFromStackAction implements AtomicMoveAction {
  private removedPiece?: Piece
  private removedIndex: number = -1

  constructor(
    private carrierSquare: number,
    private pieceType: string,
    private pieceColor: string,
  ) {}

  execute(game: CoTuLenh): void {
    const carrier = game.getPieceAt(this.carrierSquare)
    if (!carrier || !carrier.carrying) {
      throw new Error(
        `No carrier or carrying pieces at ${algebraic(this.carrierSquare)}`,
      )
    }

    this.removedIndex = carrier.carrying.findIndex(
      (p) => p.type === this.pieceType && p.color === this.pieceColor,
    )

    if (this.removedIndex === -1) {
      throw new Error(
        `Piece ${this.pieceType} not found in carrier at ${algebraic(this.carrierSquare)}`,
      )
    }

    this.removedPiece = carrier.carrying[this.removedIndex]
    carrier.carrying.splice(this.removedIndex, 1)

    if (carrier.carrying.length === 0) {
      carrier.carrying = undefined
    }
  }

  undo(game: CoTuLenh): void {
    if (!this.removedPiece) return

    const carrier = game.getPieceAt(this.carrierSquare)
    if (!carrier) {
      throw new Error(
        `Carrier missing during undo at ${algebraic(this.carrierSquare)}`,
      )
    }

    if (!carrier.carrying) {
      carrier.carrying = []
    }

    // Insert at the original position if possible, otherwise just add to the end
    if (
      this.removedIndex >= 0 &&
      this.removedIndex <= carrier.carrying.length
    ) {
      carrier.carrying.splice(this.removedIndex, 0, this.removedPiece)
    } else {
      carrier.carrying.push(this.removedPiece)
    }
  }
}

/**
 * Updates the king position
 */
class UpdateKingPositionAction implements AtomicMoveAction {
  private oldPosition: number

  constructor(
    private color: Color,
    private newPosition: number,
    game: CoTuLenh,
  ) {
    // _kings square should be either -1 indicating king captured, or a square index
    if (game['_commanders'][color] === -1) {
      throw new Error(`No king found for color ${color}`)
    }
    this.oldPosition = game['_commanders'][color]
  }

  execute(game: CoTuLenh): void {
    game.updateKingsPosition(this.newPosition, this.color)
  }

  undo(game: CoTuLenh): void {
    game.updateKingsPosition(this.oldPosition, this.color)
  }
}

/**
 * Sets the deploy state
 */
class SetDeployStateAction implements AtomicMoveAction {
  private oldDeployState: { stackSquare: number; turn: Color } | null

  constructor(
    private newDeployState: { stackSquare: number; turn: Color } | null,
    game: CoTuLenh,
  ) {
    this.oldDeployState = game['_deployState']
  }

  execute(game: CoTuLenh): void {
    game['_deployState'] = this.newDeployState
  }

  undo(game: CoTuLenh): void {
    game['_deployState'] = this.oldDeployState
  }
}

/**
 * Abstract base class for all move commands.
 * Each command knows how to execute and undo itself.
 */
export abstract class MoveCommand {
  public readonly move: InternalMove
  protected actions: AtomicMoveAction[] = []

  constructor(
    protected game: CoTuLenh,
    moveData: InternalMove,
  ) {
    // Store a mutable copy for potential updates (like setting 'captured' flag)
    this.move = { ...moveData }
    this.buildActions()
  }

  /**
   * Builds the list of atomic actions for this move
   */
  protected abstract buildActions(): void

  /**
   * Executes the move, modifying the board state.
   * Focuses *only* on board piece placement/removal and captures.
   * General state updates (turn, clocks, deploy state) are handled by _makeMove.
   */
  execute(): void {
    // Execute all atomic actions in sequence
    for (const action of this.actions) {
      action.execute(this.game)
    }
  }

  /**
   * Reverts the board changes made by this command.
   */
  undo(): void {
    // Undo actions in reverse order
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo(this.game)
    }
  }
}

// --- Concrete Command Implementations ---

export class NormalMoveCommand extends MoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const pieceThatMoved = this.game.getPieceAt(this.move.from)

    if (!pieceThatMoved) {
      throw new Error(
        `Build NormalMove Error: Piece missing from source ${algebraic(
          this.move.from,
        )}`,
      )
    }

    // Handle capture if needed
    if (this.move.flags & BITS.CAPTURE) {
      const capturedPieceData = this.game.getPieceAt(this.move.to)
      if (!capturedPieceData || capturedPieceData.color !== them) {
        throw new Error(
          `Build NormalMove Error: Capture target invalid ${algebraic(
            this.move.to,
          )}`,
        )
      }
      // Ensure the captured type is stored on the move object
      this.move.otherPiece = capturedPieceData

      // Add action to remove the captured piece
      this.actions.push(new RemovePieceAction(this.move.to))
    }

    // Add actions for the normal move
    this.actions.push(new RemovePieceAction(this.move.from))
    this.actions.push(new PlacePieceAction(this.move.to, pieceThatMoved))

    // Update king position if needed
    if (pieceThatMoved.type === COMMANDER) {
      this.actions.push(
        new UpdateKingPositionAction(us, this.move.to, this.game),
      )
    }

    // Clear deploy state
    this.actions.push(new SetDeployStateAction(null, this.game))
  }
}

export class DeployMoveCommand extends MoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const carrierPiece = this.game.getPieceAt(this.move.from)

    if (!carrierPiece || !carrierPiece.carrying) {
      throw new Error(
        `Build Deploy Error: Carrier missing or empty at ${algebraic(
          this.move.from,
        )}`,
      )
    }

    // Handle stay capture
    if (this.move.flags & BITS.STAY_CAPTURE) {
      const targetSq = this.move.to
      const capturedPieceData = this.game.getPieceAt(targetSq)

      if (!capturedPieceData || capturedPieceData.color !== them) {
        throw new Error(
          `Build Deploy Error: Stay capture target invalid ${algebraic(
            targetSq,
          )}`,
        )
      }

      this.move.otherPiece = capturedPieceData
      this.actions.push(new RemovePieceAction(targetSq))
    }
    // Handle normal deploy (with or without capture)
    else {
      // Add action to remove the piece from the carrier's stack
      this.actions.push(
        new RemoveFromStackAction(this.move.from, this.move.piece.type, us),
      )
      const destSq = this.move.to

      // Handle capture if needed
      if (this.move.flags & BITS.CAPTURE) {
        const capturedPieceData = this.game.getPieceAt(destSq)

        if (!capturedPieceData || capturedPieceData.color !== them) {
          throw new Error(
            `Build Deploy Error: Capture destination invalid ${algebraic(
              destSq,
            )}`,
          )
        }

        this.move.otherPiece = capturedPieceData
        this.actions.push(new RemovePieceAction(destSq))
      }

      // Find the piece in the carrier's stack to deploy
      const deployedPieceIndex = carrierPiece.carrying!.findIndex(
        (p) => p.type === this.move.piece.type && p.color === us,
      )

      if (deployedPieceIndex === -1) {
        throw new Error(
          `Build Deploy Error: Piece ${this.move.piece} not found in carrier at ${algebraic(
            this.move.from,
          )}`,
        )
      }

      const deployedPiece = { ...carrierPiece.carrying![deployedPieceIndex] }

      // Add action to place the deployed piece
      this.actions.push(new PlacePieceAction(destSq, deployedPiece))

      // Update king position if needed
      if (deployedPiece.type === COMMANDER) {
        this.actions.push(new UpdateKingPositionAction(us, destSq, this.game))
      }
    }

    // Set deploy state for next move
    this.actions.push(
      new SetDeployStateAction(
        {
          stackSquare: this.move.from,
          turn: us,
        },
        this.game,
      ),
    )
  }
}

/**
 * Command for combining two friendly pieces.
 */
class CombinationMoveCommand extends MoveCommand {
  protected buildActions(): void {
    const movingPieceData = this.game.getPieceAt(this.move.from)
    const targetPieceData = this.game.getPieceAt(this.move.to)

    if (
      !movingPieceData ||
      !targetPieceData ||
      !(this.move.flags & BITS.COMBINATION) ||
      !this.move.otherPiece // Sanity check
    ) {
      throw new Error(
        `Invalid state for combination move: ${JSON.stringify(this.move)}`,
      )
    }

    // Create the combined piece
    const combinedPiece = createCombinedPiece(movingPieceData, targetPieceData)
    if (!combinedPiece) {
      throw new Error(
        `Failed to create combined piece: ${JSON.stringify(this.move)}`,
      )
    }

    // 1. Remove the moving piece from the 'from' square
    this.actions.push(new RemovePieceAction(this.move.from))

    // 2. Remove the existing piece from the 'to' square (before placing the combined one)
    //    Using PlacePieceAction with the combined piece handles both removal and placement
    //    and ensures correct undo behavior (restoring the original target piece).
    // this.actions.push(new RemovePieceAction(this.move.to)) // Redundant if PlacePiece handles existing

    // 3. Place the new combined piece on the 'to' square
    this.actions.push(new PlacePieceAction(this.move.to, combinedPiece))

    // Handle commander position update if the *moving* piece was a commander
    // Note: Current canCombine logic should prevent this, but defensive coding is good.
    if (movingPieceData.type === COMMANDER) {
      this.actions.push(
        new UpdateKingPositionAction(this.move.color, this.move.to, this.game),
      )
    }
    // Note: If the *target* piece was a commander, it's being removed.
    // The RemovePieceAction's undo will restore it, but the king position needs update?
    // The standard capture logic already handles removing the opponent's king,
    // maybe we need a similar action if a friendly commander is "removed" via combination?
    // For now, assume canCombine prevents combining *with* a commander.
  }
}

export class StayCaptureMoveCommand extends MoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const targetSq = this.move.to

    const capturedPiece = this.game.getPieceAt(targetSq)
    if (!capturedPiece || capturedPiece.color !== them) {
      throw new Error(
        `Build StayCapture Error: Target invalid ${algebraic(targetSq)}`,
      )
    }

    this.move.otherPiece = capturedPiece

    // Only action is to remove the captured piece
    this.actions.push(new RemovePieceAction(targetSq))

    // Clear deploy state
    this.actions.push(new SetDeployStateAction(null, this.game))
  }
}

// Factory function to create the appropriate command
export function createMoveCommand(
  game: CoTuLenh,
  move: InternalMove,
): MoveCommand {
  // Check flags in order of precedence (if applicable)
  if (move.flags & BITS.DEPLOY) {
    return new DeployMoveCommand(game, move)
  } else if (move.flags & BITS.STAY_CAPTURE) {
    return new StayCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.COMBINATION) {
    // Add combination check
    return new CombinationMoveCommand(game, move)
  } else {
    // Default to NormalMove if no other specific flags are set
    return new NormalMoveCommand(game, move)
  }
}
