import { CTLPopup } from './popup-factory';

/**
 * Registry for managing popup instances
 * This breaks the circular dependency between popup-factory and popup consumers
 */
class PopupRegistry {
  private readonly popups = new Map<string, CTLPopup<any>>();

  /**
   * Register a popup instance with a type identifier
   */
  register<T>(type: string, popup: CTLPopup<T>): void {
    this.popups.set(type, popup);
  }

  /**
   * Get a registered popup by type
   */
  get(type: string): CTLPopup<any> | undefined {
    return this.popups.get(type);
  }

  /**
   * Check if a popup type is registered
   */
  has(type: string): boolean {
    return this.popups.has(type);
  }

  /**
   * Unregister a popup (useful for testing)
   */
  unregister(type: string): boolean {
    return this.popups.delete(type);
  }

  /**
   * Clear all registered popups (useful for testing)
   */
  clear(): void {
    this.popups.clear();
  }
}

// Singleton instance
export const popupRegistry = new PopupRegistry();
