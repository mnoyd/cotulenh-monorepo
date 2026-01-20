import type { Lesson } from '../types';

export const piecesLessons: Lesson[] = [
  {
    id: 'pieces-1',
    category: 'pieces',
    title: 'The Tank',
    description: 'Master the powerful Tank unit',
    difficulty: 1,
    startFen: '11/11/11/11/11/5T5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/5T5/11/11/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The Tank moves up to 2 squares orthogonally (up, down, left, right). Move the Tank two squares forward!',
    hint: 'Click the Tank and move it two squares straight up.',
    successMessage: 'Excellent! Tanks can move 1 or 2 squares in a straight line.'
  },
  {
    id: 'pieces-2',
    category: 'pieces',
    title: 'The Artillery',
    description: 'Learn the long-range Artillery',
    difficulty: 2,
    startFen: '11/11/11/11/11/5A5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '5A5/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Artillery can move any number of squares orthogonally, like a Rook in chess. Move it to the top of the board!',
    hint: 'Move the Artillery all the way up in a straight line to rank 12.',
    successMessage: 'Artillery has unlimited range in straight lines!'
  },
  {
    id: 'pieces-3',
    category: 'pieces',
    title: 'The Air Force',
    description: 'Command the skies with Air Force',
    difficulty: 2,
    startFen: '11/11/11/11/11/5F5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '10F/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
    instruction: 'The Air Force can fly anywhere on the board! Fly it to the far corner at k12.',
    hint: 'Air Force ignores terrain and other pieces. Click and move directly to k12.',
    successMessage: 'Amazing! Air Force has ultimate mobility - it can reach any square.'
  }
];
