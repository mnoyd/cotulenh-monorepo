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
  },
  {
    id: 'basics-7',
    category: 'basics',
    title: 'Tank Movement',
    description: 'Learn how to move the Tank',
    difficulty: 1,
    startFen: '11/11/11/11/11/5T5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Tank to all highlighted squares.',
    hint: 'The Tank moves up to 2 squares orthogonally (up, down, left, right).',
    successMessage: 'Excellent! Tanks can move 1 or 2 squares in a straight line.',
    targetSquares: ['f8', 'f10', 'e9', 'g9']
  },
  {
    id: 'basics-8',
    category: 'basics',
    title: 'Artillery Movement',
    description: 'Learn how to move the Artillery',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/3A7/11/11/11 r - - 0 1',
    instruction: 'Move the Artillery to all highlighted squares.',
    hint: 'Artillery can move any number of squares orthogonally, like a Rook in chess.',
    successMessage: 'Artillery has unlimited range in straight lines!',
    targetSquares: ['f8', 'f12', 'e9', 'd6']
  },
  {
    id: 'basics-9',
    category: 'basics',
    title: 'Air Force Movement',
    description: 'Learn how to move the Air Force',
    difficulty: 1,
    startFen: '11/11/11/11/11/5F5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Air Force to all highlighted squares.',
    hint: 'Air Force can fly anywhere on the board - it ignores terrain and other pieces.',
    successMessage: 'Amazing! Air Force has ultimate mobility - it can reach any square.',
    targetSquares: ['d3', 'k2', 'k12', 'e11']
  },
  {
    id: 'basics-10',
    category: 'basics',
    title: 'Missile Movement',
    description: 'Learn how to move the Missile',
    difficulty: 1,
    startFen: '11/11/11/11/11/5S5/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the Missile to all highlighted squares.',
    hint: 'Missiles move up to 2 squares orthogonally or 1 square diagonally (circular pattern).',
    successMessage:
      'Great! Missiles have a circular reach: 2 squares straight or 1 square diagonal.',
    targetSquares: ['f8', 'e8', 'g8', 'e9']
  },
  {
    id: 'basics-11',
    category: 'basics',
    title: 'Navy Movement',
    description: 'Learn how to move the Navy',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/11/11/N10/11 r - - 0 1',
    instruction: 'Move the Navy to all highlighted squares.',
    hint: 'Navy ships only move on water (a-b files and coastal areas).',
    successMessage: 'Well done! Navy is essential for controlling water zones.',
    targetSquares: ['c4', 'd6', 'b8', 'b12']
  }
];
