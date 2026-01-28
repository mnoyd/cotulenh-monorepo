import type { Lesson } from '../../types';

export const combineBasicsLessons: Lesson[] = [
  {
    id: 'combine-1',
    category: 'combining',
    subjectId: 'subject-6-combine-piece',
    sectionId: 'section-1-combine-basics',
    title: 'Tank Carries Infantry',
    description: 'Combine a Tank with Infantry to form a stack.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/4I6/4T6/11/11/11 r - - 0 1',
    instruction: 'Move the Infantry onto the Tank to combine at e4.',
    hint: 'Select the Infantry on e5 and move to e4.',
    successMessage: 'Good! The Tank becomes the carrier and the Infantry is carried.',
    targetSquares: ['e4'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  },
  {
    id: 'combine-2',
    category: 'combining',
    subjectId: 'subject-6-combine-piece',
    sectionId: 'section-1-combine-basics',
    title: 'Engineer Carries Missile',
    description: 'Engineers can carry heavy equipment like Missiles.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/4S6/11/4E6/11/11/11 r - - 0 1',
    instruction: 'Move the Missile onto the Engineer to combine at e4.',
    hint: 'From e6, the Missile can move down to e4 in two squares.',
    successMessage: 'Correct! The Engineer becomes the carrier for the Missile.',
    targetSquares: ['e4'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  },
  {
    id: 'combine-3',
    category: 'combining',
    subjectId: 'subject-6-combine-piece',
    sectionId: 'section-1-combine-basics',
    title: 'Headquarters Carries Commander',
    description: 'Headquarters can carry the Commander for protection.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/4C6/4H6/11/11/11 r - - 0 1',
    instruction: 'Move the Commander onto the Headquarters at e4.',
    hint: 'The Commander on e5 can move down one square to e4.',
    successMessage: 'Well done! Headquarters becomes the carrier for the Commander.',
    targetSquares: ['e4'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];

export const combineCarrierLessons: Lesson[] = [
  {
    id: 'combine-4',
    category: 'combining',
    subjectId: 'subject-6-combine-piece',
    sectionId: 'section-2-carrier-rules',
    title: 'Navy Carries Air Force',
    description: 'Navy can carry Air Force while staying in water zones.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/2F8/2N8/11/11/11 r - - 0 1',
    instruction: 'Move the Air Force onto the Navy at c4 to combine.',
    hint: 'Air Force moves from c5 to c4 in one step.',
    successMessage: 'Nice! Navy is now the carrier for Air Force.',
    targetSquares: ['c4'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  },
  {
    id: 'combine-5',
    category: 'combining',
    subjectId: 'subject-6-combine-piece',
    sectionId: 'section-2-carrier-rules',
    title: 'Air Force Carries Tank',
    description: 'Air Force can carry a Tank as its first slot.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/5T5/11/5F5/11/11/11 r - - 0 1',
    instruction: 'Move the Tank onto the Air Force at f4 to combine.',
    hint: 'The Tank on f6 can move two squares down to f4.',
    successMessage: 'Great! Air Force becomes the carrier and can transport the Tank.',
    targetSquares: ['f4'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];
