// Types
export type {
  Lesson,
  LessonCategory,
  LessonProgress,
  LearnStatus,
  LearnEngineCallbacks,
  LessonResult,
  Uci,
  ScenarioStep,
  ScenarioBlueprint,
  BoardShape,
  SquareInfo,
  Subject,
  SubjectId,
  Section,
  SectionId,
  SubjectProgress,
  FeedbackData,
  MoveValidationResult,
  LessonFeedback,
  FeedbackStyle,
  GradingSystem,
  FeedbackCode,
  HintLevel,
  ProgressiveHintsConfig
} from './types';

// Validators
export { CompositeValidator } from './validators/composite-validator';
export { TargetValidator } from './validators/target-validator';
export { TerrainValidator } from './validators/terrain-validator';
export { CustomValidator } from './validators/custom-validator';
export { ValidatorFactory } from './validators/validator-factory';
export type { MoveValidator } from './validators/move-validator';

// Completion checkers
export { GoalCompletionChecker } from './completion/goal-completion';
export { FirstMoveCompletionChecker } from './completion/first-move-completion';
export { TargetCompletionChecker } from './completion/target-completion';
export { CustomCompletionChecker } from './completion/custom-completion';
export { CompletionFactory } from './completion/completion-factory';
export type { CompletionChecker } from './completion/completion-checker';

// Graders
export { NoGrader } from './grading/no-grader';
export { PassFailGrader } from './grading/pass-fail-grader';
export { StarGrader } from './grading/star-grader';
export { GraderFactory } from './grading/grader-factory';
export type { Grader } from './grading/grader';

// Feedback providers
export { SilentFeedbackProvider } from './feedback/silent-feedback';
export { FeedbackFactory } from './feedback/feedback-factory';
export type { FeedbackProvider } from './feedback/feedback-provider';

// Anti-rule core for relaxed game rules
export { AntiRuleCore, createAntiRuleCore } from './anti-rule-core';
export type { AntiRuleOptions } from './anti-rule-core';

// Scenario for scripted interactive lessons
export { Scenario, createScenario } from './scenario';
export type { ScenarioOptions } from './scenario';

// Learn engine (framework-agnostic)
export { LearnEngine, createLearnEngine } from './learn-engine';

// Lessons and curriculum
export { getLessonById, getLessonContext } from './lessons';
export type { LessonContext } from './lessons';

// Subjects (curriculum structure)
export { subjects, getSubjectById, getLessonInSubject, getNextLessonInSubject } from './lessons';

// Progress management (framework-agnostic)
export { ProgressManager, createProgressManager } from './progress';
export { type StorageAdapter, MemoryStorageAdapter, LocalStorageAdapter } from './progress';

// Hint system (progressive hints)
export { HintSystem, createHintSystem } from './hint-system';
export type { HintSystemCallbacks } from './hint-system';

// Internationalization for learn content
export {
  LEARN_LOCALES,
  setLearnLocale,
  getLearnLocale,
  getSubjectTranslation,
  getSectionTranslation,
  getLessonTranslation,
  tSubjectTitle,
  tSubjectDescription,
  tSubjectIntroduction,
  tSectionTitle,
  tSectionDescription,
  tSectionIntroduction,
  tLessonTitle,
  tLessonDescription,
  tLessonContent,
  tLessonInstruction,
  tLessonHint,
  tLessonSuccessMessage,
  tLessonFailureMessage,
  translateSubject,
  translateSection,
  translateLesson
} from './i18n';
export type {
  LearnLocale,
  LessonTranslation,
  SectionTranslation,
  SubjectTranslation,
  LearnTranslations
} from './i18n';
