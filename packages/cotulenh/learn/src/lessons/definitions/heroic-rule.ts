import type { Lesson } from '../../types';

export const heroicPromotionLessons: Lesson[] = [
  {
    id: 'heroic-rule-1',
    category: 'heroic',
    subjectId: 'subject-8-heroic-rule',
    sectionId: 'section-1-heroic-promotion',
    title: 'Promote by Giving Check',
    description: 'Any piece that gives check becomes heroic immediately.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/4c6/11/4I6/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/11/4c6/4+I6/11/11/11/11 r - - 0 1',
    instruction: 'Move the Infantry from e4 to e5 to give check to the Commander on e6.',
    hint: 'From e5, the Infantry attacks the Commander on e6 and becomes heroic (+I).',
    successMessage: 'Great! Giving check promoted your Infantry to heroic.',
    targetSquares: ['e5'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];

export const heroicMovementLessons: Lesson[] = [
  {
    id: 'heroic-rule-2',
    category: 'heroic',
    subjectId: 'subject-8-heroic-rule',
    sectionId: 'section-2-heroic-movement',
    title: 'Move as Heroic',
    description: 'Heroic Infantry moves 2 squares instead of 1.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/4+I6/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/4+I6/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Move the heroic Infantry from e5 to e7 in one move.',
    hint: 'Heroic Infantry can move 2 squares orthogonally.',
    successMessage: 'Nice! The heroic Infantry used its upgraded range.',
    targetSquares: ['e7'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];
