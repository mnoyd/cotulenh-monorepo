/**
 * Learn system internationalization
 *
 * Provides translations for lesson content separate from UI i18n.
 * This allows lesson content to be translated independently.
 */

import type {
  LearnLocale,
  LearnTranslations,
  LessonTranslation,
  SectionTranslation,
  SubjectTranslation
} from './types';
import { en } from './en';
import { vi } from './vi';

export type * from './types';

const translations: Record<LearnLocale, LearnTranslations> = { en, vi };

/**
 * Get the current locale from the app's i18n system
 * This imports from the app's i18n module
 */
let currentLocale: LearnLocale = 'vi'; // Default to Vietnamese

/**
 * Set the current locale for learn content
 */
export function setLearnLocale(locale: LearnLocale): void {
  currentLocale = locale;
}

/**
 * Get the current locale
 */
export function getLearnLocale(): LearnLocale {
  return currentLocale;
}

/**
 * Get translations for a subject
 */
export function getSubjectTranslation(
  subjectId: string,
  locale?: LearnLocale
): SubjectTranslation | null {
  const lang = locale ?? currentLocale;
  const subjectData = translations[lang].subjects[subjectId];
  return subjectData?.subject ?? null;
}

/**
 * Get translations for a section
 */
export function getSectionTranslation(
  subjectId: string,
  sectionId: string,
  locale?: LearnLocale
): SectionTranslation | null {
  const lang = locale ?? currentLocale;
  const sectionData = translations[lang].subjects[subjectId]?.sections[sectionId];
  return sectionData ?? null;
}

/**
 * Get translations for a lesson
 */
export function getLessonTranslation(
  subjectId: string,
  lessonId: string,
  locale?: LearnLocale
): LessonTranslation | null {
  const lang = locale ?? currentLocale;
  const lessonData = translations[lang].subjects[subjectId]?.lessons[lessonId];
  return lessonData ?? null;
}

/**
 * Get translated subject title
 */
export function tSubjectTitle(subjectId: string, fallback: string, locale?: LearnLocale): string {
  return getSubjectTranslation(subjectId, locale)?.title ?? fallback;
}

/**
 * Get translated subject description
 */
export function tSubjectDescription(
  subjectId: string,
  fallback: string,
  locale?: LearnLocale
): string {
  return getSubjectTranslation(subjectId, locale)?.description ?? fallback;
}

/**
 * Get translated subject introduction
 */
export function tSubjectIntroduction(
  subjectId: string,
  fallback: string,
  locale?: LearnLocale
): string {
  return getSubjectTranslation(subjectId, locale)?.introduction ?? fallback;
}

/**
 * Get translated section title
 */
export function tSectionTitle(
  subjectId: string,
  sectionId: string,
  fallback: string,
  locale?: LearnLocale
): string {
  return getSectionTranslation(subjectId, sectionId, locale)?.title ?? fallback;
}

/**
 * Get translated section description
 */
export function tSectionDescription(
  subjectId: string,
  sectionId: string,
  fallback: string,
  locale?: LearnLocale
): string {
  return getSectionTranslation(subjectId, sectionId, locale)?.description ?? fallback;
}

/**
 * Get translated section introduction
 */
export function tSectionIntroduction(
  subjectId: string,
  sectionId: string,
  fallback: string,
  locale?: LearnLocale
): string {
  return getSectionTranslation(subjectId, sectionId, locale)?.introduction ?? fallback;
}

/**
 * Get translated lesson title
 */
export function tLessonTitle(
  subjectId: string,
  lessonId: string,
  fallback: string,
  locale?: LearnLocale
): string {
  return getLessonTranslation(subjectId, lessonId, locale)?.title ?? fallback;
}

/**
 * Get translated lesson description
 */
export function tLessonDescription(
  subjectId: string,
  lessonId: string,
  fallback: string,
  locale?: LearnLocale
): string {
  return getLessonTranslation(subjectId, lessonId, locale)?.description ?? fallback;
}

/**
 * Get translated lesson content
 */
export function tLessonContent(
  subjectId: string,
  lessonId: string,
  fallback: string | undefined,
  locale?: LearnLocale
): string | undefined {
  return getLessonTranslation(subjectId, lessonId, locale)?.content ?? fallback;
}

/**
 * Get translated lesson instruction
 */
export function tLessonInstruction(
  subjectId: string,
  lessonId: string,
  fallback: string,
  locale?: LearnLocale
): string {
  return getLessonTranslation(subjectId, lessonId, locale)?.instruction ?? fallback;
}

/**
 * Get translated lesson hint
 */
export function tLessonHint(
  subjectId: string,
  lessonId: string,
  fallback: string | undefined,
  locale?: LearnLocale
): string | undefined {
  return getLessonTranslation(subjectId, lessonId, locale)?.hint ?? fallback;
}

/**
 * Get translated lesson success message
 */
export function tLessonSuccessMessage(
  subjectId: string,
  lessonId: string,
  fallback: string | undefined,
  locale?: LearnLocale
): string | undefined {
  return getLessonTranslation(subjectId, lessonId, locale)?.successMessage ?? fallback;
}

/**
 * Get translated lesson failure message
 */
export function tLessonFailureMessage(
  subjectId: string,
  lessonId: string,
  fallback: string | undefined,
  locale?: LearnLocale
): string | undefined {
  return getLessonTranslation(subjectId, lessonId, locale)?.failureMessage ?? fallback;
}

/**
 * Apply translations to a subject object
 * Returns a new object with translated fields
 */
export function translateSubject<
  T extends { id: string; title: string; description: string; introduction: string }
>(subject: T, locale?: LearnLocale): T {
  const translation = getSubjectTranslation(subject.id, locale);
  if (!translation) return subject;

  return {
    ...subject,
    title: translation.title,
    description: translation.description,
    introduction: translation.introduction
  };
}

/**
 * Apply translations to a section object
 */
export function translateSection<
  T extends { id: string; title: string; description: string; introduction?: string }
>(subjectId: string, section: T, locale?: LearnLocale): T {
  const translation = getSectionTranslation(subjectId, section.id, locale);
  if (!translation) return section;

  return {
    ...section,
    title: translation.title,
    description: translation.description,
    ...(translation.introduction !== undefined && { introduction: translation.introduction })
  };
}

/**
 * Apply translations to a lesson object
 */
export function translateLesson<
  T extends {
    id: string;
    title: string;
    description: string;
    content?: string;
    instruction: string;
    hint?: string;
    successMessage?: string;
    failureMessage?: string;
  }
>(subjectId: string, lesson: T, locale?: LearnLocale): T {
  const translation = getLessonTranslation(subjectId, lesson.id, locale);
  if (!translation) return lesson;

  return {
    ...lesson,
    title: translation.title,
    description: translation.description,
    ...(translation.content !== undefined && { content: translation.content }),
    instruction: translation.instruction,
    ...(translation.hint !== undefined && { hint: translation.hint }),
    ...(translation.successMessage !== undefined && { successMessage: translation.successMessage }),
    ...(translation.failureMessage !== undefined && { failureMessage: translation.failureMessage })
  };
}
