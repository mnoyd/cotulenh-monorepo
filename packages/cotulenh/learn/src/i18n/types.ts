/**
 * Learn system translation types
 *
 * Supports dual language (English/Vietnamese) for all learn content
 */

export type LearnLocale = 'en' | 'vi';

/**
 * Translation record for a single lesson
 */
export interface LessonTranslation {
  title: string;
  description: string;
  content?: string;
  instruction: string;
  hint?: string;
  successMessage?: string;
  failureMessage?: string;
}

/**
 * Translation record for a section
 */
export interface SectionTranslation {
  title: string;
  description: string;
  introduction?: string;
}

/**
 * Translation record for a subject
 */
export interface SubjectTranslation {
  title: string;
  description: string;
  introduction: string;
}

/**
 * All translations for a subject including sections and lessons
 */
export interface SubjectTranslations {
  subject: SubjectTranslation;
  sections: Record<string, SectionTranslation>;
  lessons: Record<string, LessonTranslation>;
}

/**
 * Complete translation set for all learn content
 */
export interface LearnTranslations {
  subjects: Record<string, SubjectTranslations>;
}

/**
 * Learn translation key format: learn.subjects.{subjectId}.{field}
 * For sections: learn.subjects.{subjectId}.sections.{sectionId}.{field}
 * For lessons: learn.subjects.{subjectId}.lessons.{lessonId}.{field}
 */
