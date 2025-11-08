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
} from './type.js'
import { combinePieces, flattenPiece, removePieceFromStack } from './utils.js'

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
class PlacePieceAction implements CTLAtomicMoveAction {
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
class RemoveFromStackAction implements CTLAtomicMoveAction {
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
    this.originalCarrier = {
      ...carrier,
      carrying: carrier.carrying ? [...carrier.carrying] : undefined,
    }

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

// SetDeployStateAction removed - deploy state tracking now handled by DeploySession

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
      this.actions.push(new RemovePieceAction(this.game, this.move.from))
    }
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
    if (!isStackMove(this.move)) {
      this.actions.push(new RemovePieceAction(this.game, this.move.from))
    }
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, pieceThatMoved),
    )
  }
}

export class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)

    // During active deploy session, get carrier from session's remaining pieces
    // Otherwise get from board (for batch deploy moves)
    const deploySession = this.game.getDeploySession()
    let carrierPiece: Piece | null = null

    if (deploySession && deploySession.stackSquare === this.move.from) {
      // Active deploy session - use remaining pieces from session
      carrierPiece = deploySession.getRemainingPieces()
    } else {
      // No active session or different square - use board state
      carrierPiece = this.game.get(this.move.from) || null
    }

    if (!carrierPiece) {
      throw new Error(
        `Build Deploy Error: Carrier missing or empty at ${algebraic(
          this.move.from,
        )}`,
      )
    }

    const flattendMovingPieces = flattenPiece(this.move.piece)
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
      this.actions.push(new RemovePieceAction(this.game, destSq))
    }
    // Handle normal deploy (with or without capture)
    else {
      // Add action to remove the piece from the carrier's stack
      this.actions.push(
        new RemoveFromStackAction(this.game, this.move.from, this.move.piece),
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
        this.actions.push(new RemovePieceAction(this.game, destSq))
      }

      // Add action to place the deployed piece
      if ((this.move.flags & BITS.SUICIDE_CAPTURE) === 0) {
        // Check if this is a recombine move (deploy + combination)
        if (this.move.flags & BITS.COMBINATION) {
          const targetPiece = this.game.get(destSq)
          if (targetPiece) {
            // Combine the moving piece with the target piece
            const combinedPiece = combinePieces([this.move.piece, targetPiece])
            if (!combinedPiece) {
              throw new Error(
                `Failed to create combined piece during recombine: ${JSON.stringify(this.move)}`,
              )
            }
            this.actions.push(
              new PlacePieceAction(this.game, destSq, combinedPiece),
            )
          } else {
            // No target piece - just place the moving piece
            this.actions.push(
              new PlacePieceAction(this.game, destSq, this.move.piece),
            )
          }
        } else {
          // Normal deploy - just place the piece
          this.actions.push(
            new PlacePieceAction(this.game, destSq, this.move.piece),
          )
        }
      }
    }

    // Deploy state tracking is now handled by DeploySession
    // No need for SetDeployStateAction - session tracks all commands
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

    // 1. Remove the moving piece from the 'from' square
    if (!isStackMove(this.move)) {
      this.actions.push(new RemovePieceAction(this.game, this.move.from))
    }

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

    if (!isStackMove(this.move)) {
      this.actions.push(new RemovePieceAction(this.game, this.move.from))
    }
    this.actions.push(new RemovePieceAction(this.game, targetSq))
  }
}

// Factory function to create the appropriate command
export function createMoveCommand(
  game: CoTuLenh,
  move: InternalMove,
): CTLMoveCommand {
  // Check flags in order of precedence (if applicable)
  if (move.flags & BITS.DEPLOY) {
    return new SingleDeployMoveCommand(game, move)
  } else if (move.flags & BITS.SUICIDE_CAPTURE) {
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
    skipBuild: boolean = false,
  ) {
    this.move = moveData
    if (!skipBuild) {
      this.buildActions()
    }
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
 * Can be used for:
 * - Batch execution (execute all moves at once)
 * - Wrapping already-executed moves from a session (for history/undo only)
 */
export class DeployMoveCommand extends SequenceMoveCommand {
  constructor(
    protected game: CoTuLenh,
    protected moveData: InternalDeployMove,
    providedCommands?: CTLMoveCommandInteface[],
  ) {
    // Skip buildActions if we have provided commands
    super(game, moveData, !!providedCommands)
    // Set commands if provided
    if (providedCommands) {
      this.commands = providedCommands
    }
  }

  protected buildActions(): void {
    // Build from scratch (for backward compatibility or batch moves)
    // Deploy state tracking is now handled by DeploySession
    this.commands = this.moveData.moves.map((move) =>
      createMoveCommand(this.game, move),
    )
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
  const combined = combinePieces(movingPiece)
  if (!combined) {
    throw new Error(`Not enough pieces to move at ${algebraic(move.from)}`)
  }
  return combined
}

const isStackMove = (move: InternalMove): boolean => {
  return !!(move.flags & BITS.DEPLOY)
}
