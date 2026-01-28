import type { Subject, Section } from '../types';
import { terrainLessons } from './terrain';
import { subject2Introduction, section1TerrainBasicsIntro } from '../content';

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
