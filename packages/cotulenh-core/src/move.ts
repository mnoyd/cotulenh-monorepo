// src/move.ts

import type { CoTuLenh, } from './cotulenh.js'
import { swapColor, algebraic, InternalMove, COMMANDER, BITS, Piece } from './type.js'

/**
 * Abstract base class for all move commands.
 * Each command knows how to execute and undo itself.
 */
export abstract class MoveCommand {
  public readonly move: InternalMove

  constructor(protected game: CoTuLenh, moveData: InternalMove) {
    // Store a mutable copy for potential updates (like setting 'captured' flag)
    this.move = { ...moveData }
  }

  /**
   * Executes the move, modifying the board state.
   * Focuses *only* on board piece placement/removal and captures.
   * General state updates (turn, clocks, deploy state) are handled by _makeMove.
   */
  execute(): void{
    //all move that is not deploy, will reset deploy state
    this.game['_deployState'] =null
  }

  /**
   * Reverts the board changes made by this command.
   */
  abstract undo(): void
}

// --- Concrete Command Implementations ---

export class NormalMoveCommand extends MoveCommand {
  execute(): void {
    super.execute()
    const us = this.move.color
    const them = swapColor(us)
    const pieceThatMoved = this.game['_board'][this.move.from] // Get piece/stack

    if (!pieceThatMoved) {
      throw new Error(
        `Execute NormalMove Error: Piece missing from source ${algebraic(
          this.move.from,
        )}`,
      )
      // Should we throw? State might be inconsistent.
      return
    }

    // Handle capture first
    if (this.move.flags & BITS.CAPTURE) {
      const capturedPieceData = this.game['_board'][this.move.to]
      if (!capturedPieceData || capturedPieceData.color !== them) {
        throw new Error(
          `Execute NormalMove Error: Capture target invalid ${algebraic(
            this.move.to,
          )}`,
        )
        // Inconsistent state if capture flag is set but target is wrong
        return
      }
      // Ensure the captured type is stored on the move object
      this.move.captured = capturedPieceData.type
      // Board deletion happens when moving the piece below
    }

    // Move the piece
    delete this.game['_board'][this.move.from]
    this.game['_board'][this.move.to] = pieceThatMoved

    // Update king position *if* the commander moved (handled AFTER execute in _makeMove)
    // if (pieceThatMoved.type === COMMANDER) {
    //   this.game['_kings'][us] = this.move.to;
    // }
  }

  undo(): void {
    // (Undo logic remains the same as before)
    const pieceThatMoved = this.game['_board'][this.move.to]
    if (!pieceThatMoved || pieceThatMoved.type !== this.move.piece) {
      throw new Error(
        `Undo NormalMove Error: Piece mismatch/missing at destination ${algebraic(
          this.move.to,
        )}`,
      )
    }
    delete this.game['_board'][this.move.to]
    if (pieceThatMoved) {
      this.game['_board'][this.move.from] = pieceThatMoved
    } else {
      console.warn(
        `Undo NormalMove Warning: Piece not found at destination ${algebraic(
          this.move.to,
        )}`,
      )
    }
    if (this.move.captured) {
      this.game['_board'][this.move.to] = {
        type: this.move.captured,
        color: swapColor(this.move.color),
      }
    }
  }
}

