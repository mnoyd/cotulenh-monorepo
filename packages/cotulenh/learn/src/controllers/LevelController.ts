import { CoTuLenh, MoveResult } from '@cotulenh/core';
import type { Level, MoveValidationResult } from '../types';

export class LevelController {
  private game: CoTuLenh;
  private moveCount = 0;
  private captureCount = 0;

  constructor(private level: Level) {
    this.game = new CoTuLenh();
    this.game.load(level.fen);
  }

  validateMove(move: { from: string; to: string; [key: string]: any }): MoveValidationResult {
    try {
      const result = this.game.move(move);

      if (!result) {
        return {
          valid: false,
          success: false,
          message: 'Invalid move'
        };
      }

      this.moveCount++;

      if (result.captured) {
        this.captureCount++;
      }

      // Check if level is completed
      const isSuccess = this.checkSuccess();

      return {
        valid: true,
        success: isSuccess,
        message: isSuccess ? 'Level completed! ⭐' : 'Good move!'
      };
    } catch (error) {
      return {
        valid: false,
        success: false,
        message: error instanceof Error ? error.message : 'Invalid move'
      };
    }
  }

  private checkSuccess(): boolean {
    // Check move count requirement
    if (this.moveCount < this.level.nbMoves) {
      return false;
    }

    // Check if required captures are met
    if (this.level.requiredCaptures && this.captureCount < this.level.requiredCaptures.length) {
      return false;
    }

    return true;
  }

  getLegalMoves(): MoveResult[] {
    return this.game.moves({ verbose: true }) as MoveResult[];
  }

  getGame(): CoTuLenh {
    return this.game;
  }

  reset(): void {
    this.moveCount = 0;
    this.captureCount = 0;
    this.game.load(this.level.fen);
  }

  getProgress(): { moves: number; captures: number; movesRequired: number } {
    return {
      moves: this.moveCount,
      captures: this.captureCount,
      movesRequired: this.level.nbMoves
    };
  }
}
