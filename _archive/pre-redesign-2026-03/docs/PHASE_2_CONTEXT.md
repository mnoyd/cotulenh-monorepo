# Phase 2: LearnEngine Refactor - Context Summary

## Goal

Refactor LearnEngine to use the new component architecture (validators, completion checkers, graders, feedback providers) instead of hardcoded logic.

## Current State (Phase 1 Complete)

- ✅ All component infrastructure built
- ✅ Type system complete
- ✅ Factories ready
- ⚠️ LearnEngine still uses old hardcoded logic
- ⚠️ Tests failing (16/23)

## Files to Refactor

### Primary Target

- `packages/cotulenh/learn/src/learn-engine.ts` - Main refactor target

### Supporting Files (reference only)

- `packages/cotulenh/learn/src/types.ts` - Type definitions
- `packages/cotulenh/learn/src/validators/validator-factory.ts` - How to create validators
- `packages/cotulenh/learn/src/completion/completion-factory.ts` - How to create completion checkers
- `packages/cotulenh/learn/src/grading/grader-factory.ts` - How to create graders
- `packages/cotulenh/learn/src/feedback/feedback-factory.ts` - How to create feedback providers

## Key Changes Needed in LearnEngine

### 1. Add Component Fields

```typescript
#validator: MoveValidator | null = null
#completionChecker: CompletionChecker | null = null
#grader: Grader | null = null
#feedbackProvider: FeedbackProvider | null = null
```

### 2. Initialize Components in loadLesson()

```typescript
async loadLesson(lessonId: string): Promise<void> {
  // ... existing code ...

  this.#validator = ValidatorFactory.create(lesson, this)
  this.#completionChecker = CompletionFactory.create(lesson, [this.#validator])
  this.#grader = GraderFactory.create(lesson)
  this.#feedbackProvider = FeedbackFactory.create(lesson)
}
```

### 3. Replace Hardcoded Validation

**Before** (hardcoded):

```typescript
// Inline validation logic
if (!this.#game.isLegal(move)) {
  return false;
}
```

**After** (delegated):

```typescript
const result = this.#validator?.validate(move, this.#game);
if (!result?.valid) {
  if (result?.feedbackData) {
    this.#feedbackProvider?.showError(result.feedbackData, this.#lesson?.feedback);
  }
  return false;
}
```

### 4. Replace Hardcoded Completion

**Before**:

```typescript
if (this.fen === this.#lesson?.goalFen) {
  this.#complete();
}
```

**After**:

```typescript
if (this.#completionChecker?.check(this)) {
  this.#complete();
}
```

### 5. Replace Hardcoded Grading

**Before**:

```typescript
const stars = this.calculateStars(this.#moveCount, optimal);
return { lessonId, moveCount, stars, completed: true };
```

**After**:

```typescript
const grade = this.#grader?.grade(this.#moveCount, this.#lesson);
return grade;
```

## What to Keep from Old Code

- FEN management
- Move execution (game.move())
- Callback triggering
- Scenario handling (for now)
- Undo/restart functionality

## What to Remove

- Inline validation logic
- Inline completion checking
- Star calculation (moved to StarGrader)
- Target tracking (moved to TargetValidator)

## Test Expectations

After refactor, these should pass:

- Target validation works
- Completion detection works
- Grading works
- Feedback callbacks trigger correctly
- Undo/restart works with new components

## Imports Needed

```typescript
import { ValidatorFactory } from './validators/validator-factory';
import { CompletionFactory } from './completion/completion-factory';
import { GraderFactory } from './grading/grader-factory';
import { FeedbackFactory } from './feedback/feedback-factory';
import type { MoveValidator } from './validators/move-validator';
import type { CompletionChecker } from './completion/completion-checker';
import type { Grader } from './grading/grader';
import type { FeedbackProvider } from './feedback/feedback-provider';
```

## Success Criteria

- ✅ All component factories used
- ✅ No hardcoded validation/completion/grading
- ✅ Tests passing
- ✅ Build passing
- ✅ Backward compatible with existing lessons
