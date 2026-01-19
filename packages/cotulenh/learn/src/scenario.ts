import type { Square } from '@cotulenh/core';
import type { ScenarioBlueprint, BoardShape } from './types';

/**
 * Normalized step with guaranteed structure
 */
interface NormalizedStep {
  move: string;
  shapes: BoardShape[];
}

/**
 * Options for creating a Scenario
 */
export interface ScenarioOptions {
  /** Callback when shapes should be displayed */
  onShapes?: (shapes: BoardShape[]) => void;
  /** Delay in ms before opponent moves (default: 500) */
  opponentDelay?: number;
}

/**
 * Scenario - Manages scripted sequences of moves for interactive lessons.
 *
 * A scenario defines a sequence of alternating player/opponent moves:
 * - Even indices (0, 2, 4, ...): Player moves
 * - Odd indices (1, 3, 5, ...): Opponent moves
 *
 * The scenario validates player moves and automatically plays opponent responses.
 */
export class Scenario {
  readonly #steps: NormalizedStep[];
  readonly #options: Required<ScenarioOptions>;

  #currentIndex = 0;
  #isFailed = false;

  constructor(blueprint: ScenarioBlueprint, options: ScenarioOptions = {}) {
    this.#steps = this.#normalize(blueprint);
    this.#options = {
      onShapes: options.onShapes ?? (() => {}),
      opponentDelay: options.opponentDelay ?? 500
    };
  }

  /**
   * Normalize blueprint steps to consistent structure
   */
  #normalize(blueprint: ScenarioBlueprint): NormalizedStep[] {
    return blueprint.map((step) => {
      if (typeof step === 'string') {
        return { move: step, shapes: [] };
      }
      return {
        move: step.move,
        shapes: step.shapes ?? []
      };
    });
  }

  /**
   * Parse a UCI move string to from/to squares
   */
  static parseUci(uci: string): { from: Square; to: Square } {
    if (uci.length < 4) {
      throw new Error(`Invalid UCI move: ${uci}`);
    }
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    return { from, to };
  }

  /**
   * Convert from/to squares to UCI format
   */
  static toUci(from: Square, to: Square): string {
    return `${from}${to}`;
  }

  // ============================================================
  // STATE GETTERS
  // ============================================================

  get currentIndex(): number {
    return this.#currentIndex;
  }

  get isFailed(): boolean {
    return this.#isFailed;
  }

  get isComplete(): boolean {
    return this.#currentIndex >= this.#steps.length;
  }

  get totalSteps(): number {
    return this.#steps.length;
  }

  /**
   * Get the opponent move delay in milliseconds
   */
  get opponentDelay(): number {
    return this.#options.opponentDelay;
  }

  /**
   * Number of player moves in the scenario
   */
  get playerMoveCount(): number {
    return Math.ceil(this.#steps.length / 2);
  }

  /**
   * Get the expected player move at current position
   */
  get expectedMove(): string | null {
    if (this.isComplete || this.#isFailed) return null;
    if (!this.#isPlayerTurn()) return null;
    return this.#steps[this.#currentIndex].move;
  }

  /**
   * Check if it's currently the player's turn
   */
  #isPlayerTurn(): boolean {
    return this.#currentIndex % 2 === 0;
  }

  // ============================================================
  // PLAYER INTERACTION
  // ============================================================

  /**
   * Process a player move.
   *
   * @param move - The move in UCI format (e.g., "e2e4")
   * @returns true if move matches expected, false if wrong move
   */
  player(move: string): boolean {
    if (this.isComplete || this.#isFailed) return false;
    if (!this.#isPlayerTurn()) return false;

    const expected = this.#steps[this.#currentIndex];

    if (move !== expected.move) {
      this.#isFailed = true;
      return false;
    }

    // Correct move - advance and show shapes
    this.#currentIndex++;

    if (expected.shapes.length > 0) {
      this.#options.onShapes(expected.shapes);
    }

    return true;
  }

  /**
   * Process a player move using from/to squares
   */
  playerMove(from: Square, to: Square): boolean {
    return this.player(Scenario.toUci(from, to));
  }

  // ============================================================
  // OPPONENT INTERACTION
  // ============================================================

  /**
   * Check if opponent should move next
   */
  shouldOpponentMove(): boolean {
    if (this.isComplete || this.#isFailed) return false;
    return !this.#isPlayerTurn();
  }

  /**
   * Get the next opponent move (without advancing state)
   */
  getOpponentMove(): { from: Square; to: Square; shapes: BoardShape[] } | null {
    if (!this.shouldOpponentMove()) return null;

    const step = this.#steps[this.#currentIndex];
    const { from, to } = Scenario.parseUci(step.move);

    return { from, to, shapes: step.shapes };
  }

  /**
   * Confirm opponent move was executed (advances state)
   */
  confirmOpponentMove(): void {
    if (!this.shouldOpponentMove()) return;

    const step = this.#steps[this.#currentIndex];
    this.#currentIndex++;

    if (step.shapes.length > 0) {
      this.#options.onShapes(step.shapes);
    }
  }

  // ============================================================
  // CONTROL
  // ============================================================

  /**
   * Reset the scenario to the beginning
   */
  reset(): void {
    this.#currentIndex = 0;
    this.#isFailed = false;
  }

  /**
   * Get scenario progress as a fraction (0 to 1)
   */
  getProgress(): number {
    if (this.#steps.length === 0) return 1;
    return this.#currentIndex / this.#steps.length;
  }
}

/**
 * Create a new Scenario instance
 */
export function createScenario(blueprint: ScenarioBlueprint, options?: ScenarioOptions): Scenario {
  return new Scenario(blueprint, options);
}
