import type { Subject, Section } from '../types';
import { airDefenseAvoidanceLessons, airDefenseKamikazeLessons } from './air-defense';
import { subject5Introduction, section1AvoidanceIntro, section2KamikazeIntro } from '../content';

const section1: Section = {
  id: 'section-1-avoid-air-defense',
  title: 'Avoiding Air Defense',
  description: 'Learn how to route Air Force around defended squares.',
  introduction: section1AvoidanceIntro,
  lessons: airDefenseAvoidanceLessons
};

const section2: Section = {
  id: 'section-2-kamikaze',
  title: 'Kamikaze Capture',
  description: 'Execute a suicide capture through a single defense zone.',
  introduction: section2KamikazeIntro,
  lessons: airDefenseKamikazeLessons
};

export const subject5AirDefense: Subject = {
  id: 'subject-5-air-defense',
  title: 'Air Defense',
  description: 'Navigate air defense zones and execute kamikaze captures.',
  icon: '🛡️',
  introduction: subject5Introduction,
  prerequisites: ['subject-3-capture', 'subject-4-blocking'],
  sections: [section1, section2]
};
