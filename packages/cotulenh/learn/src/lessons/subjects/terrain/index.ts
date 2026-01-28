import type { Subject, Section, Lesson } from '../../../types';
import { subject2Introduction, section1TerrainBasicsIntro } from '../../../content';

const terrainLessons: Lesson[] = [
  {
    id: 'terrain-1',
    category: 'terrain',
    subjectId: 'subject-2-terrain',
    sectionId: 'section-1-terrain-basics',
    title: 'Water vs Land',
    description: 'Learn which squares belong to water and land zones.',
    content: `## Water vs Land

- **Navy zones**: files **a-b** plus coastal **c-file** access.
- **Land zones**: files **d-k**.
- **Mixed zones** (c-file and river squares) allow both Navy and Land units.`,
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
    content: `## River and Bridges

- The river sits **between ranks 6 and 7**.
- **Tanks** can cross normally.
- **Heavy units** (Artillery/Anti-Air/Missile) must use **bridge squares**: f6/f7 or h6/h7.`,
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
    content: `## Mixed Zones

- The **c-file** and **river squares** are shared terrain.
- Both **Navy** and **Land** units can move through these squares.
- Use mixed zones to transition between water and land operations.`,
    difficulty: 2,
    startFen: '11/11/11/11/11/11/1N9/3I7/11/11/11/11 r - - 0 1',
    instruction:
      'Mixed zones are shared terrain: the c-file and the river squares. Both Navy and Land units can move there. Reach all the mixed-zone targets.',
    hint: 'Use either piece to visit the c-file and river squares.',
    successMessage: 'Perfect! Mixed zones are shared by Navy and Land.',
    targetSquares: ['c6', 'd6', 'e6']
  }
];

const section1: Section = {
  id: 'section-1-terrain-basics',
  title: 'Terrain Basics',
  description: 'Learn water, land, river crossings, and mixed zones.',
  introduction: section1TerrainBasicsIntro,
  lessons: terrainLessons
};

export const subject2Terrain: Subject = {
  id: 'subject-2-terrain',
  title: 'Terrain',
  description: 'Learn water, land, river crossings, and mixed zones.',
  icon: '🌊',
  introduction: subject2Introduction,
  prerequisites: ['subject-1-basic-movement'],
  sections: [section1]
};
