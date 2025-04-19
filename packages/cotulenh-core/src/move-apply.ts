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
    if (!carrier || !carrier.carried) {
      throw new Error(
        `No carrier or carried pieces at ${algebraic(this.carrierSquare)}`,
      )
    }

    this.removedIndex = carrier.carried.findIndex(
      (p) => p.type === this.pieceType && p.color === this.pieceColor,
    )

    if (this.removedIndex === -1) {
      throw new Error(
        `Piece ${this.pieceType} not found in carrier at ${algebraic(this.carrierSquare)}`,
      )
    }

    this.removedPiece = carrier.carried[this.removedIndex]
    carrier.carried.splice(this.removedIndex, 1)

    if (carrier.carried.length === 0) {
      carrier.carried = undefined
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

    if (!carrier.carried) {
      carrier.carried = []
    }

    // Insert at the original position if possible, otherwise just add to the end
    if (this.removedIndex >= 0 && this.removedIndex <= carrier.carried.length) {
      carrier.carried.splice(this.removedIndex, 0, this.removedPiece)
    } else {
      carrier.carried.push(this.removedPiece)
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
      this.move.captured = capturedPieceData.type

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

    if (!carrierPiece || !carrierPiece.carried) {
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

      this.move.captured = capturedPieceData.type
      this.actions.push(new RemovePieceAction(targetSq))
    }
    // Handle normal deploy (with or without capture)
    else {
      // Add action to remove the piece from the carrier's stack
      this.actions.push(
        new RemoveFromStackAction(this.move.from, this.move.piece, us),
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

        this.move.captured = capturedPieceData.type
        this.actions.push(new RemovePieceAction(destSq))
      }

      // Find the piece in the carrier's stack to deploy
      const deployedPieceIndex = carrierPiece.carried!.findIndex(
        (p) => p.type === this.move.piece && p.color === us,
      )

      if (deployedPieceIndex === -1) {
        throw new Error(
          `Build Deploy Error: Piece ${this.move.piece} not found in carrier at ${algebraic(
            this.move.from,
          )}`,
        )
      }

      const deployedPiece = { ...carrierPiece.carried![deployedPieceIndex] }

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

    this.move.captured = capturedPiece.type

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
  if (move.flags & BITS.DEPLOY) {
    return new DeployMoveCommand(game, move)
  } else if (move.flags & BITS.STAY_CAPTURE) {
    return new StayCaptureMoveCommand(game, move)
  } else {
    return new NormalMoveCommand(game, move)
  }
}
