// Types
export type {
  Lesson,
  LessonCategory,
  LessonProgress,
  CategoryInfo,
  LearnStatus,
  LearnEngineCallbacks,
  LessonResult
} from './types';

// Anti-rule core for relaxed game rules
export { AntiRuleCore, createAntiRuleCore } from './anti-rule-core';
export type { AntiRuleOptions } from './anti-rule-core';

// Learn engine (framework-agnostic)
export { LearnEngine, createLearnEngine } from './learn-engine';

// Lessons and categories
export {
  categories,
  getLessonById,
  getCategoryById,
  getNextLesson,
  basicsLessons,
  piecesLessons,
  terrainLessons
} from './lessons';
