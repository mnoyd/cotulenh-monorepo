import type { Lesson, Subject } from '../types';
import { subject1BasicMovement } from './subjects/basic-movement';
import { subject2Terrain } from './subjects/terrain';
import { subject3Capture } from './subjects/capture';
import { subject4Blocking } from './subjects/blocking';
import { subject5AirDefense } from './subjects/air-defense';
import { subject6CombinePiece } from './subjects/combine-piece';
import { subject7DeployMove } from './subjects/deploy-move';
import { subject8HeroicRule } from './subjects/heroic-rule';

// ============================================================
// SUBJECTS (New curriculum structure)
// ============================================================

export const subjects: Subject[] = [
  subject1BasicMovement,
  subject2Terrain,
  subject3Capture,
  subject4Blocking,
  subject5AirDefense,
  subject6CombinePiece,
  subject7DeployMove,
  subject8HeroicRule
];

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
