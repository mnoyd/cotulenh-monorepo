import type { Subject, Section } from '../../types';
import { blockingLessons, unblockedLessons } from '../definitions/blocking';
import {
  subject4Introduction,
  section1BlockedPiecesIntro,
  section2UnblockedPiecesIntro
} from '../../content';

const blockMovementSection: Section = {
  id: 'section-1-block-movement',
  title: 'Block Movement',
  description: 'Learn how pieces are blocked from moving by obstacles.',
  introduction: section1BlockedPiecesIntro,
  lessons: blockingLessons
};

const blockingCaptureSection: Section = {
  id: 'section-2-blocking-capture',
  title: 'Blocking Capture',
  description: 'Learn how pieces interact with blocking when capturing.',
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
  sections: [blockMovementSection, blockingCaptureSection]
};
