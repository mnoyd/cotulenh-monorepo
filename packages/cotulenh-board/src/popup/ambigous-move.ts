import {
  AMBIGOUS_STACK_MOVE_STAY_PIECES_CANT_COMBINE,
  ambigousStackMoveStayPiecesCantCombineHandling,
} from '../combined-piece';
import { AMBIGOUS_CAPTURE_STAY_BACK, ambigousCaptureStayBackHandling } from '../piece-attack';
import { State } from '../state';
import { CTLPopup } from './popup-factory';

export type AmbigousMoveType = string;
type AmbigousMoveHandlingOption<T> = {
  type: AmbigousMoveType;
  popup: CTLPopup<T>;
  renderAmbigousMoveElements: (s: State, popup: CTLPopup<T>) => void;
};

export interface AmbigousMoveHandling<T> {
  type: AmbigousMoveType;
  popup: CTLPopup<T>;
  start: (s: State) => void;
}

export function createAmbigousModeHandling<T>(
  option: AmbigousMoveHandlingOption<T>,
): AmbigousMoveHandling<T> {
  const handling: AmbigousMoveHandling<T> = {
    type: option.type,
    popup: option.popup,
    start: createStartHandler(option),
  };

  return handling;
}
function createStartHandler<T>(option: AmbigousMoveHandlingOption<T>): (s: State) => void {
  return (s: State) => {
    option.renderAmbigousMoveElements(s, option.popup);
    s.dom.redraw();
  };
}

export function getAmbigousMoveHandling(state: State): AmbigousMoveHandling<any> | undefined {
  if (!state.ambigousMove) {
    return undefined;
  }
  switch (state.ambigousMove.type) {
    case AMBIGOUS_CAPTURE_STAY_BACK:
      return ambigousCaptureStayBackHandling;
    case AMBIGOUS_STACK_MOVE_STAY_PIECES_CANT_COMBINE:
      return ambigousStackMoveStayPiecesCantCombineHandling;
    default:
      return undefined;
  }
}
