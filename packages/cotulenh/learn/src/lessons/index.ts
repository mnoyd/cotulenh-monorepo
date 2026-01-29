import type { Lesson, Subject, Section } from '../types';
import { subject1BasicMovement } from './subjects/basic-movement/index';
import { subject2Terrain } from './subjects/terrain/index';
import { subject3Capture } from './subjects/capture/index';
import { subject4Blocking } from './subjects/blocking/index';
import { subject5AirDefense } from './subjects/air-defense/index';
import { subject6CombinePiece } from './subjects/combine-piece/index';
import { subject7DeployMove } from './subjects/deploy-move/index';
import { subject8HeroicRule } from './subjects/heroic-rule/index';
import { subject9FlyingGeneral } from './subjects/flying-general/index';

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
  subject8HeroicRule,
  subject9FlyingGeneral
];

// ============================================================
// Indexed maps for O(1) lookups
// ============================================================

export const lessonById: Map<string, Lesson> = new Map();
export const subjectById: Map<string, Subject> = new Map();
export const nextLessonMap: Map<string, Lesson | null> = new Map();
export const prevLessonMap: Map<string, Lesson | null> = new Map();

export interface LessonContext {
  lesson: Lesson;
  subject: Subject;
  section: Section;
  /** 1-indexed position in section */
  positionInSection: number;
  totalInSection: number;
  /** 1-indexed position in subject (across all sections) */
  positionInSubject: number;
  totalInSubject: number;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
}

export const lessonContextMap: Map<string, LessonContext> = new Map();

function buildIndexes(): void {
  // Index subjects (new curriculum structure)
  for (const subject of subjects) {
    subjectById.set(subject.id, subject);

    const allLessons: Lesson[] = [];
    const lessonSectionMap: Map<string, Section> = new Map();
    const lessonPositionInSection: Map<string, number> = new Map();
    const sectionTotals: Map<Section, number> = new Map();

    for (const section of subject.sections) {
      sectionTotals.set(section, section.lessons.length);
      for (let i = 0; i < section.lessons.length; i++) {
        const lesson = section.lessons[i];
        lessonById.set(lesson.id, lesson);
        lessonSectionMap.set(lesson.id, section);
        lessonPositionInSection.set(lesson.id, i + 1); // 1-indexed
        allLessons.push(lesson);
      }
    }

    for (let i = 0; i < allLessons.length; i++) {
      const lesson = allLessons[i];
      const prev = i > 0 ? allLessons[i - 1] : null;
      const next = i + 1 < allLessons.length ? allLessons[i + 1] : null;
      prevLessonMap.set(lesson.id, prev);
      nextLessonMap.set(lesson.id, next);

      const section = lessonSectionMap.get(lesson.id)!;
      lessonContextMap.set(lesson.id, {
        lesson,
        subject,
        section,
        positionInSection: lessonPositionInSection.get(lesson.id)!,
        totalInSection: sectionTotals.get(section)!,
        positionInSubject: i + 1, // 1-indexed
        totalInSubject: allLessons.length,
        prevLesson: prev,
        nextLesson: next
      });
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

export function getLessonContext(lessonId: string): LessonContext | undefined {
  return lessonContextMap.get(lessonId);
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

        const goalFenValue = lesson.goalFen;
        const hasGoalFen =
          goalFenValue !== undefined &&
          (Array.isArray(goalFenValue) ? goalFenValue.length > 0 : goalFenValue.length > 0);
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
