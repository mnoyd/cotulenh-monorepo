'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/browser';
import { useLearnProgress } from '@/hooks/use-learn-progress';
import { useLearnStore } from '@/stores/learn-store';
import { getDbProgress, migrateProgress, saveDbProgress } from '@/lib/actions/learn';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuthLearnProgress() {
  const { initialized, progressVersion } = useLearnProgress();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const migrationAttemptedRef = useRef(false);
  const pendingSavesRef = useRef<
    Array<{ lessonId: string; stars: 0 | 1 | 2 | 3; moveCount: number }>
  >([]);
  const saveLessonProgressLocal = useLearnStore((s) => s.saveLessonProgress);
  const replaceAllProgress = useLearnStore((s) => s.replaceAllProgress);
  const progressManager = useLearnStore((s) => s.progressManager);

  const flushPendingSaves = useCallback(async () => {
    if (authState !== 'authenticated' || pendingSavesRef.current.length === 0) return;

    const queued = [...pendingSavesRef.current];
    pendingSavesRef.current = [];

    for (const save of queued) {
      const saveResult = await saveDbProgress(save.lessonId, save.stars, save.moveCount);
      if (!saveResult.success) {
        pendingSavesRef.current.push(save);
      }
    }

    if (pendingSavesRef.current.length === 0) {
      const dbResult = await getDbProgress();
      if (dbResult.success && dbResult.data) {
        replaceAllProgress(dbResult.data, { persist: false });
      }
    }
  }, [authState, replaceAllProgress]);

  // Check auth state and listen for changes
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(session ? 'authenticated' : 'unauthenticated');
    });

    // Listen for auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setAuthState('authenticated');
        migrationAttemptedRef.current = false; // Allow migration on new sign-in
      } else if (event === 'SIGNED_OUT') {
        setAuthState('unauthenticated');
        migrationAttemptedRef.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Trigger migration and hydration when auth state changes to authenticated
  useEffect(() => {
    if (authState !== 'authenticated' || !initialized || migrationAttemptedRef.current) return;
    if (!progressManager) return;

    migrationAttemptedRef.current = true;

    const syncProgress = async () => {
      const localProgress = progressManager.getAllProgress();
      const hasLocalProgress = Object.keys(localProgress).length > 0;

      if (hasLocalProgress) {
        const migrateResult = await migrateProgress(localProgress);
        if (migrateResult.success) {
          progressManager.resetAllProgress();
        } else {
          // On failure: keep localStorage, retry next session (AC: 5.5)
          return;
        }
      }

      const dbResult = await getDbProgress();
      if (dbResult.success && dbResult.data) {
        replaceAllProgress(dbResult.data, { persist: false });
      }
    };

    void syncProgress();
  }, [authState, initialized, progressManager, replaceAllProgress]);

  const persistProgress = useCallback(
    async (lessonId: string, stars: 0 | 1 | 2 | 3, moveCount: number) => {
      if (authState === 'authenticated') {
        await flushPendingSaves();

        const saveResult = await saveDbProgress(lessonId, stars, moveCount);
        if (saveResult.success) {
          const dbResult = await getDbProgress();
          if (dbResult.success && dbResult.data) {
            replaceAllProgress(dbResult.data, { persist: false });
          }
          return;
        }

        pendingSavesRef.current.push({ lessonId, stars, moveCount });
        return;
      }

      // Unauthenticated flow uses local storage.
      saveLessonProgressLocal(lessonId, stars, moveCount);
    },
    [authState, flushPendingSaves, replaceAllProgress, saveLessonProgressLocal]
  );

  useEffect(() => {
    if (authState === 'loading' || pendingSavesRef.current.length === 0) return;

    if (authState === 'unauthenticated') {
      const queued = [...pendingSavesRef.current];
      pendingSavesRef.current = [];
      for (const save of queued) {
        saveLessonProgressLocal(save.lessonId, save.stars, save.moveCount);
      }
      return;
    }

    void flushPendingSaves();
  }, [authState, flushPendingSaves, saveLessonProgressLocal]);

  // Dual-mode save function
  const saveLessonProgressDual = useCallback(
    (lessonId: string, stars: 0 | 1 | 2 | 3, moveCount: number) => {
      if (authState === 'loading') {
        pendingSavesRef.current.push({ lessonId, stars, moveCount });
        return;
      }

      void persistProgress(lessonId, stars, moveCount);
    },
    [authState, persistProgress]
  );

  return {
    initialized,
    progressVersion,
    authState,
    saveLessonProgress: saveLessonProgressDual
  };
}
