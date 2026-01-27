import type { Lesson } from '../types';
import type { FeedbackProvider } from './feedback-provider';
import { SilentFeedbackProvider } from './silent-feedback';

/**
 * Factory for creating feedback providers based on lesson configuration
 */
export class FeedbackFactory {
  static create(lesson: Lesson): FeedbackProvider {
    const style = lesson.feedbackStyle ?? 'silent';

    switch (style) {
      case 'silent':
        return new SilentFeedbackProvider();
      case 'toast':
      case 'modal':
      case 'inline':
        // For now, return silent - these will be implemented later
        // when we integrate with the UI
        return new SilentFeedbackProvider();
      default:
        return new SilentFeedbackProvider();
    }
  }
}
