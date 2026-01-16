import { describe, it, expect } from 'vitest';
import { LearnController } from '../src/controllers/LearnController';

describe('LearnController', () => {
  it('should load all stages', () => {
    const learn = new LearnController();
    const stages = learn.getAllStages();

    expect(stages).toBeDefined();
    expect(stages.length).toBeGreaterThan(0);
  });

  it('should select a stage and start first level', () => {
    const learn = new LearnController();
    learn.selectStage('basic-move');

    const stageCtrl = learn.getCurrentStageController();
    expect(stageCtrl).toBeDefined();

    const level = stageCtrl?.getCurrentLevel();
    expect(level).toBeDefined();
    expect(level?.id).toBe('basic-move-1');
  });

  it('should throw error for invalid stage', () => {
    const learn = new LearnController();
    expect(() => learn.selectStage('invalid-stage')).toThrow();
  });
});
