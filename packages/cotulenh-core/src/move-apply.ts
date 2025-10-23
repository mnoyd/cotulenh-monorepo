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
} from './utils.js'
import { DeploySession } from './deploy-session.js'

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
      const result = this.game.put(this.existingPiece, algebraic(this.square))
      if (!result) {
        throw new Error(
          'Place piece fail:' +
            JSON.stringify(this.piece) +
            algebraic(this.square),
        )
      }
    } else {
      this.game.remove(algebraic(this.square))
    }
  }
}

/**
 * Removes a piece from a carrier's stack
 */
class RemoveFromStackAction implements CTLAtomicMoveAction {
  private removedPiece: Piece[] | null = null
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
    const movingPiece = flattenPiece(this.piece)
    this.removedPiece = [...movingPiece]
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
      this.game.remove(algebraic(this.carrierSquare))
      return
    }
    const { combined: combinedPiece, uncombined } =
      createCombineStackFromPieces(remainingPiece)
    if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
      throw new Error(
        `Failed to remove piece from stack at ${algebraic(this.carrierSquare)}`,
      )
    }
    const result = this.game.put(combinedPiece, algebraic(this.carrierSquare))
    if (!result) {
      throw new Error(
        'Place piece fail:' +
          JSON.stringify(combinedPiece) +
          algebraic(this.carrierSquare),
      )
    }
    if (movingPiece.some((p) => p.type === COMMANDER)) {
      this.game['_commanders'][this.piece.color] = -1
    }
  }

  undo(): void {
    if (!this.removedPiece) return
    const carrier = this.game.get(this.carrierSquare)
    const allPieces = carrier ? flattenPiece(carrier) : []
    const { combined: combinedPiece, uncombined } =
      createCombineStackFromPieces([...allPieces, ...this.removedPiece])
    if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
      throw new Error(
        `Failed to remove piece from stack at ${algebraic(this.carrierSquare)}`,
      )
    }
    const result = this.game.put(combinedPiece, algebraic(this.carrierSquare))
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
 * Sets the deploy state
 */
class SetDeployStateAction implements CTLAtomicMoveAction {
  private oldDeployState: DeployState | null = null
  constructor(
    protected game: CoTuLenh,
    private newDeployState: Partial<DeployState> | null,
  ) {
    // Don't capture oldDeployState here, we'll do it in execute()
  }

  execute(): void {
    // Capture the current deploy state at execution time, not construction time
    this.oldDeployState = this.game.getDeployState()
    if (this.newDeployState === null) {
      this.game.setDeployState(null)
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
        this.game.setDeployState(null)
        this.game['_turn'] = swapColor(this.oldDeployState.turn)
        return
      }
      this.game.setDeployState({
        stackSquare: this.oldDeployState.stackSquare,
        turn: this.oldDeployState.turn,
        originalPiece: this.oldDeployState.originalPiece,
        movedPieces: updatedMovedPiece,
        stay: this.oldDeployState.stay,
      })
    } else {
      this.game.setDeployState(this.newDeployState as DeployState)
    }
  }

  undo(): void {
    this.game.setDeployState(this.oldDeployState)
    if (this.oldDeployState) {
      this.game['_turn'] = this.oldDeployState.turn
    }
  }
}

/**
 * Sets the deploy session (new action-based approach)
 * Much simpler than SetDeployStateAction - just manages session reference
 */
class SetDeploySessionAction implements CTLAtomicMoveAction {
  private oldSession: DeploySession | null = null
  private turnSwitched: boolean = false

  constructor(
    protected game: CoTuLenh,
    private newSession: DeploySession | null,
  ) {}

  execute(): void {
    // Capture current session
    this.oldSession = this.game.getDeploySession()

    // Set new session
    this.game.setDeploySession(this.newSession)

    // Auto-complete if all pieces deployed
    if (this.newSession && this.newSession.isComplete()) {
      this.game.setDeploySession(null)
      this.game['_turn'] = swapColor(this.newSession.turn)
      this.turnSwitched = true
    }
    // If explicitly clearing session (batch deploy complete)
    else if (!this.newSession && this.oldSession) {
      this.game['_turn'] = swapColor(this.oldSession.turn)
      this.turnSwitched = true
    }
  }

  undo(): void {
    // Restore old session
    this.game.setDeploySession(this.oldSession)

    // Restore turn if we switched it
    if (this.turnSwitched && this.oldSession) {
      this.game['_turn'] = this.oldSession.turn
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
        this.actions.push(
          new PlacePieceAction(this.game, destSq, this.move.piece),
        )
      }
    }

    // Update or create deploy session
    const currentSession = this.game.getDeploySession()

    if (currentSession && currentSession.stackSquare === this.move.from) {
      // Create updated session with new move added
      const updatedSession = new DeploySession({
        stackSquare: currentSession.stackSquare,
        turn: currentSession.turn,
        originalPiece: currentSession.originalPiece,
        startFEN: currentSession.startFEN,
        actions: [...currentSession.actions, this.move],
        stayPieces: currentSession.stayPieces,
      })
      this.actions.push(new SetDeploySessionAction(this.game, updatedSession))
    } else {
      // Create new session
      const newSession = new DeploySession({
        stackSquare: this.move.from,
        turn: us,
        originalPiece: carrierPiece,
        startFEN: this.game.fen(),
        actions: [this.move],
      })
      this.actions.push(new SetDeploySessionAction(this.game, newSession))
    }
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
  ) {
    super(game, moveData)
  }

  protected buildActions(): void {
    // For batch deploy moves, we execute all moves then clear the session
    // Each individual move will update the session incrementally

    // Execute each individual move (they will create/update session)
    this.commands = this.moveData.moves.map((move) =>
      createMoveCommand(this.game, move),
    )

    // After all moves, clear the session (deployment complete)
    this.commands.push(new SetDeploySessionAction(this.game, null))
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
