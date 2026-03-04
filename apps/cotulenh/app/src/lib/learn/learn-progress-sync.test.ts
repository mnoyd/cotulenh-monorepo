import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startLearnProgressSync, stopLearnProgressSync } from './learn-progress-sync.svelte';
import { subjectProgress } from './learn-progress.svelte';

type MockLessonProgress = {
	lessonId: string;
	completed: boolean;
	stars: 0 | 1 | 2 | 3;
	moveCount: number;
};

// Mock the logger
vi.mock('@cotulenh/common', () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	}
}));

// Mock subjectProgress singleton
vi.mock('./learn-progress.svelte', () => {
	const mockProgress: Record<string, MockLessonProgress> = {};

	return {
		subjectProgress: {
			saveLessonProgress: vi.fn((lessonId: string, stars: 0 | 1 | 2 | 3, moveCount: number) => {
				const existing = mockProgress[lessonId];
				if (!existing || stars > existing.stars) {
					mockProgress[lessonId] = { lessonId, completed: true, stars, moveCount };
				}
			}),
			getAllProgress: vi.fn(() => ({ ...mockProgress })),
			getLessonProgress: vi.fn((lessonId: string) => mockProgress[lessonId] ?? null)
		}
	};
});

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function createMockSupabase(options: {
	selectData?: Array<{ lesson_id: string; stars: number; move_count: number }>;
	selectError?: { message: string } | null;
	upsertError?: { message: string } | null;
} = {}) {
	const { selectData = [], selectError = null, upsertError = null } = options;

	const upsertFn = vi.fn().mockResolvedValue({ error: upsertError });
	const eqFn = vi.fn().mockResolvedValue({ data: selectData, error: selectError });
	const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

	return {
		client: {
			from: vi.fn().mockReturnValue({
				select: selectFn,
				upsert: upsertFn
			})
		} as unknown as import('@supabase/supabase-js').SupabaseClient,
		upsertFn,
		eqFn,
		selectFn
	};
}

