import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeMessage, collectContext, submitFeedback } from './submit';

describe('sanitizeMessage', () => {
  it('strips HTML tags from message', () => {
    expect(sanitizeMessage('Hello <script>alert("xss")</script> world')).toBe(
      'Hello alert("xss") world'
    );
  });

  it('strips nested HTML tags', () => {
    expect(sanitizeMessage('<div><b>Bold</b></div>')).toBe('Bold');
  });

  it('returns plain text unchanged', () => {
    expect(sanitizeMessage('Normal feedback message')).toBe('Normal feedback message');
  });

  it('handles empty string', () => {
    expect(sanitizeMessage('')).toBe('');
  });

  it('handles message with only whitespace', () => {
    expect(sanitizeMessage('   ')).toBe('   ');
  });

  it('strips angle bracket sequences that resemble tags', () => {
    // Same behavior as sanitizeName — regex treats <...> as tag-like
    expect(sanitizeMessage('3 < 5 and 10 > 7')).toBe('3  7');
  });
});

describe('collectContext', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 TestBrowser',
      configurable: true
    });
  });

  it('collects browser user agent', () => {
    const ctx = collectContext('en');
    expect(ctx.browser).toBe('Mozilla/5.0 TestBrowser');
  });

  it('detects desktop for wide screens', () => {
    const ctx = collectContext('en');
    expect(ctx.deviceType).toBe('desktop');
  });

  it('detects mobile for narrow screens', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    const ctx = collectContext('en');
    expect(ctx.deviceType).toBe('mobile');
  });

  it('formats screen size correctly', () => {
    const ctx = collectContext('en');
    expect(ctx.screenSize).toBe('1920x1080');
  });

  it('includes passed locale', () => {
    const ctx = collectContext('vi');
    expect(ctx.locale).toBe('vi');
  });
});

describe('submitFeedback', () => {
  function createMockSupabase(insertResult: { error: unknown }) {
    const insertFn = vi.fn().mockResolvedValue(insertResult);
    const fromFn = vi.fn().mockReturnValue({ insert: insertFn });
    return {
      supabase: { from: fromFn } as unknown as Parameters<typeof submitFeedback>[0],
      fromFn,
      insertFn
    };
  }

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/play' },
      configurable: true
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'TestAgent',
      configurable: true
    });
  });

  it('returns error for empty message', async () => {
    const { supabase } = createMockSupabase({ error: null });
    const result = await submitFeedback(supabase, '   ', 'en');
    expect(result.error).toBe('empty');
  });

  it('returns error when sanitized message becomes empty', async () => {
    const { supabase } = createMockSupabase({ error: null });
    const result = await submitFeedback(supabase, '<b>   </b>', 'en');
    expect(result.error).toBe('empty');
  });

  it('inserts feedback with correct data for authenticated user', async () => {
    const { supabase, insertFn } = createMockSupabase({ error: null });
    const result = await submitFeedback(supabase, 'Great app!', 'en', 'user-123');

    expect(result.error).toBeNull();
    expect(insertFn).toHaveBeenCalledWith({
      user_id: 'user-123',
      message: 'Great app!',
      page_url: 'https://example.com/play',
      context_json: {
        browser: 'TestAgent',
        deviceType: 'desktop',
        screenSize: '1024x768',
        locale: 'en'
      }
    });
  });

  it('inserts feedback with null user_id for anonymous user', async () => {
    const { supabase, insertFn } = createMockSupabase({ error: null });
    await submitFeedback(supabase, 'Bug report', 'vi');

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ user_id: null }));
  });

  it('sanitizes HTML from message before insert', async () => {
    const { supabase, insertFn } = createMockSupabase({ error: null });
    await submitFeedback(supabase, '<script>hack</script>Real feedback', 'en', 'user-1');

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'hackReal feedback' })
    );
  });

  it('trims sanitized message before insert', async () => {
    const { supabase, insertFn } = createMockSupabase({ error: null });
    await submitFeedback(supabase, '   <b>Real feedback</b>   ', 'en', 'user-1');

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ message: 'Real feedback' }));
  });

  it('returns error message on supabase failure', async () => {
    const { supabase } = createMockSupabase({ error: { message: 'Network error' } });
    const result = await submitFeedback(supabase, 'Feedback', 'en', 'user-1');
    expect(result.error).toBe('Network error');
  });

  it('allows retry after failure', async () => {
    const insertFn = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: 'Network error' } })
      .mockResolvedValueOnce({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({ insert: insertFn })
    } as unknown as Parameters<typeof submitFeedback>[0];

    const first = await submitFeedback(supabase, 'Feedback', 'en', 'user-1');
    const second = await submitFeedback(supabase, 'Feedback', 'en', 'user-1');

    expect(first.error).toBe('Network error');
    expect(second.error).toBeNull();
    expect(insertFn).toHaveBeenCalledTimes(2);
  });
});
