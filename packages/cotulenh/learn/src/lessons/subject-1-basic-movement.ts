import type { Subject, Section, Lesson } from '../types';
import type { LearnEngine } from '../learn-engine';
import {
  subject1Introduction,
  section1BasicUnitsIntro,
  section2MediumRangeIntro,
  section3AdvancedUnitsIntro
} from '../content';

/**
 * Subject 1: Basic Movement
 *
 * Comprehensive introduction to unit movement in Cotulenh.
 * Covers all 11 piece types with guided exercises.
 */

const INTERACTION_COMPLETION = (engine: LearnEngine) => engine.interactionCount > 0;
const MOVES_COMPLETION = (engine: LearnEngine) => engine.moveCount > 0;

// ============================================================
// SECTION 1: Basic Unit Movement (1-square pieces)
// ============================================================

const section1Lessons: Lesson[] = [
  {
    id: 'bm-1-1',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-1-basic-units',
    title: 'Infantry Movement',
    description: 'The Infantry is a basic ground unit that moves 1 square orthogonally.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/2I8/11/11/11/11 r - - 0 1',
    instruction:
      'Click that Infantry and move to any valid square (highlighted). Infantry moves 1 square orthogonally (up, down, left, right).',
    hint: 'Try moving the Infantry straight up, down, left, or right - but only 1 square at a time.',
    successMessage: 'Perfect! Infantry moves 1 square orthogonally.',
    targetSquares: ['c4', 'c6', 'd5'],
    showValidMoves: true,
    showMoveCount: true,
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  },
  {
    id: 'bm-1-2',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-1-basic-units',
    title: 'Engineer Movement',
    description:
      'Engineers are support units with the same movement as Infantry - 1 square orthogonally.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/3E7/11/11/11/11 r - - 0 1',
    instruction: 'Move the Engineer to any valid square. Engineers move 1 square orthogonally.',
    hint: 'Engineers move exactly like Infantry - straight lines, 1 square at a time.',
    successMessage: 'Excellent! Engineers share the same movement as Infantry.',
    targetSquares: ['c5', 'd4', 'd6', 'e5'],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  },
  {
    id: 'bm-1-3',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-1-basic-units',
    title: 'Militia Movement',
    description:
      'Militia units are versatile and can move in all 8 directions, 1 square at a time.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/6M4/11/11/11/11 r - - 0 1',
    instruction:
      'Move the Militia. Militia can move in all directions - orthogonally AND diagonally.',
    hint: 'Militia is more flexible than Infantry. Try moving diagonally as well as straight.',
    successMessage: 'Great! Militia moves in all 8 directions, 1 square at a time.',
    targetSquares: ['f4', 'f5', 'f6', 'g4', 'g6', 'h4', 'h5', 'h6'],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  },
  {
    id: 'bm-1-4',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-1-basic-units',
    title: 'Commander Movement',
    description:
      'The Commander is a special piece that moves unlimited squares orthogonally but only 1 square to capture.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/11/11/11/11/6C4 r - - 0 1',
    instruction:
      'Move the Commander. The Commander can move unlimited squares orthogonally (like the Rook in chess).',
    hint: 'Try moving the Commander all the way to the top or bottom of the board in one move.',
    successMessage:
      'Well done! The Commander has unlimited orthogonal movement - a powerful tactical piece.',
    targetSquares: [
      'c1',
      'd1',
      'e1',
      'f1',
      'g10',
      'g11',
      'g12',
      'g2',
      'g3',
      'g4',
      'g5',
      'g6',
      'g7',
      'g8',
      'g9',
      'h1',
      'i1',
      'j1',
      'k1'
    ],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  },
  {
    id: 'bm-1-5',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-1-basic-units',
    title: 'Headquarters',
    description: 'Headquarters is an immobile piece - it cannot move on the board.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/11/11/5H5/11 r - - 0 1',
    instruction: 'The Headquarters cannot move. Click on it or any square to complete the lesson.',
    hint: 'Headquarters represents your command structure - it stays in place to defend.',
    successMessage: 'Correct! Headquarters is immobile - an important strategic asset to protect.',
    customCompletion: INTERACTION_COMPLETION,
    targetSquares: [],
    grading: 'none'
  }
];

const section1: Section = {
  id: 'section-1-basic-units',
  title: 'Basic Unit Movement',
  description:
    'Master the fundamental movement of 1-square units: Infantry, Engineer, Militia, Commander, and Headquarters.',
  introduction: section1BasicUnitsIntro,
  lessons: section1Lessons
};

// ============================================================
// SECTION 2: Medium Range Units (2-3 squares)
// ============================================================

