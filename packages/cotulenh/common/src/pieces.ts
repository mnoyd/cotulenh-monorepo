export const COMMANDER = 'c' as const;
export const INFANTRY = 'i' as const;
export const TANK = 't' as const;
export const MILITIA = 'm' as const;
export const ENGINEER = 'e' as const;
export const ARTILLERY = 'a' as const;
export const ANTI_AIR = 'g' as const;
export const MISSILE = 's' as const;
export const AIR_FORCE = 'f' as const;
export const NAVY = 'n' as const;
export const HEADQUARTER = 'h' as const;

export const PIECE_SYMBOLS = [
  COMMANDER,
  INFANTRY,
  TANK,
  MILITIA,
  ENGINEER,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
  AIR_FORCE,
  NAVY,
  HEADQUARTER
] as const;

export type PieceSymbol = (typeof PIECE_SYMBOLS)[number];

export const ROLE_COMMANDER = 'commander' as const;
export const ROLE_INFANTRY = 'infantry' as const;
export const ROLE_TANK = 'tank' as const;
export const ROLE_MILITIA = 'militia' as const;
export const ROLE_ENGINEER = 'engineer' as const;
export const ROLE_ARTILLERY = 'artillery' as const;
export const ROLE_ANTI_AIR = 'anti_air' as const;
export const ROLE_MISSILE = 'missile' as const;
export const ROLE_AIR_FORCE = 'air_force' as const;
export const ROLE_NAVY = 'navy' as const;
export const ROLE_HEADQUARTER = 'headquarter' as const;

export const ROLES = [
  ROLE_COMMANDER,
  ROLE_INFANTRY,
  ROLE_TANK,
  ROLE_MILITIA,
  ROLE_ENGINEER,
  ROLE_ARTILLERY,
  ROLE_ANTI_AIR,
  ROLE_MISSILE,
  ROLE_AIR_FORCE,
  ROLE_NAVY,
  ROLE_HEADQUARTER
] as const;

export type Role = (typeof ROLES)[number];

export const Role = {
  Commander: ROLE_COMMANDER,
  Infantry: ROLE_INFANTRY,
  Tank: ROLE_TANK,
  Militia: ROLE_MILITIA,
  Engineer: ROLE_ENGINEER,
  Artillery: ROLE_ARTILLERY,
  AntiAir: ROLE_ANTI_AIR,
  Missile: ROLE_MISSILE,
  AirForce: ROLE_AIR_FORCE,
  Navy: ROLE_NAVY,
  Headquarter: ROLE_HEADQUARTER
} as const;

export const SYMBOL_TO_ROLE: Record<PieceSymbol, Role> = {
  [COMMANDER]: ROLE_COMMANDER,
  [INFANTRY]: ROLE_INFANTRY,
  [TANK]: ROLE_TANK,
  [MILITIA]: ROLE_MILITIA,
  [ENGINEER]: ROLE_ENGINEER,
  [ARTILLERY]: ROLE_ARTILLERY,
  [ANTI_AIR]: ROLE_ANTI_AIR,
  [MISSILE]: ROLE_MISSILE,
  [AIR_FORCE]: ROLE_AIR_FORCE,
  [NAVY]: ROLE_NAVY,
  [HEADQUARTER]: ROLE_HEADQUARTER
};

export const ROLE_TO_SYMBOL: Record<Role, PieceSymbol> = {
  [ROLE_COMMANDER]: COMMANDER,
  [ROLE_INFANTRY]: INFANTRY,
  [ROLE_TANK]: TANK,
  [ROLE_MILITIA]: MILITIA,
  [ROLE_ENGINEER]: ENGINEER,
  [ROLE_ARTILLERY]: ARTILLERY,
  [ROLE_ANTI_AIR]: ANTI_AIR,
  [ROLE_MISSILE]: MISSILE,
  [ROLE_AIR_FORCE]: AIR_FORCE,
  [ROLE_NAVY]: NAVY,
  [ROLE_HEADQUARTER]: HEADQUARTER
};
