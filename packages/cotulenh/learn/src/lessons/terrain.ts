import type { Lesson } from '../types';

export const terrainLessons: Lesson[] = [
  {
    id: 'terrain-1',
    category: 'terrain',
    subjectId: 'subject-2-terrain',
    sectionId: 'section-1-terrain-basics',
    title: 'Water vs Land',
    description: 'Learn which squares belong to water and land zones.',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/1N4T4/11/11/11 r - - 0 1',
    instruction:
      'Terrain splits the board into water and land. Navy ships stay on water (files a-c), while land units stay on land (files d-k). Move the Navy to the water targets and the Tank to the land targets.',
    hint: 'Use the Navy for a/b-file targets and the Tank for d-k targets.',
    successMessage: 'Great! Water is for Navy, land is for ground units.',
    targetSquares: ['a4', 'b6', 'f4', 'h4']
  },
  {
    id: 'terrain-2',
    category: 'terrain',
    subjectId: 'subject-2-terrain',
    sectionId: 'section-1-terrain-basics',
    title: 'The River and Bridges',
    description: 'Cross the river with a Tank and use bridges for Artillery.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/4TA5/11/11/11/11 r - - 0 1',
    instruction:
      'The river runs between ranks 6 and 7. Tanks can cross it, but heavy Artillery must use bridge squares (f6/f7 or h6/h7). Move the Tank across the river and move the Artillery onto bridge squares.',
    hint: 'Tank to e7 works. Artillery should visit f6 and f7.',
    successMessage: 'Nice! Tanks can cross the river, but Artillery needs bridges.',
    targetSquares: ['e7', 'f6', 'f7']
  },
  {
    id: 'terrain-3',
    category: 'terrain',
    subjectId: 'subject-2-terrain',
    sectionId: 'section-1-terrain-basics',
    title: 'Mixed Zones',
    description: 'Practice squares that both Navy and Land units can use.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/1N9/3I7/11/11/11/11 r - - 0 1',
    instruction:
      'Mixed zones are shared terrain: the c-file and the river squares. Both Navy and Land units can move there. Reach all the mixed-zone targets.',
    hint: 'Use either piece to visit the c-file and river squares.',
    successMessage: 'Perfect! Mixed zones are shared by Navy and Land.',
    targetSquares: ['c6', 'd6', 'e6']
  }
];
