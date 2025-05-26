import { State } from '../state';
import { createPopupFactory, CTLPopup } from './popup-factory';
import * as cg from '../types';
import { unselect } from '../board';

type AmbigousMoveHandlingOption<T> = {
  type: string;
  renderItem: (s: State, item: T, index: number) => HTMLElement;
  onSelect: (s: State, index: number) => void;
  updateBoard: (s: State) => void;
  undoUpdateBoard: (s: State) => void;
};

interface AmbigousMoveHandling {
  start: (s: State, items?: any[], key?: cg.Key) => void;
  end: (s: State) => void;
  cancel: (s: State) => void;
}

export function createAmbigousModeHandling<T>(option: AmbigousMoveHandlingOption<T>): AmbigousMoveHandling {
  const popup = createPopupFactory({
    type: option.type,
    renderItem: option.renderItem,
    onSelect: option.onSelect,
    onClose: createCloseHandler(option),
  });
  const handling: AmbigousMoveHandling = {
    start: createStartHandler(option, popup),
    end: createCloseHandler(option),
    cancel: (s: State) => {
      s.ambigousMove = undefined;
      unselect(s);
    },
  };

  return handling;
}
function createStartHandler<T>(
  option: AmbigousMoveHandlingOption<T>,
  popup: CTLPopup<T>,
): (s: State, items?: T[], key?: cg.Key) => void {
  return (s: State, items?: T[], key?: cg.Key) => {
    // Initialize ambiguousMove state if needed
    if (!s.ambigousMove) {
    }

    // Update the board to show the ambiguous stack
    option.updateBoard(s);

    // Unselect any currently selected piece
    unselect(s);

    // Force a redraw to show the ambiguous stack
    s.dom.redraw();

    // If items and key are provided, display the popup
    if (items && items.length > 0 && key) {
      popup.setPopup(s, items, key);
    }
  };
}

function createCloseHandler<T>(option: AmbigousMoveHandlingOption<T>): (s: State) => void {
  return (s: State) => {
    option.undoUpdateBoard(s);
    s.ambigousMove = undefined;
    unselect(s);
  };
}
