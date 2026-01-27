import type { Subject, Section } from '../types';
import { captureLessons } from './capture';
import { subject3Introduction, section1CaptureBasicsIntro } from '../content';

const section1: Section = {
  id: 'section-1-capture-basics',
  title: 'Capture Basics',
  description: 'Learn normal capture, stay capture, and special capture cases.',
  introduction: section1CaptureBasicsIntro,
  lessons: captureLessons
};

export const subject3Capture: Subject = {
  id: 'subject-3-capture',
  title: 'Capture',
  description: 'Learn normal capture, stay capture, and special capture cases.',
  icon: '⚔️',
  introduction: subject3Introduction,
  prerequisites: ['subject-1-basic-movement', 'subject-2-terrain'],
  sections: [section1]
};
