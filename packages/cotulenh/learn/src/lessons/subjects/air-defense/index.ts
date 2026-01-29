import type { Subject, Section, Lesson } from '../../../types';
import {
  subject5Introduction,
  section1AvoidanceIntro,
  section2KamikazeIntro
} from '../../../content';

const airDefenseAvoidanceLessons: Lesson[] = [
  {
    id: 'air-defense-1',
    category: 'tactics',
    subjectId: 'subject-5-air-defense',
    sectionId: 'section-1-avoid-air-defense',
    title: 'Avoid Air Defense Zones',
    description: 'Navigate the Air Force around missile coverage to reach multiple targets.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/5s5/11/11/3F7/11/11 r - - 0 1',
    content: `## What is Air Defense?

**Missiles** create a protective zone that threatens enemy aircraft. Any **Air Force** flying through this zone will be destroyed!

### The Defense Zone

- The missile defends **all adjacent squares** (including diagonals)
- The zone is shown by the **purple highlighted area** on the board
- Your Air Force cannot safely pass through these squares

### Strategy

To complete this lesson, you must:
1. Navigate **around** the danger zone
2. Reach both target squares in order

> **Tip:** Always check for missiles before planning your Air Force route!`,
    instruction:
      'Move the Air Force to d5, then d7. Avoid the missile air defense zone centered on f6.',
    hint: 'Stay on the c-file. The missile protects squares around f6.',
    successMessage: 'Great! You reached both targets while staying out of air defense.',
    targetSquares: ['d5', 'd7'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: false,
    grading: 'none'
  }
];

const airDefenseKamikazeLessons: Lesson[] = [
  {
    id: 'air-defense-2',
    category: 'tactics',
    subjectId: 'subject-5-air-defense',
    sectionId: 'section-2-kamikaze',
    title: 'Kamikaze Capture',
    description: 'Air Force can sacrifice itself when passing through a single defense zone.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/4g6/11/11/11/4F6 r - - 0 1',
    goalFen: '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
    content: `## The Kamikaze Strike

Sometimes, the only way to neutralize an air defense is through **sacrifice**. 

### How Kamikaze Works

When your Air Force flies through **exactly one** missile's defense zone to capture it:
- The Air Force **captures the missile**
- But then the Air Force is **also destroyed**
- Both pieces are removed from the board

### When to Use This Tactic

Kamikaze is valuable when:
- The missile is blocking a critical attack route
- You have more aircraft than the enemy has missiles
- Removing the defense opens up your other pieces

> **Warning:** If the enemy has *multiple* missiles covering the same square, kamikaze won't work — your Air Force will be shot down before reaching the target!`,
    instruction: 'Capture the Anti-Air on e5. The Air Force will be destroyed after the attack.',
    hint: 'Fly straight up from e1 to e5 to trigger a kamikaze capture.',
    successMessage: 'Confirmed: both units are removed after the kamikaze strike.',
    showValidMoves: true,
    validateLegality: false,
    grading: 'none'
  }
];

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
