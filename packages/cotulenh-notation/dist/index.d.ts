import type { Square, CoTuLenh } from '@repo/cotulenh-core';
import type { Key } from '@repo/cotulenh-board/types';
export type NumericCoordinate = Key;
/**
 * Converts a numeric coordinate (e.g., '0-0', '10-11') to algebraic notation.
 * @param coord The numeric coordinate key ('fileIndex-rankIndex').
 * @returns The corresponding algebraic square (e.g., 'a12', 'k1') or null if invalid.
 */
export declare function numericToAlgebraic(coord: NumericCoordinate): Square | null;
/**
 * Converts an algebraic square notation to the numeric coordinate key.
 * @param sq The algebraic square (e.g., 'a12', 'k1').
 * @returns The corresponding numeric coordinate ('fileIndex-rankIndex') or null if invalid.
 */
export declare function algebraicToNumeric(sq: Square): NumericCoordinate | null;
export declare function toDests(chess: CoTuLenh): Map<Key, Key[]>;
