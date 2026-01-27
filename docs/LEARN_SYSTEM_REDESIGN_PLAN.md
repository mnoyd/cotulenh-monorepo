# Learn System Redesign Plan

## Overview

Redesign the learn system from a flat category-based approach to a **progressive, subject-based curriculum** that gradually introduces Cotulenh's complex game mechanics through structured lessons with walkthroughs.

---

## Current vs. Proposed Architecture

### Current Structure

```
/learn
  → Shows all categories as expandable cards
  → Each category contains lessons displayed in grid
  → Direct navigation: /learn/[lessonId]

Categories: basics, heroic, pieces, terrain, tactics
- All lessons visible at once
- No explicit progression
- No introductions/walkthroughs
```

### Proposed Structure

```
/learn
  → Subject selection page (locked/unlocked progression)

/learn/[subjectId]
  → Subject introduction/walkthrough
  → Explains rules, objectives, what to expect
  → Lists sections within subject
  → "Start Learning" button

/learn/[subjectId]/[sectionId]
  → Section introduction (optional)
  → Lesson list for this section

/learn/[subjectId]/[sectionId]/[lessonId]
  → Individual lesson player
  → Progress tracking
  → Next lesson navigation
```

---

## Proposed Subject Curriculum

### Subject 1: Basic Piece Movement

**Objective**: Learn how each piece type moves in isolation

**Sections**:

1. **Ground Units** - Infantry, Militia, Tank, Engineer
2. **Artillery Units** - Artillery, Anti-Air, Missile
3. **Special Units** - Air Force, Navy, Commander, Headquarters

**Lesson Pattern**:

- One piece on board
- Highlight reachable squares
- Move piece to any valid square
- Redo/retry available
- Goal: Just complete one legal move

---

### Subject 2: Terrain System

**Objective**: Understand Navy zones, Land zones, River, Bridges

**Walkthrough Content**:

- Explain board zones (files a-b-c, river squares, bridges)
- Navy vs Land piece restrictions
- Air Force terrain-ignoring ability
- Mixed zones (file c, river squares d6/e6/d7/e7)
- Bridge squares (f6/f7, h6/h7) for heavy pieces

**Sections**:

1. **Navy Zone Basics** - Navy pieces in water
2. **Land Zone Basics** - Ground pieces on land
3. **Mixed Zones** - File c and river access
4. **Bridges** - Heavy piece crossing
5. **Air Force Freedom** - Terrain-ignoring movement

**Lesson Pattern**:

- Pieces placed near zone boundaries
- Must move to highlighted target squares
- Invalid moves blocked with feedback
- Multiple target squares to visit

---

### Subject 3: Movement + Terrain Combined

**Objective**: Navigate pieces across the board considering terrain

**Sections**:

1. **Cross-Zone Navigation** - Moving between zones
2. **Path Planning** - Finding valid routes
3. **Heavy Piece Routing** - Using bridges

**Lesson Pattern**:

- Multiple target squares to visit in sequence
- Must acknowledge terrain restrictions
- Show optimal path hints

---

### Subject 4: Capture Mechanics

**Objective**: Master all capture types in Cotulenh

**Walkthrough Content**:

- **Normal Capture**: Move to enemy square, replace piece
- **Stay Capture**: Capture without moving (Commander, Tank range attack)
- **Suicide Capture**: Air Force kamikaze (both pieces die)

**Sections**:

1. **Basic Captures** - Normal movement captures
2. **Stay Captures** - Commander and Tank ranged attacks
3. **Suicide Captures** - Air Force kamikaze attacks
4. **Terrain-Aware Captures** - Capturing across zone boundaries
5. **Multiple Capture Options** - Choosing best capture

**Lesson Pattern**:

- Enemy pieces to capture
- Specific capture type required
- Feedback on wrong capture type
- Scenarios with multiple capture options

---

### Subject 5: Air Force & Air Defense

**Objective**: Understand air units and anti-air systems

**Walkthrough Content**:

- Air Force movement (ignores terrain/blocking)
- Air Defense zones (Anti-Air, Missile, Navy)
- Zone calculation and ranges
- Air Force destruction when passing through defense zones
- Kamikaze attacks vs regular movement

**Sections**:

1. **Air Force Movement** - Flying freely
2. **Air Defense Zones** - Understanding coverage
3. **Avoiding Air Defense** - Safe paths
4. **Kamikaze Tactics** - Suicide attacks through defense
5. **Anti-Air Positioning** - Defensive setup

**Lesson Pattern**:

- Navigate Air Force around defense zones
- Calculate safe paths
- Execute kamikaze when necessary
- Position anti-air for coverage

---

### Subject 6: Piece Stacking System

**Objective**: Combine and transport pieces

**Walkthrough Content**:

- Carrier hierarchy (Navy, Tank, Engineer, Air Force, Headquarters)
- Valid combinations (reference blueprints.yaml)
- Stack movement rules
- Stack notation (e.g., `Navy(AirForce, Tank)`)

**Sections**:

