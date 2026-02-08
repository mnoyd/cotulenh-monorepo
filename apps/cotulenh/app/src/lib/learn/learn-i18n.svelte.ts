/**
 * Learn i18n composable
 *
 * Synchronizes the learn content locale with the app's UI locale
 */

import { getLocale, type Locale } from '$lib/i18n/index.svelte';
import {
  setLearnLocale,
  getLearnLocale,
  translateSubject,
  translateSection,
  translateLesson,
  type LearnLocale,
  type Subject,
  type Section,
  type Lesson
} from '@cotulenh/learn';

/**
 * Sync learn locale with app locale
 * Call this when locale changes or on initialization
 */
export function syncLearnLocale(): void {
  const appLocale = getLocale();
  // Learn locale matches app locale (both 'en' or 'vi')
  setLearnLocale(appLocale as LearnLocale);
}

/**
 * Initialize learn i18n sync
 * Should be called on app initialization
 */
export function initLearnI18n(): void {
  syncLearnLocale();
}

/**
 * Get a translated version of a subject
 */
export function useSubjectTranslation(subject: Subject): Subject {
  syncLearnLocale();
  return translateSubject(subject);
}

/**
 * Get a translated version of a section
 */
export function useSectionTranslation(subjectId: string, section: Section): Section {
  syncLearnLocale();
  return translateSection(subjectId, section);
}

/**
 * Get a translated version of a lesson
 */
export function useLessonTranslation(subjectId: string, lesson: Lesson): Lesson {
  syncLearnLocale();
  return translateLesson(subjectId, lesson);
}

/**
 * Reactive locale state for learn components
 */
export const learnLocale = $state(() => {
  syncLearnLocale();
  return getLearnLocale();
});

/**
 * Watch for locale changes and update learn locale
 */
export function watchLocale(locale: Locale): void {
  setLearnLocale(locale as LearnLocale);
  // Trigger reactivity
  learnLocale();
}
