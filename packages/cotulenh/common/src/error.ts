/**
 * Standardized Error Codes for CoTuLenh
 */
export enum ErrorCode {
  // FEN / Parsing
  FEN_INVALID_FORMAT = 'FEN_INVALID_FORMAT',
  FEN_INVALID_PIECE = 'FEN_INVALID_PIECE',
  FEN_INVALID_RANK_COUNT = 'FEN_INVALID_RANK_COUNT',
  FEN_INVALID_FILE_COUNT = 'FEN_INVALID_FILE_COUNT',
  FEN_MISMATCH_PARENTHESES = 'FEN_MISMATCH_PARENTHESES',

  // Board / Move Validation
  BOARD_INVALID_SQUARE = 'BOARD_INVALID_SQUARE',
  BOARD_INVALID_TERRAIN = 'BOARD_INVALID_TERRAIN',
  COMMANDER_LIMIT_EXCEEDED = 'COMMANDER_LIMIT_EXCEEDED',
  MOVE_INVALID_DESTINATION = 'MOVE_INVALID_DESTINATION',
  MOVE_NO_PIECE_TO_MOVE = 'MOVE_NO_PIECE_TO_MOVE',
  MOVE_PIECE_NOT_FOUND = 'MOVE_PIECE_NOT_FOUND',
  COMBINATION_FAILED = 'COMBINATION_FAILED',
  CAPTURE_INVALID_TARGET = 'CAPTURE_INVALID_TARGET',

  // Session / Game State
  SESSION_INVALID_OPERATION = 'SESSION_INVALID_OPERATION',
  INTERNAL_INCONSISTENCY = 'INTERNAL_INCONSISTENCY',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  APP_UNKNOWN_ERROR = 'APP_UNKNOWN_ERROR'
}

/**
 * Error category for validation results
 */
export type ValidationErrorCategory =
  | 'structure'
  | 'lexical'
  | 'semantic'
  | 'terrain'
  | 'combination'
  | 'roundtrip';

/**
 * Position in FEN string for error reporting
 */
export interface FenLocation {
  /** Rank number (1-12, display rank) */
  rank?: number;
  /** File number (0-10, where 0=a, 10=k) */
  file?: number;
  /** Which FEN token (0-5) */
  tokenIndex?: number;
  /** Character index in raw FEN string */
  charIndex?: number;
  /** The problematic substring */
  context?: string;
}

/**
 * A single validation error
 */
export interface ValidationError {
  /** Error code from ErrorCode enum */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** Category of validation error */
  category: ValidationErrorCategory;
  /** Location of the error in the FEN */
  location?: FenLocation;
}

/**
 * Result of FEN validation
 */
export interface ValidationResult {
  /** Whether the FEN is valid (no errors) */
  valid: boolean;
  /** All validation errors found */
  errors: ValidationError[];
}

/**
 * Options for FEN validation
 */
export interface ValidateFenOptions {
  /** Whether to perform deep semantic checks (default: false) */
  checkSemantics?: boolean;
  /** Whether to perform round-trip test (default: false) */
  roundTripTest?: boolean;
  /** Whether to throw on first error vs. collect all (default: false) */
  throwOnError?: boolean;
}

/**
 * Base Error class for CoTuLenh
 */
export class CotulenhError extends Error {
  public readonly code: ErrorCode;
  public readonly metadata?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'CotulenhError';
    this.code = code;
    this.metadata = metadata;

    // Maintain prototype chain for instanceof checks (mostly for ES5 targets, but good practice)
    Object.setPrototypeOf(this, CotulenhError.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      metadata: this.metadata,
      stack: this.stack
    };
  }
}

/**
 * Helper to create a standardized error
 * @param code Error Code
 * @param message Readable message
 * @param metadata Contextual data
 */
export function createError(
  code: ErrorCode,
  message?: string,
  metadata?: Record<string, unknown>
): CotulenhError {
  const msg = message || `CoTuLenh Error: ${code}`;
  return new CotulenhError(code, msg, metadata);
}
