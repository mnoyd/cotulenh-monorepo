import type { Square, Move } from '@repo/cotulenh-core';
import { CoTuLenh } from '@repo/cotulenh-core'; // Re-add CoTuLenh import
import type { Color, Key } from '@repo/cotulenh-board/types'; // Import Key type

// --- Constants ---
const FILES = 'abcdefghijk'.split(''); // 11 files
const RANKS = '1,2,3,4,5,6,7,8,9,10,11,12'.split(','); // 12 ranks
const SQUARES = FILES.flatMap(f => RANKS.map(r => `${f}${r}`)) as Square[];

// Type definition for the numeric coordinate system (fileIndex-rankIndex)
export type NumericCoordinate = Key;

/**
 * Converts a numeric coordinate (e.g., '0-0', '10-11') to algebraic notation.
 * @param coord The numeric coordinate key ('fileIndex-rankIndex').
 * @returns The corresponding algebraic square (e.g., 'a12', 'k1') or null if invalid.
 */
export function numericToAlgebraic(coord: NumericCoordinate): Square | null {
  const parts = coord.split('.');
  if (parts.length !== 2) {
    console.error(`Invalid numeric coordinate format: ${coord}`);
    return null;
  }
  const fileIndex = parseInt(parts[0], 10);
  const rankIndex = parseInt(parts[1], 10);

  if (isNaN(fileIndex) || isNaN(rankIndex) || 
      fileIndex < 0 || fileIndex >= FILES.length || 
      rankIndex < 0 || rankIndex >= RANKS.length) {
    console.error(`Invalid indices parsed from numeric coordinate ${coord}: file=${fileIndex}, rank=${rankIndex}`);
    return null;
  }

  return `${FILES[fileIndex]}${RANKS[rankIndex]}` as Square;
}

/**
 * Converts an algebraic square notation to the numeric coordinate key.
 * @param sq The algebraic square (e.g., 'a12', 'k1').
 * @returns The corresponding numeric coordinate ('fileIndex-rankIndex') or null if invalid.
 */
export function algebraicToNumeric(sq: Square): NumericCoordinate | null {
  const fileChar = sq.charAt(0);
  const rankStr = sq.substring(1);

  const fileIndex = FILES.indexOf(fileChar);
  const rankIndex = RANKS.indexOf(rankStr);

  if (fileIndex === -1 || rankIndex === -1) {
    console.error(`Invalid algebraic square: ${sq}`);
    return null;
  }

  // Key format is 'fileIndex-rankIndex'
  return `${fileIndex}.${rankIndex}` as NumericCoordinate;
}

export function toDests(game: CoTuLenh): Map<Key, Key[]> {
  const dests = new Map<NumericCoordinate, Key[]>(); // Use NumericCoordinate (Key) as map key type
  SQUARES.forEach((s) => {
    const numericKey = algebraicToNumeric(s); // Convert algebraic source to numeric key
    if (!numericKey) return; // Skip if conversion fails

    const ms = game.moves({ square: s, verbose: true });
    if (ms.length) {
      // console.log('Valid moves for square', s, ':', ms);
      // Filter for actual Move objects before mapping
      const validMoves = ms
        .filter((m): m is Move => typeof m === 'object' && m !== null && 'to' in m) // Type guard
        .map((m: Move) => algebraicToNumeric(m.to)) // Add type Move to m, Now m is guaranteed to be Move
        .filter(key => key !== undefined) as Key[]; // Keep existing filter for algebraicToNumeric results
      if (validMoves.length > 0) {
        dests.set(numericKey, validMoves);
      }
    }
  });
  return dests;
}

export function numericToAlgebraicPair(orig: NumericCoordinate, dest: NumericCoordinate): [Square, Square] {
  const origSquare = numericToAlgebraic(orig);
  const destSquare = numericToAlgebraic(dest);
  if (!origSquare || !destSquare) {
    throw new Error(`Invalid numeric coordinates: orig=${orig}, dest=${dest}`);
  }
  return [origSquare, destSquare];
}

export function sanMoveToNumericBoard(sanMove: string):string {
  //write me a regex to find algebraic squares in sanMove
  return sanMove.replace(/([a-k]\d)/g, (match) => {
    const numeric = algebraicToNumeric(match);
    if (!numeric) {
      throw new Error(`Invalid SAN move: ${sanMove}`);
    }
    return numeric;
  });
}