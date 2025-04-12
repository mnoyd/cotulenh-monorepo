import { State } from './state.js';
import * as cg from './types.js';
import * as board from './board.js';
import * as util from './util.js';
import { cancel as dragCancel } from './drag.js';

export function setDropMode(s: State, piece?: cg.Piece): void {
  s.dropmode = {
    active: true,
    piece,
  };
  dragCancel(s);
}

export function cancelDropMode(s: State): void {
  s.dropmode = {
    active: false,
  };
}

export function drop(s: State, e: cg.MouchEvent): void {
  if (!s.dropmode.active) return;

  const piece = s.dropmode.piece;

  if (piece) {
    s.pieces.set('0-0', piece);
    const position = util.eventPosition(e);
    const dest = position && board.getKeyAtDomPos(position, board.redPov(s), s.dom.bounds());
    if (dest) board.dropNewPiece(s, '0-0', dest);
  }
  s.dom.redraw();
}
