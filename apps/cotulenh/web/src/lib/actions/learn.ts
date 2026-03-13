'use server';

import { createClient } from '@/lib/supabase/server';

type LessonProgressInput = {
  lessonId: string;
  completed: boolean;
  moveCount: number;
  stars: 0 | 1 | 2 | 3;
};

type MigrateResult = {
  success: boolean;
  error?: string;
  migratedCount?: number;
};

type SaveResult = {
  success: boolean;
  error?: string;
};

type GetProgressResult = {
  success: boolean;
  error?: string;
  data?: Record<string, LessonProgressInput>;
};

function validateProgressEntry(entry: unknown): entry is LessonProgressInput {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.lessonId === 'string' &&
    e.completed === true &&
    typeof e.moveCount === 'number' &&
    e.moveCount >= 0 &&
    typeof e.stars === 'number' &&
    e.stars >= 0 &&
    e.stars <= 3
  );
}

export async function migrateProgress(
  localProgress: Record<string, unknown>
): Promise<MigrateResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để đồng bộ tiến độ' };
  }

  const entries = Object.values(localProgress);
  if (entries.length === 0) {
    return { success: true, migratedCount: 0 };
  }

  // Validate all entries
  for (const entry of entries) {
    if (!validateProgressEntry(entry)) {
      return { success: false, error: 'Dữ liệu tiến độ không hợp lệ' };
    }
  }

  const validEntries = entries as LessonProgressInput[];

  // Fetch existing DB progress
  const { data: existingRows, error: fetchError } = await supabase
    .from('learn_progress')
    .select('lesson_id, stars, move_count')
    .eq('user_id', user.id);

  if (fetchError) {
    return { success: false, error: 'Không thể đọc tiến độ hiện tại' };
  }

  const existingMap = new Map<string, { stars: number; move_count: number }>();
  for (const row of existingRows ?? []) {
    existingMap.set(row.lesson_id, { stars: row.stars, move_count: row.move_count });
  }

  // Determine which entries need upserting (local stars > existing DB stars)
  const toUpsert: { user_id: string; lesson_id: string; stars: number; move_count: number }[] = [];

  for (const entry of validEntries) {
    const existing = existingMap.get(entry.lessonId);
    if (!existing || entry.stars > existing.stars) {
      toUpsert.push({
        user_id: user.id,
        lesson_id: entry.lessonId,
        stars: entry.stars,
        move_count: entry.moveCount
      });
    }
  }

  if (toUpsert.length === 0) {
    return { success: true, migratedCount: 0 };
  }

  const { error: upsertError } = await supabase
    .from('learn_progress')
    .upsert(toUpsert, { onConflict: 'user_id,lesson_id' });

  if (upsertError) {
    return { success: false, error: 'Không thể đồng bộ tiến độ' };
  }

  return { success: true, migratedCount: toUpsert.length };
}

export async function saveDbProgress(
  lessonId: string,
  stars: 0 | 1 | 2 | 3,
  moveCount: number
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để lưu tiến độ' };
  }

  // Check existing stars
  const { data: existing, error: fetchError } = await supabase
    .from('learn_progress')
    .select('stars')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId);

  if (fetchError) {
    return { success: false, error: 'Không thể đọc tiến độ hiện tại' };
  }

  // Only upsert if new stars are better
  if (existing && existing.length > 0 && existing[0].stars >= stars) {
    return { success: true };
  }

  const { error: upsertError } = await supabase.from('learn_progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      stars,
      move_count: moveCount
    },
    { onConflict: 'user_id,lesson_id' }
  );

  if (upsertError) {
    return { success: false, error: 'Không thể lưu tiến độ' };
  }

  return { success: true };
}

export async function getDbProgress(): Promise<GetProgressResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để xem tiến độ' };
  }

  const { data: rows, error } = await supabase
    .from('learn_progress')
    .select('lesson_id, stars, move_count')
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Không thể đọc tiến độ' };
  }

  const progress: Record<string, LessonProgressInput> = {};
  for (const row of rows ?? []) {
    progress[row.lesson_id] = {
      lessonId: row.lesson_id,
      completed: true,
      stars: row.stars as 0 | 1 | 2 | 3,
      moveCount: row.move_count
    };
  }

  return { success: true, data: progress };
}
