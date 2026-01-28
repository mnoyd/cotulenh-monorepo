import type { Lesson } from '../../types';

export const captureLessons: Lesson[] = [
  {
    id: 'capture-1',
    category: 'basics',
    subjectId: 'subject-3-capture',
    sectionId: 'section-1-capture-basics',
    title: 'Normal Capture',
    description: 'Capture by moving onto an enemy piece.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/4i6/4I6/11/11/11/11 r - - 0 1',
    instruction:
      'Normal capture means you move onto the enemy square. Capture the enemy directly above you.',
    hint: 'Move the Infantry from e5 to e6 to capture.',
    successMessage: 'Nice! Normal captures replace the enemy on its square.',
    targetSquares: ['e6'],
    showValidMoves: true
  },
  {
    id: 'capture-2',
    category: 'basics',
    subjectId: 'subject-3-capture',
    sectionId: 'section-1-capture-basics',
    title: 'Stay Capture',
    description: 'Destroy a target without leaving your square.',
    difficulty: 2,
    startFen: '11/11/11/11/3t7/11/11/11/11/11/3A7/11 r - - 0 1',
    goalFen: '11/11/11/11/11/11/11/11/11/11/3A7/11 r - - 0 1',
    instruction:
      'Stay capture destroys the target but the attacker stays. Use Artillery to destroy the target on d8 without moving.',
    hint: 'Choose the stay-capture option when you attack the target square.',
    successMessage: 'Perfect! Stay captures remove the enemy while you hold position.',
    showValidMoves: true
  },
  {
    id: 'capture-3',
    category: 'basics',
    subjectId: 'subject-3-capture',
    sectionId: 'section-1-capture-basics',
    title: 'Capture Across the River',
    description: 'Tanks can capture across the river.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/4i6/11/4T6/11/11/11 r - - 0 1',
    instruction:
      'The river divides ranks 6 and 7. Tanks can cross and capture across it. Capture the enemy at e7.',
    hint: 'From e5, the Tank can move two squares to e7.',
    successMessage: 'Great! The Tank crossed the river to capture.',
    targetSquares: ['e7'],
    showValidMoves: true
  },
  {
    id: 'capture-4',
    category: 'basics',
    subjectId: 'subject-3-capture',
    sectionId: 'section-1-capture-basics',
    title: 'Air Force Capture',
    description: 'Air Force captures using its long-range flight.',
    difficulty: 2,
    startFen: '11/11/11/5i5/11/11/11/5F5/11/11/11/11 r - - 0 1',
    instruction:
      'Air Force can capture within its flight range, ignoring terrain and blocking. Capture the target on f8.',
    hint: 'Move the Air Force straight up to f8 to capture.',
    successMessage: 'Excellent! Air Force captures from long range.',
    targetSquares: ['f8'],
    showValidMoves: true
  }
];
