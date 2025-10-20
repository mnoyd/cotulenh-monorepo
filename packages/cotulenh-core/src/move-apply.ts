// src/move.ts

import type { Color, CoTuLenh, PieceSymbol } from './cotulenh.js'
import { InternalDeployMove } from './deploy-move.js'
import {
  swapColor,
  algebraic,
  InternalMove,
  COMMANDER,
  BITS,
  Piece,
  DeployState,
  MoveContext,
  Square,
} from './type.js'
import {
  createCombinedPiece,
  createCombineStackFromPieces,
  flattenPiece,
} from './utils.js'

/**
 * Represents an atomic board action that can be executed and undone
 */
interface CTLAtomicMoveAction {
  execute(): void
  undo(): void
}

/**
 * Removes a piece from a square
 */
class RemovePieceAction implements CTLAtomicMoveAction {
  private removedPiece?: Piece
  constructor(
    protected game: CoTuLenh,
    private square: number,
    private context?: MoveContext,
  ) {}

  execute(): void {
    const piece = this.game.get(this.square)
    if (piece) {
      // Deep copy to prevent reference mutations
      this.removedPiece = {
        ...piece,
        carrying: piece.carrying?.map((p) => ({ ...p })),
      }

      // Check game's current deploy session
      const currentDeploySession = this.game.getDeployState()
      if (this.context?.isDeployMode && currentDeploySession) {
        // In deploy mode, update virtual state
        currentDeploySession.virtualChanges.set(algebraic(this.square), null)
      } else {
        // In normal mode, update real board
        this.game.remove(algebraic(this.square))
      }
    }
  }

