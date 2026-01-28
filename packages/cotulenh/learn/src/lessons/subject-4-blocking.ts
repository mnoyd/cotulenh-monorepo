import type { Subject, Section } from '../types';
import { blockingLessons, unblockedLessons } from './blocking';
import {
  subject4Introduction,
  section1BlockedPiecesIntro,
  section2UnblockedPiecesIntro
} from '../content';

const section1: Section = {
  id: 'section-1-blocked-pieces',
  title: 'Blocked Pieces',
  description:
    'Learn how blocking affects Infantry, Commander, Militia, and other standard pieces.',
  introduction: section1BlockedPiecesIntro,
  lessons: blockingLessons
};

const section2: Section = {
  id: 'section-2-unblocked-pieces',
  title: 'Pieces That Ignore Blocking',
  description: 'Master pieces that can shoot over or fly through blockers.',
  introduction: section2UnblockedPiecesIntro,
  lessons: unblockedLessons
};

export const subject4Blocking: Subject = {
  id: 'subject-4-blocking',
  title: 'Blocking Mechanism',
  description: 'Learn which pieces can move or capture through other pieces.',
  icon: '🚧',
  introduction: subject4Introduction,
  prerequisites: ['subject-1-basic-movement', 'subject-3-capture'],
  sections: [section1, section2]
};
