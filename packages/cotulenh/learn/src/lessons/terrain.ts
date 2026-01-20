import type { Lesson } from '../types';

export const terrainLessons: Lesson[] = [
  {
    id: 'terrain-1',
    category: 'terrain',
    title: 'Land and Water',
    description: 'Understand terrain restrictions',
    difficulty: 1,
    startFen: '11/11/11/11/11/2N8/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/N10/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The Navy (N) can only move in water zones: files a, b, c and the river. Move the Navy to the left edge!',
    hint: 'Navy pieces stay in the water. Move toward file a.',
    successMessage: 'Navy controls the seas! They cannot venture onto land (files d-k).'
  },
  {
    id: 'terrain-2',
    category: 'terrain',
    title: 'The River',
    description: 'Cross the river strategically',
    difficulty: 2,
    startFen: '11/11/11/11/11/5T5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5T5/11/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The river divides the board between ranks 6 and 7. Move the Tank across the river into enemy territory!',
    hint: 'Move north across the river. Tanks can cross at bridges on f6-f7 and h6-h7.',
    successMessage: 'Tanks and most land units can cross the river freely using the bridges.'
  }
];
