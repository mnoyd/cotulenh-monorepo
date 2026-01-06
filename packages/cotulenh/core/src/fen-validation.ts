/**
 * FEN Validation Module
 *
 * Simplified validation: format checking + load() for semantics.
 * The put() method already validates terrain, commander count, and stacking.
 */

import {
  ErrorCode,
  createError,
  ValidationResult,
  ValidationError,
  ValidationErrorCategory,
  CotulenhError,
} from '@cotulenh/common'

const ERROR_CODE_CATEGORIES: Partial<
  Record<ErrorCode, ValidationErrorCategory>
> = {
  [ErrorCode.BOARD_INVALID_TERRAIN]: 'terrain',
  [ErrorCode.COMBINATION_FAILED]: 'combination',
  [ErrorCode.COMMANDER_LIMIT_EXCEEDED]: 'semantic',
  [ErrorCode.FEN_INVALID_RANK_COUNT]: 'structure',
  [ErrorCode.FEN_INVALID_FILE_COUNT]: 'structure',
  [ErrorCode.FEN_MISMATCH_PARENTHESES]: 'structure',
  [ErrorCode.FEN_INVALID_PIECE]: 'lexical',
}

function categorizeErrorCode(code: ErrorCode): ValidationErrorCategory {
  return ERROR_CODE_CATEGORIES[code] ?? 'semantic'
}

// Valid piece characters (case-insensitive): c,m,t,i,e,a,g,s,f,n,h
const VALID_PIECES = new Set('cmtieasgfnhCMTIEASGFNH'.split(''))

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9'
}

export interface FenValidationOptions {
  checkSemantics?: boolean
  throwOnError?: boolean
}

/**
 * Validates a single rank string.
 */
function validateRank(rankStr: string, displayRank: number): ValidationError[] {
  const errors: ValidationError[] = []
  let col = 0
  let inParens = false
  let parenDepth = 0
  let lastWasPlus = false

  for (let i = 0; i < rankStr.length; i++) {
    const char = rankStr[i]

    if (isDigit(char)) {
      let numStr = char
      if (char === '1' && i + 1 < rankStr.length && isDigit(rankStr[i + 1])) {
        numStr += rankStr[++i]
      }
      const num = parseInt(numStr, 10)

      if (num < 1 || num > 11) {
        errors.push({
          code: ErrorCode.FEN_INVALID_FILE_COUNT,
          message: `Empty count ${num} out of range (1-11)`,
          category: 'lexical',
          location: { rank: displayRank, charIndex: i, context: numStr },
        })
      }
      col += num
      lastWasPlus = false
    } else if (char === '+') {
      if (lastWasPlus) {
        errors.push({
          code: ErrorCode.FEN_INVALID_FORMAT,
          message: `Double heroic marker '++' not allowed`,
          category: 'lexical',
          location: { rank: displayRank, charIndex: i, context: '++' },
        })
      }
      lastWasPlus = true
    } else if (char === '(') {
      parenDepth++
      if (parenDepth > 1) {
        errors.push({
          code: ErrorCode.FEN_INVALID_FORMAT,
          message: `Nested parentheses not supported`,
          category: 'structure',
          location: { rank: displayRank, charIndex: i },
        })
      }
      inParens = true
      lastWasPlus = false
    } else if (char === ')') {
      parenDepth--
      if (parenDepth < 0) {
        errors.push({
          code: ErrorCode.FEN_MISMATCH_PARENTHESES,
          message: `Unmatched closing parenthesis`,
          category: 'structure',
          location: { rank: displayRank, charIndex: i, context: ')' },
        })
      }
      inParens = parenDepth > 0
      col++
      lastWasPlus = false
    } else if (VALID_PIECES.has(char)) {
      if (!inParens) col++
      lastWasPlus = false
    } else {
      errors.push({
        code: ErrorCode.FEN_INVALID_PIECE,
        message: `Invalid character '${char}' in FEN`,
        category: 'lexical',
        location: { rank: displayRank, charIndex: i, context: char },
      })
      lastWasPlus = false
    }
  }

  if (parenDepth > 0) {
    errors.push({
      code: ErrorCode.FEN_MISMATCH_PARENTHESES,
      message: `Unclosed parenthesis in rank ${displayRank}`,
      category: 'structure',
      location: { rank: displayRank },
    })
  }

  if (lastWasPlus) {
    errors.push({
      code: ErrorCode.FEN_INVALID_FORMAT,
      message: `Dangling heroic marker '+' at end of rank ${displayRank}`,
      category: 'lexical',
      location: { rank: displayRank },
    })
  }

  if (col !== 11) {
    errors.push({
      code: ErrorCode.FEN_INVALID_FILE_COUNT,
      message: `Rank ${displayRank} has ${col} squares, expected 11`,
      category: 'structure',
      location: { rank: displayRank },
    })
  }

  return errors
}

