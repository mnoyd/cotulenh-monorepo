import { State } from '../state';
import { CTLPopup } from './popup-factory';

type AmbigousMoveHandlingOption<T> = {
  type: string;
  popup: CTLPopup<T>;
  renderAmbigousMoveElements: (s: State, popup: CTLPopup<T>) => void;
};

export interface AmbigousMoveHandling<T> {
  popup: CTLPopup<T>;
  start: (s: State) => void;
}

export function createAmbigousModeHandling<T>(
  option: AmbigousMoveHandlingOption<T>,
): AmbigousMoveHandling<T> {
  const handling: AmbigousMoveHandling<T> = {
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
