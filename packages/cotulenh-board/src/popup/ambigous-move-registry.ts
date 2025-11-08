import { AmbigousMoveHandling } from './ambigous-move';

/**
 * Registry for managing ambiguous move handling instances
 * This breaks the circular dependency between ambigous-move and its consumers
 */
class AmbigousMoveRegistry {
  private readonly handlers = new Map<string, AmbigousMoveHandling<any>>();

  /**
   * Register an ambiguous move handler with a type identifier
   */
  register<T>(type: string, handler: AmbigousMoveHandling<T>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Get a registered handler by type
   */
  get(type: string): AmbigousMoveHandling<any> | undefined {
    return this.handlers.get(type);
  }

  /**
   * Check if a handler type is registered
   */
  has(type: string): boolean {
    return this.handlers.has(type);
  }

  /**
   * Unregister a handler (useful for testing)
   */
  unregister(type: string): boolean {
    return this.handlers.delete(type);
  }

  /**
   * Clear all registered handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance
export const ambigousMoveRegistry = new AmbigousMoveRegistry();
