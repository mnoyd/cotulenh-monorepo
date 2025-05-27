import * as cg from './types.js';
import { clearPopup, createPopupFactory, CTLPopup } from './popup/popup-factory';
import { createAmbigousPiecesStackElement, createSinglePieceElement } from './render';
import { HeadlessState, State } from './state';
import * as board from './board.js';
import * as util from './util.js';
import * as drag from './drag.js';

import { formStack } from '@repo/cotulenh-combine-piece';
import { createEl } from './util.js';
import { createAmbigousModeHandling } from './popup/ambigous-move.js';
import { userMove } from './board.js';

const END_MOVE = 'end-move';
type EndMove = typeof END_MOVE;

/**
 * Attempts to combine two pieces into a stack
 * @param origPiece The piece being moved/dragged
 * @param destPiece The destination piece
 * @returns The combined piece if successful, undefined otherwise
 */
export function tryCombinePieces(origPiece: cg.Piece, destPiece: cg.Piece): cg.Piece | undefined {
  if (!origPiece || !destPiece) return undefined;

  try {
    const combined = formStack(
      origPiece,
      destPiece,
      p => p.role,
      r => r,
    );
    return combined ?? undefined;
  } catch (error) {
    console.error('Error combining pieces:', error);
    return undefined;
  }
}

/**
 * Finds a carried piece in a stack that matches the given predicate
 * @param piece The carrier piece to search in
 * @param predicate Function to test each carried piece
 * @returns The first carried piece that satisfies the predicate, or undefined
 */
export function findCarriedPieceMatching(
  piece: cg.Piece,
  predicate: (p: cg.Piece) => boolean,
): cg.Piece | undefined {
  if (!piece || !piece.carrying || piece.carrying.length === 0) {
    return undefined;
  }
  return piece.carrying.find(predicate);
}

export function createCombineStackFromPieces(pieces: cg.Piece[]): {
  combined: cg.Piece | undefined;
  uncombined: cg.Piece[] | undefined;
} {
  if (!pieces || pieces.length === 0) return { combined: undefined, uncombined: undefined };
  const uncombined: cg.Piece[] = [];
  const piece = pieces.reduce((acc, p) => {
    if (!acc) return p;
    const combined = tryCombinePieces(acc, p);
    if (!combined) {
      uncombined.push(p);
      return acc;
    }
    return combined;
  }, pieces[0]);
  return { combined: piece, uncombined: uncombined.splice(1) };
}

const combinedPiecePopup = createPopupFactory<cg.Piece | EndMove>({
  type: 'combined-piece',
  renderItem: (s: State, item: cg.Piece | EndMove, index: number) => {
    if (item === END_MOVE) {
      const el = createEl('cg-btn', 'end-stack-move');
      el.setAttribute('data-index', index.toString());
      el.style.width = s.dom.bounds().squareSize + 'px';
      el.style.height = s.dom.bounds().squareSize + 'px';
      return el;
    }
    const piece = createSinglePieceElement(s, item);
    piece.setAttribute('data-index', index.toString());
    return piece;
  },
  onSelect: (s: State, index: number, e?: cg.MouchEvent) => {
    const selectedPiece = s.popup?.items[index];
    if (selectedPiece === END_MOVE) {
      board.endUserStackMove(s);
      board.unselect(s);
    } else {
      if (!e) return;
      const position = util.eventPosition(e)!;

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
    }
    // Clean up and redraw
    clearPopup(s);
    s.dom.redraw();
    return true;
  },
});
export { combinedPiecePopup };

export function prepareCombinedPopup(state: HeadlessState, pieces: cg.Piece[]): (cg.Piece | EndMove)[] {
  if (pieces.length < 2) return [END_MOVE];
  const stackPieceMoves = state.stackPieceMoves;
  if (!stackPieceMoves) return pieces;
  return [...pieces, END_MOVE];
}

const moveWithCarrierPopup = createPopupFactory<cg.Piece>({
  type: 'move-with-carrier',
  renderItem: (s: State, item: cg.Piece, index: number) => {
    const piece = createSinglePieceElement(s, item);
    piece.setAttribute('data-index', index.toString());
    return piece;
  },
  onSelect: (s: State, index: number) => {
    const selectedPiece = s.popup?.items[index];
    if (!selectedPiece || !s.ambigousMove) return;
    const origMove = {
      square: s.ambigousMove.origKey,
      type: s.ambigousMove.pieceThatMoves.role,
      stackMove: true,
      carrying: [selectedPiece.role],
    };
    const destMove = {
      square: s.ambigousMove.destKey,
    };
    userMove(s, origMove, destMove);
    // board.selectSquare(s, s.popup.square, selectedPiece.role, true);
    s.ambigousMove = undefined;
    clearPopup(s);
    s.dom.redraw();
  },
  onClose: (s: State) => {
    s.ambigousMove = undefined;
    board.unselect(s);
  },
});
const ambigousStackMoveStayPiecesCantCombineHandling = createAmbigousModeHandling<cg.Piece>({
  type: 'ambigous-stack-move-stay-pieces-cant-combine',
  popup: moveWithCarrierPopup,
  renderAmbigousMoveElements: (s: State, popup: CTLPopup<cg.Piece>) => {
    if (!s.ambigousMove) return;
    const carrying = s.ambigousMove.pieceAtOrig!.carrying;
    if (!carrying) return;
    popup.setPopup(s, carrying, s.ambigousMove.destKey);
    const ambigousStackEl = createAmbigousPiecesStackElement(s, carrying);
    ambigousStackEl.style.width = s.dom.bounds().squareSize + 'px';
    ambigousStackEl.style.height = s.dom.bounds().squareSize + 'px';
    ambigousStackEl.cgKey = s.ambigousMove.destKey;
    s.ambigousMove.renderGuide = {
      atOrig: ambigousStackEl,
      atDest: createSinglePieceElement(s, s.ambigousMove.pieceThatMoves),
    };
    s.dom.redraw();
  },
});
export { ambigousStackMoveStayPiecesCantCombineHandling };
