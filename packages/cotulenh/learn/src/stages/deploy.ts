import type { Stage } from '../types';

export const deployStage: Stage = {
  id: 'deploy',
  title: 'Deploy Moves',
  description: 'Learn how to deploy pieces from carriers',
  levels: [
    {
      id: 'deploy-1',
      goal: 'Deploy the Infantry from the Navy',
      fen: '11/11/11/11/11/11/11/2N(I)6/11/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['deploy']
    },
    {
      id: 'deploy-2',
      goal: 'Deploy the Tank from the Air Force',
      fen: '11/11/11/11/11/11/11/2A(T)6/11/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['deploy']
    }
  ]
};
