import { describe, expect, it, beforeEach } from 'vitest';

import { useLearnStore } from '../learn-store';

function installLocalStorageMock() {
  let storage: Record<string, string> = {};

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      }
    }
  });
}

describe('useLearnStore', () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.removeItem('learn-progress');
    useLearnStore.getState().reset();
  });

  it('starts with no progress', () => {
    const state = useLearnStore.getState();
    expect(state.initialized).toBe(false);
  });

  it('initializes progress manager', () => {
    useLearnStore.getState().initialize();
    const state = useLearnStore.getState();
    expect(state.initialized).toBe(true);
  });

  it('returns subject progress after initialization', () => {
    useLearnStore.getState().initialize();
    const progress = useLearnStore.getState().getSubjectProgress('subject-1-basic-movement');
    expect(progress).toBeDefined();
    expect(progress.progress).toBe(0);
  });

  it('checks lesson completion', () => {
    useLearnStore.getState().initialize();
    expect(useLearnStore.getState().isLessonCompleted('bm-1-1')).toBe(false);
  });

  it('returns null for next incomplete when no subject found', () => {
    useLearnStore.getState().initialize();
    const next = useLearnStore.getState().getNextIncompleteLesson('nonexistent');
    expect(next).toBeNull();
  });

  it('saves lesson progress and exposes subject completion counts', () => {
    useLearnStore.getState().initialize();
    useLearnStore.getState().saveLessonProgress('bm-1-1', 2, 4);

    expect(useLearnStore.getState().isLessonCompleted('bm-1-1')).toBe(true);
    expect(useLearnStore.getState().getCompletedLessonCount('subject-1-basic-movement')).toBe(1);
  });

  it('loads persisted progress from localStorage on a new store session', () => {
    useLearnStore.getState().initialize();
    useLearnStore.getState().saveLessonProgress('bm-1-1', 3, 2);
    useLearnStore.getState().reset();

    useLearnStore.getState().initialize();

    expect(useLearnStore.getState().isLessonCompleted('bm-1-1')).toBe(true);
    expect(
      useLearnStore.getState().getSubjectProgress('subject-1-basic-movement').progress
    ).toBeGreaterThan(0);
  });
});
