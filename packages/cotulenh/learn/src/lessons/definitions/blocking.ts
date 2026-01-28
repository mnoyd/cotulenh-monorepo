import type { Lesson } from '../../types';

export const blockingLessons: Lesson[] = [
  {
    id: 'blocking-1',
    category: 'basics',
    subjectId: 'subject-4-blocking',
    sectionId: 'section-1-block-movement',
    title: 'Tank Is Blocked',
    description: 'Tank cannot move through other pieces.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/4G6/4T6/11/11 r - - 0 1',
    instruction:
      'The Tank on e4 is blocked by the friendly Infantry on e5. Try moving it forward - you can only go to e5 if captured, but you cannot pass through.',
    hint: 'Move the Tank on e4 sideways to d4 or f4 since forward is blocked.',
    successMessage: 'Correct! Tank must go around blocking pieces.',
    targetSquares: ['e5'],
    showValidMoves: true
  },
  {
    id: 'blocking-2',
    category: 'basics',
    subjectId: 'subject-4-blocking',
    sectionId: 'section-1-block-movement',
    title: 'Artillery Is Blocked',
    description: 'Artillery cannot move through other pieces.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/6I4/5A5/11/11 r - - 0 1',
    instruction:
      'The Artillery on e4 is blocked by the friendly Infantry on e5. Even though it is a long range unit, it cannot move through pieces.',
    hint: 'Move the Artillery sideways to d4 or f4.',
    successMessage: 'Good! Artillery needs an open path to move.',
    targetSquares: ['i6'],
    showValidMoves: true
  },
  {
    id: 'blocking-3',
    category: 'basics',
    subjectId: 'subject-4-blocking',
    sectionId: 'section-1-block-movement',
    title: 'Commander Blocked Despite Range',
    description: 'Even the Commander with infinite range cannot pass through pieces.',
    difficulty: 1,
    startFen: '11/11/3ig6/11/11/11/4I6/11/4C6/11/11/11 r - - 0 1',
    instruction:
      'The Commander has unlimited movement range but cannot move through the Infantry at e7. Move the Commander sideways or backwards.',
    hint: 'The Commander can move to d5, f5, or any empty square not blocked by Infantry.',
    successMessage: 'Right! Even the Commander respects blocking.',
    targetSquares: ['i4', 'd12', 'e8'],
    showValidMoves: true
  }
];

export const unblockedLessons: Lesson[] = [
  {
    id: 'blocking-4',
    category: 'basics',
    subjectId: 'subject-4-blocking',
    sectionId: 'section-2-blocking-capture',
    title: 'Tank Shoots Over Blockers',
    description: 'Tank cannot move through pieces but CAN capture through them.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/4i6/4I6/4T6/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/11/4T6/4I6/11/11/11/11 r - - 0 1',
    instruction:
      'The Tank at e4 cannot move through the Infantry at e5, but it CAN capture the enemy at e7 by shooting over the blocker.',
    hint: 'Select the Tank and capture the enemy infantry at e7.',
    successMessage: 'Excellent! Tank shoots over friendly pieces to capture.',
    showValidMoves: true
  },
  {
    id: 'blocking-5',
    category: 'basics',
    subjectId: 'subject-4-blocking',
    sectionId: 'section-2-blocking-capture',
    title: 'Artillery Long-Range Strike',
    description: 'Artillery ignores blocking for captures.',
    difficulty: 2,
    startFen: '11/11/11/11/4i6/11/4I6/11/4A6/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/4A6/11/4I6/11/11/11/11/11 r - - 0 1',
    instruction:
      'Artillery at e4 can capture the enemy at e8 despite the friendly Infantry at e6. Shoot over the blocker!',
    hint: 'Artillery range is 3 squares and ignores blocking for capture.',
    successMessage: 'Perfect! Artillery strikes through defensive lines.',
    showValidMoves: true
  },
  {
    id: 'blocking-6',
    category: 'basics',
    subjectId: 'subject-4-blocking',
    sectionId: 'section-2-blocking-capture',
    title: 'Air Force Flies Over All',
    description: 'Air Force ignores all blocking for both movement AND capture.',
    difficulty: 2,
    startFen: '11/11/11/5i5/5I5/5I5/5F5/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/5F5/5I5/5I5/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Air Force at f6 can fly over both friendly Infantry pieces to capture the enemy at f9. Air ignores all blocking!',
    hint: 'Select Air Force and capture the enemy at f9.',
    successMessage: 'Outstanding! Air Force bypasses all ground obstacles.',
    showValidMoves: true
  },
  {
    id: 'blocking-7',
    category: 'basics',
    subjectId: 'subject-4-blocking',
    sectionId: 'section-2-blocking-capture',
    title: 'Navy Moves Through Pieces',
    description: 'Navy can move and capture through other pieces in water.',
    difficulty: 2,
    startFen: '11/11/11/11/N10/11/N10/11/n10/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/N10/11/11/11/N10/11/11/11 r - - 0 1',
    instruction:
      'The Navy at a6 can move through the friendly Navy at a8 to capture the enemy at a4. Navy ignores blocking.',
    hint: 'Select the Navy at a6 and capture at a4.',
    successMessage: 'Excellent! Navy navigates freely through congested waters.',
    showValidMoves: true
  },
  {
    id: 'blocking-8',
    category: 'basics',
    subjectId: 'subject-4-blocking',
    sectionId: 'section-2-blocking-capture',
    title: 'Missile Shoots Over',
    description: 'Missile can capture through blocking pieces.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/4i6/4I6/4S6/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/11/4S6/4I6/11/11/11/11 r - - 0 1',
    instruction:
      'The Missile at e4 can shoot over the friendly Infantry at e5 to capture the enemy at e7.',
    hint: 'Missile range is 2 and ignores blocking for capture.',
    successMessage: 'Great! Missile strikes through obstacles.',
    showValidMoves: true
  }
];
