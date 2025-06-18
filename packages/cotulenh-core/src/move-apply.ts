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
} from './type.js'
import {
  createCombinedPiece,
  createCombineStackFromPieces,
  flattenPiece,
  haveCommander,
} from './utils.js'

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
    const piece = game.get(this.square)
    if (piece) {
      this.removedPiece = { ...piece }
      game.remove(algebraic(this.square))
    }
  }

  undo(game: CoTuLenh): void {
    if (this.removedPiece) {
      const result = game.put(this.removedPiece, algebraic(this.square))
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
class PlacePieceAction implements AtomicMoveAction {
  private existingPiece?: Piece

  constructor(
    private square: number,
    private piece: Piece,
  ) {}

  execute(game: CoTuLenh): void {
    const piece = game.get(this.square)
    if (piece) {
      this.existingPiece = { ...piece }
    }
    const result = game.put(this.piece, algebraic(this.square))
    if (!result) {
      throw new Error(
        'Place piece fail:' +
          JSON.stringify(this.piece) +
          algebraic(this.square),
      )
    }
  }

  undo(game: CoTuLenh): void {
    if (this.existingPiece) {
      const result = game.put(this.existingPiece, algebraic(this.square))
      if (!result) {
        throw new Error(
          'Place piece fail:' +
            JSON.stringify(this.piece) +
            algebraic(this.square),
        )
      }
    } else {
      game.remove(algebraic(this.square))
    }
  }
}

/**
 * Removes a piece from a carrier's stack
 */
class RemoveFromStackAction implements AtomicMoveAction {
  private removedPiece: Piece[] | null = null

  constructor(
    private carrierSquare: number,
    private piece: Piece,
  ) {}

  execute(game: CoTuLenh): void {
    const carrier = game.get(this.carrierSquare)
    if (!carrier) {
      throw new Error(
        `No carrier or carrying pieces at ${algebraic(this.carrierSquare)}`,
      )
    }
    const movingPiece = flattenPiece(this.piece)

    this.removedPiece = [...movingPiece] //set the value of moving piece here.
    const allPieces = flattenPiece(carrier)
    const remainingPiece = allPieces.filter(
      (p) => !movingPiece.some((p2) => p2.type === p.type),
    )

    if (remainingPiece.length + movingPiece.length !== allPieces.length) {
      throw new Error(
        `Request moving piece ${algebraic(this.carrierSquare)} not found in the stack`,
      )
    }
    if (remainingPiece.length === 0) {
      game.remove(algebraic(this.carrierSquare))
      return
    }
    const { combined: combinedPiece, uncombined } =
      createCombineStackFromPieces(remainingPiece)
    if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
      throw new Error(
        `Failed to remove piece from stack at ${algebraic(this.carrierSquare)}`,
      )
    }

    const result = game.put(combinedPiece, algebraic(this.carrierSquare))
    if (!result) {
      throw new Error(
        'Place piece fail:' +
          JSON.stringify(combinedPiece) +
          algebraic(this.carrierSquare),
      )
    }
    if (movingPiece.some((p) => p.type === COMMANDER)) {
      game['_commanders'][this.piece.color] = -1
    }
  }

  undo(game: CoTuLenh): void {
    if (!this.removedPiece) return

    const carrier = game.get(this.carrierSquare)

    const allPieces = carrier ? flattenPiece(carrier) : []
    const { combined: combinedPiece, uncombined } =
      createCombineStackFromPieces([...allPieces, ...this.removedPiece])
    if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
      throw new Error(
        `Failed to remove piece from stack at ${algebraic(this.carrierSquare)}`,
      )
    }
    const result = game.put(combinedPiece, algebraic(this.carrierSquare))
    if (!result) {
      throw new Error(
        'Place piece fail:' +
          JSON.stringify(combinedPiece) +
          algebraic(this.carrierSquare),
      )
    }
  }
}

/**
 * Updates the king position
 */
class UpdateCommanderPositionAction implements AtomicMoveAction {
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
    game.updateCommandersPosition(this.newPosition, this.color)
  }

  undo(game: CoTuLenh): void {
    game.updateCommandersPosition(this.oldPosition, this.color)
  }
}