1. **Basic Stacking** - Combining two pieces
2. **Carrier Rules** - What can carry what
3. **Stack Movement** - Moving combined pieces
4. **Terrain + Stacks** - Stack movement restrictions
5. **Stack Captures** - Capturing with/as stacks

**Lesson Pattern**:

- Combine pieces into valid stacks
- Move stacks to targets
- Avoid invalid combinations
- Feedback on blueprint violations

---

### Subject 7: Deployment System

**Objective**: Spread stacks across multiple squares

**Walkthrough Content**:

- Multi-move deployment sequences
- Deployment notation (e.g., `c3-c5-c7`)
- Turn counting (deployment = one turn)
- Stack separation strategies

**Sections**:

1. **Basic Deployment** - 2-square spread
2. **Complex Deployment** - 3+ square sequences
3. **Tactical Deployment** - Strategic spreading
4. **Deployment + Terrain** - Zone-aware deployment

**Lesson Pattern**:

- Deploy pieces to specific target pattern
- Follow multi-square sequences
- Validate each deployment step

---

### Subject 8: Heroic Status System

**Objective**: Achieve and utilize heroic promotion

**Walkthrough Content**:

- How pieces become heroic (giving check)
- Enhanced abilities (+1 range, diagonal movement)
- Headquarters mobility when heroic
- Air defense range increases
- Permanent status

**Sections**:

1. **Becoming Heroic** - Giving check
2. **Heroic Movement** - Enhanced ranges
3. **Heroic Captures** - Increased threat
4. **Heroic Headquarters** - Mobility gain
5. **Multiple Promotions** - Simultaneous heroism

**Lesson Pattern**:

- Create check to promote piece
- Use enhanced abilities
- Compare normal vs heroic movement

---

### Subject 9: Special Rules

**Objective**: Master advanced game mechanics

**Sections**:

1. **Flying General Rule** - Commanders facing each other
2. **Commander Exposure** - Attacking enemy Commander
3. **Last Guard Promotion** - Automatic promotion when alone
4. **Check & Checkmate** - Winning conditions
5. **Draw Conditions** - Stalemate, repetition, fifty-move

**Lesson Pattern**:

- Scenarios demonstrating each rule
- Practice detecting violations
- Execute winning combinations

---

## Required Changes

### 1. Type System (`packages/cotulenh/learn/src/types.ts`)

```typescript
// Add new types
export type SubjectId = string;
export type SectionId = string;

export interface SubjectIntroduction {
  /** Rich text/markdown introduction */
  content: string;
  /** Key concepts covered */
  objectives: string[];
  /** What students will be able to do */
  outcomes: string[];
}

export interface Section {
  id: SectionId;
  title: string;
  description: string;
  /** Optional section-specific introduction */
  introduction?: string;
  lessons: Lesson[];
}

export interface Subject {
  id: SubjectId;
  title: string;
  description: string;
  icon: string;
  /** Full walkthrough explaining the subject */
  introduction: SubjectIntroduction;
  /** Prerequisite subjects (must complete before unlocking) */
  prerequisites: SubjectId[];
  /** Sections within this subject */
  sections: Section[];
}

export interface SubjectProgress {
  subjectId: SubjectId;
  completed: boolean;
  /** Section completion tracking */
  sections: Record<SectionId, boolean>;
  /** Overall progress percentage */
  progress: number;
}

// Update Lesson to reference parent
export interface Lesson {
  // ... existing fields ...

  /** Parent subject ID */
  subjectId: SubjectId;
  /** Parent section ID */
  sectionId: SectionId;

  /** Allow multiple target squares as primary goal */
  targetSquares?: Square[];
  /** Target squares to visit in order (for progressive lessons) */
  orderedTargets?: Square[];
}
```

### 2. Data Structure (`packages/cotulenh/learn/src/subjects/`)

Create new directory structure:

```
src/
  subjects/
    index.ts              # Export all subjects
    01-basic-movement/
      index.ts            # Subject definition
      introduction.ts     # Walkthrough content
      sections/
        ground-units.ts
        artillery-units.ts
        special-units.ts
    02-terrain/
      index.ts
      introduction.ts
      sections/
        navy-zones.ts
        land-zones.ts
        mixed-zones.ts
        bridges.ts
        airforce-freedom.ts
    03-movement-terrain/
    04-captures/
    05-air-defense/
    06-stacking/
    07-deployment/
    08-heroic/
    09-special-rules/
```

### 3. LearnEngine Updates (`packages/cotulenh/learn/src/learn-engine.ts`)

```typescript
// Add support for ordered target tracking
export class LearnEngine {
  #orderedTargets: Square[] = [];
  #currentTargetIndex = 0;

  get currentTarget(): Square | null {
    if (this.#orderedTargets.length === 0) return null;
    return this.#orderedTargets[this.#currentTargetIndex] ?? null;
  }

  get remainingOrderedTargets(): Square[] {
    return this.#orderedTargets.slice(this.#currentTargetIndex);
  }

  // Check if move visits next ordered target
  #checkOrderedTargets(move: Move): boolean {
    const target = this.currentTarget;
    if (!target) return true;

    if (move.to === target) {
      this.#currentTargetIndex++;
      this.#callbacks.onTargetReached?.(target, this.remainingOrderedTargets);
      return true;
    }
    return false;
  }
}

// Add callback
export interface LearnEngineCallbacks {
  // ... existing callbacks ...
  onTargetReached?: (reached: Square, remaining: Square[]) => void;
}
```