  undo(): void {
    if (this.removedPiece) {
      // ✅ CRITICAL FIX: Check game's current deploy session, not stale context
      const currentDeploySession = this.game.getDeployState()
      if (this.context?.isDeployMode && currentDeploySession) {
        // In deploy mode, restore virtual state by removing the virtual change
        currentDeploySession.virtualChanges.delete(algebraic(this.square))
      } else {
        // In normal mode, restore real board
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
}

/**
 * Places a piece on a square
 */
class PlacePieceAction implements CTLAtomicMoveAction {
  private existingPiece?: Piece
  constructor(
    protected game: CoTuLenh,
    private square: number,
    private piece: Piece,
    private context?: MoveContext,
  ) {}

  execute(): void {
    const piece = this.game.get(this.square)
    console.log(
      `[DEBUG] PlacePieceAction.execute: Placing ${this.piece.type} at ${algebraic(this.square)}, existing:`,
      piece ? piece.type : 'empty',
    )
    if (piece) {
      // Deep copy to prevent reference mutations
      this.existingPiece = {
        ...piece,
        carrying: piece.carrying?.map((p) => ({ ...p })),
      }
    }

    // ✅ Check game's current deploy session, not stale context
    const currentDeploySession = this.game.getDeployState()
    if (this.context?.isDeployMode && currentDeploySession) {
      // In deploy mode, update virtual state
      currentDeploySession.virtualChanges.set(
        algebraic(this.square),
        this.piece,
      )
    } else {
      // In normal mode, update real board
      const result = this.game.put(this.piece, algebraic(this.square))
      if (!result) {
        throw new Error(
          'Place piece fail:' +
            JSON.stringify(this.piece) +
            algebraic(this.square),
        )
      }
    }
  }

  undo(): void {
    console.log(
      `[DEBUG] PlacePieceAction.undo: Removing ${this.piece.type} from ${algebraic(this.square)}, restoring:`,
      this.existingPiece ? this.existingPiece.type : 'empty',
    )

    // ✅ CRITICAL FIX: Check GAME's current deploy session, not stale context
    // The context.deploySession points to the session that existed during execute(),
    // but by undo time, the game's _deploySession might have been restored to null.
    // We must respect the game's current state!
    const currentDeploySession = this.game.getDeployState()
    const shouldUseVirtualState =
      this.context?.isDeployMode && currentDeploySession

    if (shouldUseVirtualState) {
      // In deploy mode, restore virtual state
      console.log(
        `[DEBUG] PlacePieceAction.undo: Using virtual state restoration`,
      )
      if (this.existingPiece) {
        currentDeploySession!.virtualChanges.set(
          algebraic(this.square),
          this.existingPiece,
        )
      } else {
        currentDeploySession!.virtualChanges.delete(algebraic(this.square))
      }
    } else {
      // In normal mode, restore real board
      console.log(`[DEBUG] PlacePieceAction.undo: Using real board restoration`)
      if (this.existingPiece) {
        const result = this.game.put(this.existingPiece, algebraic(this.square))
        if (!result) {
          throw new Error(
            'Place piece fail:' +
              JSON.stringify(this.piece) +
              algebraic(this.square),
          )
        }
      } else {
        console.log(
          `[DEBUG] PlacePieceAction.undo: Removing piece from ${algebraic(this.square)}`,
        )
        this.game.remove(algebraic(this.square))
      }

      const verification = this.game.get(this.square)
      console.log(
        `[DEBUG] PlacePieceAction.undo: Verified board at ${algebraic(this.square)}:`,
        verification ? verification.type : 'empty',
      )
    }
  }
}

/**
 * Removes a piece from a carrier's stack
 */
class RemoveFromStackAction implements CTLAtomicMoveAction {
  private removedPiece: Piece[] | null = null
  private originalState: Piece | undefined // Save complete original state for proper undo

  constructor(
    protected game: CoTuLenh,
    private carrierSquare: number,
    private piece: Piece,
    private context?: MoveContext,
  ) {
    // ✅ CRITICAL: Save original state BEFORE any modifications with DEEP COPY
    // This ensures undo can restore the exact original state,
    // not a reconstructed state that might be wrong if something
    // else modified the square in between.
    // MUST be deep copy to avoid reference mutations!
    const original = this.game.get(this.carrierSquare)
    if (original) {
      this.originalState = {
        ...original,
        carrying: original.carrying?.map((p) => ({ ...p })),
      }
    } else {
      this.originalState = undefined
    }
    console.log(
      `[DEBUG] RemoveFromStackAction constructor: Saved original state at ${algebraic(this.carrierSquare)}:`,
      this.originalState
        ? `${this.originalState.type} carrying ${this.originalState.carrying?.length || 0}`
        : 'empty',
    )
  }

  execute(): void {
    const carrier = this.game.get(this.carrierSquare)
    console.log(
      `[DEBUG] RemoveFromStackAction: Removing ${this.piece.type} from ${algebraic(this.carrierSquare)}`,
    )
    console.log(
      `[DEBUG] RemoveFromStackAction: Carrier at square:`,
      carrier
        ? `${carrier.type} carrying ${carrier.carrying?.length || 0} pieces`
        : 'null',
    )
    if (!carrier) {
      throw new Error(
        `No carrier or carrying pieces at ${algebraic(this.carrierSquare)}`,
      )
    }
    const movingPiece = flattenPiece(this.piece)
    this.removedPiece = [...movingPiece]
    const allPieces = flattenPiece(carrier)
    console.log(
      `[DEBUG] RemoveFromStackAction: All pieces in carrier:`,
      allPieces.map((p) => p.type),
    )

    // Better piece matching logic that handles multiple pieces of same type
    const remainingPiece = [...allPieces]
    for (const pieceToRemove of movingPiece) {
      const index = remainingPiece.findIndex(
        (p) =>
          p.type === pieceToRemove.type &&
          p.color === pieceToRemove.color &&
          (p.heroic || false) === (pieceToRemove.heroic || false),
      )
      if (index === -1) {
        console.error(`[DEBUG] RemoveFromStackAction failed:`)
        console.error(`  Square: ${algebraic(this.carrierSquare)}`)
        console.error(`  Looking for piece:`, pieceToRemove)
        console.error(`  Available pieces:`, allPieces)
        console.error(`  Remaining pieces:`, remainingPiece)
        throw new Error(
          `Request moving piece ${pieceToRemove.type} from ${algebraic(this.carrierSquare)} not found in the stack`,
        )
      }
      remainingPiece.splice(index, 1)
    }

    // Update board state - either virtual or real
    // ✅ Check game's current deploy session, not stale context
    const currentDeploySession = this.game.getDeployState()
    if (this.context?.isDeployMode && currentDeploySession) {
      // Deploy mode with session: update virtual state
      console.log(
        `[DEBUG] RemoveFromStackAction: Updating virtual state at ${algebraic(this.carrierSquare)}`,
      )
      console.log(
        `[DEBUG] RemoveFromStackAction: Remaining pieces after removal:`,
        remainingPiece.map((p) => p.type),
      )

      if (remainingPiece.length === 0) {
        currentDeploySession.virtualChanges.set(
          algebraic(this.carrierSquare),
          null,
        )
        console.log(
          `[DEBUG] RemoveFromStackAction: Set virtual state to NULL (empty)`,
        )
      } else {
        const { combined: combinedPiece, uncombined } =
          createCombineStackFromPieces(remainingPiece)
        if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
          throw new Error(
            `Failed to remove piece from stack at ${algebraic(this.carrierSquare)}`,
          )
        }
        currentDeploySession.virtualChanges.set(
          algebraic(this.carrierSquare),
          combinedPiece,
        )
        console.log(
          `[DEBUG] RemoveFromStackAction: Set virtual state to ${combinedPiece.type} carrying ${combinedPiece.carrying?.length || 0}`,
        )
        console.log(
          `[DEBUG] RemoveFromStackAction: Virtual changes map size:`,
          currentDeploySession.virtualChanges.size,
        )
      }
    } else {
      // Normal mode OR deploy testing mode (no session): update real board
      // The undo() will restore the original state
      if (remainingPiece.length === 0) {
        this.game.remove(algebraic(this.carrierSquare))
      } else {
        const { combined: combinedPiece, uncombined } =
          createCombineStackFromPieces(remainingPiece)
        if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
          throw new Error(
            `Failed to remove piece from stack at ${algebraic(this.carrierSquare)}`,
          )
        }
        const result = this.game.put(
          combinedPiece,
          algebraic(this.carrierSquare),
        )
        if (!result) {
          throw new Error(
            'Place piece fail:' +
              JSON.stringify(combinedPiece) +
              algebraic(this.carrierSquare),
          )
        }
      }
    }

    if (movingPiece.some((p) => p.type === COMMANDER)) {
      this.game['_commanders'][this.piece.color] = -1
    }
  }

  undo(): void {
    if (!this.removedPiece) return

    console.log(
      `[DEBUG] RemoveFromStackAction.undo: Restoring to ${algebraic(this.carrierSquare)}`,
    )

    // ✅ CRITICAL FIX: Check GAME's current deploy session, not stale context
    // The context.deploySession points to the session that existed during execute(),
    // but by undo time, the game's _deploySession might have been restored to null.
    // We must respect the game's current state!
    const currentDeploySession = this.game.getDeployState()
    const hasActiveVirtualChanges =
      this.context?.isDeployMode &&
      currentDeploySession &&
      currentDeploySession.virtualChanges.has(algebraic(this.carrierSquare))

    if (hasActiveVirtualChanges) {
      // In deploy mode with active virtual changes: restore virtual state
      // This will make the effective board show the original state
      console.log(
        '[DEBUG] RemoveFromStackAction.undo: Using virtual state restoration',
      )
      currentDeploySession!.virtualChanges.delete(algebraic(this.carrierSquare))
    } else {
      // ✅ CRITICAL FIX: Restore ORIGINAL state, not reconstructed state
      // Previous bug: reconstructed from current state which might be corrupted
      // New fix: restore exact original state saved in constructor
      console.log(
        `[DEBUG] RemoveFromStackAction.undo: Restoring original state:`,
        this.originalState
          ? `${this.originalState.type} carrying ${this.originalState.carrying?.length || 0}`
          : 'empty',
      )

      if (this.originalState) {
        const result = this.game.put(
          this.originalState,
          algebraic(this.carrierSquare),
        )
        if (!result) {
          throw new Error(
            `Failed to restore original state at ${algebraic(this.carrierSquare)}: ` +
              JSON.stringify(this.originalState),
          )
        }
      } else {
        // Original state was empty - remove the piece
        this.game.remove(algebraic(this.carrierSquare))
      }

      // Verify restoration
      const verification = this.game.get(this.carrierSquare)
      console.log(
        `[DEBUG] RemoveFromStackAction.undo: Verified board now has:`,
        verification
          ? `${verification.type} carrying ${verification.carrying?.length || 0}`
          : 'empty',
      )
    }
  }
}

/**
 * Initializes a deploy session when the first deploy move is made
 */
class InitializeDeploySessionAction implements CTLAtomicMoveAction {
  private wasSessionCreated: boolean = false