/**
 * Sets the deploy state
 */
class SetDeployStateAction implements AtomicMoveAction {
  private oldDeployState: DeployState | null = null

  constructor(private newDeployState: Partial<DeployState> | null) {
    // Don't capture oldDeployState here, we'll do it in execute()
  }

  execute(game: CoTuLenh): void {
    // Capture the current deploy state at execution time, not construction time
    this.oldDeployState = game.getDeployState()
    if (this.newDeployState === null) {
      game.setDeployState(null)
      return
    }
    if (this.oldDeployState) {
      const updatedMovedPiece = [
        ...this.oldDeployState.movedPieces,
        ...(this.newDeployState.movedPieces ?? []),
      ]
      const originalLen = flattenPiece(this.oldDeployState.originalPiece).length
      if (
        updatedMovedPiece.length + (this.oldDeployState.stay?.length ?? 0) ===
        originalLen
      ) {
        game.setDeployState(null)
        game['_turn'] = swapColor(this.oldDeployState.turn)
        return
      }

      game.setDeployState({
        stackSquare: this.oldDeployState.stackSquare,
        turn: this.oldDeployState.turn,
        originalPiece: this.oldDeployState.originalPiece,
        movedPieces: updatedMovedPiece,
        stay: this.oldDeployState.stay,
      })
    } else {
      game.setDeployState(this.newDeployState as DeployState)
    }
  }

  undo(game: CoTuLenh): void {
    game.setDeployState(this.oldDeployState)
    if (this.oldDeployState) {
      game['_turn'] = this.oldDeployState.turn
    }
  }
}

export interface MoveCommandInteface {
  move: InternalMove | InternalDeployMove
  execute(): void
  undo(): void
}

/**
 * Abstract base class for all move commands.
 * Each command knows how to execute and undo itself.
 */
export abstract class MoveCommand implements MoveCommandInteface {
  public readonly move: InternalMove
  protected actions: AtomicMoveAction[] = []

  constructor(
    protected game: CoTuLenh,
    moveData: InternalMove,
  ) {
    // Store a mutable copy for potential updates (like setting 'captured' flag)
    this.move = { ...moveData }
    this.buildActions()
    const defaultPostMoveActions = [
      new CheckAndPromoteAttackersAction(this.move),
    ]
    this.actions.push(...defaultPostMoveActions)
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
    const pieceThatMoved = this.game.get(this.move.from)

    if (!pieceThatMoved) {
      throw new Error(
        `Build NormalMove Error: Piece missing from source ${algebraic(
          this.move.from,
        )}`,
      )
    }

    // Add actions for the normal move
    this.actions.push(new RemovePieceAction(this.move.from))
    this.actions.push(new PlacePieceAction(this.move.to, pieceThatMoved))

    // Update king position if needed
    if (
      pieceThatMoved.type === COMMANDER ||
      (pieceThatMoved.carrying?.some((p) => p.type === COMMANDER) ?? false)
    ) {
      this.actions.push(
        new UpdateCommanderPositionAction(us, this.move.to, this.game),
      )
    }
  }
}

export class CaptureMoveCommand extends MoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const pieceThatMoved = this.game.get(this.move.from)

    if (!pieceThatMoved) {
      throw new Error(
        `Build CaptureMove Error: Piece missing from source ${algebraic(
          this.move.from,
        )}`,
      )
    }

    const capturedPieceData = this.game.get(this.move.to)
    if (!capturedPieceData || capturedPieceData.color !== them) {
      throw new Error(
        `Build CaptureMove Error: Capture target invalid ${algebraic(
          this.move.to,
        )}`,
      )
    }

    // Add actions for the capture move
    this.actions.push(new RemovePieceAction(this.move.from))
    this.actions.push(new RemovePieceAction(this.move.to))
    this.actions.push(new PlacePieceAction(this.move.to, pieceThatMoved))

    // Update king position if needed
    if (
      pieceThatMoved.type === COMMANDER ||
      (pieceThatMoved.carrying?.some((p) => p.type === COMMANDER) ?? false)
    ) {
      this.actions.push(
        new UpdateCommanderPositionAction(us, this.move.to, this.game),
      )
    }
  }
}

