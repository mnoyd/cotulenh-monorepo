import { CoTuLenh } from '@cotulenh/core';

export function positionFromFen(fen: string): [CoTuLenh, null] | [null, Error] {
  try {
    const position = new CoTuLenh(fen);
    return [position, null];
  } catch (error) {
    return [null, error as Error];
  }
}