  constructor(
    protected game: CoTuLenh,
    private stackSquare: Square,
    private originalPiece: Piece,
    private context?: MoveContext,
  ) {}

  execute(): void {
    // Skip session initialization if in testing mode
    if (this.context?.isTesting) {
      return
    }

    // Only initialize if no deploy session exists
    if (!this.game.getDeployState()) {
      const deploySession = this.game['startDeploySession'](
        this.stackSquare,
        this.originalPiece,
      )
      this.wasSessionCreated = true

      // Update context with the new session
      if (this.context) {
        this.context.deploySession = deploySession
      }
    }
  }

  undo(): void {
    // Only clear if we created the session
    if (this.wasSessionCreated) {
      this.game.setDeployState(null)

      // Clear context session
      if (this.context) {
        this.context.deploySession = undefined
      }
    }
  }
}

/**
 * Updates deploy session with moved piece information
 */
class UpdateDeploySessionAction implements CTLAtomicMoveAction {
  private previousMoveCount: number = 0

  constructor(
    protected game: CoTuLenh,
    private context: MoveContext,
    private movedPiece: Piece,
    private fromSquare: Square,
    private toSquare: Square,
    private captured?: Piece,
  ) {}

  execute(): void {
    // ✅ Check game's current deploy session
    const currentDeploySession = this.game.getDeployState()
    if (currentDeploySession) {
      this.previousMoveCount = currentDeploySession.movedPieces.length

      // Add the moved piece to the deploy session
      currentDeploySession.movedPieces.push({
        piece: this.movedPiece,
        from: this.fromSquare,
        to: this.toSquare,
        captured: this.captured,
      })

      console.log(
        `[DEBUG] UpdateDeploySessionAction: Added piece ${this.movedPiece.type} from ${this.fromSquare} to ${this.toSquare}. Total moved: ${currentDeploySession.movedPieces.length}`,
      )
    }
  }

