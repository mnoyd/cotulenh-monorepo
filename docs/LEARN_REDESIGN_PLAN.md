# Learn System Redesign - Implementation Plan

## Architecture Changes

### Current: Flat Categories

```
/learn → All categories → All lessons visible
/learn/[lessonId] → Lesson player
```

### New: Progressive Subjects

```
/learn → Subject list (with unlock progression)
/learn/[subjectId] → Subject intro + sections
/learn/[subjectId]/[sectionId]/[lessonId] → Lesson player
```

---

## Subject Structure (9 Subjects)

1. **Basic Movement** - Individual piece movement
2. **Terrain** - Zones, restrictions, bridges
3. **Movement + Terrain** - Combined navigation
4. **Captures** - Normal, stay, suicide
5. **Air Defense** - Air Force, anti-air zones
6. **Stacking** - Piece combinations
7. **Deployment** - Multi-move sequences
8. **Heroic** - Promotion system
9. **Special Rules** - Flying general, exposure, etc.

---

## Code Architecture: Strategy Pattern

### Component Structure

```
validators/
  - TerrainValidator
  - ScenarioValidator
  - TargetValidator
  - CompositeValidator

feedback/
  - SilentFeedbackProvider
  - ToastFeedbackProvider
  - ModalFeedbackProvider

completion/
  - GoalCompletionChecker
  - TargetCompletionChecker
  - ScenarioCompletionChecker

grading/
  - StarGrader
  - PassFailGrader
  - NoGrader

factories/
  - Create components from lesson config
```

### LearnEngine Role

- Orchestrator only
- Injects components via factories
- No business logic (delegated to components)

---

## Type System Changes

### New Types

```typescript
// Subject hierarchy
type SubjectId = string;
type SectionId = string;

interface Subject {
  id: SubjectId;
  title: string;
  description: string;
  icon: string;
  introduction: string; // Markdown walkthrough
  prerequisites: SubjectId[];
  sections: Section[];
}

interface Section {
  id: SectionId;
  title: string;
  description: string;
  introduction?: string;
  lessons: Lesson[];
}

// Lesson config (simplified)
interface Lesson {
  id: string;
  subjectId: SubjectId;
  sectionId: SectionId;

  // Meta
  title: string;
  description: string;
  difficulty: 1 | 2 | 3;
  startFen: string;

  // Validation flags
  validateTerrain?: boolean;
  strictScenario?: boolean;

  // Completion
  goalFen?: string;
  targetSquares?: Square[];
  orderedTargets?: boolean;
  scenario?: ScenarioBlueprint;
  customCompletion?: (engine: LearnEngine) => boolean;

  // Feedback
  feedbackStyle?: 'silent' | 'toast' | 'modal';
  feedback?: {
    terrain?: Record<string, string>;
    capture?: Record<string, string>;
    stacking?: Record<string, string>;
    // ...
  };

  // Grading
  grading?: 'none' | 'pass-fail' | 'stars';
  optimalMoves?: number;

  // UI
  allowUndo?: boolean;
  allowHints?: boolean;
  showMoveCount?: boolean;
}

// Progress tracking
interface SubjectProgress {
  subjectId: SubjectId;
  completed: boolean;
  sections: Record<SectionId, boolean>;
  progress: number; // 0-100
}
```

### Feedback Data Structure

```typescript
interface FeedbackData {
  type: 'terrain' | 'capture' | 'stacking' | 'air-defense' | 'scenario';
  severity: 'error' | 'warning' | 'info';
  code: string; // e.g., 'NAVY_TO_LAND'
  context: Record<string, unknown>;
}

interface MoveValidationResult {
  valid: boolean;
  feedbackData?: FeedbackData;
}
```

---

## File Structure

### Core Package (`packages/cotulenh/learn/src/`)

```
validators/
  move-validator.ts          # Interface
  terrain-validator.ts
  scenario-validator.ts
  target-validator.ts
  composite-validator.ts
  validator-factory.ts

feedback/
  feedback-provider.ts       # Interface
  silent-feedback.ts
  toast-feedback.ts
  modal-feedback.ts
  feedback-factory.ts

completion/
  completion-checker.ts      # Interface
  goal-completion.ts
  target-completion.ts
  scenario-completion.ts
  completion-factory.ts

grading/
  grader.ts                  # Interface
  star-grader.ts
  pass-fail-grader.ts
  no-grader.ts
  grader-factory.ts

subjects/
  index.ts
  01-basic-movement/
    index.ts
    sections/
      ground-units.ts
      artillery-units.ts
      special-units.ts
  02-terrain/
    index.ts
    sections/
      navy-zones.ts
      land-zones.ts
      mixed-zones.ts
      bridges.ts
  03-movement-terrain/
  04-captures/
  05-air-defense/
  06-stacking/
  07-deployment/
  08-heroic/
  09-special-rules/

learn-engine.ts              # Updated orchestrator
types.ts                     # New types
```

### App Package (`apps/cotulenh/app/src/`)

```
routes/learn/
  +page.svelte                              # Subject selection
  [subjectId]/
    +page.svelte                            # Subject intro
    [sectionId]/
      +page.svelte                          # Section overview
      [lessonId]/
        +page.svelte                        # Lesson player

lib/learn/
  components/
    SubjectCard.svelte                      # NEW
    SubjectIntro.svelte                     # NEW
    SectionCard.svelte                      # NEW
    LessonPlayer.svelte                     # UPDATE
    ProgressIndicator.svelte                # NEW
  learn-progress.svelte.ts                  # NEW
```

