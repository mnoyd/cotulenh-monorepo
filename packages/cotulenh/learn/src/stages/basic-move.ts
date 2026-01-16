import type { Stage } from '../types';

export const basicMoveStage: Stage = {
  id: 'basic-move',
  title: 'Basic Movement',
  description: 'Learn how pieces move on the board',
  levels: [
    {
      id: 'basic-move-1',
      goal: 'Move the Infantry forward',
      fen: '11/11/11/11/11/11/4I6/11/11/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['normal']
    },
    {
      id: 'basic-move-2',
      goal: 'Move the Commander to the target square',
      fen: '11/11/11/11/11/11/4C6/11/11/11/11/11 r - - 0 1',
      nbMoves: 2,
      allowedMoveTypes: ['normal']
    }
  ]
};