  undo(): void {
    // ✅ CRITICAL FIX: Check game's current deploy session
    const currentDeploySession = this.game.getDeployState()
    if (currentDeploySession) {
      // Remove the last moved piece
      currentDeploySession.movedPieces.splice(this.previousMoveCount)
    }
  }
}

export interface CTLMoveCommandInteface extends CTLAtomicMoveAction {
  move: InternalMove | InternalDeployMove
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
    protected context?: MoveContext,
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
}

// --- Concrete Command Implementations ---

export class NormalMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const pieceThatMoved = getMovingPieceFromInternalMove(this.game, this.move)

    // Add actions for the normal move
    if (!isStackMove(this.move)) {
      this.actions.push(
        new RemovePieceAction(this.game, this.move.from, this.context),
      )
    }
    this.actions.push(
      new PlacePieceAction(
        this.game,
        this.move.to,
        pieceThatMoved,
        this.context,
      ),
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
    if (!isStackMove(this.move)) {
      this.actions.push(
        new RemovePieceAction(this.game, this.move.from, this.context),
      )
    }
    this.actions.push(
      new PlacePieceAction(
        this.game,
        this.move.to,
        pieceThatMoved,
        this.context,
      ),
    )
  }
}

export class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    console.log(
      `[DEBUG] SingleDeployMoveCommand.buildActions: piece=${this.move.piece.type}, from=${algebraic(this.move.from)}, to=${algebraic(this.move.to)}`,
    )
    console.log(
      `[DEBUG] SingleDeployMoveCommand: context.isDeployMode=${this.context?.isDeployMode}, hasSession=${!!this.context?.deploySession}`,
    )

    const us = this.move.color
    const them = swapColor(us)

    // Get carrier piece using effective board (handles virtual state)
    const effectiveBoard = this.game['getEffectiveBoard']()
    let carrierPiece: Piece | null | undefined

    if ('get' in effectiveBoard && typeof effectiveBoard.get === 'function') {
      // VirtualBoard case
      carrierPiece = effectiveBoard.get(algebraic(this.move.from))
    } else {
      // Regular board array case
      carrierPiece = (effectiveBoard as (Piece | undefined)[])[this.move.from]
    }

    // If we're in deploy mode and no piece at the original square,
    // check if we have a deploy session with the original piece
    // ✅ Check game's current deploy session
    const currentDeploySession = this.game.getDeployState()
    if (!carrierPiece && this.context?.isDeployMode && currentDeploySession) {
      if (
        algebraic(currentDeploySession.stackSquare) ===
        algebraic(this.move.from)
      ) {
        // Use the original piece from the deploy session
        carrierPiece = currentDeploySession.originalPiece
      }
    }

    if (!carrierPiece) {
      throw new Error(
        `Build Deploy Error: Carrier missing or empty at ${algebraic(
          this.move.from,
        )}`,
      )
    }

    const flattendMovingPieces = flattenPiece(this.move.piece)

    // Initialize deploy session if this is the first deploy move (only for standalone deploy moves)
    if (!this.context?.deploySession) {
      this.actions.push(
        new InitializeDeploySessionAction(
          this.game,
          algebraic(this.move.from),
          carrierPiece,
          this.context,
        ),
      )
    }

    // Handle stay capture
    if (this.move.flags & BITS.STAY_CAPTURE) {
      const destSq = this.move.to
      const capturedPieceData = this.game.get(destSq)

      if (!capturedPieceData || capturedPieceData.color !== them) {
        throw new Error(
          `Build Deploy Error: Capture destination invalid ${algebraic(
            destSq,
          )}`,
        )
      }

      this.move.captured = capturedPieceData
      this.actions.push(new RemovePieceAction(this.game, destSq, this.context))

      // Update deploy session with stay capture info
      if (this.context) {
        this.actions.push(
          new UpdateDeploySessionAction(
            this.game,
            this.context,
            this.move.piece,
            algebraic(this.move.from),
            algebraic(destSq),
            capturedPieceData,
          ),
        )
      }
    }
    // Handle normal deploy (with or without capture)
    else {
      // Add action to remove the piece from the carrier's stack
      this.actions.push(
        new RemoveFromStackAction(
          this.game,
          this.move.from,
          this.move.piece,
          this.context,
        ),
      )
      const destSq = this.move.to

      // Handle capture if needed
      if (this.move.flags & (BITS.CAPTURE | BITS.SUICIDE_CAPTURE)) {
        const capturedPieceData = this.game.get(destSq)

        if (!capturedPieceData || capturedPieceData.color !== them) {
          throw new Error(
            `Build Deploy Error: Capture destination invalid ${algebraic(
              destSq,
            )}`,
          )
        }

        this.move.captured = capturedPieceData
        this.actions.push(
          new RemovePieceAction(this.game, destSq, this.context),
        )
      }

      // Add action to place the deployed piece
      if ((this.move.flags & BITS.SUICIDE_CAPTURE) === 0) {
        this.actions.push(
          new PlacePieceAction(
            this.game,
            destSq,
            this.move.piece,
            this.context,
          ),
        )
      }

      // Update deploy session with move info
      if (this.context) {
        this.actions.push(
          new UpdateDeploySessionAction(
            this.game,
            this.context,
            this.move.piece,
            algebraic(this.move.from),
            algebraic(destSq),
            this.move.captured,
          ),
        )
      }
    }

    // Note: Deploy session management is now handled by the virtual state system
    // The UpdateDeploySessionAction above handles tracking moved pieces
    // Session completion and turn switching is handled in CoTuLenh._makeMove()
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
    const combinedPiece = createCombinedPiece(movingPieceData, targetPieceData)
    if (!combinedPiece) {
      throw new Error(
        `Failed to create combined piece: ${JSON.stringify(this.move)}`,
      )
    }

    // 1. Remove the moving piece from the 'from' square
    if (!isStackMove(this.move)) {
      this.actions.push(
        new RemovePieceAction(this.game, this.move.from, this.context),
      )
    }

    // 2. Remove the existing piece from the 'to' square (before placing the combined one)
    //    Using PlacePieceAction with the combined piece handles both removal and placement
    //    and ensures correct undo behavior (restoring the original target piece).
    // this.actions.push(new RemovePieceAction(this.game, this.move.to)) // Redundant if PlacePiece handles existing

    // 3. Place the new combined piece on the 'to' square
    this.actions.push(
      new PlacePieceAction(
        this.game,
        this.move.to,
        combinedPiece,
        this.context,
      ),
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
    this.actions.push(new RemovePieceAction(this.game, targetSq, this.context))
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

    if (!isStackMove(this.move)) {
      this.actions.push(
        new RemovePieceAction(this.game, this.move.from, this.context),
      )
    }
    this.actions.push(new RemovePieceAction(this.game, targetSq, this.context))
  }
}

