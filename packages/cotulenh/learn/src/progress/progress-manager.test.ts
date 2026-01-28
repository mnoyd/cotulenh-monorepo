import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressManager, MemoryStorageAdapter } from './index';

describe('ProgressManager', () => {
  let storage: MemoryStorageAdapter;
  let manager: ProgressManager;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    manager = new ProgressManager(storage);
  });

  describe('lesson progress', () => {
    it('should start with no completed lessons', () => {
      expect(manager.isLessonCompleted('terrain-2')).toBe(false);
      expect(manager.getLessonStars('terrain-2')).toBe(0);
    });

    it('should save and retrieve lesson progress', () => {
      manager.saveLessonProgress('terrain-2', 3, 5);

      expect(manager.isLessonCompleted('terrain-2')).toBe(true);
      expect(manager.getLessonStars('terrain-2')).toBe(3);

      const progress = manager.getLessonProgress('terrain-2');
      expect(progress).toEqual({
        lessonId: 'terrain-2',
        completed: true,
        moveCount: 5,
        stars: 3
      });
    });

    it('should only update if stars are better', () => {
      manager.saveLessonProgress('terrain-2', 2, 10);
      manager.saveLessonProgress('terrain-2', 1, 5); // Worse stars

      expect(manager.getLessonStars('terrain-2')).toBe(2);
    });

    it('should update if stars are better', () => {
      manager.saveLessonProgress('terrain-2', 1, 10);
      manager.saveLessonProgress('terrain-2', 3, 5); // Better stars

      expect(manager.getLessonStars('terrain-2')).toBe(3);
    });

    it('should reset lesson progress', () => {
      manager.saveLessonProgress('terrain-2', 3, 5);
      manager.resetLessonProgress('terrain-2');

      expect(manager.isLessonCompleted('terrain-2')).toBe(false);
    });

    it('should reset all progress', () => {
      manager.saveLessonProgress('terrain-2', 3, 5);
      manager.saveLessonProgress('capture-1', 2, 8);
      manager.resetAllProgress();

      expect(manager.isLessonCompleted('terrain-2')).toBe(false);
      expect(manager.isLessonCompleted('capture-1')).toBe(false);
    });

    it('should get all progress', () => {
      manager.saveLessonProgress('terrain-2', 3, 5);
      manager.saveLessonProgress('capture-1', 2, 8);

      const all = manager.getAllProgress();
      expect(Object.keys(all)).toHaveLength(2);
      expect(all['terrain-2']).toBeDefined();
      expect(all['capture-1']).toBeDefined();
    });
  });

  describe('onChange callback', () => {
    it('should call onChange when progress changes', () => {
      const changes: unknown[] = [];
      manager.setOnChange((progress) => changes.push(progress));

      manager.saveLessonProgress('terrain-2', 3, 5);

      expect(changes).toHaveLength(1);
    });
  });

  describe('persistence', () => {
    it('should persist across manager instances', () => {
      manager.saveLessonProgress('terrain-2', 3, 5);

      // Create new manager with same storage
      const manager2 = new ProgressManager(storage);

      expect(manager2.isLessonCompleted('terrain-2')).toBe(true);
      expect(manager2.getLessonStars('terrain-2')).toBe(3);
    });
  });
});

describe('MemoryStorageAdapter', () => {
  it('should store and retrieve values', () => {
    const storage = new MemoryStorageAdapter();

    storage.set('key', { foo: 'bar' });
    expect(storage.get('key')).toEqual({ foo: 'bar' });
  });

  it('should return null for missing keys', () => {
    const storage = new MemoryStorageAdapter();
    expect(storage.get('missing')).toBeNull();
  });

  it('should remove values', () => {
    const storage = new MemoryStorageAdapter();
    storage.set('key', 'value');
    storage.remove('key');
    expect(storage.get('key')).toBeNull();
  });

  it('should clear all values', () => {
    const storage = new MemoryStorageAdapter();
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    storage.clear();
    expect(storage.get('key1')).toBeNull();
    expect(storage.get('key2')).toBeNull();
  });
});
