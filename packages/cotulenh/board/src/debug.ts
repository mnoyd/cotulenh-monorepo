/**
 * Debug logging utility for the board package.
 * Checks the global DEBUG_RENDER flag set by the app.
 */

export function logRender(...args: unknown[]): void {
  if (typeof window !== 'undefined' && (window as unknown as { DEBUG_RENDER?: boolean }).DEBUG_RENDER) {
    console.log(...args);
  }
}

export function isRenderDebugEnabled(): boolean {
  return (
    typeof window !== 'undefined' && ((window as unknown as { DEBUG_RENDER?: boolean }).DEBUG_RENDER || false)
  );
}
