/**
 * Performance Monitoring Utility
 *
 * Tracks execution time of operations with configurable thresholds and warnings.
 * Supports hierarchical timing for nested operations.
 *
 * Enable via:
 * 1. URL parameter: ?debug=true or ?debug=perf
 * 2. localStorage: localStorage.setItem('debug', 'perf')
 * 3. Global: window.DEBUG_PERF = true
 */

interface PerfMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  threshold: number;
  children: PerfMetric[];
  parent?: PerfMetric;
}

interface PerfStats {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
}

// Global state
let enabled: boolean | null = null;
let rootMetrics: PerfMetric[] = [];
let currentMetric: PerfMetric | null = null;
const stats = new Map<string, PerfStats>();

// Default thresholds (in ms)
const DEFAULT_THRESHOLDS: Record<string, number> = {
  // Move generation
  moves: 50,
  'moves:square': 5,
  'moves:pseudo-legal': 20,
  'moves:filter-legal': 30,
  'moves:verbose': 5,

  // Game operations
  'game:move': 10,
  'game:undo': 10,
  'game:reset': 50,
  'game:initialize': 100,
  'game:sync-board': 16, // 1 frame at 60fps

  // UI operations
  render: 16, // 1 frame at 60fps
  'render:effect': 16,
  'render:board-sync': 16,

  // Deploy operations
  'deploy:commit': 50,
  'deploy:cancel': 10,

  // Default for unknown operations
  default: 100
};

// Browser detection
const isBrowser = typeof window !== 'undefined' && typeof window.performance !== 'undefined';

function isEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (!isBrowser) {
    enabled = false;
    return false;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const urlDebug = urlParams.get('debug');
  if (urlDebug === 'true' || urlDebug === 'perf') {
    enabled = true;
    return true;
  }

  if (typeof window.localStorage !== 'undefined') {
    const storedDebug = window.localStorage.getItem('debug');
    if (storedDebug === 'true' || storedDebug === 'perf') {
      enabled = true;
      return true;
    }
  }

  if ((window as unknown as { DEBUG_PERF?: boolean }).DEBUG_PERF) {
    enabled = true;
    return true;
  }

  enabled = false;
  return false;
}

/**
 * Enable or disable performance logging programmatically.
 */
export function setPerfDebug(enabled_: boolean): void {
  enabled = enabled_;
  if (isBrowser && typeof window.localStorage !== 'undefined') {
    if (enabled_) {
      window.localStorage.setItem('debug', 'perf');
      (window as unknown as { DEBUG_PERF?: boolean }).DEBUG_PERF = true;
    } else {
      window.localStorage.removeItem('debug');
      (window as unknown as { DEBUG_PERF?: boolean }).DEBUG_PERF = false;
    }
  }
}

/**
 * Toggle performance logging on/off.
 */
export function togglePerfDebug(): boolean {
  const newState = !isEnabled();
  setPerfDebug(newState);
  return newState;
}

/**
 * Check if performance debugging is enabled.
 */
export function isPerfDebugEnabled(): boolean {
  return isEnabled();
}

/**
 * Get the threshold for a given operation name.
 */
function getThreshold(name: string): number {
  return DEFAULT_THRESHOLDS[name] ?? DEFAULT_THRESHOLDS['default'];
}

/**
 * Start timing an operation.
 * Returns a function that must be called to end the timing.
 *
 * @example
 * const endPerf = perfStart('game:move');
 * // ... do work ...
 * endPerf();
 *
 * @example with context
 * const endPerf = perfStart('game:move', { from: 'e2', to: 'e4' });
 * // ... do work ...
 * endPerf();
 */
export function perfStart(name: string, context?: Record<string, unknown>): () => void {
  if (!isEnabled()) {
    return () => {};
  }

  const startTime = isBrowser ? performance.now() : Date.now();
  const threshold = getThreshold(name);

  const metric: PerfMetric = {
    name,
    startTime,
    threshold,
    children: [],
    parent: currentMetric ?? undefined
  };

  if (currentMetric) {
    currentMetric.children.push(metric);
  } else {
    rootMetrics.push(metric);
  }
  currentMetric = metric;

  if (context) {
    console.log(`⏱️ [PERF] Starting: ${name}`, context);
  } else {
    console.log(`⏱️ [PERF] Starting: ${name}`);
  }

  return () => perfEnd(name, context);
}

/**
 * End timing for an operation.
 */
export function perfEnd(name: string, context?: Record<string, unknown>): void {
  if (!isEnabled() || !currentMetric) return;

  const endTime = isBrowser ? performance.now() : Date.now();
  const duration = endTime - currentMetric.startTime;

  currentMetric.endTime = endTime;
  currentMetric.duration = duration;

  // Update stats
  updateStats(currentMetric.name, duration);

  // Check threshold
  const exceededThreshold = duration > currentMetric.threshold;
  const icon = exceededThreshold ? '⚠️' : '✅';
  const style = exceededThreshold ? 'color: #ff6b6b; font-weight: bold;' : 'color: #51cf66;';

  const thresholdMsg = exceededThreshold
    ? ` (exceeded ${currentMetric.threshold}ms threshold)`
    : ` (<${currentMetric.threshold}ms threshold)`;

  const baseMsg = `${icon} %c[PERF] ${name}%c took ${duration.toFixed(2)}ms${thresholdMsg}`;

  if (context) {
    console.log(baseMsg, 'color: #4dabf7;', '', context);
  } else {
    console.log(baseMsg, 'color: #4dabf7;', '');
  }

  // Log children if any
  if (currentMetric.children.length > 0) {
    const childrenDuration = currentMetric.children.reduce(
      (sum, child) => sum + (child.duration ?? 0),
      0
    );
    const ownDuration = duration - childrenDuration;

    console.groupCollapsed(`  📊 Breakdown: ${name}`);
    console.log(`  Total: ${duration.toFixed(2)}ms`);
    console.log(`  Own time: ${ownDuration.toFixed(2)}ms`);
    console.log(`  Children: ${childrenDuration.toFixed(2)}ms`);

    for (const child of currentMetric.children) {
      const childIcon = (child.duration ?? 0) > child.threshold ? '⚠️' : '  ';
      console.log(
        `  ${childIcon} ${child.name}: ${(child.duration ?? 0).toFixed(2)}ms (threshold: ${child.threshold}ms)`
      );
    }

    console.groupEnd();
  }

  // Pop to parent
  currentMetric = currentMetric.parent ?? null;
}

