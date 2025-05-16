import { clearPopup, createPopupFactory } from './popup/popup-factory';
import { createSinglePieceElement } from './render';
import * as cg from './types';
import { State } from './state';
import * as board from './board.js';
import * as util from './util.js';
import * as drag from './drag.js';

const combinedPiecePopup = createPopupFactory<cg.Piece>({
  type: 'combined-piece',
  renderItem: (s: State, item: cg.Piece, index: number) => {
    const piece = createSinglePieceElement(s, item);
    piece.setAttribute('data-index', index.toString());
    return piece;
  },
  onSelect: (s: State, index: number, e?: cg.MouchEvent) => {
    console.log('Selected piece:', index, s, e);

    if (!e) return;
    const position = util.eventPosition(e)!;

    // Carried piece clicked - select the specific piece from the stack
    const selectedPiece = s.popup?.items[index];
    if (!s.popup?.square || !selectedPiece) return;
    board.selectSquare(s, s.popup.square, selectedPiece.role, true);

    // Create temporary piece for dragging
    const tempKey = cg.TEMP_KEY;
    s.pieces.set(tempKey, selectedPiece);

    // Initialize drag
    //TODO: add drag support for stack pieces on touch screens
    if (!e.touches) {
      s.draggable.current = {
        orig: tempKey,
        piece: selectedPiece,
        origPos: position,
        pos: position,
        started: false,
        element: () => drag.pieceElementByKey(s, tempKey),
        originTarget: e.target,
        newPiece: true,
        keyHasChanged: false,
        fromStack: true,
      };
      drag.processDrag(s);
    }
    // Clean up and redraw
    clearPopup(s);
    s.dom.redraw();
    return true;
  },
});
export { combinedPiecePopup };