### 4. Progress Tracking (`apps/cotulenh/app/src/lib/learn/`)

Create new files:

```typescript
// learn-progress.svelte.ts
import { persisted } from '$lib/stores/persisted.svelte';

interface ProgressData {
  subjects: Record<SubjectId, SubjectProgress>;
  currentSubject: SubjectId | null;
}

class LearnProgressManager {
  #progress = persisted<ProgressData>('learn-progress', {
    subjects: {},
    currentSubject: null
  });

  isSubjectUnlocked(subjectId: SubjectId): boolean {
    const subject = getSubjectById(subjectId);
    if (!subject) return false;

    // Check all prerequisites completed
    return subject.prerequisites.every(
      (prereqId) => this.#progress.value.subjects[prereqId]?.completed ?? false
    );
  }

  completeLesson(subjectId: SubjectId, sectionId: SectionId, lessonId: string) {
    // Update progress tracking
  }

  getSubjectProgress(subjectId: SubjectId): SubjectProgress {
    // Return progress data
  }
}

export const learnProgress = new LearnProgressManager();
```

### 5. UI Components

#### New Components:

- `SubjectCard.svelte` - Subject selection card with lock/unlock state
- `SubjectIntro.svelte` - Full walkthrough page for subject
- `SectionCard.svelte` - Section overview within subject
- `ProgressIndicator.svelte` - Visual progress bar for subjects/sections
- `LessonNavigator.svelte` - Next/previous lesson navigation

#### Update Existing:

- `LessonPlayer.svelte` - Add ordered target support
- `CategoryCard.svelte` → Deprecate or rename to `SubjectCard.svelte`

### 6. Routing (`apps/cotulenh/app/src/routes/learn/`)

```
routes/
  learn/
    +page.svelte                          # Subject selection
    [subjectId]/
      +page.svelte                        # Subject intro/walkthrough
      [sectionId]/
        +page.svelte                      # Section overview
        [lessonId]/
          +page.svelte                    # Lesson player
```

### 7. I18n Updates

Add translations for:

- Subject titles/descriptions
- Introduction content
- Section titles/descriptions
- UI labels (locked, unlocked, prerequisites, etc.)

---

## Migration Strategy

### Phase 1: Type System & Data Structure

1. Add new types to `types.ts`
2. Create `subjects/` directory structure
3. Keep existing `lessons/` for backward compatibility

### Phase 2: Core Logic

1. Update LearnEngine with ordered target support
2. Create progress tracking system
3. Add subject/section utility functions

### Phase 3: Content Creation

1. Write Subject 1 (Basic Movement) completely
2. Test with new UI
3. Iterate on remaining subjects

### Phase 4: UI Implementation

1. Create new components
2. Update routing
3. Add i18n strings
4. Implement progress visualization

### Phase 5: Migration & Cleanup

1. Migrate existing lessons to new structure
2. Deprecate old category system
3. Update documentation

---

## Open Questions

1. **Lesson Reset**: Should users be able to replay completed lessons?
   - **Recommendation**: Yes, for practice

2. **Subject Unlocking**: Strict linear progression or allow skipping?
   - **Recommendation**: Strict for first 5 subjects, optional for advanced

3. **Lesson Grading**: Keep star system or simplified pass/fail?
   - **Recommendation**: Keep stars for motivation

4. **Hint System**: Progressive hints (basic → detailed)?
   - **Recommendation**: Yes, 3-tier hint system

5. **Validation Feedback**: How detailed for terrain/capture violations?
   - **Recommendation**: Specific error messages explaining why invalid

---

## Success Criteria

- ✅ All 9 subjects defined with introductions
- ✅ Progressive unlocking working
- ✅ Ordered target support in LearnEngine
- ✅ Subject/section navigation implemented
- ✅ Progress tracking persisted
- ✅ At least 10 lessons per subject (90+ total)
- ✅ All terrain rules validated in lessons
- ✅ All capture types covered
- ✅ Stacking lessons follow blueprints.yaml
- ✅ Mobile-responsive UI

---

## Timeline Estimate

- **Phase 1**: 4-6 hours (types, structure)
- **Phase 2**: 6-8 hours (engine, progress)
- **Phase 3**: 20-30 hours (content for all subjects)
- **Phase 4**: 10-15 hours (UI components, routing)
- **Phase 5**: 4-6 hours (migration, cleanup)

**Total**: ~45-65 hours

---

## Next Steps

1. **Review this plan** - Get approval on approach
2. **Start with Phase 1** - Create type system
3. **Build Subject 1 end-to-end** - Validate approach
4. **Iterate** - Refine based on learnings
5. **Scale to all subjects** - Replicate successful pattern
