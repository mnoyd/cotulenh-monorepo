import { State } from '../state';
import { CTLPopup } from './popup-factory';
import { ambigousMoveRegistry } from './ambigous-move-registry';

type AmbigousMoveHandlingOption<T> = {
  type: string;
  popup: CTLPopup<T>;
  renderAmbigousMoveElements: (s: State, popup: CTLPopup<T>) => void;
};

export interface AmbigousMoveHandling<T> {
  type: string;
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

/**
 * Get the ambiguous move handler for the current ambiguous move type
 * Uses the registry to avoid circular dependencies
 */
export function getAmbigousMoveHandling(state: State): AmbigousMoveHandling<any> | undefined {
  if (!state.ambigousMove) {
    return undefined;
  }
  return ambigousMoveRegistry.get(state.ambigousMove.type);
}
