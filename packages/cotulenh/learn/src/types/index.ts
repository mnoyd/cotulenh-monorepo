export interface Level {
  id: string;
  goal: string;
  fen: string;
  nbMoves: number;
  allowedMoveTypes?: ('normal' | 'capture' | 'deploy' | 'combine' | 'recombine')[];
  requiredCaptures?: string[];
  terrain?: Record<string, 'river' | 'bridge'>;
  scenario?: ScenarioStep[];
}

export interface ScenarioStep {
  playerMove: string;
  opponentResponse?: string;
}

export interface Stage {
  id: string;
  title: string;
  description: string;
  levels: Level[];
}

export interface LevelProgress {
  levelId: string;
  completed: boolean;
  stars: number;
  attempts: number;
}

export interface StageProgress {
  stageId: string;
  levelsProgress: LevelProgress[];
}

export interface LearnProgress {
  stages: StageProgress[];
  currentStage?: string;
  currentLevel?: string;
}

export interface MoveValidationResult {
  valid: boolean;
  success?: boolean;
  message?: string;
}