export class DeployMoveCommand extends MoveCommand {
  execute(): void {
    const us = this.move.color
    const them = swapColor(us)
    const carrierPiece = this.game['_board'][this.move.from]

    if (!carrierPiece || !carrierPiece.carried) {
      throw new Error(
        `Execute Deploy Error: Carrier missing or empty at ${algebraic(
          this.move.from,
        )}`,
      )
      return
    }

    // Find and remove the deployed piece from the carrier stack
    const deployIndex = carrierPiece.carried.findIndex(
      (p) => p.type === this.move.piece && p.color === us,
    )
    if (deployIndex === -1) {
      throw new Error(
        `Execute Deploy Error: Deployed piece ${this.move.piece} not found in carrier ${algebraic(this.move.from)}`,
      )
      return
    }
    const deployedPiece = carrierPiece.carried.splice(deployIndex, 1)[0]
    if (carrierPiece.carried.length === 0) {
      carrierPiece.carried = undefined // Clear array if empty
    }

    // Handle placement/capture based on flags
    if (this.move.flags & BITS.STAY_CAPTURE) {
      const targetSq = this.move.to
      const capturedPieceData = this.game['_board'][targetSq]
      if (!capturedPieceData || capturedPieceData.color !== them) {
        throw new Error(
          `Execute Deploy Error: Stay capture target invalid ${algebraic(
            targetSq,
          )}`,
        )
        return
      }
      this.move.captured = capturedPieceData.type // Record capture
      delete this.game['_board'][targetSq]       // Remove captured piece
      // Deployed piece remains off-board (conceptually)
    } else {
      // Normal Deploy (with or without capture)
      const destSq = this.move.to
      if (this.move.flags & BITS.CAPTURE) {
        const capturedPieceData = this.game['_board'][destSq]
        if (!capturedPieceData || capturedPieceData.color !== them) {
          throw new Error(
            `Execute Deploy Error: Capture destination invalid ${algebraic(
              destSq,
            )}`,
          )
          return
        }
        this.move.captured = capturedPieceData.type // Record capture
        // Board deletion happens when placing deployed piece below
      }
      this.game['_board'][destSq] = deployedPiece // Place deployed piece
      // Update king position *if* commander deployed (handled AFTER execute in _makeMove)
      // if (deployedPiece.type === COMMANDER) {
      //    this.game['_kings'][us] = destSq;
      // }
    }
    // Set deploy state for next move generation
    this.game["_deployState"] = { stackSquare: this.move.from, turn: us }
  }

  undo(): void {
    // (Undo logic remains the same as before)
    const us = this.move.color
    const them = swapColor(us)
    const carrierPiece = this.game['_board'][this.move.from]
    if (!carrierPiece) {
      throw new Error(
        `Undo Deploy Error: Carrier missing at ${algebraic(this.move.from)}`,
      )
      return
    }
    let deployedPieceToAddBack: Piece | undefined

    if (this.move.flags & BITS.STAY_CAPTURE) {
      deployedPieceToAddBack = { type: this.move.piece, color: us } // Recreate
      const targetSq = this.move.to
      if (this.move.captured) {
        this.game['_board'][targetSq] = {
          type: this.move.captured,
          color: them,
        }
      } else {
        delete this.game['_board'][targetSq]
      }
    } else {
      const destSq = this.move.to
      deployedPieceToAddBack = this.game['_board'][destSq] // Get from destination
      if (
        !deployedPieceToAddBack || deployedPieceToAddBack.type !== this.move.piece
      ) {
        throw new Error(
          `Undo Deploy Error: Deployed piece missing/mismatch at ${algebraic(
            destSq,
          )}`,
        )
      }
      delete this.game['_board'][destSq] // Remove from destination
      if (this.move.captured) {
        this.game['_board'][destSq] = { type: this.move.captured, color: them }
      }
    }

    if (deployedPieceToAddBack) {
      if (!carrierPiece.carried) {
        carrierPiece.carried = []
      }
      if (
        !carrierPiece.carried.some(
          (p) =>
            p.type === deployedPieceToAddBack!.type &&
            p.color === deployedPieceToAddBack!.color,
        )
      ) {
        carrierPiece.carried.push(deployedPieceToAddBack)
      }
    } else {
        console.warn(`Undo Deploy Warning: Could not determine piece to add back for move ${JSON.stringify(this.move)}`);
    }
  }
}

export class StayCaptureMoveCommand extends MoveCommand {
  execute(): void {
    super.execute()
    const us = this.move.color
    const them = swapColor(us)
    const targetSq = this.move.to // 'to' holds the target square

    const capturedPiece = this.game['_board'][targetSq]
    if (!capturedPiece || capturedPiece.color !== them) {
      throw new Error(
        `Execute StayCapture Error: Target invalid ${algebraic(targetSq)}`,
      )
      return
    }
    this.move.captured = capturedPiece.type // Record capture
    delete this.game['_board'][targetSq]    // Remove captured piece
    // Moving piece stays at move.from - no board change needed for it.
  }

  undo(): void {
    // (Undo logic remains the same as before)
    const them = swapColor(this.move.color)
    const targetSq = this.move.to
    if (this.move.captured) {
      this.game['_board'][targetSq] = { type: this.move.captured, color: them }
    } else {
      throw new Error(
        `Undo StayCapture Error: Missing captured piece for move ${JSON.stringify(
          this.move,
        )}`,
      )
      delete this.game['_board'][targetSq]
    }
  }
}

// Factory function remains the same
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