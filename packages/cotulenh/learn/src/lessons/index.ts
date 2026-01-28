import type { CategoryInfo, Lesson, Subject } from '../types';
import { basicsLessons } from './basics';
import { piecesLessons } from './pieces';
import { heroicLessons } from './heroic';
import { terrainLessons } from './terrain';
import { tacticsLessons } from './tactics';
import { subject1BasicMovement } from './subject-1-basic-movement';
import { subject2Terrain } from './subject-2-terrain';
import { subject3Capture } from './subject-3-capture';

// ============================================================
// SUBJECTS (New curriculum structure)
// ============================================================

export const subjects: Subject[] = [subject1BasicMovement, subject2Terrain, subject3Capture];

// ============================================================
// Indexed maps for O(1) lookups
// ============================================================

export const lessonById: Map<string, Lesson> = new Map();
export const subjectById: Map<string, Subject> = new Map();
export const nextLessonMap: Map<string, Lesson | null> = new Map();

function buildIndexes(): void {
  // Index subjects (new curriculum structure)
  for (const subject of subjects) {
    subjectById.set(subject.id, subject);

    const allLessons: Lesson[] = [];
    for (const section of subject.sections) {
      for (const lesson of section.lessons) {
        lessonById.set(lesson.id, lesson);
        allLessons.push(lesson);
      }
    }

    for (let i = 0; i < allLessons.length; i++) {
      const lesson = allLessons[i];
      const next = i + 1 < allLessons.length ? allLessons[i + 1] : null;
      nextLessonMap.set(lesson.id, next);
    }
  }

  // Also index legacy category lessons (for backward compatibility)
  // Use imported lesson arrays directly since categories is declared later
  const legacyLessons = [
    ...basicsLessons,
    ...piecesLessons,
    ...heroicLessons,
    ...terrainLessons,
    ...tacticsLessons
  ];
  for (const lesson of legacyLessons) {
    if (!lessonById.has(lesson.id)) {
      lessonById.set(lesson.id, lesson);
    }
  }
}

buildIndexes();

// ============================================================
// Lookup functions using indexed maps
// ============================================================

export function getLessonById(id: string): Lesson | undefined {
  return lessonById.get(id);
}

export function getSubjectById(id: string): Subject | undefined {
  return subjectById.get(id);
}

export function getLessonInSubject(subjectId: string, lessonId: string): Lesson | undefined {
  const subject = subjectById.get(subjectId);
  if (!subject) return undefined;

  const lesson = lessonById.get(lessonId);
  if (!lesson) return undefined;

  for (const section of subject.sections) {
    if (section.lessons.includes(lesson)) return lesson;
  }
  return undefined;
}

export function getNextLessonInSubject(_subjectId: string, currentId: string): Lesson | undefined {
  return nextLessonMap.get(currentId) ?? undefined;
}

// ============================================================
// Curriculum validation
// ============================================================

export interface ValidationError {
  type: 'duplicate-id' | 'missing-completion-criteria';
  lessonId: string;
  message: string;
}

export function validateCurriculum(): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();

  for (const subject of subjects) {
    for (const section of subject.sections) {
      for (const lesson of section.lessons) {
        if (seenIds.has(lesson.id)) {
          errors.push({
            type: 'duplicate-id',
            lessonId: lesson.id,
            message: `Duplicate lesson ID: ${lesson.id}`
          });
        }
        seenIds.add(lesson.id);

        const hasGoalFen = 'goalFen' in lesson && lesson.goalFen !== undefined;
        const hasScenario = 'scenario' in lesson && lesson.scenario !== undefined;
        const hasCustomCompletion =
          'customCompletion' in lesson && lesson.customCompletion !== undefined;

        if (!hasGoalFen && !hasScenario && !hasCustomCompletion) {
          errors.push({
            type: 'missing-completion-criteria',
            lessonId: lesson.id,
            message: `Lesson ${lesson.id} has no goalFen, scenario, or customCompletion`
          });
        }
      }
    }
  }

  return errors;
}

// ============================================================
// LEGACY: Categories (deprecated)
// ============================================================

/**
 * @deprecated Use `subjects` array instead. Categories are legacy curriculum structure.
 */
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

/**
 * @deprecated Use `getSubjectById` instead. Categories are legacy curriculum structure.
 */
export function getCategoryById(id: string): CategoryInfo | undefined {
  return categories.find((c) => c.id === id);
}

/**
 * @deprecated Use `getNextLessonInSubject` instead. Categories are legacy curriculum structure.
 */
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

export { basicsLessons, piecesLessons, heroicLessons, terrainLessons, tacticsLessons };
