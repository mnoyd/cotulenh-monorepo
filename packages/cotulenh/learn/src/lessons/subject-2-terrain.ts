import type { Subject, Section } from '../types';
import { terrainLessons } from './terrain';

const section1: Section = {
  id: 'section-1-terrain-basics',
  title: 'Terrain Basics',
  description: 'Learn water, land, river crossings, and mixed zones.',
  introduction: `
# Terrain Basics

Terrain controls where each unit can operate:
- **Water** (files a-c) is for **Navy**
- **Land** (files d-k) is for ground units
- The **river** runs between ranks 6 and 7
- **Bridges** (f6/f7, h6/h7) let heavy units cross

These short lessons teach the rules step by step.
  `,
  lessons: terrainLessons
};

export const subject2Terrain: Subject = {
  id: 'subject-2-terrain',
  title: 'Terrain',
  description: 'Learn water, land, river crossings, and mixed zones.',
  icon: '🌊',
  introduction: `
# Terrain in Cotulenh

Terrain shapes every battle. Water is for Navy, land is for ground units, and the river is a boundary that some pieces can cross freely while heavy units must use bridges.

In this subject, you will:
- Identify water vs land zones
- Cross the river with Tanks
- Use bridges for heavy Artillery
- Practice mixed zones where both Navy and land units can operate
  `,
  prerequisites: ['subject-1-basic-movement'],
  sections: [section1]
};
