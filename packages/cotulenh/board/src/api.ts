import { State } from './state.js';
import * as cg from './types.js';
import * as board from './board.js';
import { applyAnimation, Config, configure } from './config.js';
import { anim, render } from './anim.js';
import { DrawShape } from './draw.js';
import { write as fenWrite } from './fen.js';
import { dragNewPiece } from './drag.js';
import * as drop from './drop.js';

export interface Api {
  set(config: Config): void;

  state: State;

  // change the view angle
  toggleOrientation(): void;

  // get the position as a FEN string (only contains pieces, no flags)
  getFen(): cg.FEN;

  // programmatically draw user shapes
  setShapes(shapes: DrawShape[]): void;

  // perform a move programmatically
  move(orig: cg.OrigMove, dest: cg.DestMove): void;

  // add and/or remove arbitrary pieces on the board
  setPieces(pieces: cg.PiecesDiff): void;

  // put a new piece on the board
  newPiece(piece: cg.Piece, key: cg.Key): void;

  // only useful when CSS changes the board width/height ratio (for 3D)
  redrawAll: cg.Redraw;

  // for crazyhouse and board editors
  dragNewPiece(piece: cg.Piece, event: cg.MouchEvent, force?: boolean): void;

  setDropMode(active: boolean, piece?: cg.Piece): void;

  // unbinds all events
  // (important for document-wide events like scroll and mousemove)
  destroy: cg.Unbind;
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
    state,
    toggleOrientation,
    getFen: () => fenWrite(state.pieces),
    setShapes(shapes: DrawShape[]): void {
      render(state => (state.drawable.shapes = shapes), state);
    },
    setPieces(pieces): void {
      anim(state => board.setPieces(state, pieces), state);
    },
    move(orig, dest): void {
      anim(state => board.baseMove(state, orig, dest), state);
    },
    newPiece(piece, key): void {
      anim(state => board.baseNewPiece(state, piece, key), state);
    },
    redrawAll,

    dragNewPiece(piece, event, force): void {
      dragNewPiece(state, piece, event, force);
    },

    setDropMode(active, piece): void {
      if (active) drop.setDropMode(state, piece);
      else drop.cancelDropMode(state);
    },

    destroy(): void {
      board.stop(state);
      state.dom.unbind && state.dom.unbind();
      state.dom.destroyed = true;
    },
  };
}
