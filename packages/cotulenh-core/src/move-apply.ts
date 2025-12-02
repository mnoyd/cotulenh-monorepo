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
import { combinePieces, flattenPiece, removePieceFromStack } from './utils.js'

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

    // Validate that the piece to remove is actually in the stack
    const carrierPieces = flattenPiece(carrier)
    const piecesToRemove = flattenPiece(this.piece)

    // We need to match by type and count
    const carrierCounts = new Map<string, number>()
    for (const p of carrierPieces) {
      carrierCounts.set(p.type, (carrierCounts.get(p.type) || 0) + 1)
    }

    for (const p of piecesToRemove) {
      const count = carrierCounts.get(p.type) || 0
      if (count <= 0) {
        throw new Error(
          `Piece ${p.type} not found in stack at ${algebraic(this.carrierSquare)}`,
        )
      }
      carrierCounts.set(p.type, count - 1)
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

/**
 * Updates game state (turn, halfMoves, moveNumber) after a move.
 * This action encapsulates state changes so they can be executed/undone atomically.
 */
class StateUpdateAction implements CTLAtomicMoveAction {
  private oldTurn: Color
  private oldHalfMoves: number
  private oldMoveNumber: number

  constructor(
    private game: CoTuLenh,
    private move: InternalMove,
  ) {
    // Capture current state before execution
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
  }

  undo(): void {
    // Restore previous state
    this.game['_turn'] = this.oldTurn
    this.game['_halfMoves'] = this.oldHalfMoves
    this.game['_moveNumber'] = this.oldMoveNumber
    this.game['_movesCache'].clear()
  }
}

// SetDeployStateAction removed - deploy state tracking now handled by DeploySession

export interface CTLMoveCommandInteface extends CTLAtomicMoveAction {
  move: InternalMove
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
      // If remaining pieces are empty, it means we are moving the last piece(s).
      // But we need a "carrier" to remove from.
      // In the new design, we don't really need a "carrier" object to remove from,
      // we just need to know that the pieces we are moving ARE available.
      // However, RemoveFromStackAction expects a carrier on the board.

      // Wait, RemoveFromStackAction calls game.get(carrierSquare).
      // So it gets the CURRENT state of the stack on the board.
      // SingleDeployMoveCommand doesn't need to pass the carrier to the action.
      // It just needs to verify validity?

      // The error "Carrier missing or empty" comes from the check `if (!carrierPiece)`.
      // This check seems to be trying to validate that the move is possible.

      // If we are in a deploy session, the board state is updated incrementally.
      // So game.get(this.move.from) should return the current stack.
      carrierPiece = this.game.get(this.move.from) || null
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
            // Important: combinePieces expects flattened pieces if we want to merge stacks
            const piecesToCombine = [
              ...flattenPiece(targetPiece),
              ...flattenPiece(this.move.piece),
            ]
            const combinedPiece = combinePieces(piecesToCombine)
            if (!combinedPiece) {
              // console.log('Failed to combine pieces:', JSON.stringify(piecesToCombine, null, 2))
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

/**
 * Represents a sequence of moves that make up a full deployment
 * Used for history management to treat the entire sequence as one atomic operation
 */
export class DeployMoveSequenceCommand implements CTLMoveCommandInteface {
  public readonly move: InternalMove
  private commands: CTLAtomicMoveAction[] = []

  private constructor(
    firstMove: InternalMove,
    commands: CTLAtomicMoveAction[],
  ) {
    this.move = firstMove
    this.commands = commands
  }

  static create(commands: CTLAtomicMoveAction[], firstMove: InternalMove) {
    return new DeployMoveSequenceCommand(firstMove, commands)
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
