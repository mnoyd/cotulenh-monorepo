import type { ProgressiveHintsConfig, HintLevel } from './types';

/**
 * Callbacks for HintSystem events
 */
export interface HintSystemCallbacks {
  /**
   * Called when hint level changes
   * @param level - New hint level (none, subtle, medium, explicit)
   * @param type - Visual hint type to display
   */
  onHintChange?: (level: 'none' | 'subtle' | 'medium' | 'explicit', type?: HintLevel) => void;

  /**
   * Called when tutorial mode should be triggered (after N wrong moves)
   */
  onTutorialMode?: () => void;
}

/**
 * Default timing configuration (in milliseconds)
 */
const DEFAULT_TIMING = {
  subtle: 15000, // 15 seconds
  medium: 30000, // 30 seconds
  explicit: 45000 // 45 seconds
};

/**
 * Default visual hint levels
 */
const DEFAULT_LEVELS = {
  subtle: 'pulse-target' as HintLevel,
  medium: 'show-arrow' as HintLevel,
  explicit: 'show-instruction' as HintLevel
};

/**
 * HintSystem - Manages progressive hint display based on time and wrong moves
 *
 * Features:
 * - Timer-based hint escalation (subtle → medium → explicit)
 * - Wrong move tracking
 * - Tutorial mode after threshold
 * - Opt-in per lesson
 */
export class HintSystem {
  #enabled: boolean;
  #timing: Required<NonNullable<ProgressiveHintsConfig['timing']>>;
  #levels: Required<NonNullable<ProgressiveHintsConfig['levels']>>;
  #wrongMoveThreshold: number;
  #callbacks: HintSystemCallbacks;

  // State
  #currentLevel: 'none' | 'subtle' | 'medium' | 'explicit' = 'none';
  #timeSinceLastMove = 0;
  #wrongMoveCount = 0;
  #intervalId: ReturnType<typeof setInterval> | null = null;
  #isRunning = false;

  constructor(config: ProgressiveHintsConfig | undefined, callbacks: HintSystemCallbacks = {}) {
    this.#enabled = config?.enabled ?? false;
    this.#timing = {
      subtle: config?.timing?.subtle ?? DEFAULT_TIMING.subtle,
      medium: config?.timing?.medium ?? DEFAULT_TIMING.medium,
      explicit: config?.timing?.explicit ?? DEFAULT_TIMING.explicit
    };
    this.#levels = {
      subtle: config?.levels?.subtle ?? DEFAULT_LEVELS.subtle,
      medium: config?.levels?.medium ?? DEFAULT_LEVELS.medium,
      explicit: config?.levels?.explicit ?? DEFAULT_LEVELS.explicit
    };
    this.#wrongMoveThreshold = config?.wrongMoveThreshold ?? 3;
    this.#callbacks = callbacks;
  }

  /**
   * Start the hint timer
   */
  start(): void {
    if (!this.#enabled || this.#isRunning) return;

    this.#isRunning = true;
    this.#intervalId = setInterval(() => {
      this.#tick(1000); // Tick every second
    }, 1000);
  }

  /**
   * Stop the hint timer and cleanup
   */
  stop(): void {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
    this.#isRunning = false;
    this.reset();
  }

  /**
   * Reset hint state to initial (no hints shown)
   */
  reset(): void {
    this.#timeSinceLastMove = 0;
    this.#wrongMoveCount = 0;
    if (this.#currentLevel !== 'none') {
      this.#currentLevel = 'none';
      this.#callbacks.onHintChange?.('none');
    }
  }

  /**
   * Called when user makes a valid move
   * Resets the hint timer
   */
  onMove(): void {
    if (!this.#enabled) return;

    this.#timeSinceLastMove = 0;
    this.#wrongMoveCount = 0; // Reset wrong move count on success
    if (this.#currentLevel !== 'none') {
      this.#currentLevel = 'none';
      this.#callbacks.onHintChange?.('none');
    }
  }

  /**
   * Called when user makes a wrong move
   * Tracks count and may trigger tutorial mode
   */
  onWrongMove(): void {
    if (!this.#enabled) return;

    this.#wrongMoveCount++;

    // Trigger tutorial mode if threshold reached
    if (this.#wrongMoveCount >= this.#wrongMoveThreshold) {
      this.#updateLevel('explicit');
      this.#callbacks.onTutorialMode?.();
    }
  }

  /**
   * Get current hint level
   */
  get currentLevel(): 'none' | 'subtle' | 'medium' | 'explicit' {
    return this.#currentLevel;
  }

  /**
   * Get current hint type
   */
  get currentType(): HintLevel | null {
    if (this.#currentLevel === 'none') return null;
    return this.#levels[this.#currentLevel];
  }

  /**
   * Check if hints are enabled
   */
  get isEnabled(): boolean {
    return this.#enabled;
  }

  /**
   * Timer tick - check if we should escalate hints
   */
  #tick(deltaMs: number): void {
    this.#timeSinceLastMove += deltaMs;

    // Check thresholds in reverse order (explicit → medium → subtle)
    // so we set the highest applicable level
    if (this.#timeSinceLastMove >= this.#timing.explicit && this.#levels.explicit) {
      this.#updateLevel('explicit');
    } else if (this.#timeSinceLastMove >= this.#timing.medium && this.#levels.medium) {
      this.#updateLevel('medium');
    } else if (this.#timeSinceLastMove >= this.#timing.subtle && this.#levels.subtle) {
      this.#updateLevel('subtle');
    }
  }

  /**
   * Update hint level and notify callbacks
   */
  #updateLevel(level: 'subtle' | 'medium' | 'explicit'): void {
    if (this.#currentLevel !== level) {
      this.#currentLevel = level;
      const hintType = this.#levels[level];
      this.#callbacks.onHintChange?.(level, hintType);
    }
  }
}

/**
 * Factory function to create a HintSystem
 */
export function createHintSystem(
  config: ProgressiveHintsConfig | undefined,
  callbacks?: HintSystemCallbacks
): HintSystem {
  return new HintSystem(config, callbacks);
}
