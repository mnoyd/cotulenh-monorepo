import type { Lesson } from '../types';

export const basicsLessons: Lesson[] = [
  {
    id: 'basics-1',
    category: 'basics',
    title: 'Moving Infantry',
    description: 'Learn how infantry moves one square at a time',
    difficulty: 1,
    startFen: '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5I5/11/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The Infantry moves one square orthogonally (up, down, left, or right). Move the Infantry one square forward!',
    hint: 'Click the Infantry and drag it one square up toward the enemy side.',
    successMessage: 'Excellent! Infantry advances one square at a time.'
  },
  {
    id: 'basics-2',
    category: 'basics',
    title: 'Capturing Pieces',
    description: 'Learn how to capture enemy pieces',
    difficulty: 1,
    startFen: '11/11/11/11/5i5/5I5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5I5/11/11/11/11/11/11/11 r - - 0 1',
    instruction: "To capture, move your piece to the enemy's square. Capture the blue infantry!",
    hint: 'Move your Infantry (red) onto the enemy infantry (blue) to capture it.',
    successMessage: 'Victory! You captured the enemy piece.'
  },
  {
    id: 'basics-3',
    category: 'basics',
    title: 'The Commander',
    description: 'Protect your Commander at all costs',
    difficulty: 1,
    startFen: '11/11/11/11/11/4iGi4/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5G5/5i5/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The Commander (G) is your most important piece. Capture one enemy infantry and escape!',
    hint: 'The Commander moves one square in any direction. Capture an infantry to create an escape route, then move forward.',
    successMessage:
      'The Commander escaped! Protect your Commander at all costs - if captured, you lose!'
  }
];
