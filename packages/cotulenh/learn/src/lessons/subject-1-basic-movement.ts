import type { Subject, Section, Lesson } from '../types';

/**
 * Subject 1: Basic Movement
 *
 * Comprehensive introduction to unit movement in Cotulenh.
 * Covers all 11 piece types with guided exercises.
 */

const INTERACTION_COMPLETION = (engine: any) => engine.interactionCount > 0;
const MOVES_COMPLETION = (engine: any) => engine.moveCount > 0;

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
    targetSquares: ['b5', 'c4', 'c6', 'd5'],
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
      'a1',
      'b1',
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
  introduction: `
# Basic Unit Movement

In Cotulenh, the simplest units move just 1 square at a time:
- **Infantry** and **Engineer**: Move orthogonally (straight lines)
- **Militia**: Moves in all 8 directions
- **Commander**: Has unlimited orthogonal range
- **Headquarters**: Cannot move (immobile)

These units form the foundation of your army. Learn their movement patterns first!
  `,
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
  introduction: `
# Medium Range Units

These units have more reach than basic units:
- **Tank**: Moves up to 2 squares orthogonally (straight lines)
- **Anti-Air**: Moves 1 square orthogonally (provides air defense)
- **Missile**: Moves in a circular pattern - 2 squares straight or 1 diagonal

They provide tactical flexibility between basic 1-square units and powerful long-range pieces.
  `,
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
      'a3',
      'b3',
      'c3',
      'd1',
      'd10',
      'd11',
      'd12',
      'd2',
      'd4',
      'd5',
      'd6',
      'd7',
      'd8',
      'd9',
      'e3',
      'f3',
      'g3',
      'h3',
      'i3',
      'j3',
      'k3'
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
      'Air Force units can fly to any square on the board, ignoring terrain and other pieces.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/11/11/11/4F6/11 r - - 0 1',
    instruction:
      'Move the Air Force. Air Force can reach ANY square on the board in a single move - no terrain restrictions!',
    hint: 'Air Force has the ultimate mobility. Any square on the board is reachable in one move.',
    successMessage:
      'Amazing! Air Force has unlimited mobility - the most powerful movement in the game.',
    // Listing all ~120 squares as targets.
    targetSquares: [
      'a1',
      'a10',
      'a11',
      'a12',
      'a2',
      'a3',
      'a4',
      'a5',
      'a6',
      'a7',
      'a8',
      'a9',
      'b1',
      'b10',
      'b11',
      'b12',
      'b2',
      'b3',
      'b4',
      'b5',
      'b6',
      'b7',
      'b8',
      'b9',
      'c1',
      'c10',
      'c11',
      'c12',
      'c2',
      'c3',
      'c4',
      'c5',
      'c6',
      'c7',
      'c8',
      'c9',
      'd1',
      'd10',
      'd11',
      'd12',
      'd2',
      'd3',
      'd4',
      'd5',
      'd6',
      'd7',
      'd8',
      'd9',
      'e1',
      'e10',
      'e11',
      'e12',
      'e3',
      'e4',
      'e5',
      'e6',
      'e7',
      'e8',
      'e9',
      'f1',
      'f10',
      'f11',
      'f12',
      'f2',
      'f3',
      'f4',
      'f5',
      'f6',
      'f7',
      'f8',
      'f9',
      'g1',
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
      'h10',
      'h11',
      'h12',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'h7',
      'h8',
      'h9',
      'i1',
      'i10',
      'i11',
      'i12',
      'i2',
      'i3',
      'i4',
      'i5',
      'i6',
      'i7',
      'i8',
      'i9',
      'j1',
      'j10',
      'j11',
      'j12',
      'j2',
      'j3',
      'j4',
      'j5',
      'j6',
      'j7',
      'j8',
      'j9',
      'k1',
      'k10',
      'k11',
      'k12',
      'k2',
      'k3',
      'k4',
      'k5',
      'k6',
      'k7',
      'k8',
      'k9'
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
    targetSquares: [
      'a1',
      'a2',
      'a3',
      'a4',
      'a5',
      'a6',
      'a7',
      'a8',
      'b1',
      'b2',
      'b3',
      'b4',
      'b5',
      'b6',
      'b7',
      'b8',
      'c1',
      'c2',
      'c3',
      'c5',
      'c6',
      'c7',
      'c8'
    ],
    customCompletion: MOVES_COMPLETION,
    grading: 'none'
  }
];

const section3: Section = {
  id: 'section-3-advanced-units',
  title: 'Advanced & Special Units',
  description:
    'Master the powerful units: Artillery (unlimited orthogonal), Air Force (unlimited), and Navy (water-based).',
  introduction: `
# Advanced & Special Units

These units have powerful movement characteristics:
- **Artillery**: Unlimited orthogonal range, can shoot over blocking pieces
- **Air Force**: Can reach ANY square on the board - ultimate mobility
- **Navy**: Restricted to water zones, 4-square range in all directions

These are your most powerful pieces for controlling the board strategically.
  `,
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
  introduction: `
# Welcome to Cotulenh: Basic Movement

In Cotulenh, each unit type has unique movement characteristics. Understanding these patterns is fundamental to mastering the game.

## What You\'ll Learn

This subject covers all 11 piece types across three progressive sections:

1. **Basic Units** - Infantry, Engineer, Militia, Commander, and Headquarters
   - Master the foundation of unit movement
   - Learn the differences between orthogonal and all-direction movement

2. **Medium Range Units** - Tanks, Anti-Air, and Missiles
   - Expand your tactical options with 2-3 square ranges
   - Discover the unique circular pattern of Missiles

3. **Advanced Units** - Artillery, Air Force, and Navy
   - Harness unlimited range with Artillery
   - Master the ultimate mobility of Air Force
   - Control the seas with Navy

## Game Board

The board is **11 files × 12 ranks**:
- Files: a through k (left to right)
- Ranks: 1 through 12 (bottom to top)
- River divides the board between ranks 6 and 7

## Learning Path

Complete each lesson in order. Each lesson teaches you a unit's movement through guided practice.

**Ready to begin? Let's start with the basics!**
  `,
  prerequisites: [],
  sections: [section1, section2, section3]
};
