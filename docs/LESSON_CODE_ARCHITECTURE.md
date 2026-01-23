# Lesson System Code Architecture

## Goal

Organize code so different lessons can have different behaviors WITHOUT:

- Duplicating validation logic
- Giant if/else chains
- Tight coupling between components

## Core Principle: Composition over Configuration

Each lesson composes small, focused modules rather than toggling modes.

---

## Code Organization

```
packages/cotulenh/learn/src/

  # Core engine (orchestration only)
  learn-engine.ts

  # Pluggable validators (strategy pattern)
  validators/
    move-validator.ts           # Interface + base validator
    scenario-validator.ts       # Strict scenario matching
    terrain-validator.ts        # Terrain rule checking
    target-validator.ts         # Target square tracking
    custom-validator.ts         # Lesson-specific logic
    validator-factory.ts        # Creates validators from config

  # Pluggable feedback providers
  feedback/
    feedback-provider.ts        # Interface
    silent-feedback.ts          # No output
    toast-feedback.ts           # Simple toasts
    modal-feedback.ts           # Educational modals
    inline-feedback.ts          # Board overlays
    feedback-factory.ts         # Creates providers from config

  # Pluggable completion checkers
  completion/
    completion-checker.ts       # Interface
    goal-completion.ts          # FEN/state matching
    target-completion.ts        # Visit all targets
    scenario-completion.ts      # Complete sequence
    custom-completion.ts        # Custom function
    completion-factory.ts       # Creates checkers from config

  # Pluggable graders
  grading/
    grader.ts                   # Interface
    no-grader.ts                # Just mark complete
    pass-fail-grader.ts         # Binary
    star-grader.ts              # 1-3 stars
    grader-factory.ts           # Creates graders from config

  # Lesson definition
  types.ts                      # Lesson interface
  lessons/                      # Lesson content
  subjects/                     # Subject-based organization
```

---

## 1. Validator Architecture

### Interface

```typescript
// validators/move-validator.ts

export interface MoveValidationResult {
  valid: boolean;
  error?: string;
  feedbackData?: FeedbackData;
}

export interface FeedbackData {
  type: 'terrain' | 'capture' | 'stacking' | 'air-defense' | 'scenario' | 'generic';
  severity: 'error' | 'warning' | 'info';
  code: string; // e.g., 'NAVY_TO_LAND', 'WRONG_CAPTURE_TYPE'
  context: Record<string, unknown>;
}

export interface MoveValidator {
  validate(move: Move, game: AntiRuleCore): MoveValidationResult;
}
```

### Concrete Validators

```typescript
// validators/terrain-validator.ts

export class TerrainValidator implements MoveValidator {
  validate(move: Move, game: AntiRuleCore): MoveValidationResult {
    const piece = game.get(move.from);
    if (!piece) return { valid: false };

    const fromTerrain = getTerrainType(move.from);
    const toTerrain = getTerrainType(move.to);

    // Navy to land violation
    if (piece.type === NAVY && toTerrain === 'pure-land') {
      return {
        valid: false,
        feedbackData: {
          type: 'terrain',
          severity: 'error',
          code: 'NAVY_TO_LAND',
          context: {
            piece: 'Navy',
            from: move.from,
            to: move.to,
            terrain: toTerrain
          }
        }
      };
    }

    // Land to water violation
    if (isLandPiece(piece) && toTerrain === 'pure-water') {
      return {
        valid: false,
        feedbackData: {
          type: 'terrain',
          severity: 'error',
          code: 'LAND_TO_WATER',
          context: {
            piece: piece.type,
            from: move.from,
            to: move.to,
            terrain: toTerrain
          }
        }
      };
    }

    return { valid: true };
  }
}
```

