export type PlayerColor = 'red' | 'blue';

export type ClockState = {
  red: number;
  blue: number;
};

export function applyElapsedAndIncrement(params: {
  clocks: ClockState;
  playerColor: PlayerColor;
  elapsedMs: number;
  incrementSeconds?: number;
}): ClockState {
  const { clocks, playerColor, elapsedMs, incrementSeconds = 0 } = params;
  const incrementMs = Math.max(0, incrementSeconds) * 1000;
  const elapsed = Math.max(0, elapsedMs);

  return {
    red: playerColor === 'red' ? Math.max(0, clocks.red - elapsed) + incrementMs : clocks.red,
    blue: playerColor === 'blue' ? Math.max(0, clocks.blue - elapsed) + incrementMs : clocks.blue
  };
}
