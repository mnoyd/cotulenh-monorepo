import type { Stage } from '../types';

export const terrainStage: Stage = {
  id: 'terrain',
  title: 'Terrain Rules',
  description: 'Learn how different pieces move across water and land',
  levels: [
    {
      id: 'terrain-1',
      goal: 'Move Navy through water zones (files a-c)',
      fen: '11/11/11/11/11/11/11/N10/11/11/11/11 r - - 0 1',
      nbMoves: 2,
      allowedMoveTypes: ['normal'],
      terrain: {
        a1: 'river',
        b1: 'river',
        c1: 'river'
      }
    },
    {
      id: 'terrain-2',
      goal: 'Infantry cannot move through water without Navy',
      fen: '11/11/11/11/11/11/11/I10/11/11/11/11 r - - 0 1',
      nbMoves: 1,
      allowedMoveTypes: ['normal']
    },
    {
      id: 'terrain-3',
      goal: 'Air Force can fly over any terrain',
      fen: '11/11/11/11/11/11/11/A10/11/11/11/11 r - - 0 1',
      nbMoves: 2,
      allowedMoveTypes: ['normal']
    }
  ]
};