---

## Implementation Phases

### Phase 1: Core Architecture (Foundation)

**Goal**: Set up type system and component infrastructure

1. Add new types to `types.ts`
2. Create validator interfaces and base classes
3. Create feedback provider interfaces
4. Create completion checker interfaces
5. Create grader interfaces
6. Create factory classes

**Files**:

- `packages/cotulenh/learn/src/types.ts` (update)
- `packages/cotulenh/learn/src/validators/*` (create)
- `packages/cotulenh/learn/src/feedback/*` (create)
- `packages/cotulenh/learn/src/completion/*` (create)
- `packages/cotulenh/learn/src/grading/*` (create)

**Testing**: Unit test each component independently

---

### Phase 2: LearnEngine Refactor

**Goal**: Update engine to use new components

1. Update LearnEngine to use factories
2. Remove hardcoded validation logic
3. Add component injection
4. Update callbacks to use FeedbackData

**Files**:

- `packages/cotulenh/learn/src/learn-engine.ts` (refactor)

**Testing**: Integration tests with different lesson configs

---

### Phase 3: Subject 1 (Proof of Concept)

**Goal**: Build first complete subject end-to-end

1. Create Subject 1 structure (Basic Movement)
2. Write 3 sections with 10 lessons each
3. Test all lesson behaviors
4. Validate terrain rules in tests

**Files**:

- `packages/cotulenh/learn/src/subjects/01-basic-movement/`

**Testing**: Run all Subject 1 lessons manually

---

### Phase 4: Progress & Navigation

**Goal**: Implement subject unlocking and progress tracking

1. Create progress manager
2. Add subject unlocking logic
3. Create new UI components
4. Update routing

**Files**:

- `apps/cotulenh/app/src/lib/learn/learn-progress.svelte.ts`
- `apps/cotulenh/app/src/lib/learn/components/SubjectCard.svelte`
- `apps/cotulenh/app/src/lib/learn/components/SubjectIntro.svelte`
- `apps/cotulenh/app/src/lib/learn/components/SectionCard.svelte`
- `apps/cotulenh/app/src/routes/learn/+page.svelte` (update)
- `apps/cotulenh/app/src/routes/learn/[subjectId]/+page.svelte` (create)

**Testing**: Test progression flow and locking

---

### Phase 5: Remaining Subjects

**Goal**: Complete all 9 subjects

1. Create Subjects 2-9 with all sections
2. Write ~10 lessons per subject (90+ total)
3. Ensure all game mechanics covered

**Files**:

- `packages/cotulenh/learn/src/subjects/02-terrain/` through `09-special-rules/`

**Testing**: Manual QA of all lessons

---

### Phase 6: Migration & Polish

**Goal**: Clean up and finalize

1. Migrate existing lessons to new structure
2. Update i18n strings
3. Add mobile responsiveness
4. Performance optimization
5. Documentation

**Files**:

- Various cleanup
- `apps/cotulenh/app/src/lib/i18n/locales/*`

**Testing**: Full regression testing

---

## Key Decisions

### Lesson Configuration

- **No modes** - each lesson has one behavior (configured by flags)
- **Composition** - combine validators, feedback, completion, grading
- **Factories** - build components from lesson config

### Validation

- `validateTerrain: true` → adds TerrainValidator
- `strictScenario: true` → adds ScenarioValidator
- `targetSquares: [...]` → adds TargetValidator
- All validators chain via CompositeValidator

### Feedback

- `feedbackStyle: 'silent'` → SilentFeedbackProvider
- `feedbackStyle: 'toast'` → ToastFeedbackProvider
- `feedbackStyle: 'modal'` → ModalFeedbackProvider
- Custom messages in `feedback` object

### Completion

- `goalFen: "..."` → GoalCompletionChecker
- `targetSquares: [...]` → TargetCompletionChecker
- `scenario: [...]` → ScenarioCompletionChecker
- `customCompletion: fn` → CustomCompletionChecker

### Grading

- `grading: 'none'` → NoGrader
- `grading: 'pass-fail'` → PassFailGrader
- `grading: 'stars'` → StarGrader (with optimalMoves)

---

## Timeline Estimate

- **Phase 1**: 8 hours (architecture setup)
- **Phase 2**: 6 hours (engine refactor)
- **Phase 3**: 12 hours (Subject 1 + testing)
- **Phase 4**: 8 hours (progress + UI)
- **Phase 5**: 30 hours (8 more subjects)
- **Phase 6**: 6 hours (cleanup)

**Total**: ~70 hours

---

## Success Criteria

- ✅ All 9 subjects defined
- ✅ 90+ lessons created
- ✅ All game mechanics covered
- ✅ Progressive unlocking works
- ✅ All lesson behaviors functional
- ✅ Terrain validation accurate
- ✅ Stacking follows blueprints.yaml
- ✅ Mobile responsive
- ✅ Tests passing
- ✅ No hardcoded validation in LearnEngine

---

## Next Steps

1. **Review & approve** this plan
2. **Start Phase 1** - Create type system and component infrastructure
3. **Test Phase 1** - Unit test validators, feedback, completion, grading
4. **Continue to Phase 2** - Refactor LearnEngine
5. **Build Subject 1** - Validate approach works end-to-end
6. **Scale** - Complete remaining subjects
