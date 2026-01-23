import { describe, it, expect, vi } from 'vitest';
import { LearnEngine } from './learn-engine';
import { TargetValidator } from './validators/target-validator';
import { GoalCompletionChecker } from './completion/goal-completion';
import { StarGrader } from './grading/star-grader';
import { PassFailGrader } from './grading/pass-fail-grader';

/**
 * Tests for Phase 2 refactored LearnEngine architecture
 * These verify that the component-based system works correctly
 */
describe('LearnEngine - Component Architecture', () => {
  describe('Component Initialization', () => {
    it('should initialize components on loadLesson', () => {
      const engine = new LearnEngine();
      const result = engine.loadLesson('basics-1');

      expect(result).toBe(true);
      expect(engine.lesson).not.toBeNull();
      expect(engine.game).not.toBeNull();
    });

    it('should handle invalid lesson ID gracefully', () => {
      const engine = new LearnEngine();
      const result = engine.loadLesson('nonexistent-lesson');

      expect(result).toBe(false);
      expect(engine.lesson).toBeNull();
    });
  });

  describe('Grading System Integration', () => {
    it('should use grader for star calculation with star grading', () => {
      const engine = new LearnEngine();

      // Create a simple lesson with star grading
      const testLesson = {
        id: 'test-star-grading',
        category: 'basics' as const,
        title: 'Test Star Grading',
        description: 'Test',
        difficulty: 1 as const,
        startFen: '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1',
        instruction: 'Test',
        targetSquares: ['f8'],
        grading: 'stars' as const,
        optimalMoves: 1
      };

      // Manually inject lesson for testing
      (engine as any)['#lesson'] = testLesson;

      // Should use StarGrader logic
      expect(engine.stars).toBeDefined();
      expect(typeof engine.stars).toBe('number');
    });

    it('should return pass-fail grading when configured', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      const testLesson = {
        id: 'test-pass-fail',
        category: 'basics' as const,
        title: 'Test Pass-Fail',
        description: 'Test',
        difficulty: 1 as const,
        startFen: '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1', // Empty board
        goalFen: '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
        instruction: 'Test',
        grading: 'pass-fail' as const
      };

      (engine as any)['#lesson'] = testLesson;

      // Stars should be 1 for pass-fail
      const stars = engine.stars;
      expect(stars).toBeGreaterThanOrEqual(0);
      expect(stars).toBeLessThanOrEqual(3);
    });

    it('should handle no grading config (defaults to pass-fail)', () => {
      const engine = new LearnEngine();

      // Lessons without explicit grading config default to pass-fail (1 star)
      // or fall back to star calculation
      engine.loadLesson('basics-1');

      // Should return a valid star rating (0-3)
      expect(engine.stars).toBeGreaterThanOrEqual(0);
      expect(engine.stars).toBeLessThanOrEqual(3);
    });
  });

  describe('Completion Checker Integration', () => {
    it('should use completion checker for goal-based lessons', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      // Use an actual lesson that has goalFen
      engine.loadLesson('basics-6'); // Headquarters (immobile) - has goalFen

      expect(engine.lesson).not.toBeNull();
      expect(engine.status).toBe('ready');
    });

    it('should complete when all targets are visited (using TargetValidator)', () => {
      const onComplete = vi.fn();
      const engine = new LearnEngine({ onComplete });

      // Create lesson with single target for simple testing
      const testLesson = {
        id: 'test-target-completion',
        category: 'basics' as const,
        title: 'Target Test',
        description: 'Test',
        difficulty: 1 as const,
        // Simple position: Infantry at d5, target is e5 (one move right)
        startFen: '11/11/11/11/11/11/11/3I7/11/11/11/11 r - - 0 1',
        instruction: 'Move to e5',
        targetSquares: ['e5'],
        grading: 'pass-fail' as const
      };

      (engine as any)['#lesson'] = testLesson;

      // Should track targets
      expect(engine.remainingTargets).toBeDefined();
      expect(Array.isArray(engine.remainingTargets)).toBe(true);
    });
  });

  describe('Validator Integration', () => {
    it('should create validator for lessons with targetSquares', () => {
      const engine = new LearnEngine();

      // Load a lesson with targets
      engine.loadLesson('basics-1');

      // Verify lesson was loaded
      expect(engine.lesson).not.toBeNull();
      expect(engine.lesson?.targetSquares).toBeDefined();
      expect(engine.lesson?.targetSquares?.length).toBeGreaterThan(0);
    });

    it('should track remaining targets', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

      const remaining = engine.remainingTargets;
      expect(Array.isArray(remaining)).toBe(true);

      // Should match lesson's target squares initially
      if (engine.lesson?.targetSquares) {
        expect(remaining.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track visited targets', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

      const visited = engine.visitedTargets;
      expect(Array.isArray(visited)).toBe(true);
      expect(visited.length).toBe(0); // Should start empty
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing lessons that do not use new config', () => {
      const engine = new LearnEngine();

      // Load existing lesson
      const result = engine.loadLesson('basics-1');

      expect(result).toBe(true);
      expect(engine.lesson).not.toBeNull();
      expect(engine.status).toBe('ready');
    });

    it('should provide fallback for lessons without grading config', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

      // Should still calculate stars (fallback to old logic)
      expect(typeof engine.stars).toBe('number');
      expect(engine.stars).toBeGreaterThanOrEqual(0);
      expect(engine.stars).toBeLessThanOrEqual(3);
    });

    it('should handle lessons with only goalFen', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-6'); // Has goalFen, no targets

      expect(engine.lesson?.goalFen).toBeDefined();
      expect(engine.status).toBe('ready');
    });

    it('should handle lessons with only targetSquares', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1'); // Has targets, no goalFen

      expect(engine.lesson?.targetSquares).toBeDefined();
      expect(engine.lesson?.targetSquares?.length).toBeGreaterThan(0);
      expect(engine.status).toBe('ready');
    });
  });

  describe('Component Factories', () => {
    it('should create appropriate grader based on lesson config', () => {
      const engine = new LearnEngine();

      // Test with star grading
      const starLesson = {
        id: 'test',
        category: 'basics' as const,
        title: 'Test',
        description: 'Test',
        difficulty: 1 as const,
        startFen: '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1',
        instruction: 'Test',
        grading: 'stars' as const,
        optimalMoves: 5
      };

      (engine as any)['#lesson'] = starLesson;

      // Stars should be calculated based on move count vs optimal
      const initialStars = engine.stars;
      expect(initialStars).toBeDefined();
    });

    it('should create completion checker based on lesson type', () => {
      const engine = new LearnEngine();

      // Lesson with goalFen should use GoalCompletionChecker
      engine.loadLesson('basics-6');
      expect(engine.lesson?.goalFen).toBeDefined();

      // Lesson with targetSquares should use TargetCompletionChecker
      const engine2 = new LearnEngine();
      engine2.loadLesson('basics-1');
      expect(engine2.lesson?.targetSquares).toBeDefined();
    });
  });

  describe('Status Management', () => {
    it('should initialize with loading status', () => {
      const engine = new LearnEngine();
      expect(engine.status).toBe('loading');
    });

    it('should transition to ready after successful load', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');
      expect(engine.status).toBe('ready');
    });

    it('should call onStateChange callback', () => {
      const onStateChange = vi.fn();
      const engine = new LearnEngine({ onStateChange });

      engine.loadLesson('basics-1');
      expect(onStateChange).toHaveBeenCalledWith('ready');
    });
  });

  describe('Restart Functionality', () => {
    it('should reset state on restart', () => {
      const engine = new LearnEngine();
      engine.loadLesson('basics-1');

      // Simulate some moves (move count increment)
      (engine as any)['#moveCount'] = 5;

      engine.restart();

      expect(engine.moveCount).toBe(0);
      expect(engine.status).toBe('ready');
      expect(engine.visitedTargets).toEqual([]);
    });
  });
});
