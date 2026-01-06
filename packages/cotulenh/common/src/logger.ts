/**
 * Interface for a log processor (e.g., Sentry, Console, File)
 */
export interface LogProcessor {
  /**
   * Capture an exception/error
   * @param error The error object
   * @param context Additional context or message
   */
  captureException(error: unknown, context?: Record<string, unknown> | string): void;

  /**
   * Log a general message
   * @param message Message to log
   * @param level Log level
   * @param context Additional context
   */
  log(
    message: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    context?: Record<string, unknown>
  ): void;
}

/**
 * Default console processor
 */
class ConsoleProcessor implements LogProcessor {
  captureException(error: unknown, context?: Record<string, unknown> | string): void {
    console.error(error, context);
  }

  log(
    message: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    context?: Record<string, unknown>
  ): void {
    const args = context ? [message, context] : [message];
    switch (level) {
      case 'info':
        console.info(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'error':
        console.error(...args);
        break;
      case 'debug':
        console.debug(...args);
        break;
    }
  }
}

/**
 * Central Logger class
 */
export class Logger {
  private static instance: Logger;
  private processors: LogProcessor[] = [];

  private constructor() {
    // Add default console processor
    this.processors.push(new ConsoleProcessor());
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Register a new log processor (e.g. Sentry)
   * @param processor The processor to add
   */
  public registerProcessor(processor: LogProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Clear all processors (mainly for testing)
   */
  public clearProcessors(): void {
    this.processors = [];
  }

  public error(error: unknown, context?: Record<string, unknown> | string): void {
    this.processors.forEach((p) => p.captureException(error, context));
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.processors.forEach((p) => p.log(message, 'info', context));
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.processors.forEach((p) => p.log(message, 'warn', context));
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.processors.forEach((p) => p.log(message, 'debug', context));
  }
}

export const logger = Logger.getInstance();
