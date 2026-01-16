import type { LearnProgress, StageProgress } from '../types';
import { allStages } from '../stages';
import { StageController } from './StageController';

export class LearnController {
  private progress: LearnProgress = { stages: [] };
  private currentStageController?: StageController;

  constructor() {
    this.loadProgress();
  }

  private loadProgress(): void {
    // TODO: Load from localStorage or backend
    this.progress = {
      stages: []
    };
  }

  selectStage(stageId: string): void {
    const stage = allStages.find((s) => s.id === stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    this.currentStageController = new StageController(stage);

    this.currentStageController.startLevel(0);
    this.progress.currentStage = stageId;
    this.progress.currentLevel = stage.levels[0]?.id;
  }

  getCurrentStageController(): StageController | undefined {
    return this.currentStageController;
  }

  getProgress(): LearnProgress {
    return this.progress;
  }

  getStageProgress(stageId: string): StageProgress | undefined {
    return this.progress.stages.find((s) => s.stageId === stageId);
  }

  getAllStages() {
    return allStages;
  }
}
