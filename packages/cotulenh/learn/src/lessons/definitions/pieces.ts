import type { Lesson } from '../../types';

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
  },
  {
    id: 'pieces-4',
    category: 'pieces',
    title: 'The Missile',
    description: 'Master the Missile circular movement',
    difficulty: 2,
    startFen: '11/11/11/11/11/5S5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/5S5/11/11/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The Missile moves in a unique circular pattern: up to 2 squares straight (orthogonal) or 1 square diagonally. Move the Missile two squares forward!',
    hint: 'Click the Missile and move it two squares straight up (not diagonal).',
    successMessage:
      'Excellent! Missiles have a circular reach: 2 squares in straight lines, 1 square diagonally.',
    targetSquares: ['f9'],
    feedback: {
      targets: {
        reached: 'This is your destination! Move the Missile here.'
      },
      generic: {
        pieceSelected: 'Good! The Missile can move 2 squares orthogonally or 1 diagonally.'
      }
    }
  },
  {
    id: 'pieces-5',
    category: 'pieces',
    title: 'The Navy',
    description: 'Navigate the waters with Navy',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/11/11/11/N10/11 r - - 0 1',
    goalFen: '11/11/11/11/11/11/11/11/11/N10/11/11 r - - 0 1',
    instruction:
      'Navy ships only move on water (a-b files and coastal areas). Move the Navy one square up along the water!',
    hint: 'Navy can only navigate on water. Move it one square up along the a-file.',
    successMessage:
      'Well done! Navy is essential for controlling water zones and supporting coastal operations.',
    targetSquares: ['a3'],
    feedback: {
      targets: {
        reached: 'Move to this water square to complete the lesson!'
      },
      generic: {
        pieceSelected: 'Navy can only move on water tiles (a-b files).'
      }
    }
  }
];
