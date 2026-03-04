import type { Database } from '$lib/types/database';

export type FeedbackRow = Database['public']['Tables']['feedback']['Row'];
export type FeedbackInsert = Database['public']['Tables']['feedback']['Insert'];

export interface FeedbackContext {
  browser: string;
  deviceType: 'mobile' | 'desktop';
  screenSize: string;
  locale: string;
}
