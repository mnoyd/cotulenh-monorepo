import type { Lesson } from '../types';

export const airDefenseAvoidanceLessons: Lesson[] = [
  {
    id: 'air-defense-1',
    category: 'tactics',
    subjectId: 'subject-5-air-defense',
    sectionId: 'section-1-avoid-air-defense',
    title: 'Avoid Air Defense Zones',
    description: 'Navigate the Air Force around missile coverage to reach multiple targets.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/5s5/11/11/2F8/11/11 r - - 0 1',
    instruction:
      'Move the Air Force to c5, then c7. Avoid the missile air defense zone centered on f6.',
    hint: 'Stay on the c-file. The missile protects squares around f6.',
    successMessage: 'Great! You reached both targets while staying out of air defense.',
    targetSquares: ['c5', 'c7'],
    orderedTargets: true,
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];

export const airDefenseKamikazeLessons: Lesson[] = [
  {
    id: 'air-defense-2',
    category: 'tactics',
    subjectId: 'subject-5-air-defense',
    sectionId: 'section-2-kamikaze',
    title: 'Kamikaze Capture',
    description: 'Air Force can sacrifice itself when passing through a single defense zone.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/4g6/11/11/11/4F6 r - - 0 1',
    goalFen: '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Capture the Anti-Air on e5. The Air Force will be destroyed after the attack.',
    hint: 'Fly straight up from e1 to e5 to trigger a kamikaze capture.',
    successMessage: 'Confirmed: both units are removed after the kamikaze strike.',
    showValidMoves: true,
    validateLegality: true,
    grading: 'none'
  }
];
