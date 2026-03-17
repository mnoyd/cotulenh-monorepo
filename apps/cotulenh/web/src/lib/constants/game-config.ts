export const TIME_CONTROL_PRESETS = {
  bullet: { initial: 60, increment: 0 },
  blitz: { initial: 180, increment: 2 },
  rapid: { initial: 600, increment: 5 },
  classical: { initial: 1800, increment: 10 }
} as const;

export const FORFEIT_WINDOW_SECONDS = 60;

export const DEPLOY_RULES = {
  maxDeployTimeSeconds: 120,
  maxPiecesPerZone: 16
} as const;

export const TEAM_COLORS = {
  red: 'hsl(0, 70%, 50%)',
  blue: 'hsl(210, 70%, 50%)'
} as const;