describe('learn-progress-sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		stopLearnProgressSync();
		// Restore saveLessonProgress to a fresh spy (stopSync restores a .bind() copy which isn't a spy)
		const mockProgress: Record<string, MockLessonProgress> = {};
		subjectProgress.saveLessonProgress = vi.fn((lessonId: string, stars: 0 | 1 | 2 | 3, moveCount: number) => {
			const existing = mockProgress[lessonId];
			if (!existing || stars > existing.stars) {
				mockProgress[lessonId] = { lessonId, completed: true, stars, moveCount };
			}
		}) as typeof subjectProgress.saveLessonProgress;
		vi.mocked(subjectProgress.getAllProgress).mockImplementation(() => ({ ...mockProgress }));
		vi.mocked(subjectProgress.getLessonProgress).mockImplementation((lessonId: string) => {
			return mockProgress[lessonId] ?? null;
		});
	});

	afterEach(() => {
		stopLearnProgressSync();
	});

	describe('merge logic', () => {
		it('localStorage wins when stars are higher', async () => {
			// Local has 3 stars, DB has 1 star
			vi.mocked(subjectProgress.getAllProgress).mockReturnValue({
				'basics-1': { lessonId: 'basics-1', completed: true, stars: 3, moveCount: 5 }
			});

			// Save reference to original spy before it gets wrapped
			const originalSaveSpy = subjectProgress.saveLessonProgress as ReturnType<typeof vi.fn>;

			const { client, upsertFn } = createMockSupabase({
				selectData: [{ lesson_id: 'basics-1', stars: 1, move_count: 10 }]
			});

			startLearnProgressSync(client, 'user-123');
			// Wait for async initial sync
			await vi.waitFor(() => {
				expect(upsertFn).toHaveBeenCalled();
			});

			// DB should be updated with localStorage's better stars
			expect(upsertFn).toHaveBeenCalledWith(
				[{ user_id: 'user-123', lesson_id: 'basics-1', stars: 3, move_count: 5 }],
				{ onConflict: 'user_id,lesson_id' }
			);
			// saveLessonProgress should NOT have been called with DB's lower stars
			expect(originalSaveSpy).not.toHaveBeenCalledWith('basics-1', 1, 10);
		});

		it('Supabase wins when stars are higher', async () => {
			// Local has 1 star, DB has 3 stars
			vi.mocked(subjectProgress.getAllProgress).mockReturnValue({
				'basics-1': { lessonId: 'basics-1', completed: true, stars: 1, moveCount: 10 }
			});

			// Save reference to original spy before wrapping
			const originalSaveSpy = subjectProgress.saveLessonProgress as ReturnType<typeof vi.fn>;

			const { client } = createMockSupabase({
				selectData: [{ lesson_id: 'basics-1', stars: 3, move_count: 5 }]
			});

			startLearnProgressSync(client, 'user-123');
			await vi.waitFor(() => {
				// The wrapped saveLessonProgress calls originalSave, which is our spy
				expect(originalSaveSpy).toHaveBeenCalledWith('basics-1', 3, 5);
			});
		});

		it('equal stars are not re-written', async () => {
			vi.mocked(subjectProgress.getAllProgress).mockReturnValue({
				'basics-1': { lessonId: 'basics-1', completed: true, stars: 2, moveCount: 5 }
			});

			// Save reference to original spy before wrapping
			const originalSaveSpy = subjectProgress.saveLessonProgress as ReturnType<typeof vi.fn>;

			const { client, upsertFn } = createMockSupabase({
				selectData: [{ lesson_id: 'basics-1', stars: 2, move_count: 5 }]
			});

			startLearnProgressSync(client, 'user-123');
			// Wait a tick for async to complete
			await new Promise((r) => setTimeout(r, 50));

			// Neither store should be updated — original save spy should not have been called
			expect(originalSaveSpy).not.toHaveBeenCalledWith('basics-1', expect.anything(), expect.anything());
			// Batch upsert should not include this lesson
			expect(upsertFn).not.toHaveBeenCalled();
		});
	});

	describe('upsert', () => {
		it('uses correct ON CONFLICT clause', async () => {
			vi.mocked(subjectProgress.getAllProgress).mockReturnValue({
				'basics-1': { lessonId: 'basics-1', completed: true, stars: 2, moveCount: 5 }
			});

			const { client, upsertFn } = createMockSupabase();

			startLearnProgressSync(client, 'user-123');
			await vi.waitFor(() => {
				expect(upsertFn).toHaveBeenCalled();
			});

			expect(upsertFn).toHaveBeenCalledWith(
				expect.any(Array),
				{ onConflict: 'user_id,lesson_id' }
			);
		});
	});

	describe('error handling', () => {
		it('Supabase fetch failure does not crash', async () => {
			const { logger } = await import('@cotulenh/common');

			const { client } = createMockSupabase({
				selectError: { message: 'network error' }
			});

			// Should not throw
			startLearnProgressSync(client, 'user-123');
			await new Promise((r) => setTimeout(r, 50));

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'network error' }),
				expect.stringContaining('Failed to fetch learn progress')
			);
		});

		it('Supabase write failure does not crash and localStorage is preserved', async () => {
			const { logger } = await import('@cotulenh/common');

			vi.mocked(subjectProgress.getAllProgress).mockReturnValue({
				'basics-1': { lessonId: 'basics-1', completed: true, stars: 2, moveCount: 5 }
			});

			const { client } = createMockSupabase({
				upsertError: { message: 'write error' }
			});

			startLearnProgressSync(client, 'user-123');
			await new Promise((r) => setTimeout(r, 50));

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'write error' }),
				expect.stringContaining('Failed to batch sync learn progress')
			);

			// localStorage data should still be intact
			const progress = subjectProgress.getAllProgress();
			expect(progress['basics-1']).toBeDefined();
		});
	});

	describe('stopSync', () => {
		it('prevents future Supabase writes', async () => {
			const { client, upsertFn } = createMockSupabase();

			startLearnProgressSync(client, 'user-123');
			await new Promise((r) => setTimeout(r, 50));

			// Clear call history
			upsertFn.mockClear();

			stopLearnProgressSync();

			// saveLessonProgress should now only write to localStorage (original behavior)
			subjectProgress.saveLessonProgress('new-lesson', 2, 3);

			// Give time for any async operations
			await new Promise((r) => setTimeout(r, 50));

			// No new Supabase upsert calls should have been made
			expect(upsertFn).not.toHaveBeenCalled();
		});
	});

	describe('idempotency', () => {
		it('startSync is idempotent — calling twice does not double-fetch', async () => {
			const { client, eqFn } = createMockSupabase();

			startLearnProgressSync(client, 'user-123');
			startLearnProgressSync(client, 'user-123');

			await new Promise((r) => setTimeout(r, 50));

			// eq should only be called once (single fetch)
			expect(eqFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('unauthenticated path', () => {
		it('no Supabase calls made when not synced', () => {
			const { client } = createMockSupabase();

			// Don't call startSync — user is unauthenticated
			subjectProgress.saveLessonProgress('lesson-1', 2, 5);

			// from() should never be called
			expect(client.from).not.toHaveBeenCalled();
		});
	});

	describe('ongoing sync', () => {
		it('does not write to Supabase when stars do not improve', async () => {
			// Seed local progress with a better score.
			subjectProgress.saveLessonProgress('new-lesson', 3, 4);

			const { client, upsertFn } = createMockSupabase();

			startLearnProgressSync(client, 'user-123');
			await new Promise((r) => setTimeout(r, 50));

			// Clear initial sync calls.
			upsertFn.mockClear();

			// Lower stars should be ignored locally and must not downgrade Supabase.
			subjectProgress.saveLessonProgress('new-lesson', 1, 99);

			await new Promise((r) => setTimeout(r, 50));

			expect(upsertFn).not.toHaveBeenCalled();
			expect(subjectProgress.getLessonProgress('new-lesson')?.stars).toBe(3);
		});

		it('saveLessonProgress triggers both localStorage and Supabase writes when synced', async () => {
			const { client, upsertFn } = createMockSupabase();

			startLearnProgressSync(client, 'user-123');
			await new Promise((r) => setTimeout(r, 50));

			// Clear initial sync calls
			upsertFn.mockClear();

			// Now save a new lesson — should trigger Supabase upsert via wrapped method
			subjectProgress.saveLessonProgress('new-lesson', 3, 4);

			await new Promise((r) => setTimeout(r, 50));

			// The single-item upsert should have been called
			expect(client.from).toHaveBeenCalledWith('learn_progress');
			expect(upsertFn).toHaveBeenCalledWith(
				{
					user_id: 'user-123',
					lesson_id: 'new-lesson',
					stars: 3,
					move_count: 4
				},
				{ onConflict: 'user_id,lesson_id' }
			);
		});
	});

	describe('session isolation', () => {
		it('ignores stale initial sync after switching users', async () => {
			const staleFetch = deferred<{
				data: Array<{ lesson_id: string; stars: number; move_count: number }>;
				error: null;
			}>();

			const oldUpsert = vi.fn().mockResolvedValue({ error: null });
			const oldClient = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockImplementation(() => staleFetch.promise)
					}),
					upsert: oldUpsert
				})
			} as unknown as import('@supabase/supabase-js').SupabaseClient;

			const newUpsert = vi.fn().mockResolvedValue({ error: null });
			const newClient = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: [], error: null })
					}),
					upsert: newUpsert
				})
			} as unknown as import('@supabase/supabase-js').SupabaseClient;

			startLearnProgressSync(oldClient, 'user-a');
			startLearnProgressSync(newClient, 'user-b');

			staleFetch.resolve({
				data: [{ lesson_id: 'cross-user-lesson', stars: 2, move_count: 7 }],
				error: null
			});

			await new Promise((r) => setTimeout(r, 50));

			expect(newUpsert).not.toHaveBeenCalled();
		});
	});
});