```typescript
// validators/scenario-validator.ts

export class ScenarioValidator implements MoveValidator {
  constructor(private scenario: Scenario) {}

  validate(move: Move, game: AntiRuleCore): MoveValidationResult {
    const expectedMove = this.scenario.getExpectedMove();

    if (!expectedMove) {
      return { valid: true }; // No more expected moves
    }

    const matches = this.movesEqual(move, expectedMove);

    if (!matches) {
      return {
        valid: false,
        feedbackData: {
          type: 'scenario',
          severity: 'error',
          code: 'WRONG_MOVE',
          context: {
            expected: expectedMove,
            actual: move,
            hint: this.scenario.getHint()
          }
        }
      };
    }

    return { valid: true };
  }

  private movesEqual(a: Move, b: Move): boolean {
    return a.from === b.from && a.to === b.to;
  }
}
```

```typescript
// validators/target-validator.ts

export class TargetValidator implements MoveValidator {
  constructor(
    private targets: Square[],
    private ordered: boolean = false
  ) {}

  private visitedTargets = new Set<Square>();
  private currentIndex = 0;

  validate(move: Move, game: AntiRuleCore): MoveValidationResult {
    if (this.ordered) {
      const expectedTarget = this.targets[this.currentIndex];
      if (move.to === expectedTarget) {
        this.visitedTargets.add(expectedTarget);
        this.currentIndex++;
        return {
          valid: true,
          feedbackData: {
            type: 'generic',
            severity: 'info',
            code: 'TARGET_REACHED',
            context: {
              target: expectedTarget,
              remaining: this.targets.length - this.currentIndex
            }
          }
        };
      } else {
        return {
          valid: false,
          feedbackData: {
            type: 'scenario',
            severity: 'error',
            code: 'WRONG_TARGET',
            context: {
              expected: expectedTarget,
              actual: move.to
            }
          }
        };
      }
    } else {
      // Unordered targets - any is fine
      if (this.targets.includes(move.to) && !this.visitedTargets.has(move.to)) {
        this.visitedTargets.add(move.to);
        return {
          valid: true,
          feedbackData: {
            type: 'generic',
            severity: 'info',
            code: 'TARGET_REACHED',
            context: {
              target: move.to,
              remaining: this.targets.length - this.visitedTargets.size
            }
          }
        };
      }
      return { valid: true }; // Non-target moves allowed
    }
  }

  get isComplete(): boolean {
    return this.visitedTargets.size === this.targets.length;
  }
}
```

### Validator Composition

```typescript
// validators/composite-validator.ts

export class CompositeValidator implements MoveValidator {
  constructor(private validators: MoveValidator[]) {}

  validate(move: Move, game: AntiRuleCore): MoveValidationResult {
    // Run all validators in sequence
    for (const validator of this.validators) {
      const result = validator.validate(move, game);
      if (!result.valid) {
        return result; // First failure stops chain
      }
    }

    return { valid: true };
  }
}
```

### Factory

```typescript
// validators/validator-factory.ts

export class ValidatorFactory {
  static create(lesson: Lesson, scenario?: Scenario): MoveValidator {
    const validators: MoveValidator[] = [];

    // Always validate basic legality (unless explicitly disabled)
    if (lesson.validateLegality !== false) {
      validators.push(new LegalityValidator());
    }

    // Add terrain validation if needed
    if (lesson.validateTerrain) {
      validators.push(new TerrainValidator());
    }

    // Add scenario validation if present
    if (scenario && lesson.strictScenario) {
      validators.push(new ScenarioValidator(scenario));
    }

    // Add target validation if present
    if (lesson.targetSquares) {
      validators.push(new TargetValidator(lesson.targetSquares, lesson.orderedTargets ?? false));
    }

    // Add custom validator if present
    if (lesson.customMoveValidator) {
      validators.push(new CustomValidator(lesson.customMoveValidator));
    }

    return new CompositeValidator(validators);
  }
}
```

---

## 2. Feedback Provider Architecture

### Interface

```typescript
// feedback/feedback-provider.ts

export interface FeedbackProvider {
  showError(data: FeedbackData, messages: LessonFeedback): void;
  showWarning(data: FeedbackData, messages: LessonFeedback): void;
  showInfo(data: FeedbackData, messages: LessonFeedback): void;
  clear(): void;
}
```

### Concrete Providers

