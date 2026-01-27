import type { FeedbackProvider } from './feedback-provider';

/**
 * Silent feedback provider - no output
 */
export class SilentFeedbackProvider implements FeedbackProvider {
  showError(): void {}
  showWarning(): void {}
  showInfo(): void {}
  clear(): void {}
}
