import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedbackContext } from './types';

/** Strip HTML tags from feedback message to prevent stored XSS */
export function sanitizeMessage(message: string): string {
  return message.replace(/<[^>]*>/g, '');
}

/** Collect browser/device context for feedback submission */
export function collectContext(locale: string): FeedbackContext {
  return {
    browser: navigator.userAgent,
    deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    locale
  };
}

/** Submit feedback to Supabase */
export async function submitFeedback(
  supabase: SupabaseClient,
  message: string,
  locale: string,
  userId?: string
): Promise<{ error: string | null }> {
  const sanitized = sanitizeMessage(message).trim();
  if (!sanitized) {
    return { error: 'empty' };
  }

  const context = collectContext(locale);

  const { error } = await supabase.from('feedback').insert({
    user_id: userId ?? null,
    message: sanitized,
    page_url: window.location.href,
    context_json: context
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
