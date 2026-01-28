import type { Subject, Section } from '../../types';
import { combineBasicsLessons, combineCarrierLessons } from '../definitions/combine-piece';
import {
  subject6Introduction,
  section1CombineBasicsIntro,
  section2CarrierRulesIntro
} from '../../content';

const section1: Section = {
  id: 'section-1-combine-basics',
  title: 'Combination Basics',
  description: 'Learn how to form stacks with standard carriers.',
  introduction: section1CombineBasicsIntro,
  lessons: combineBasicsLessons
};

const section2: Section = {
  id: 'section-2-carrier-rules',
  title: 'Carrier Rules',
  description: 'Practice combinations that depend on special carrier rules.',
  introduction: section2CarrierRulesIntro,
  lessons: combineCarrierLessons
};

export const subject6CombinePiece: Subject = {
  id: 'subject-6-combine-piece',
  title: 'Combine Pieces',
  description: 'Form stacks using the official combination blueprints.',
  icon: '🧩',
  introduction: subject6Introduction,
  prerequisites: ['subject-2-terrain', 'subject-4-blocking'],
  sections: [section1, section2]
};