```typescript
// feedback/silent-feedback.ts

export class SilentFeedbackProvider implements FeedbackProvider {
  showError() {
    /* no-op */
  }
  showWarning() {
    /* no-op */
  }
  showInfo() {
    /* no-op */
  }
  clear() {
    /* no-op */
  }
}
```

```typescript
// feedback/toast-feedback.ts

import { toast } from 'svelte-sonner';

export class ToastFeedbackProvider implements FeedbackProvider {
  showError(data: FeedbackData, messages: LessonFeedback) {
    const message = this.getMessage(data, messages);
    toast.error(message);
  }

  showWarning(data: FeedbackData, messages: LessonFeedback) {
    const message = this.getMessage(data, messages);
    toast.warning(message);
  }

  showInfo(data: FeedbackData, messages: LessonFeedback) {
    const message = this.getMessage(data, messages);
    toast.success(message);
  }

  clear() {
    toast.dismiss();
  }

  private getMessage(data: FeedbackData, messages: LessonFeedback): string {
    // Map feedback code to message
    if (data.type === 'terrain' && data.code === 'NAVY_TO_LAND') {
      return messages.terrain?.navyToLand ?? 'Navy cannot enter land zones';
    }
    if (data.type === 'terrain' && data.code === 'LAND_TO_WATER') {
      return messages.terrain?.landToWater ?? 'Land units cannot enter water';
    }
    // ... more mappings

    return data.error ?? 'Invalid move';
  }
}
```

```typescript
// feedback/modal-feedback.ts

export class ModalFeedbackProvider implements FeedbackProvider {
  constructor(private showModalFn: (content: ModalContent) => void) {}

  showError(data: FeedbackData, messages: LessonFeedback) {
    const content = this.buildModalContent(data, messages, 'error');
    this.showModalFn(content);
  }

  showWarning(data: FeedbackData, messages: LessonFeedback) {
    const content = this.buildModalContent(data, messages, 'warning');
    this.showModalFn(content);
  }

  showInfo(data: FeedbackData, messages: LessonFeedback) {
    const content = this.buildModalContent(data, messages, 'info');
    this.showModalFn(content);
  }

  private buildModalContent(
    data: FeedbackData,
    messages: LessonFeedback,
    severity: string
  ): ModalContent {
    return {
      title: this.getTitle(data),
      message: this.getMessage(data, messages),
      details: this.getDetails(data),
      severity,
      actions: ['Try Again', 'Show Hint']
    };
  }

  clear() {
    /* close modal */
  }
}
```

### Factory

```typescript
// feedback/feedback-factory.ts

export class FeedbackFactory {
  static create(lesson: Lesson, showModal?: (content: ModalContent) => void): FeedbackProvider {
    if (lesson.feedbackStyle === 'silent') {
      return new SilentFeedbackProvider();
    }

    if (lesson.feedbackStyle === 'toast') {
      return new ToastFeedbackProvider();
    }

    if (lesson.feedbackStyle === 'modal' && showModal) {
      return new ModalFeedbackProvider(showModal);
    }

    if (lesson.feedbackStyle === 'inline') {
      return new InlineFeedbackProvider();
    }

    // Default
    return new ToastFeedbackProvider();
  }
}
```

---

## 3. Completion Checker Architecture

```typescript
// completion/completion-checker.ts

export interface CompletionChecker {
  check(engine: LearnEngine): boolean;
  getProgress(): number; // 0-100
}
```

```typescript
// completion/goal-completion.ts

export class GoalCompletionChecker implements CompletionChecker {
  constructor(private goalFen: string) {}

  check(engine: LearnEngine): boolean {
    return engine.fen === this.goalFen;
  }

  getProgress(): number {
    // Could calculate similarity percentage
    return 0;
  }
}
```

```typescript
// completion/target-completion.ts

export class TargetCompletionChecker implements CompletionChecker {
  constructor(private targetValidator: TargetValidator) {}

  check(): boolean {
    return this.targetValidator.isComplete;
  }

  getProgress(): number {
    const total = this.targetValidator.targets.length;
    const visited = this.targetValidator.visitedTargets.size;
    return (visited / total) * 100;
  }
}
```

