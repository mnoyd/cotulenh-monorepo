/**
 * Re-export constants from types
 * This module provides convenient access to all constants
 */

export * from '../types/Constants.js'

// Starting position FEN
export const DEFAULT_POSITION =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r g1,g12 1 0'

// Piece display names
export const PIECE_NAMES: Record<string, string> = {
  c: 'Commander',
  i: 'Infantry',
  t: 'Tank',
  m: 'Militia',
  e: 'Engineer',
  a: 'Artillery',
  g: 'Anti-Air',
  s: 'Missile',
  f: 'Air Force',
  n: 'Navy',
  h: 'Headquarter',
}