export class SingleDeployMoveCommand extends MoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const carrierPiece = this.game.get(this.move.from)

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
      this.actions.push(new RemovePieceAction(destSq))
    }
    // Handle normal deploy (with or without capture)
    else {
      // Add action to remove the piece from the carrier's stack
      this.actions.push(
        new RemoveFromStackAction(this.move.from, this.move.piece),
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
        this.actions.push(new RemovePieceAction(destSq))
      }

      // Add action to place the deployed piece
      if ((this.move.flags & BITS.SUICIDE_CAPTURE) === 0) {
        this.actions.push(new PlacePieceAction(destSq, this.move.piece))
      }

      const haveCommander = flattendMovingPieces.some(
        (p) => p.type === COMMANDER,
      )

      // Update king position if needed
      if (haveCommander) {
        this.actions.push(
          new UpdateCommanderPositionAction(us, destSq, this.game),
        )
      }
    }

    // Set deploy state for next move
    this.actions.push(
      new SetDeployStateAction({
        stackSquare: this.move.from,
        turn: us,
        originalPiece: carrierPiece,
        movedPieces: flattendMovingPieces,
      }),
    )
  }
}

/**
 * Command for combining two friendly pieces.
 */
class CombinationMoveCommand extends MoveCommand {
  protected buildActions(): void {
    const movingPieceData = this.game.get(this.move.from)
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
    this.actions.push(new RemovePieceAction(this.move.from))

    // 2. Remove the existing piece from the 'to' square (before placing the combined one)
    //    Using PlacePieceAction with the combined piece handles both removal and placement
    //    and ensures correct undo behavior (restoring the original target piece).
    // this.actions.push(new RemovePieceAction(this.move.to)) // Redundant if PlacePiece handles existing

    // 3. Place the new combined piece on the 'to' square
    this.actions.push(new PlacePieceAction(this.move.to, combinedPiece))

    // Handle commander position update if the *moving* piece was a commander
    if (
      movingPieceData.type === COMMANDER ||
      (movingPieceData.carrying?.some((p) => p.type === COMMANDER) ?? false)
    ) {
      this.actions.push(
        new UpdateCommanderPositionAction(
          this.move.color,
          this.move.to,
          this.game,
        ),
      )
    }
  }
}

export class StayCaptureMoveCommand extends MoveCommand {
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

    this.move.captured = capturedPiece

    // Only action is to remove the captured piece
    this.actions.push(new RemovePieceAction(targetSq))
  }
}

/**
 * Command for suicide capture moves where both the attacking piece and target are destroyed.
 * For deploy moves, only the deployed air force piece (and its carrying pieces) are destroyed,
 * while the remainder stays on the original square.
 */
export class SuicideCaptureMoveCommand extends MoveCommand {
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

    this.move.captured = capturedPiece

    this.actions.push(new RemovePieceAction(targetSq))
    this.actions.push(new RemovePieceAction(this.move.from))
  }
}

