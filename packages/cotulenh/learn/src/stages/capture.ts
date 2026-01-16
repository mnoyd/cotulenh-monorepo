import type { Stage } from '../types';

export const captureStage: Stage = {
  id: 'capture',
  title: 'Capturing Pieces',
  description: 'Learn different types of captures',
  levels: [
    {
      id: 'capture-1',
      goal: 'Capture the enemy piece',
      fen: '11/11/11/11/11/11/11/4i6/3I7/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['capture']
    },
    {
      id: 'capture-2',
      goal: 'Learn stay capture - capture without moving',
      fen: '11/11/11/11/11/11/11/4i6/4I6/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['capture']
    }
  ]
};