const section2Lessons: Lesson[] = [
  {
    id: 'bm-2-1',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-2-medium-range',
    title: 'Tank Movement',
    description: 'Tanks are armored units that move up to 2 squares orthogonally.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/5T5/11/11/11 r - - 0 1',
    instruction:
      'Move the Tank. Tanks move up to 2 squares orthogonally - they can move 1 or 2 squares, but not 3 or more.',
    hint: 'Think of the Tank like a more mobile Infantry. It can move 1 or 2 squares in straight lines.',
    successMessage:
      'Excellent! Tanks can move 1 or 2 squares orthogonally, giving them more tactical flexibility.',
    targetSquares: ['d4', 'e4', 'f2', 'f3', 'f5', 'f6', 'g4', 'h4'],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  },
  {
    id: 'bm-2-2',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-2-medium-range',
    title: 'Anti-Air Movement',
    description: 'Anti-Air units move 1 square orthogonally and provide air defense.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/4G6/11/11/11 r - - 0 1',
    instruction:
      'Move the Anti-Air unit. Like Infantry, Anti-Air units move 1 square orthogonally.',
    hint: 'Anti-Air movement is identical to Infantry - straight lines, 1 square at a time.',
    successMessage: 'Good! Anti-Air units move like Infantry, but provide crucial air defense.',
    targetSquares: ['d4', 'e3', 'e5', 'f4'],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  },
  {
    id: 'bm-2-3',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-2-medium-range',
    title: 'Missile Movement',
    description:
      'Missiles have a unique circular movement pattern: 2 squares orthogonally or 1 square diagonally.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/11/11/6S4/11/11 r - - 0 1',
    instruction:
      'Move the Missile. Missiles have a circular reach pattern: up to 2 squares straight OR 1 square diagonal.',
    hint: 'Imagine a circle around the Missile - it can reach the outer edges of that circle.',
    successMessage:
      'Perfect! Missiles have a unique circular reach - useful for varied tactical positioning.',
    targetSquares: ['e3', 'f2', 'f3', 'f4', 'g1', 'g2', 'g4', 'g5', 'h2', 'h3', 'h4', 'i3'],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  }
];

const section2: Section = {
  id: 'section-2-medium-range',
  title: 'Medium Range Units',
  description: 'Learn the movement of units with 2-3 square range: Tanks, Anti-Air, and Missiles.',
  introduction: section2MediumRangeIntro,
  lessons: section2Lessons
};

// ============================================================
// SECTION 3: Advanced Units (Long Range & Special)
// ============================================================

const section3Lessons: Lesson[] = [
  {
    id: 'bm-3-1',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-3-advanced-units',
    title: 'Artillery Movement',
    description: 'Artillery can move unlimited squares orthogonally, ignoring blocking pieces.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/11/11/3A7/11/11 r - - 0 1',
    instruction:
      'Move the Artillery. Artillery can move any number of squares orthogonally, like the Rook in chess. It can shoot over obstacles!',
    hint: 'Think of Artillery as a long-range unit. It can move across the entire board in straight lines.',
    successMessage: 'Excellent! Artillery has unlimited orthogonal range - a powerful ranged unit.',
    targetSquares: [
      'c3',
      'd1',
      'd2',
      'd4',
      'd5',
      'd6',
      'e3',
      'f3',
      'g3',
      'h3',
      'c2',
      'e2',
      'c4',
      'e4',
      'f5',
      'g6',
      'f1'
    ],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  },
  {
    id: 'bm-3-2',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-3-advanced-units',
    title: 'Air Force Movement',
    description:
      'Air Force units can fly to any LAND square within range 4, ignoring terrain and other pieces.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/11/11/11/4F6/11 r - - 0 1',
    instruction:
      'Move the Air Force. Air Force can reach any land square within distance 4, ignoring obstacles!',
    hint: 'Air Force has great mobility (range 4) and ignores obstacles, but cannot land on water (files a-b).',
    successMessage: 'Amazing! Air Force is a versatile unit with high mobility and range.',
    // Target squares are limited to Range 4 and Land squares (c-k files)
    targetSquares: [
      'c2',
      'c4',
      'd1',
      'd2',
      'd3',
      'e1',
      'e3',
      'e4',
      'e5',
      'e6',
      'f1',
      'f2',
      'f3',
      'g2',
      'g4',
      'h2',
      'h5',
      'i2',
      'i6'
    ],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  },
  {
    id: 'bm-3-3',
    category: 'basics',
    subjectId: 'subject-1-basic-movement',
    sectionId: 'section-3-advanced-units',
    title: 'Navy Movement',
    description:
      'Navy units move in water zones (files a-b and coastal areas). They have 4-square range in all directions.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/11/2N8/11/11/11 r - - 0 1',
    instruction:
      'Move the Navy ship. Navy can only move in water zones: files a-b and the coastal c-file. It has a 4-square range in all directions within these zones.',
    hint: "Navy is restricted to water. Look at files a, b, and c - that's where Navy operates.",
    successMessage:
      'Well done! Navy controls the water zones - essential for naval dominance and strategic defense.',
    targetSquares: ['a2', 'a4', 'a6', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c5', 'c6', 'c7', 'c8'],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  }
];

const section3: Section = {
  id: 'section-3-advanced-units',
  title: 'Advanced & Special Units',
  description:
    'Master the powerful units: Artillery (unlimited orthogonal), Air Force (long range), and Navy (water-based).',
  introduction: section3AdvancedUnitsIntro,
  lessons: section3Lessons
};

// ============================================================
// SUBJECT 1: Basic Movement
// ============================================================

export const subject1BasicMovement: Subject = {
  id: 'subject-1-basic-movement',
  title: 'Basic Movement',
  description:
    'Master the movement patterns of all 11 unit types in Cotulenh. From basic 1-square units to unlimited-range pieces.',
  icon: '🎯',
  introduction: subject1Introduction,
  prerequisites: [],
  sections: [section1, section2, section3]
};
