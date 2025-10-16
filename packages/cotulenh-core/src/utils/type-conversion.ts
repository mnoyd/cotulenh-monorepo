/**
 * Type conversion utilities between core and board representations
 */

import type { PieceSymbol } from '../types/Constants.js'

// Board role type (from cotulenh-board package)
export type BoardRole =
  | 'commander'
  | 'infantry'
  | 'tank'
  | 'militia'
  | 'engineer'
  | 'artillery'
  | 'anti_air'
  | 'missile'
  | 'air_force'
  | 'navy'
  | 'headquarter'

/**
 * Convert core piece type to board role
 */
export function getRoleFromCoreType(coreType: PieceSymbol): BoardRole {
  const mapping: Record<PieceSymbol, BoardRole> = {
    c: 'commander',
    i: 'infantry',
    t: 'tank',
    m: 'militia',
    e: 'engineer',
    a: 'artillery',
    g: 'anti_air',
    s: 'missile',
    f: 'air_force',
    n: 'navy',
    h: 'headquarter',
  }

  return mapping[coreType]
}

/**
 * Convert board role to core piece type
 */
export function getCoreTypeFromRole(role: BoardRole): PieceSymbol {
  const mapping: Record<BoardRole, PieceSymbol> = {
    commander: 'c',
    infantry: 'i',
    tank: 't',
    militia: 'm',
    engineer: 'e',
    artillery: 'a',
    anti_air: 'g',
    missile: 's',
    air_force: 'f',
    navy: 'n',
    headquarter: 'h',
  }

  return mapping[role]
}
