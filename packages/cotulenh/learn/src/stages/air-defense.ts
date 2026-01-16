import type { Stage } from '../types';

export const airDefenseStage: Stage = {
  id: 'air-defense',
  title: 'Air Defense',
  description: 'Learn how Anti-Air units control airspace',
  levels: [
    {
      id: 'air-defense-1',
      goal: 'Air Force cannot enter Anti-Air zone',
      fen: '11/11/11/11/11/11/11/4a6/11/A10/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['normal']
    },
    {
      id: 'air-defense-2',
      goal: 'Capture the Anti-Air to clear airspace',
      fen: '11/11/11/11/11/11/11/4a6/11/A10/11/11 r - - 0 1',
      nbMoves: 2,
      allowedMoveTypes: ['normal', 'capture']
    }
  ]
};
