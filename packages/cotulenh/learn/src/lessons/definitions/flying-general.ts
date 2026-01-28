import type { Lesson } from '../../types';

export const flyingGeneralLessons: Lesson[] = [
  {
    id: 'flying-general-1',
    category: 'tactics',
    subjectId: 'subject-9-flying-general',
    sectionId: 'section-1-flying-general',
    title: 'Commander Exposure',
    description: 'A commander cannot capture if it would expose a flying general line.',
    difficulty: 2,
    startFen: '11/11/11/11/4c6/11/11/2i1i6/2M1C6/11/11/11 r - - 0 1',
    instruction:
      'The Commander cannot capture the Infantry on e5 without exposing itself. Capture the Infantry on c5 with the Militia.',
    hint: 'Move the Militia from c4 to c5. The Commander on e4 is blocked by the enemy Infantry on e5.',
    successMessage: 'Correct! The militia captures safely while the commander stays protected.',
    targetSquares: ['c5'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];
