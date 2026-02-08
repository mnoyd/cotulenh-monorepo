import { describe, expect, it } from 'vitest';
import { findMissingTranslationKeys } from '@cotulenh/i18n';
import { en } from './en';
import { vi } from './vi';
import type { LearnTranslations } from './types';

function flatten(translations: LearnTranslations): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [subjectId, subjectData] of Object.entries(translations.subjects)) {
    flat[`subjects.${subjectId}.subject.title`] = subjectData.subject.title;
    flat[`subjects.${subjectId}.subject.description`] = subjectData.subject.description;
    flat[`subjects.${subjectId}.subject.introduction`] = subjectData.subject.introduction;

    for (const [sectionId, section] of Object.entries(subjectData.sections)) {
      flat[`subjects.${subjectId}.sections.${sectionId}.title`] = section.title;
      flat[`subjects.${subjectId}.sections.${sectionId}.description`] = section.description;
      if (section.introduction !== undefined) {
        flat[`subjects.${subjectId}.sections.${sectionId}.introduction`] = section.introduction;
      }
    }

    for (const [lessonId, lesson] of Object.entries(subjectData.lessons)) {
      flat[`subjects.${subjectId}.lessons.${lessonId}.title`] = lesson.title;
      flat[`subjects.${subjectId}.lessons.${lessonId}.description`] = lesson.description;
      flat[`subjects.${subjectId}.lessons.${lessonId}.instruction`] = lesson.instruction;
      if (lesson.content !== undefined) {
        flat[`subjects.${subjectId}.lessons.${lessonId}.content`] = lesson.content;
      }
      if (lesson.hint !== undefined) {
        flat[`subjects.${subjectId}.lessons.${lessonId}.hint`] = lesson.hint;
      }
      if (lesson.successMessage !== undefined) {
        flat[`subjects.${subjectId}.lessons.${lessonId}.successMessage`] = lesson.successMessage;
      }
      if (lesson.failureMessage !== undefined) {
        flat[`subjects.${subjectId}.lessons.${lessonId}.failureMessage`] = lesson.failureMessage;
      }
    }
  }

  return flat;
}

describe('learn i18n parity', () => {
  it('has no missing paths between en and vi', () => {
    const flatEn = flatten(en);
    const flatVi = flatten(vi);
    const missing = findMissingTranslationKeys({ en: flatEn, vi: flatVi });

    expect(missing.en).toEqual([]);
    expect(missing.vi).toEqual([]);
  });

  it('has matching subject/section/lesson ids', () => {
    expect(Object.keys(en.subjects).sort()).toEqual(Object.keys(vi.subjects).sort());

    for (const subjectId of Object.keys(en.subjects)) {
      const enSubject = en.subjects[subjectId];
      const viSubject = vi.subjects[subjectId];

      expect(Object.keys(enSubject.sections).sort()).toEqual(Object.keys(viSubject.sections).sort());
      expect(Object.keys(enSubject.lessons).sort()).toEqual(Object.keys(viSubject.lessons).sort());
    }
  });

  it('does not contain empty localized strings', () => {
    for (const [locale, flat] of Object.entries({ en: flatten(en), vi: flatten(vi) })) {
      for (const [path, value] of Object.entries(flat)) {
        expect(value.trim(), `${locale}:${path}`).not.toBe('');
      }
    }
  });
});
