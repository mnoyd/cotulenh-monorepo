import type { FeedbackData, LessonFeedback } from '../types';

/**
 * Base interface for feedback providers
 */
export interface FeedbackProvider {
  showError(data: FeedbackData, messages: LessonFeedback): void;
  showWarning(data: FeedbackData, messages: LessonFeedback): void;
  showInfo(data: FeedbackData, messages: LessonFeedback): void;
  clear(): void;
}
