import type { Subject, Section } from '../../types';
import { heroicPromotionLessons, heroicMovementLessons } from '../definitions/heroic-rule';
import {
  subject8Introduction,
  section1HeroicPromotionIntro,
  section2HeroicMovementIntro
} from '../../content';

const section1: Section = {
  id: 'section-1-heroic-promotion',
  title: 'Heroic Promotion',
  description: 'Give check to promote a piece to heroic status.',
  introduction: section1HeroicPromotionIntro,
  lessons: heroicPromotionLessons
};

const section2: Section = {
  id: 'section-2-heroic-movement',
  title: 'Heroic Movement',
  description: 'Use upgraded movement after promotion.',
  introduction: section2HeroicMovementIntro,
  lessons: heroicMovementLessons
};

export const subject8HeroicRule: Subject = {
  id: 'subject-8-heroic-rule',
  title: 'Heroic Rule',
  description: 'Promote pieces by giving check and use heroic movement.',
  icon: '⭐',
  introduction: subject8Introduction,
  prerequisites: ['subject-3-capture'],
  sections: [section1, section2]
};
