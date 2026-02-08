import type { PuzzleContentMap } from '../types';

export const enPuzzles: PuzzleContentMap = {
  1: {
    title: 'Commander Capture',
    description: 'Red to move. Find the winning move to capture the blue commander.',
    hint: 'Try to corner the blue commander, mirror their moves, and avoid stalemate.'
  },
  2: {
    title: 'Combined Arms',
    description: 'Must win in 2 moves.',
    hint: 'Double attacks are powerful when you know how to create them.'
  },
  3: {
    title: 'Less vs More',
    description: 'Must win in 3 moves.',
    hint: 'The last piece from each side is auto-promoted.'
  }
};
