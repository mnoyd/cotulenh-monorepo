import type { CategoryInfo, Lesson, Subject } from '../types';
import { basicsLessons } from './basics';
import { piecesLessons } from './pieces';
import { heroicLessons } from './heroic';
import { terrainLessons } from './terrain';
import { tacticsLessons } from './tactics';
import { subject1BasicMovement } from './subject-1-basic-movement';
import { subject2Terrain } from './subject-2-terrain';
import { subject3Capture } from './subject-3-capture';

export const categories: CategoryInfo[] = [
  {
    id: 'basics',
    title: 'The Basics',
    description: 'Learn how pieces move and capture',
    icon: '♟',
    lessons: basicsLessons
  },
  {
    id: 'heroic',
    title: 'Heroic Pieces',
    description: 'Learn how heroic status enhances movement',
    icon: '⭐',
    lessons: heroicLessons
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
  },
  {
    id: 'tactics',
    title: 'Tactics',
    description: 'Master tactical patterns and combinations',
    icon: '🎯',
    lessons: tacticsLessons
  }
];

export function getLessonById(id: string): Lesson | undefined {
  // Search in categories (legacy)
  for (const category of categories) {
    const lesson = category.lessons.find((l) => l.id === id);
    if (lesson) return lesson;
  }

  // Search in subjects (new)
  for (const subject of subjects) {
    for (const section of subject.sections) {
      const lesson = section.lessons.find((l) => l.id === id);
      if (lesson) return lesson;
    }
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

// ============================================================
// SUBJECTS (New curriculum structure)
// ============================================================

export const subjects: Subject[] = [subject1BasicMovement, subject2Terrain, subject3Capture];

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function getLessonInSubject(subjectId: string, lessonId: string): Lesson | undefined {
  const subject = getSubjectById(subjectId);
  if (!subject) return undefined;

  for (const section of subject.sections) {
    const lesson = section.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}

export function getNextLessonInSubject(subjectId: string, currentId: string): Lesson | undefined {
  const subject = getSubjectById(subjectId);
  if (!subject) return undefined;

  let foundCurrent = false;
  for (const section of subject.sections) {
    for (const lesson of section.lessons) {
      if (foundCurrent) return lesson;
      if (lesson.id === currentId) foundCurrent = true;
    }
  }
  return undefined;
}

export { basicsLessons, piecesLessons, heroicLessons, terrainLessons, tacticsLessons };
