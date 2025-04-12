import { State } from './state.js';
import * as cg from './types.js';
import * as board from './board.js';
import { applyAnimation, Config, configure } from './config.js';
import { anim, render } from './anim.js';
import { DrawShape } from './draw.js';
import { write as fenWrite } from './fen.js';

export interface Api {
  redrawAll: any;
  set(config: Config): void;
  state: State;
  // change the view angle
  toggleOrientation(): void;
  // get the position as a FEN string (only contains pieces, no flags)
  // e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR
  getFen(): cg.FEN;
  // programmatically draw user shapes
  setShapes(shapes: DrawShape[]): void;
}

export function start(state: State, redrawAll: cg.Redraw): Api {
  function toggleOrientation(): void {
    board.toggleOrientation(state);
    redrawAll();
  }

  return {
    set(config): void {
      if (config.orientation && config.orientation !== state.orientation) toggleOrientation();
      applyAnimation(state, config);
      (config.fen ? anim : render)(state => configure(state, config), state);
    },
    redrawAll,
    state,
    toggleOrientation,
    getFen: () => fenWrite(state.pieces),
    setShapes(shapes: DrawShape[]): void {
      render(state => (state.drawable.shapes = shapes), state);
    },
  };
}
