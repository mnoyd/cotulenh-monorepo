import type { SupabaseClient } from '@supabase/supabase-js';
import type { LessonProgress } from '@cotulenh/learn';
import { subjectProgress } from './learn-progress.svelte';
import { logger } from '@cotulenh/common';

let currentSyncUserId: string | null = null;
let syncSessionId = 0;
let pendingInitialRetryUserId: string | null = null;
let originalSave: ((lessonId: string, stars: 0 | 1 | 2 | 3, moveCount: number) => void) | null =
  null;

function isActiveSync(userId: string, sessionId: number): boolean {
  return currentSyncUserId === userId && syncSessionId === sessionId;
}

function saveLessonProgressLocally(
  lessonId: string,
  stars: 0 | 1 | 2 | 3,
  moveCount: number
): void {
  if (originalSave) {
    originalSave(lessonId, stars, moveCount);
    return;
  }

  subjectProgress.saveLessonProgress(lessonId, stars, moveCount);
}

async function upsertProgress(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string,
  stars: number,
  moveCount: number
): Promise<void> {
  try {
    const { error } = await supabase.from('learn_progress').upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        stars,
        move_count: moveCount
      },
      { onConflict: 'user_id,lesson_id' }
    );
    if (error) {
      logger.error(error, `Failed to sync learn progress for lesson ${lessonId}`);
    }
  } catch (err) {
    logger.error(err, `Failed to sync learn progress for lesson ${lessonId}`);
  }
}

async function batchUpsertProgress(
  supabase: SupabaseClient,
  userId: string,
  entries: Array<{ lessonId: string; stars: number; moveCount: number }>
): Promise<boolean> {
  if (entries.length === 0) return true;
  try {
    const rows = entries.map((e) => ({
      user_id: userId,
      lesson_id: e.lessonId,
      stars: e.stars,
      move_count: e.moveCount
    }));
    const { error } = await supabase
      .from('learn_progress')
      .upsert(rows, { onConflict: 'user_id,lesson_id' });
    if (error) {
      logger.error(error, 'Failed to batch sync learn progress');
      return false;
    }
    return true;
  } catch (err) {
    logger.error(err, 'Failed to batch sync learn progress');
    return false;
  }
}

export function startLearnProgressSync(supabase: SupabaseClient, userId: string): void {
  if (currentSyncUserId === userId) {
    // Already syncing for this user. If the initial migration failed earlier,
    // allow a retry on the next start call (e.g., next navigation).
    if (pendingInitialRetryUserId === userId) {
      pendingInitialRetryUserId = null;
      syncSessionId += 1;
      const retrySessionId = syncSessionId;
      void performInitialSync(supabase, userId, retrySessionId);
    }
    return;
  }
  if (currentSyncUserId) stopLearnProgressSync(); // Different user — stop previous
  currentSyncUserId = userId;
  pendingInitialRetryUserId = null;
  syncSessionId += 1;
  const sessionId = syncSessionId;

  // Wrap saveLessonProgress to also write to Supabase
  originalSave = subjectProgress.saveLessonProgress.bind(subjectProgress);
  const localSave = originalSave;
  const boundSupabase = supabase;
  const boundUserId = userId;

  subjectProgress.saveLessonProgress = (
    lessonId: string,
    stars: 0 | 1 | 2 | 3,
    moveCount: number
  ) => {
    const existing = subjectProgress.getLessonProgress(lessonId);
    localSave(lessonId, stars, moveCount);

    // Keep remote and local consistency with ProgressManager's "higher stars only" rule.
    const shouldSync = !existing || stars > existing.stars;
    if (!shouldSync) return;

    if (!isActiveSync(boundUserId, sessionId)) return;
    void upsertProgress(boundSupabase, boundUserId, lessonId, stars, moveCount);
  };

  // Fire-and-forget initial sync
  void performInitialSync(supabase, userId, sessionId);
}

export function stopLearnProgressSync(): void {
  // Invalidate in-flight async work for the current user/session.
  syncSessionId += 1;
  pendingInitialRetryUserId = null;
  if (originalSave) {
    subjectProgress.saveLessonProgress = originalSave;
    originalSave = null;
  }
  currentSyncUserId = null;
}

async function performInitialSync(
  supabase: SupabaseClient,
  userId: string,
  sessionId: number
): Promise<void> {
  try {
    if (!isActiveSync(userId, sessionId)) return;

    // Fetch all DB rows for this user
    const { data: dbRows, error } = await supabase
      .from('learn_progress')
      .select('lesson_id, stars, move_count')
      .eq('user_id', userId);

    if (!isActiveSync(userId, sessionId)) return;

    if (error) {
      logger.error(error, 'Failed to fetch learn progress from Supabase');
      if (isActiveSync(userId, sessionId)) {
        pendingInitialRetryUserId = userId;
      }
      return;
    }

    const dbProgress: Record<string, LessonProgress> = {};
    if (dbRows) {
      for (const row of dbRows) {
        dbProgress[row.lesson_id] = {
          lessonId: row.lesson_id,
          completed: true, // Only completed lessons have rows in DB
          moveCount: row.move_count,
          stars: row.stars as 0 | 1 | 2 | 3
        };
      }
    }

    // Get current localStorage progress
    const localProgress = subjectProgress.getAllProgress();

    // Find lessons only in DB — save to localStorage
    for (const [lessonId, dbLesson] of Object.entries(dbProgress)) {
      if (!isActiveSync(userId, sessionId)) return;

      const localLesson = localProgress[lessonId];
      if (!localLesson) {
        // DB-only: save to localStorage (ProgressManager handles new inserts)
        saveLessonProgressLocally(dbLesson.lessonId, dbLesson.stars, dbLesson.moveCount);
      } else if (dbLesson.stars > localLesson.stars) {
        // DB has better stars: update localStorage
        saveLessonProgressLocally(dbLesson.lessonId, dbLesson.stars, dbLesson.moveCount);
      }
    }

    // Find lessons only in localStorage or where localStorage has better stars — batch upsert to DB
    const toUpsert: Array<{ lessonId: string; stars: number; moveCount: number }> = [];
    for (const [lessonId, localLesson] of Object.entries(localProgress)) {
      const dbLesson = dbProgress[lessonId];
      if (!dbLesson) {
        // localStorage-only: upsert to DB
        toUpsert.push({
          lessonId,
          stars: localLesson.stars,
          moveCount: localLesson.moveCount
        });
      } else if (localLesson.stars > dbLesson.stars) {
        // localStorage has better stars: update DB
        toUpsert.push({
          lessonId,
          stars: localLesson.stars,
          moveCount: localLesson.moveCount
        });
      }
    }

    if (!isActiveSync(userId, sessionId)) return;
    const upsertSucceeded = await batchUpsertProgress(supabase, userId, toUpsert);
    if (!isActiveSync(userId, sessionId)) return;
    if (!upsertSucceeded) {
      pendingInitialRetryUserId = userId;
      return;
    }
    pendingInitialRetryUserId = null;
    if (toUpsert.length > 0) {
      logger.info(`Learn progress: migrated ${toUpsert.length} lesson(s) to database`);
    }
  } catch (err) {
    logger.error(err, 'Failed to perform initial learn progress sync');
    if (isActiveSync(userId, sessionId)) {
      pendingInitialRetryUserId = userId;
    }
    // Non-fatal: localStorage has the data, will retry on next auth
  }
}