// Factory function to create the appropriate command
export function createMoveCommand(
  game: CoTuLenh,
  move: InternalMove,
  context?: MoveContext,
): CTLMoveCommand {
  // Check flags in order of precedence (if applicable)
  if (move.flags & BITS.DEPLOY) {
    return new SingleDeployMoveCommand(game, move, context)
  } else if (move.flags & BITS.SUICIDE_CAPTURE) {
    return new SuicideCaptureMoveCommand(game, move, context)
  } else if (move.flags & BITS.STAY_CAPTURE) {
    return new StayCaptureMoveCommand(game, move, context)
  } else if (move.flags & BITS.COMBINATION) {
    // Add combination check
    return new CombinationMoveCommand(game, move, context)
  } else if (move.flags & BITS.CAPTURE) {
    return new CaptureMoveCommand(game, move, context)
  } else {
    // Default to NormalMove if no other specific flags are set
    return new NormalMoveCommand(game, move, context)
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
/**
 * Abstract base class for commands that handle sequences of moves.
 * Provides common functionality for executing and undoing sequences.
 */
export abstract class SequenceMoveCommand implements CTLMoveCommandInteface {
  public readonly move: InternalDeployMove
  protected commands: (CTLMoveCommand | CTLAtomicMoveAction)[] = []

  constructor(
    protected game: CoTuLenh,
    protected moveData: InternalDeployMove,
  ) {
    this.move = moveData
    this.buildActions()
  }

  protected buildActions(): void {}

  execute(): void {
    // Then execute each move command in sequence
    for (const command of this.commands) {
      command.execute()
    }
  }

  undo(): void {
    // First undo moves in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo()
    }
  }
}

/**
 * Handles the entire sequence of moves in a deploy move.
 */
export class DeployMoveCommand extends SequenceMoveCommand {
  constructor(
    protected game: CoTuLenh,
    protected moveData: InternalDeployMove,
    protected context?: MoveContext,
  ) {
    super(game, moveData)
  }

  protected buildActions(): void {
    // For InternalDeployMove, create individual move commands but ensure they complete the deployment
    this.commands = this.moveData.moves.map((move, index) => {
      // Mark the last move as completing the deployment
      const isLastMove = index === this.moveData.moves.length - 1
      const deployContext: MoveContext = {
        ...this.context,
        isDeployMode: true,
        deploySession: this.game.getDeployState() || undefined,
        isCompleteDeployment: isLastMove,
      }
      return createMoveCommand(this.game, move, deployContext)
    })
  }

  execute(): void {
    // Execute all the individual moves
    super.execute()

    // Skip session commit if in testing mode or preventCommit flag is set
    if (this.context?.isTesting || this.context?.preventCommit) {
      return
    }

    // After executing all moves, force completion of the deploy session
    const deploySession = this.game.getDeployState()
    if (deploySession) {
      // Mark all pieces as moved to complete the session
      const originalPieces = flattenPiece(deploySession.originalPiece)
      const totalMoved = this.moveData.moves.reduce(
        (acc, move) => acc + flattenPiece(move.piece).length,
        0,
      )
      const totalStaying = this.moveData.stay
        ? flattenPiece(this.moveData.stay).length
        : 0

      // If all pieces are accounted for, commit the session
      if (totalMoved + totalStaying >= originalPieces.length) {
        this.game.commitDeploySession(deploySession)
      }
    }
  }
}

/**
 * Creates a DeployMoveCommand for handling sequences of deploy moves
 */
export function createDeployMoveCommand(
  game: CoTuLenh,
  move: InternalDeployMove,
): DeployMoveCommand {
  return new DeployMoveCommand(game, move)
}

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
  const { combined, uncombined } = createCombineStackFromPieces(movingPiece)
  if (!combined || (uncombined && uncombined.length > 0)) {
    throw new Error(`Not enough pieces to move at ${algebraic(move.from)}`)
  }
  return combined
}

const isStackMove = (move: InternalMove): boolean => {
  return !!(move.flags & BITS.DEPLOY)
}
