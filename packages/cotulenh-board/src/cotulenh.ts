import { Api, start } from './api.js';
import { defaults, HeadlessState, State } from './state.js';
import { renderWrap } from './wrap.js';
import * as util from './util.js';
import { render, renderResized, updateBounds } from './render.js';
import * as events from './events.js';
import { Config, configure } from './config.js';
import { Bounds } from './types.js';
import { ambigousStackMoveStayPiecesCantCombineHandling, combinedPiecePopup } from './combined-piece.js';
import { ambigousCaptureStayBackHandling } from './piece-attack.js';
import { CTLPopup } from './popup/popup-factory.js';
import { AmbigousMoveHandling } from './popup/ambigous-move.js';

export function initModule({ el, config }: { el: HTMLElement; config?: Config }): Api {
  return CotulenhBoard(el, config);
}

export function CotulenhBoard(element: HTMLElement, config?: Config): Api {
  const maybeState: State | HeadlessState = defaults();

  configure(maybeState, config || {});
  function redrawAll(): State {
    const prevUnbind = 'dom' in maybeState ? maybeState.dom.unbind : undefined;
    const elements = renderWrap(element, maybeState),
      bounds = util.memo(() => {
        const bounds = elements.board.getBoundingClientRect() as Bounds;
        bounds.squareSize = util.computeSquareSize(bounds);
        return bounds;
      }),
      redrawNow = (): void => {
        render(state);
      },
      onResize = (): void => {
        updateBounds(state);
        renderResized(state);
      };
    const state = maybeState as State;
    state.dom = {
      elements,
      bounds,
      redraw: debounceRedraw(redrawNow),
      redrawNow,
    };
    redrawNow();
    events.bindBoard(state, onResize);
    if (!prevUnbind) state.dom.unbind = events.bindDocument(state, onResize);
    state.events.insert && state.events.insert(elements);
    return state;
  }
  return start(redrawAll(), redrawAll);
}

function debounceRedraw(redrawNow: () => void): () => void {
  let redrawing = false;
  return () => {
    if (redrawing) return;
    redrawing = true;
    requestAnimationFrame(() => {
      redrawNow();
      redrawing = false;
    });
  };
}
export function getPopup(s: State, type?: string): CTLPopup<any> | undefined {
  if (!s.popup || (type && s.popup.type !== type)) {
    return undefined;
  }
  const filter = type ? type : s.popup.type;
  switch (filter) {
    case 'combined-piece':
      return combinedPiecePopup;
    case 'piece-attack':
      return ambigousCaptureStayBackHandling.popup;
    case 'move-with-carrier':
      return ambigousStackMoveStayPiecesCantCombineHandling.popup;
    default:
      return undefined;
  }
}

export function getAmbigousMoveHandling(state: State): AmbigousMoveHandling<any> | undefined {
  if (!state.ambigousMove) {
    return undefined;
  }
  switch (state.ambigousMove.type) {
    case 'ambigous-capture-stay-back':
      return ambigousCaptureStayBackHandling;
    case 'ambigous-stack-move-stay-pieces-cant-combine':
      return ambigousStackMoveStayPiecesCantCombineHandling;
    default:
      return undefined;
  }
}
