import type { Lesson } from '../types';

export const basicsLessons: Lesson[] = [
  {
    id: 'basics-1',
    category: 'basics',
    title: 'Infantry Movement',
    description: 'Learn how to move the Infantry',
    difficulty: 1,
    startFen: '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5I5/11/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Infantry one square forward.',
    hint: 'Drag the Infantry to the highlighted square.',
    successMessage: 'Great! Infantry moves 1 square orthogonally.',
    targetSquares: ['f8']
  },
  {
    id: 'basics-2',
    category: 'basics',
    title: 'Commander Movement',
    description: 'Learn how to move the Commander',
    difficulty: 1,
    startFen: '11/11/11/11/11/5C5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5C5/11/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Commander one square forward.',
    hint: 'Drag the Commander to the highlighted square.',
    successMessage: 'Well done! The Commander moves 1 square in any direction.',
    targetSquares: ['f8']
  },
  {
    id: 'basics-3',
    category: 'basics',
    title: 'Militia Movement',
    description: 'Learn how to move the Militia',
    difficulty: 1,
    startFen: '11/11/11/11/11/5M5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/6M4/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Militia one square diagonally.',
    hint: 'Drag the Militia to the highlighted square.',
    successMessage: 'Nice! Militia moves 1 square in any direction.',
    targetSquares: ['g7']
  },
  {
    id: 'basics-4',
    category: 'basics',
    title: 'Engineer Movement',
    description: 'Learn how to move the Engineer',
    difficulty: 1,
    startFen: '11/11/11/11/11/5E5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5E5/11/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Engineer one square forward.',
    hint: 'Drag the Engineer to the highlighted square.',
    successMessage: 'Good job! Engineers move 1 square orthogonally.',
    targetSquares: ['f8']
  },
  {
    id: 'basics-5',
    category: 'basics',
    title: 'Anti-Air Movement',
    description: 'Learn how to move the Anti-Air',
    difficulty: 1,
    startFen: '11/11/11/11/11/5Y5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5Y5/11/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Anti-Air one square forward.',
    hint: 'Drag the Anti-Air to the highlighted square.',
    successMessage: 'Great! Anti-Air moves 1 square orthogonally.',
    targetSquares: ['f8']
  },
  {
    id: 'basics-6',
    category: 'basics',
    title: 'Headquarters',
    description: 'Headquarters cannot move',
    difficulty: 1,
    startFen: '11/11/11/11/11/5H5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/5H5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'The Headquarters is immobile. Click anywhere to complete the lesson.',
    hint: 'Just click anywhere.',
    successMessage: 'Correct! Headquarters cannot move.',
    optimalMoves: 0
  }
];
