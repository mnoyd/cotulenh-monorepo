import { CTLPopup, PopUpType } from './popup-factory';

/**
 * Registry for managing popup instances
 * This breaks the circular dependency between popup-factory and popup consumers
 */
class PopupRegistry {
  private popups = new Map<PopUpType, CTLPopup<any>>();

  /**
   * Register a popup instance with a type identifier
   */
  register<T>(type: PopUpType, popup: CTLPopup<T>): void {
    this.popups.set(type, popup);
  }

  /**
   * Get a registered popup by type
   */
  get(type: PopUpType): CTLPopup<any> | undefined {
    return this.popups.get(type);
  }

  /**
   * Check if a popup type is registered
   */
  has(type: PopUpType): boolean {
    return this.popups.has(type);
  }

  /**
   * Unregister a popup (useful for testing)
   */
  unregister(type: PopUpType): boolean {
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