// Factory function to create the appropriate command
export function createMoveCommand(
  game: CoTuLenh,
  move: InternalMove,
): MoveCommand {
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
class SetHeroicAction implements AtomicMoveAction {
  private wasHeroic?: boolean

  constructor(
    private square: number,
    private type: PieceSymbol,
    private setHeroic: boolean = true,
  ) {}

  execute(game: CoTuLenh): void {
    // Get the piece we want to modify (could be direct or nested)
    const piece = game.get(this.square, this.type)
    if (!piece) return

    // Store original heroic state for undo
    this.wasHeroic = piece.heroic

    // Use the setHeroicStatus method to update the heroic status
    game.setHeroicStatus(this.square, this.type, this.setHeroic)
  }

  undo(game: CoTuLenh): void {
    // Only undo if we have a valid previous state
    // Use the setHeroicStatus method to restore the original heroic status
    game.setHeroicStatus(this.square, this.type, this.wasHeroic ?? false)
  }
}

/**
 * Checks if the opponent's commander is attacked after a move
 * and promotes the attacking pieces to heroic.
 */
class CheckAndPromoteAttackersAction implements AtomicMoveAction {
  private heroicActions: SetHeroicAction[] = []
  private moveColor: Color

  constructor(move: InternalMove) {
    this.moveColor = move.color
  }

  execute(game: CoTuLenh): void {
    this.heroicActions = [] // Clear previous actions if re-executed
    const us = this.moveColor
    const them = swapColor(us)
    const themCommanderSq = game.getCommanderSquare(them)

    if (themCommanderSq === -1) return // No commander to check

    // Check if the commander is attacked by 'us' AFTER the move's primary actions
    const attackers = game.getAttackers(themCommanderSq, us)

    // Skip if no attackers found
    if (attackers.length === 0) return

    // Track which squares we've already processed to avoid duplicate promotions
    // This is useful when multiple pieces of different types at the same square attack
    const processedAttackers = new Set<string>()

    for (const { square, type } of attackers) {
      // Create a unique key for this attacker to avoid duplicates
      const attackerKey = `${square}:${type}`

      // Skip if we've already processed this exact attacker
      if (processedAttackers.has(attackerKey)) continue

      // Mark this attacker as processed
      processedAttackers.add(attackerKey)

      // Check if the piece is already heroic
      const isHeroic = game.getHeroicStatus(square, type)

      // Promote only if the attacker exists and is not already heroic
      if (!isHeroic) {
        // Create a SetHeroicAction with the new constructor signature that includes setHeroic parameter
        const promoteAction = new SetHeroicAction(square, type, true)
        // Store it so we can undo it later
        this.heroicActions.push(promoteAction)
        // Execute the promotion after storing
        promoteAction.execute(game)
      }
    }
  }

  undo(game: CoTuLenh): void {
    // Undo the promotions in reverse order
    for (let i = this.heroicActions.length - 1; i >= 0; i--) {
      this.heroicActions[i].undo(game)
    }
    this.heroicActions = [] // Clear actions after undoing
  }
}
/**
 * Abstract base class for commands that handle sequences of moves.
 * Provides common functionality for executing and undoing sequences.
 */
export abstract class SequenceMoveCommand implements MoveCommandInteface {
  public readonly move: InternalDeployMove
  protected moveCommands: MoveCommand[] = []
  protected atomicActions: AtomicMoveAction[] = []

  constructor(
    protected game: CoTuLenh,
    protected moveData: InternalDeployMove,
  ) {
    this.move = moveData
    this.buildActions()
  }

  /**
   * Creates the sequence of move commands to be executed
   */
  protected abstract createMoveSequence(): MoveCommand[]

  /**
   * Creates atomic actions to be executed before the move sequence
   * Override this method to add custom atomic actions
   */
  protected createAtomicActions(): AtomicMoveAction[] {
    return []
  }

  protected buildActions(): void {
    // Create atomic actions to be executed before the move sequence
    this.atomicActions = this.createAtomicActions()

    // Create the sequence of move commands
    this.moveCommands = this.createMoveSequence()
    // We don't add the commands directly to the actions array
    // Instead, we'll handle them in execute() and undo()
  }

  execute(): void {
    // First execute any atomic actions
    for (const action of this.atomicActions) {
      action.execute(this.game)
    }

    // Then execute each move command in sequence
    for (const command of this.moveCommands) {
      command.execute()
    }
  }

  undo(): void {
    // First undo moves in reverse order
    for (let i = this.moveCommands.length - 1; i >= 0; i--) {
      this.moveCommands[i].undo()
    }

    // Then undo atomic actions in reverse order
    for (let i = this.atomicActions.length - 1; i >= 0; i--) {
      this.atomicActions[i].undo(this.game)
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
  ) {
    super(game, moveData)
  }

  protected createAtomicActions(): AtomicMoveAction[] {
    // Add a SetDeployStateAction to be executed before the move sequence
    return [
      new SetDeployStateAction({
        stackSquare: this.moveData.from,
        turn: this.game['_turn'],
        originalPiece: this.game.get(this.moveData.from) || undefined,
        movedPieces: [],
        stay: this.moveData.stay ? flattenPiece(this.moveData.stay) : [],
      }),
    ]
  }

  protected createMoveSequence(): MoveCommand[] {
    // Create individual MoveCommand for each move in the sequence
    return this.moveData.moves.map((move) => createMoveCommand(this.game, move))
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
