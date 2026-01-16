import type { Stage } from '../types';

export const combineStage: Stage = {
  id: 'combine',
  title: 'Combine Pieces',
  description: 'Learn how to stack pieces together',
  levels: [
    {
      id: 'combine-1',
      goal: 'Combine Infantry with Tank by moving Infantry onto Tank',
      fen: '11/11/11/11/11/11/11/3I7/3T7/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['combine']
    },
    {
      id: 'combine-2',
      goal: 'Load Commander onto Navy',
      fen: '11/11/11/11/11/11/11/3C7/3N7/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['combine']
    }
  ]
};
