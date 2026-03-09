import type { Subject, Section, Lesson } from '../../../types';

// Introduction content is now managed via i18n system (en.ts, vi.ts)
// This serves as fallback - translations are applied at runtime
const subject8Introduction = '';
const section1HeroicPromotionIntro = '';
const section2HeroicMovementIntro = '';
const section3LastGuardIntro = '';

const heroicPromotionLessons: Lesson[] = [
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

const heroicMovementLessons: Lesson[] = [
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

const lastGuardLessons: Lesson[] = [
  {
    id: 'heroic-rule-3',
    category: 'heroic',
    subjectId: 'subject-8-heroic-rule',
    sectionId: 'section-3-last-guard',
    title: 'Last Guard Promotion',
    description:
      'When a side is reduced to Commander plus one non-commander atomic piece, that final guard becomes heroic.',
    difficulty: 2,
    startFen: '6c4/11/11/11/11/11/11/11/11/3t7/3I1I5/4C6 b - - 0 1',
    goalFen: '6c4/11/11/11/11/11/11/11/11/11/3+t1+I5/4C6 r - - 0 2',
    instruction:
      'Move the blue Tank from d3 to d2 to capture the red Infantry. The last remaining red guard on f2 should promote automatically.',
    hint:
      'After the capture on d2, Red is reduced to Commander + 1 non-commander atomic piece, so the Infantry on f2 becomes +I.',
    successMessage: 'Correct! Last Guard promoted the remaining Infantry on f2 to heroic.',
    skipLastGuard: false,
    targetSquares: ['d2'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];

const section1: Section = {
  id: 'section-1-heroic-promotion',
  title: 'Heroic Promotion',
  description: 'Give check to promote a piece to heroic status.',
  introduction: section1HeroicPromotionIntro,
  lessons: heroicPromotionLessons
};

const section2: Section = {
  id: 'section-2-heroic-movement',
  title: 'Heroic Movement',
  description: 'Use upgraded movement after promotion.',
  introduction: section2HeroicMovementIntro,
  lessons: heroicMovementLessons
};

const section3: Section = {
  id: 'section-3-last-guard',
  title: 'Last Guard',
  description: 'See how the final remaining guard auto-promotes to heroic status.',
  introduction: section3LastGuardIntro,
  lessons: lastGuardLessons
};

export const subject8HeroicRule: Subject = {
  id: 'subject-8-heroic-rule',
  title: 'Heroic Rule',
  description: 'Promote pieces by giving check, understand Last Guard, and use heroic movement.',
  icon: '⭐',
  introduction: subject8Introduction,
  prerequisites: ['subject-3-capture'],
  sections: [section1, section2, section3]
};
