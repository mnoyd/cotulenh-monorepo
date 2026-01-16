import type { CategoryInfo, Lesson } from '../types';
import { basicsLessons } from './basics';
import { piecesLessons } from './pieces';
import { terrainLessons } from './terrain';

export const categories: CategoryInfo[] = [
  {
    id: 'basics',
    title: 'The Basics',
    description: 'Learn how pieces move and capture',
    icon: '♟',
    lessons: basicsLessons
  },
  {
    id: 'pieces',
    title: 'Know the Pieces',
    description: 'Master each military unit',
    icon: '⚔',
    lessons: piecesLessons
  },
  {
    id: 'terrain',
    title: 'Terrain & Zones',
    description: 'Understand land, navy, and air zones',
    icon: '🗺',
    lessons: terrainLessons
  }
];

export function getLessonById(id: string): Lesson | undefined {
  for (const category of categories) {
    const lesson = category.lessons.find((l) => l.id === id);
    if (lesson) return lesson;
  }
  return undefined;
}

export function getCategoryById(id: string): CategoryInfo | undefined {
  return categories.find((c) => c.id === id);
}

export function getNextLesson(currentId: string): Lesson | undefined {
  let foundCurrent = false;
  for (const category of categories) {
    for (const lesson of category.lessons) {
      if (foundCurrent) return lesson;
      if (lesson.id === currentId) foundCurrent = true;
    }
  }
  return undefined;
}
