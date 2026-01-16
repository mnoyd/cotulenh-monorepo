import type { Lesson } from '../types';

export const terrainLessons: Lesson[] = [
  {
    id: 'terrain-1',
    category: 'terrain',
    title: 'Land and Water',
    description: 'Understand terrain restrictions',
    difficulty: 1,
    steps: [
      {
        fen: '11/11/11/11/11/2N8/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'The Navy (N) can only move in water zones: files a, b, c and the river. Move the Navy to the left!',
        expectedMoves: [
          { from: 'c6', to: 'b6' },
          { from: 'c6', to: 'a6' }
        ],
        hint: 'Navy pieces stay in the water. Move toward files a or b.',
        successMessage: 'Navy controls the seas! They cannot venture onto land (files d-k).'
      },
      {
        fen: '11/11/11/11/11/4T6/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'Land units like Tanks cannot enter water zones (files a-b). Move the Tank to the right!',
        expectedMoves: [
          { from: 'e6', to: 'f6' },
          { from: 'e6', to: 'g6' }
        ],
        hint: 'Move the Tank toward the center of the board, away from the water.',
        successMessage: 'Land units dominate the battlefield but cannot swim!'
      }
    ]
  },
  {
    id: 'terrain-2',
    category: 'terrain',
    title: 'The River',
    description: 'Cross the river strategically',
    difficulty: 2,
    steps: [
      {
        fen: '11/11/11/11/11/5T5/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'The river divides the board between ranks 6 and 7. Regular pieces can cross. Move the Tank across!',
        expectedMoves: [{ from: 'f6', to: 'f7' }],
        hint: 'Move north across the river into enemy territory.',
        successMessage:
          'Tanks and most units can cross the river freely using bridges at f6-f7 and h6-h7.'
      },
      {
        fen: '11/11/11/11/11/11/5F5/11/11/11/11/11 r - - 0 1',
        instruction:
          "The Air Force doesn't care about terrain - it flies over everything! Fly to the enemy's back rank.",
        expectedMoves: [{ from: 'f7', to: 'f12' }],
        hint: 'Air Force ignores all terrain restrictions. Fly directly to rank 12.',
        successMessage: 'Air superiority! The Air Force dominates from above.'
      }
    ]
  }
];