```typescript
// completion/completion-factory.ts

export class CompletionFactory {
  static create(lesson: Lesson, validators: MoveValidator[]): CompletionChecker {
    if (lesson.goalFen) {
      return new GoalCompletionChecker(lesson.goalFen);
    }

    if (lesson.targetSquares) {
      const targetValidator = validators.find((v) => v instanceof TargetValidator);
      if (targetValidator) {
        return new TargetCompletionChecker(targetValidator as TargetValidator);
      }
    }

    if (lesson.scenario) {
      return new ScenarioCompletionChecker(lesson.scenario);
    }

    if (lesson.customCompletion) {
      return new CustomCompletionChecker(lesson.customCompletion);
    }

    throw new Error('No completion criteria defined');
  }
}
```

---

## 4. Grader Architecture

```typescript
// grading/grader.ts

export interface LessonGrade {
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  moveCount: number;
  feedback?: string;
}

export interface Grader {
  grade(moveCount: number, lesson: Lesson): LessonGrade;
}
```

```typescript
// grading/star-grader.ts

export class StarGrader implements Grader {
  grade(moveCount: number, lesson: Lesson): LessonGrade {
    const optimal = lesson.optimalMoves ?? moveCount;
    const stars = this.calculateStars(moveCount, optimal);

    return {
      completed: true,
      stars,
      moveCount,
      feedback: this.getFeedback(stars)
    };
  }

  private calculateStars(actual: number, optimal: number): 0 | 1 | 2 | 3 {
    if (actual === optimal) return 3;
    if (actual <= optimal * 1.5) return 2;
    if (actual <= optimal * 2) return 1;
    return 0;
  }

  private getFeedback(stars: number): string {
    if (stars === 3) return 'Perfect! Optimal solution!';
    if (stars === 2) return 'Great! Very efficient!';
    if (stars === 1) return 'Good! You completed it!';
    return 'Try to use fewer moves next time.';
  }
}
```

```typescript
// grading/pass-fail-grader.ts

export class PassFailGrader implements Grader {
  grade(moveCount: number, lesson: Lesson): LessonGrade {
    return {
      completed: true,
      stars: 1,
      moveCount,
      feedback: 'Lesson complete!'
    };
  }
}
```

```typescript
// grading/grader-factory.ts

export class GraderFactory {
  static create(lesson: Lesson): Grader {
    if (lesson.grading === 'stars') {
      return new StarGrader();
    }

    if (lesson.grading === 'pass-fail') {
      return new PassFailGrader();
    }

    if (lesson.grading === 'none') {
      return new NoGrader();
    }

    return new PassFailGrader(); // default
  }
}
```

---

## 5. LearnEngine (Orchestrator)

```typescript
// learn-engine.ts

export class LearnEngine {
  #lesson: Lesson | null = null;
  #game: AntiRuleCore | null = null;
  #moveCount = 0;

  // Composed components (injected via factories)
  #validator: MoveValidator | null = null;
  #feedbackProvider: FeedbackProvider | null = null;
  #completionChecker: CompletionChecker | null = null;
  #grader: Grader | null = null;

  async loadLesson(lessonId: string): Promise<void> {
    const lesson = getLessonById(lessonId);
    if (!lesson) throw new Error(`Lesson not found: ${lessonId}`);

    this.#lesson = lesson;
    this.#game = new AntiRuleCore(lesson.startFen);

    // Create scenario if needed
    const scenario = lesson.scenario ? createScenario(lesson.scenario) : undefined;

    // Build components from lesson config
    this.#validator = ValidatorFactory.create(lesson, scenario);
    this.#feedbackProvider = FeedbackFactory.create(lesson);
    this.#completionChecker = CompletionFactory.create(lesson, [this.#validator]);
    this.#grader = GraderFactory.create(lesson);

    this.#updateStatus('ready');
  }

  makeMove(move: Move): boolean {
    if (!this.#validator || !this.#game) return false;

    // Validate
    const result = this.#validator.validate(move, this.#game);

    if (!result.valid) {
      // Show feedback based on severity
      if (result.feedbackData) {
        this.#showFeedback(result.feedbackData);
      }
      return false;
    }

    // Execute move
    this.#game.move(move);
    this.#moveCount++;

    // Show success feedback if any
    if (result.feedbackData) {
      this.#showFeedback(result.feedbackData);
    }

    // Check completion
    if (this.#completionChecker?.check(this)) {
      this.#complete();
    }

    return true;
  }

  #showFeedback(data: FeedbackData) {
    if (!this.#feedbackProvider || !this.#lesson) return;

    const messages = this.#lesson.feedback ?? {};

    if (data.severity === 'error') {
      this.#feedbackProvider.showError(data, messages);
    } else if (data.severity === 'warning') {
      this.#feedbackProvider.showWarning(data, messages);
    } else {
      this.#feedbackProvider.showInfo(data, messages);
    }
  }

  #complete() {
    if (!this.#grader || !this.#lesson) return;

    const grade = this.#grader.grade(this.#moveCount, this.#lesson);
    this.#callbacks.onComplete?.(grade);
    this.#updateStatus('completed');
  }
}
```

