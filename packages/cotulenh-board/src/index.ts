import { Api, start } from './api.js';
import { defaults, HeadlessState, State } from './state.js';
import { renderWrap } from './wrap.js';
import * as util from './util.js';
import { render, renderResized, updateBounds } from './render.js';
import * as events from './events.js';
import { Config, configure } from './config.js';

export function initModule({ el, config }: { el: HTMLElement; config?: Config }): Api {
  return CommanderChessBoard(el, config);
}

export function CommanderChessBoard(element: HTMLElement, config?: Config): Api {
  console.log('CommanderChessBoard');
  const maybeState: State | HeadlessState = defaults();

  configure(maybeState, config || {});
  function redrawAll(): State {
    const prevUnbind = 'dom' in maybeState ? maybeState.dom.unbind : undefined;
    const elements = renderWrap(element, maybeState),
      bounds = util.memo(() => elements.board.getBoundingClientRect()),
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
