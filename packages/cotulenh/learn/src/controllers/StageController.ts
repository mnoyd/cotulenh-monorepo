import type { Stage } from '../types';
import { LevelController } from './LevelController';

export class StageController {
  private currentLevelIndex = 0;
  private levelController?: LevelController;

  constructor(private stage: Stage) {}

  startLevel(levelIndex: number): void {
    if (levelIndex < 0 || levelIndex >= this.stage.levels.length) {
      throw new Error('Invalid level index');
    }
    this.currentLevelIndex = levelIndex;
    this.levelController = new LevelController(this.stage.levels[levelIndex]);
  }

  getCurrentLevel() {
    return this.stage.levels[this.currentLevelIndex];
  }

  getLevelController(): LevelController | undefined {
    return this.levelController;
  }

  nextLevel(): boolean {
    if (this.currentLevelIndex + 1 < this.stage.levels.length) {
      this.startLevel(this.currentLevelIndex + 1);
      return true;
    }
    return false;
  }

  reset(): void {
    this.currentLevelIndex = 0;
    this.levelController = undefined;
  }
}
