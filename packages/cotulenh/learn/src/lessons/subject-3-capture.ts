import type { Subject, Section } from '../types';
import { captureLessons } from './capture';

const section1: Section = {
  id: 'section-1-capture-basics',
  title: 'Capture Basics',
  description: 'Learn normal capture, stay capture, and special capture cases.',
  introduction: `
# Capture Basics

Capturing removes an enemy piece from the board. Cotulenh includes several capture styles:
- **Normal capture**: move onto the enemy square
- **Stay capture**: destroy the target without moving
- **River capture**: cross the river to take a target
- **Air Force capture**: long-range capture that ignores blocking

Each lesson below focuses on one simple rule.
  `,
  lessons: captureLessons
};

export const subject3Capture: Subject = {
  id: 'subject-3-capture',
  title: 'Capture',
  description: 'Learn normal capture, stay capture, and special capture cases.',
  icon: '⚔️',
  introduction: `
# Capture in Cotulenh

Capturing is how you remove enemy units and create tactical advantages. Most captures work like chess (move onto the enemy), but Cotulenh also adds **stay captures** and special cases like **river captures** and **air force captures**.

In this subject, you will:
- Perform a normal capture
- Execute a stay capture without moving
- Capture across the river with a Tank
- Use Air Force to capture from long range
  `,
  prerequisites: ['subject-1-basic-movement', 'subject-2-terrain'],
  sections: [section1]
};
