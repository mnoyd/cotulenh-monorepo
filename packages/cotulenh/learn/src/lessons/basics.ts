import type { Lesson } from '../types';

export const basicsLessons: Lesson[] = [
  {
    id: 'basics-1',
    category: 'basics',
    title: 'Infantry Movement',
    description: 'Learn how to move the Infantry',
    difficulty: 1,
    startFen: '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Infantry to all highlighted squares.',
    hint: 'Infantry moves 1 square orthogonally (up, down, left, right).',
    successMessage: 'Great! Infantry moves 1 square orthogonally.',
    targetSquares: ['f8', 'f9', 'f10']
  },
  {
    id: 'basics-2',
    category: 'basics',
    title: 'Commander Movement',
    description: 'Learn how to move the Commander',
    difficulty: 1,
    startFen: '11/11/11/11/11/5C5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Commander to all highlighted squares.',
    hint: 'The Commander moves 1 square in any direction.',
    successMessage: 'Well done! The Commander moves 1 square in any direction.',
    targetSquares: ['f8', 'g9']
  },
  {
    id: 'basics-3',
    category: 'basics',
    title: 'Militia Movement',
    description: 'Learn how to move the Militia',
    difficulty: 1,
    startFen: '11/11/11/11/11/5M5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Militia to all highlighted squares.',
    hint: 'Militia moves 1 square in any direction.',
    successMessage: 'Nice! Militia moves 1 square in any direction.',
    targetSquares: ['g8', 'h9']
  },
  {
    id: 'basics-4',
    category: 'basics',
    title: 'Engineer Movement',
    description: 'Learn how to move the Engineer',
    difficulty: 1,
    startFen: '11/11/11/11/11/5E5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Engineer to all highlighted squares.',
    hint: 'Engineers move 1 square orthogonally.',
    successMessage: 'Good job! Engineers move 1 square orthogonally.',
    targetSquares: ['f8', 'g8']
  },
  {
    id: 'basics-5',
    category: 'basics',
    title: 'Anti-Air Movement',
    description: 'Learn how to move the Anti-Air',
    difficulty: 1,
    startFen: '11/11/11/11/11/5Y5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Anti-Air to all highlighted squares.',
    hint: 'Anti-Air moves 1 square orthogonally.',
    successMessage: 'Great! Anti-Air moves 1 square orthogonally.',
    targetSquares: ['f8', 'e8']
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
