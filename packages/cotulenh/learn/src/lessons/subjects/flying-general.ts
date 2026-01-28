import type { Subject, Section } from '../../types';
import { flyingGeneralLessons } from '../definitions/flying-general';
import { subject9Introduction, section1FlyingGeneralIntro } from '../../content';

const section1: Section = {
  id: 'section-1-flying-general',
  title: 'Commander Exposure',
  description: 'Learn how the flying general rule restricts commander captures.',
  introduction: section1FlyingGeneralIntro,
  lessons: flyingGeneralLessons
};

export const subject9FlyingGeneral: Subject = {
  id: 'subject-9-flying-general',
  title: 'Flying General',
  description: 'Prevent commander exposure and recognize illegal captures.',
  icon: '⚔️',
  introduction: subject9Introduction,
  prerequisites: ['subject-3-capture'],
  sections: [section1]
};
