import type { Stage } from '../types';

export const advancedCaptureStage: Stage = {
  id: 'advanced-capture',
  title: 'Advanced Captures',
  description: 'Master stay capture and suicide capture',
  levels: [
    {
      id: 'stay-capture-1',
      goal: 'Use stay capture - capture without moving from your square',
      fen: '11/11/11/11/11/11/11/4i6/4I6/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['capture']
    },
    {
      id: 'suicide-capture-1',
      goal: 'Learn suicide capture - both pieces are removed',
      fen: '11/11/11/11/11/11/11/4i6/3I7/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['capture']
    }
  ]
};
