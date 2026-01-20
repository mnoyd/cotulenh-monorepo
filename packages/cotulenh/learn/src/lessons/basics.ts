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
    successMessage: 'Excellent! Infantry advances one square at a time.',
    targetSquares: ['f8']
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
    successMessage: 'Victory! You captured the enemy piece.',
    targetSquares: ['f8']
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
      'The Commander escaped! Protect your Commander at all costs - if captured, you lose!',
    targetSquares: ['e7', 'g7']
  },
  {
    id: 'basics-4',
    category: 'basics',
    title: 'The Militia',
    description: 'Militia moves in all 8 directions',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/5M5/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/6M4/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The Militia is versatile - it moves one square in ANY direction, including diagonally! Move the Militia diagonally forward-right.',
    hint: 'Click the Militia and move it one square diagonally (up and to the right).',
    successMessage:
      'Perfect! Militia can move in all 8 directions, making them great for close defense.',
    targetSquares: ['g7']
  },
  {
    id: 'basics-5',
    category: 'basics',
    title: 'The Engineer',
    description: 'Engineers move like Infantry',
    difficulty: 1,
    startFen: '11/11/11/11/11/5E5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5E5/11/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The Engineer moves one square at a time, just like Infantry. Engineers are crucial for building fortifications. Move the Engineer forward!',
    hint: 'Click the Engineer and move it one square up.',
    successMessage: 'Excellent! Engineers move one square orthogonally and can construct defenses.',
    targetSquares: ['f8']
  },
  {
    id: 'basics-6',
    category: 'basics',
    title: 'The Anti-Air',
    description: 'Anti-Air defends against air threats',
    difficulty: 1,
    startFen: '11/11/11/11/11/5Y5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5Y5/11/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Anti-Air units protect your forces from enemy Air Force. They move one square at a time. Move the Anti-Air unit forward!',
    hint: 'Click the Anti-Air unit and move it one square up.',
    successMessage: 'Well done! Anti-Air units are essential for defending against air attacks.',
    targetSquares: ['f8']
  },
  {
    id: 'basics-7',
    category: 'basics',
    title: 'The Headquarters',
    description: 'Headquarters is immobile',
    difficulty: 1,
    startFen: '11/11/11/11/11/5H5/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/5H5/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'The Headquarters is your base - it cannot move. Your mission is to protect it at all costs. Since HQ cannot move, just click anywhere to complete this lesson.',
    hint: 'Headquarters stays in place. Click any empty square or just wait to complete the lesson.',
    successMessage:
      'Correct! The Headquarters cannot move. It must be defended by your other pieces.',
    // This lesson is special - goalFen matches startFen, so any "move" that returns to same state passes
    // We'll use optimalMoves: 0 to indicate instant completion
    optimalMoves: 0
  }
];
