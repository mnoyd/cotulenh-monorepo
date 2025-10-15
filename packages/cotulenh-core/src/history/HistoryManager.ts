/**
 * History management for undo/redo
 *
 * Stores complete game state snapshots for each move.
 * Allows undo/redo functionality.
 */

import type { IGameState } from '../types/GameState'
import type { Move } from '../types/Move'
import { GameState } from '../core/GameState'

/**
 * History entry - stores state before and after a move
 */
export interface HistoryEntry {
  /** State before the move */
  stateBefore: IGameState

  /** The move that was made */
  move: Move

  /** State after the move */
  stateAfter: IGameState
}

/**
 * History manager - tracks game history for undo/redo
 */
export class HistoryManager {
  private history: HistoryEntry[]
  private currentIndex: number

  constructor() {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * Push a new move onto the history
   */
  push(stateBefore: IGameState, move: Move, stateAfter: IGameState): void {
    // If we're not at the end, remove all future history
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    this.history.push({
      stateBefore: stateBefore.clone(),
      move,
      stateAfter: stateAfter.clone(),
    })

    this.currentIndex++
  }

  /**
   * Undo the last move
   * @returns State before the move, or null if no history
   */
  undo(): IGameState | null {
    if (this.currentIndex < 0) {
      return null
    }

    const entry = this.history[this.currentIndex]
    this.currentIndex--

    return entry.stateBefore.clone()
  }

  /**
   * Redo the next move
   * @returns State after the move, or null if no future history
   */
  redo(): IGameState | null {
    if (this.currentIndex >= this.history.length - 1) {
      return null
    }

    this.currentIndex++
    const entry = this.history[this.currentIndex]

    return entry.stateAfter.clone()
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * Get the current state
   */
  getCurrentState(): IGameState | null {
    if (this.currentIndex < 0) {
      return null
    }

    return this.history[this.currentIndex].stateAfter.clone()
  }

  /**
   * Get all moves in history
   */
  getMoves(): Move[] {
    return this.history
      .slice(0, this.currentIndex + 1)
      .map((entry) => entry.move)
  }

  /**
   * Get move at specific index
   */
  getMove(index: number): Move | null {
    if (index < 0 || index >= this.history.length) {
      return null
    }

    return this.history[index].move
  }

  /**
   * Get history length (number of moves made)
   */
  length(): number {
    return this.currentIndex + 1
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * Get a specific historical state
   */
  getStateAt(index: number): IGameState | null {
    if (index < 0 || index >= this.history.length) {
      return null
    }

    return this.history[index].stateAfter.clone()
  }

  /**
   * Jump to a specific point in history
   */
  jumpTo(index: number): IGameState | null {
    if (index < -1 || index >= this.history.length) {
      return null
    }

    this.currentIndex = index

    if (index === -1) {
      // Jump to initial state
      return this.history[0]?.stateBefore.clone() || null
    }

    return this.history[index].stateAfter.clone()
  }
}