/**
 * Time an async operation automatically.
 *
 * @example
 * const result = await perfTime('game:move', () => makeCoreMove(game, orig, dest));
 */
export async function perfTime<T>(
  name: string,
  fn: () => T,
  context?: Record<string, unknown>
): Promise<T> {
  const end = perfStart(name, context);
  try {
    const result = await fn();
    end();
    return result;
  } catch (error) {
    end();
    throw error;
  }
}

/**
 * Time a synchronous operation automatically.
 *
 * @example
 * const result = perfTimeSync('game:move', () => makeCoreMove(game, orig, dest));
 */
export function perfTimeSync<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
  const end = perfStart(name, context);
  try {
    const result = fn();
    end();
    return result;
  } catch (error) {
    end();
    throw error;
  }
}

/**
 * Update statistics for a metric name.
 */
function updateStats(name: string, duration: number): void {
  const existing = stats.get(name);

  if (existing) {
    existing.count++;
    existing.totalTime += duration;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);
    existing.avgTime = existing.totalTime / existing.count;
  } else {
    stats.set(name, {
      count: 1,
      totalTime: duration,
      minTime: duration,
      maxTime: duration,
      avgTime: duration
    });
  }
}

/**
 * Get statistics for all tracked metrics.
 */
export function getPerfStats(): Map<string, PerfStats> {
  return new Map(stats);
}

/**
 * Log a summary of all performance statistics.
 */
export function logPerfSummary(): void {
  if (!isEnabled() || stats.size === 0) {
    console.log('⏱️ [PERF] No statistics available');
    return;
  }

  console.group('📊 Performance Summary');

  for (const [name, stat] of stats) {
    const threshold = getThreshold(name);
    const isSlow = stat.avgTime > threshold;

    const style = isSlow ? 'color: #ff6b6b;' : 'color: #51cf66;';
    const icon = isSlow ? '⚠️' : '✅';

    console.log(
      `${icon} %c${name}%c - avg: ${stat.avgTime.toFixed(2)}ms, ` +
        `min: ${stat.minTime.toFixed(2)}ms, max: ${stat.maxTime.toFixed(2)}ms, ` +
        `count: ${stat.count} (threshold: ${threshold}ms)`,
      style,
      ''
    );
  }

  console.groupEnd();
}

/**
 * Clear all performance statistics.
 */
export function clearPerfStats(): void {
  stats.clear();
  rootMetrics = [];
  console.log('⏱️ [PERF] Statistics cleared');
}

/**
 * Set a custom threshold for an operation.
 */
export function setPerfThreshold(name: string, thresholdMs: number): void {
  DEFAULT_THRESHOLDS[name] = thresholdMs;
}

/**
 * Decorator for timing class methods.
 *
 * @example
 * class MyClass {
 *   @perfMethod('my-operation')
 *   myMethod() {
 *     // ...
 *   }
 * }
 */
export function perfMethod(name?: string) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || _propertyKey;

    descriptor.value = function (...args: unknown[]) {
      if (!isEnabled()) {
        return originalMethod.apply(this, args);
      }

      const end = perfStart(metricName);
      try {
        const result = originalMethod.apply(this, args);
        // Check if result is a promise
        if (result && typeof result.then === 'function') {
          return result.finally(() => end());
        }
        end();
        return result;
      } catch (error) {
        end();
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Log a slow operation warning explicitly.
 * Use this when you want to warn about a slow operation without timing it.
 */
export function perfWarn(name: string, duration: number, context?: Record<string, unknown>): void {
  if (!isEnabled()) return;

  const threshold = getThreshold(name);

  if (duration > threshold) {
    console.warn(
      `⚠️ [PERF] Slow operation: ${name} took ${duration.toFixed(2)}ms ` +
        `(exceeded ${threshold}ms threshold)`,
      context ?? ''
    );
  }
}

/**
 * Mark a specific point in time for performance analysis.
 * Useful with Chrome DevTools Performance tab.
 */
export function perfMark(name: string): void {
  if (!isBrowser) return;

  if (isEnabled() && typeof window.performance?.mark === 'function') {
    window.performance.mark(`perf-${name}`);
    console.log(`🏷️ [PERF] Mark: ${name}`);
  }
}

/**
 * Measure the time between two marks.
 */
export function perfMeasure(name: string, startMark: string, endMark: string): void {
  if (!isBrowser) return;

  if (isEnabled() && typeof window.performance?.measure === 'function') {
    window.performance.measure(name, `perf-${startMark}`, `perf-${endMark}`);
    const entries = window.performance.getEntriesByName(name, 'measure');
    if (entries.length > 0) {
      const entry = entries[0];
      console.log(`📏 [PERF] Measure: ${name} = ${entry.duration.toFixed(2)}ms`);
    }
  }
}
