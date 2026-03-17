import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthLearnProgress } from '../use-auth-learn-progress';

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockMigrateProgress = vi.fn();
const mockSaveDbProgress = vi.fn();
const mockGetDbProgress = vi.fn();
const mockSaveLessonProgressLocal = vi.fn();
const mockReplaceAllProgress = vi.fn();
const mockResetAllProgress = vi.fn();
const mockGetAllProgress = vi.fn();

let authStateChangeHandler: ((event: string, session: unknown) => void) | null = null;

vi.mock('@/hooks/use-learn-progress', () => ({
  useLearnProgress: () => ({
    initialized: true,
    progressVersion: 1
  })
}));

vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        authStateChangeHandler = callback;
        return mockOnAuthStateChange(callback);
      }
    }
  })
}));

vi.mock('@/lib/actions/learn', () => ({
  migrateProgress: (...args: unknown[]) => mockMigrateProgress(...args),
  saveDbProgress: (...args: unknown[]) => mockSaveDbProgress(...args),
  getDbProgress: (...args: unknown[]) => mockGetDbProgress(...args)
}));

vi.mock('@/stores/learn-store', () => ({
  useLearnStore: <T,>(selector: (state: Record<string, unknown>) => T) =>
    selector({
      saveLessonProgress: mockSaveLessonProgressLocal,
      replaceAllProgress: mockReplaceAllProgress,
      progressManager: {
        getAllProgress: mockGetAllProgress,
        resetAllProgress: mockResetAllProgress
      }
    })
}));

describe('useAuthLearnProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeHandler = null;

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    });

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockGetAllProgress.mockReturnValue({});
    mockMigrateProgress.mockResolvedValue({ success: true, migratedCount: 0 });
    mockSaveDbProgress.mockResolvedValue({ success: true });
    mockGetDbProgress.mockResolvedValue({ success: true, data: {} });
  });

  it('migrates local progress on sign-in and hydrates from DB', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mockGetAllProgress.mockReturnValue({
      'lesson-1': { lessonId: 'lesson-1', completed: true, stars: 2, moveCount: 5 }
    });
    mockGetDbProgress.mockResolvedValue({
      success: true,
      data: {
        'lesson-1': { lessonId: 'lesson-1', completed: true, stars: 3, moveCount: 4 }
      }
    });

    renderHook(() => useAuthLearnProgress());

    await waitFor(() => {
      expect(mockMigrateProgress).toHaveBeenCalledWith({
        'lesson-1': { lessonId: 'lesson-1', completed: true, stars: 2, moveCount: 5 }
      });
    });

    expect(mockResetAllProgress).toHaveBeenCalled();
    expect(mockGetDbProgress).toHaveBeenCalled();
    expect(mockReplaceAllProgress).toHaveBeenCalledWith(
      {
        'lesson-1': { lessonId: 'lesson-1', completed: true, stars: 3, moveCount: 4 }
      },
      { persist: false }
    );
  });

  it('queues save during loading and flushes to DB once authenticated', async () => {
    let resolveSession: ((value: unknown) => void) | null = null;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });

    mockGetSession.mockReturnValue(sessionPromise);

    const { result } = renderHook(() => useAuthLearnProgress());

    act(() => {
      result.current.saveLessonProgress('lesson-2', 3, 7);
    });

    expect(mockSaveDbProgress).not.toHaveBeenCalled();
    expect(mockSaveLessonProgressLocal).not.toHaveBeenCalled();

    await act(async () => {
      resolveSession?.({ data: { session: { user: { id: 'user-1' } } } });
      await sessionPromise;
    });

    await waitFor(() => {
      expect(mockSaveDbProgress).toHaveBeenCalledWith('lesson-2', 3, 7);
    });

    expect(mockSaveLessonProgressLocal).not.toHaveBeenCalled();
  });

  it('saves authenticated lesson completion to DB, not local storage', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });

    const { result } = renderHook(() => useAuthLearnProgress());

    await waitFor(() => {
      expect(result.current.authState).toBe('authenticated');
    });

    act(() => {
      result.current.saveLessonProgress('lesson-3', 2, 6);
    });

    await waitFor(() => {
      expect(mockSaveDbProgress).toHaveBeenCalledWith('lesson-3', 2, 6);
    });

    expect(mockSaveLessonProgressLocal).not.toHaveBeenCalled();
    expect(mockReplaceAllProgress).toHaveBeenCalledWith({}, { persist: false });
  });

  it('flushes queued loading saves to local storage when session resolves unauthenticated', async () => {
    let resolveSession: ((value: unknown) => void) | null = null;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });

    mockGetSession.mockReturnValue(sessionPromise);

    const { result } = renderHook(() => useAuthLearnProgress());

    act(() => {
      result.current.saveLessonProgress('lesson-5', 1, 4);
    });

    expect(mockSaveLessonProgressLocal).not.toHaveBeenCalled();

    await act(async () => {
      resolveSession?.({ data: { session: null } });
      await sessionPromise;
    });

    await waitFor(() => {
      expect(mockSaveLessonProgressLocal).toHaveBeenCalledWith('lesson-5', 1, 4);
    });
  });

  it('runs migration on SIGNED_IN auth event', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockGetAllProgress.mockReturnValue({
      'lesson-4': { lessonId: 'lesson-4', completed: true, stars: 1, moveCount: 3 }
    });

    renderHook(() => useAuthLearnProgress());

    await waitFor(() => {
      expect(authStateChangeHandler).toBeTypeOf('function');
    });

    await act(async () => {
      authStateChangeHandler?.('SIGNED_IN', { user: { id: 'user-2' } });
    });

    await waitFor(() => {
      expect(mockMigrateProgress).toHaveBeenCalledWith({
        'lesson-4': { lessonId: 'lesson-4', completed: true, stars: 1, moveCount: 3 }
      });
    });
  });

  it('queues failed DB save and retries on next persistProgress call', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });

    const { result } = renderHook(() => useAuthLearnProgress());

    await waitFor(() => {
      expect(result.current.authState).toBe('authenticated');
    });

    // Wait for initial migration/hydration to complete, then clear mocks
    await waitFor(() => {
      expect(mockGetDbProgress).toHaveBeenCalled();
    });
    vi.clearAllMocks();
    mockSaveDbProgress.mockResolvedValue({ success: true });
    mockGetDbProgress.mockResolvedValue({ success: true, data: {} });

    // First save fails
    mockSaveDbProgress.mockResolvedValueOnce({ success: false, error: 'DB error' });

    act(() => {
      result.current.saveLessonProgress('lesson-fail', 2, 5);
    });

    await waitFor(() => {
      expect(mockSaveDbProgress).toHaveBeenCalledWith('lesson-fail', 2, 5);
    });

    // Should NOT have hydrated since save failed
    expect(mockReplaceAllProgress).not.toHaveBeenCalled();

    // Second save succeeds — should also flush the queued failed save
    mockSaveDbProgress.mockResolvedValue({ success: true });

    act(() => {
      result.current.saveLessonProgress('lesson-ok', 3, 4);
    });

    await waitFor(() => {
      // The queued 'lesson-fail' should be retried before 'lesson-ok'
      expect(mockSaveDbProgress).toHaveBeenCalledWith('lesson-fail', 2, 5);
      expect(mockSaveDbProgress).toHaveBeenCalledWith('lesson-ok', 3, 4);
    });

    // Should hydrate after successful save
    await waitFor(() => {
      expect(mockReplaceAllProgress).toHaveBeenCalledWith({}, { persist: false });
    });
  });
});
