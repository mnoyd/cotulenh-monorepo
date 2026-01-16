import type { Stage } from '../types';
import { basicMoveStage } from './basic-move';
import { captureStage } from './capture';
import { deployStage } from './deploy';
import { combineStage } from './combine';
import { terrainStage } from './terrain';
import { airDefenseStage } from './air-defense';
import { advancedCaptureStage } from './advanced-capture';

export const allStages: Stage[] = [
  basicMoveStage,
  captureStage,
  advancedCaptureStage,
  deployStage,
  combineStage,
  terrainStage,
  airDefenseStage
];

export const getStageById = (id: string): Stage | undefined => {
  return allStages.find((stage) => stage.id === id);
};
