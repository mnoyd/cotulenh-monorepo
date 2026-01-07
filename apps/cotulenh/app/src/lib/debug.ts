import { browser } from '$app/environment';

/**
 * Debug logging utility for rendering performance tracking.
 *
 * Enable via:
 * 1. URL parameter: ?debug=true or ?debug=render
 * 2. localStorage: localStorage.setItem('debug', 'render')
 * 3. Global: window.DEBUG_RENDER = true
 */

let enabled: boolean | null = null;

function isEnabled(): boolean {
  if (enabled !== null) return enabled;

  // Always disable during SSR
  if (!browser) {
    enabled = false;
    return false;
  }

  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlDebug = urlParams.get('debug');
  if (urlDebug === 'true' || urlDebug === 'render') {
    enabled = true;
    // Set global flag for board package access
    (window as unknown as { DEBUG_RENDER?: boolean }).DEBUG_RENDER = true;
    return true;
  }

  // Check localStorage
  const storedDebug = localStorage.getItem('debug');
  if (storedDebug === 'true' || storedDebug === 'render') {
    enabled = true;
    (window as unknown as { DEBUG_RENDER?: boolean }).DEBUG_RENDER = true;
    return true;
  }

  // Check global flag
  if ((window as unknown as { DEBUG_RENDER?: boolean }).DEBUG_RENDER) {
    enabled = true;
    return true;
  }

  enabled = false;
  return false;
}

/**
 * Enable or disable render logging programmatically.
 */
export function setRenderDebug(enabled_: boolean): void {
  enabled = enabled_;
  if (enabled_) {
    if (browser) {
      localStorage.setItem('debug', 'render');
      (window as unknown as { DEBUG_RENDER?: boolean }).DEBUG_RENDER = true;
    }
  } else {
    if (browser) {
      localStorage.removeItem('debug');
      (window as unknown as { DEBUG_RENDER?: boolean }).DEBUG_RENDER = false;
    }
  }
}

/**
 * Toggle render logging on/off.
 */
export function toggleRenderDebug(): boolean {
  const newState = !isEnabled();
  setRenderDebug(newState);
  return newState;
}

/**
 * Log a render event. Only logs if debug mode is enabled and browser is available.
 */
export function logRender(...args: unknown[]): void {
  if (browser && isEnabled()) {
    console.log(...args);
  }
}

/**
 * Check if render debugging is currently enabled.
 */
export function isRenderDebugEnabled(): boolean {
  return isEnabled();
}