---

## 6. Lesson Configuration (Simplified)

```typescript
// types.ts

export interface Lesson {
  id: string;
  subjectId: string;
  sectionId: string;

  title: string;
  description: string;
  difficulty: 1 | 2 | 3;

  startFen: string;

  // Validation config
  validateLegality?: boolean; // default: true
  validateTerrain?: boolean; // default: false
  strictScenario?: boolean; // default: false

  // Completion config
  goalFen?: string;
  targetSquares?: Square[];
  orderedTargets?: boolean;
  scenario?: ScenarioBlueprint;
  customCompletion?: (engine: LearnEngine) => boolean;

  // Feedback config
  feedbackStyle?: 'silent' | 'toast' | 'modal' | 'inline';
  feedback?: LessonFeedback;

  // Grading config
  grading?: 'none' | 'pass-fail' | 'stars';
  optimalMoves?: number;

  // UI config
  allowUndo?: boolean;
  allowHints?: boolean;
  showMoveCount?: boolean;

  // Custom validators
  customMoveValidator?: (move: Move, engine: LearnEngine) => string | null;
}
```

---

## 7. Example Lesson Configurations

### Simple Movement (No feedback, just complete)

```typescript
{
  id: 'infantry-1',
  // ... meta
  startFen: '...',
  targetSquares: ['e2'],
  feedbackStyle: 'silent',
  grading: 'none',
  allowUndo: true,
}
```

### Terrain Tutorial (Educational feedback)

```typescript
{
  id: 'navy-terrain-1',
  // ... meta
  startFen: '...',
  targetSquares: ['a6', 'b6', 'c6'],
  validateTerrain: true,
  feedbackStyle: 'modal',
  feedback: {
    terrain: {
      navyToLand: '❌ Navy cannot enter land zones...',
    }
  },
  grading: 'pass-fail',
  allowUndo: true,
  allowHints: true,
}
```

### Strict Scenario

```typescript
{
  id: 'capture-sequence-1',
  // ... meta
  startFen: '...',
  scenario: ['e2e4', 'e7e5', 'f1c4'],
  strictScenario: true,
  feedbackStyle: 'toast',
  grading: 'pass-fail',
  allowUndo: true,
}
```

### Challenge with Stars

```typescript
{
  id: 'endgame-puzzle-1',
  // ... meta
  startFen: '...',
  goalFen: '...',
  optimalMoves: 5,
  feedbackStyle: 'silent',
  grading: 'stars',
  allowUndo: false,
  showMoveCount: true,
}
```

---

## Benefits

✅ **Single Responsibility**: Each class does one thing  
✅ **Open/Closed**: Add new validators/feedback without changing engine  
✅ **Composition**: Combine behaviors flexibly  
✅ **Testable**: Test each component independently  
✅ **No Duplication**: Shared logic in base classes  
✅ **Type Safe**: Factories ensure correct construction  
✅ **Easy to Extend**: Add new validator = implement interface + register in factory
