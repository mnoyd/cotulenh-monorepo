import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args)
    },
    from: (...args: unknown[]) => mockFrom(...args)
  })
}));

function createQueryResult(result: { data: unknown[] | null; error: unknown }) {
  const builder: Record<string, unknown> = {
    eq: () => builder,
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(result).then(resolve, reject);
    }
  };
  return builder;
}

function setupChain(
  queryResult: { data: unknown[] | null; error: unknown } = { data: [], error: null }
) {
  mockFrom.mockReturnValue({
    select: () => createQueryResult(queryResult),
    upsert: (...args: unknown[]) => mockUpsert(...args)
  });
}

const loadActions = () => import('../learn');

describe('migrateProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { migrateProgress } = await loadActions();
    const result = await migrateProgress({});

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error for invalid input — missing stars', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    const { migrateProgress } = await loadActions();
    const result = await migrateProgress({
      'lesson-1': { lessonId: 'lesson-1', completed: true, moveCount: 5 } as never
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error for invalid stars value (out of range)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    const { migrateProgress } = await loadActions();
    const result = await migrateProgress({
      'lesson-1': { lessonId: 'lesson-1', completed: true, moveCount: 5, stars: 5 as never }
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('migrates progress and keeps higher stars (localStorage wins)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    setupChain({
      data: [{ lesson_id: 'lesson-1', stars: 2, move_count: 10 }],
      error: null
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { migrateProgress } = await loadActions();
    const result = await migrateProgress({
      'lesson-1': { lessonId: 'lesson-1', completed: true, moveCount: 5, stars: 3 }
    });

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(mockUpsert).toHaveBeenCalled();
    const upsertArg = mockUpsert.mock.calls[0][0];
    const lesson1 = Array.isArray(upsertArg)
      ? upsertArg.find((r: { lesson_id: string }) => r.lesson_id === 'lesson-1')
      : upsertArg;
    expect(lesson1.stars).toBe(3);
  });

  it('migrates progress and keeps higher stars (DB wins)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    setupChain({
      data: [{ lesson_id: 'lesson-1', stars: 3, move_count: 4 }],
      error: null
    });

    const { migrateProgress } = await loadActions();
    const result = await migrateProgress({
      'lesson-1': { lessonId: 'lesson-1', completed: true, moveCount: 10, stars: 1 }
    });

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
  });

  it('migrates new lessons not in DB', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    setupChain({ data: [], error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { migrateProgress } = await loadActions();
    const result = await migrateProgress({
      'lesson-1': { lessonId: 'lesson-1', completed: true, moveCount: 5, stars: 2 },
      'lesson-2': { lessonId: 'lesson-2', completed: true, moveCount: 3, stars: 3 }
    });

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(2);
  });

  it('returns success with 0 count for empty input', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    const { migrateProgress } = await loadActions();
    const result = await migrateProgress({});

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
  });
});

describe('saveDbProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { saveDbProgress } = await loadActions();
    const result = await saveDbProgress('lesson-1', 2, 5);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('upserts single lesson when new stars are better', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    setupChain({
      data: [{ lesson_id: 'lesson-1', stars: 1, move_count: 10 }],
      error: null
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { saveDbProgress } = await loadActions();
    const result = await saveDbProgress('lesson-1', 3, 5);

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('skips upsert when existing stars are equal or better', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    setupChain({
      data: [{ lesson_id: 'lesson-1', stars: 3, move_count: 4 }],
      error: null
    });

    const { saveDbProgress } = await loadActions();
    const result = await saveDbProgress('lesson-1', 2, 5);

    expect(result.success).toBe(true);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('inserts new lesson when none exists in DB', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    setupChain({ data: [], error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { saveDbProgress } = await loadActions();
    const result = await saveDbProgress('lesson-1', 2, 5);

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
  });
});

describe('getDbProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { getDbProgress } = await loadActions();
    const result = await getDbProgress();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns progress in Record<string, LessonProgress> format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    setupChain({
      data: [
        { lesson_id: 'lesson-1', stars: 3, move_count: 5 },
        { lesson_id: 'lesson-2', stars: 1, move_count: 10 }
      ],
      error: null
    });

    const { getDbProgress } = await loadActions();
    const result = await getDbProgress();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      'lesson-1': { lessonId: 'lesson-1', completed: true, stars: 3, moveCount: 5 },
      'lesson-2': { lessonId: 'lesson-2', completed: true, stars: 1, moveCount: 10 }
    });
  });

  it('returns empty object when no progress exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    setupChain({ data: [], error: null });

    const { getDbProgress } = await loadActions();
    const result = await getDbProgress();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });
});

describe('migration flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  it('full migration: 3 lessons from localStorage → DB, keeping best stars', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    // DB already has lesson-2 with 3 stars
    setupChain({
      data: [{ lesson_id: 'lesson-2', stars: 3, move_count: 2 }],
      error: null
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { migrateProgress } = await loadActions();
    const result = await migrateProgress({
      'lesson-1': { lessonId: 'lesson-1', completed: true, moveCount: 5, stars: 2 },
      'lesson-2': { lessonId: 'lesson-2', completed: true, moveCount: 8, stars: 1 },
      'lesson-3': { lessonId: 'lesson-3', completed: true, moveCount: 3, stars: 3 }
    });

    expect(result.success).toBe(true);
    // lesson-1 (new) and lesson-3 (new) should be upserted; lesson-2 skipped (DB has better)
    expect(result.migratedCount).toBe(2);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upserted = mockUpsert.mock.calls[0][0] as Array<{ lesson_id: string; stars: number }>;
    expect(upserted).toHaveLength(2);
    expect(upserted.find((r) => r.lesson_id === 'lesson-1')?.stars).toBe(2);
    expect(upserted.find((r) => r.lesson_id === 'lesson-3')?.stars).toBe(3);
    expect(upserted.find((r) => r.lesson_id === 'lesson-2')).toBeUndefined();
  });

  it('authenticated user saves directly to DB via saveDbProgress', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    // No existing progress
    setupChain({ data: [], error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { saveDbProgress } = await loadActions();
    const result = await saveDbProgress('lesson-new', 2, 7);

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        lesson_id: 'lesson-new',
        stars: 2,
        move_count: 7
      }),
      expect.any(Object)
    );
  });
});