/**
 * Validates FEN format.
 * Checks: token count, rank count, valid characters, parentheses balance, square count.
 */
export function validateFenFormat(fen: string): ValidationResult {
  const errors: ValidationError[] = []
  const tokens = fen.trim().split(/\s+/)

  // Must have at least 6 tokens
  if (tokens.length < 6) {
    errors.push({
      code: ErrorCode.FEN_INVALID_FORMAT,
      message: `Expected at least 6 FEN tokens, got ${tokens.length}`,
      category: 'structure',
    })
    return { valid: false, errors }
  }

  const [placement, turn, castling, enPassant, halfMoves, moveNumber] = tokens

  // Validate turn
  if (turn !== 'r' && turn !== 'b') {
    errors.push({
      code: ErrorCode.FEN_INVALID_FORMAT,
      message: `Invalid turn '${turn}', expected 'r' or 'b'`,
      category: 'structure',
    })
  }

  // Castling must be '-'
  if (castling !== '-') {
    errors.push({
      code: ErrorCode.FEN_INVALID_FORMAT,
      message: `Castling field must be '-', got '${castling}'`,
      category: 'structure',
    })
  }

  // En passant must be '-'
  if (enPassant !== '-') {
    errors.push({
      code: ErrorCode.FEN_INVALID_FORMAT,
      message: `En passant field must be '-', got '${enPassant}'`,
      category: 'structure',
    })
  }

  // Half moves must be non-negative integer
  if (!/^\d+$/.test(halfMoves)) {
    errors.push({
      code: ErrorCode.FEN_INVALID_FORMAT,
      message: `Invalid half move count '${halfMoves}'`,
      category: 'structure',
    })
  }

  // Move number must be positive integer
  if (!/^[1-9]\d*$/.test(moveNumber)) {
    errors.push({
      code: ErrorCode.FEN_INVALID_FORMAT,
      message: `Invalid move number '${moveNumber}'`,
      category: 'structure',
    })
  }

  // Validate placement
  const ranks = placement.split('/')
  if (ranks.length !== 12) {
    errors.push({
      code: ErrorCode.FEN_INVALID_RANK_COUNT,
      message: `Expected 12 ranks, got ${ranks.length}`,
      category: 'structure',
    })
    return { valid: false, errors }
  }

  for (let i = 0; i < ranks.length; i++) {
    errors.push(...validateRank(ranks[i], 12 - i))
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Converts an error to ValidationResult
 */
function errorToResult(e: unknown): ValidationResult {
  if (e instanceof CotulenhError) {
    return {
      valid: false,
      errors: [
        {
          code: e.code,
          message: e.message,
          category: categorizeErrorCode(e.code),
          location: e.metadata,
        },
      ],
    }
  }
  if (e instanceof Error) {
    return {
      valid: false,
      errors: [
        {
          code: ErrorCode.FEN_INVALID_FORMAT,
          message: e.message,
          category: 'semantic',
        },
      ],
    }
  }
  throw e
}

/**
 * Validates a FEN string comprehensively.
 *
 * 1. Format validation
 * 2. Semantic validation (try loading - put() validates terrain, stacking, commanders)
 * 3. Commander count validation (must have exactly 1 per color)
 *
 * @param fen - The FEN string to validate
 * @param options - Validation options
 * @param loadFen - Function that attempts to load the FEN, returns commander positions
 */
export function validateFen(
  fen: string,
  options: FenValidationOptions,
  loadFen: () => { commanders: Record<'r' | 'b', number> },
): ValidationResult {
  const { checkSemantics = true, throwOnError = false } = options

  // Step 1: Format validation
  const formatResult = validateFenFormat(fen)
  if (!formatResult.valid) {
    if (throwOnError) {
      const err = formatResult.errors[0]
      throw createError(
        err.code,
        err.message,
        err.location as Record<string, unknown>,
      )
    }
    return formatResult
  }

  // Step 2: Semantic validation via load()
  if (checkSemantics) {
    try {
      const { commanders } = loadFen()

      // Check commander counts
      const errors: ValidationError[] = []
      if (commanders.r === -1) {
        errors.push({
          code: ErrorCode.FEN_INVALID_FORMAT,
          message: 'Expected 1 red commander, found 0',
          category: 'semantic',
        })
      }
      if (commanders.b === -1) {
        errors.push({
          code: ErrorCode.FEN_INVALID_FORMAT,
          message: 'Expected 1 blue commander, found 0',
          category: 'semantic',
        })
      }
      if (errors.length > 0) {
        if (throwOnError) {
          throw createError(errors[0].code, errors[0].message)
        }
        return { valid: false, errors }
      }
    } catch (e) {
      const result = errorToResult(e)
      if (throwOnError) {
        throw e
      }
      return result
    }
  }

  return { valid: true, errors: [] }
}
