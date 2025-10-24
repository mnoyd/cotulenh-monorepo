import * as cg from './types.js';
import { clearPopup, createPopupFactory, CTLPopup } from './popup/popup-factory';
import { createAmbigousPiecesStackElement, createSinglePieceElement } from './render';
import { HeadlessState, State } from './state';
import * as board from './board.js';
import * as util from './util.js';
import * as drag from './drag.js';

import { PieceStacker, ROLE_FLAGS } from '@repo/cotulenh-combine-piece';
import { createEl } from './util.js';
import { createAmbigousModeHandling } from './popup/ambigous-move.js';
import { userMove } from './board.js';

const END_MOVE = 'end-move';
type EndMove = typeof END_MOVE;

// Role to flag mapping for board pieces
const boardRoleToFlagMap: Record<string, number> = {
  commander: ROLE_FLAGS.COMMANDER,
  infantry: ROLE_FLAGS.INFANTRY,
  tank: ROLE_FLAGS.TANK,
  militia: ROLE_FLAGS.MILITIA,
  engineer: ROLE_FLAGS.ENGINEER,
  artillery: ROLE_FLAGS.ARTILLERY,
  anti_air: ROLE_FLAGS.ANTI_AIR,
  missile: ROLE_FLAGS.MISSILE,
  air_force: ROLE_FLAGS.AIR_FORCE,
  navy: ROLE_FLAGS.NAVY,
  headquarter: ROLE_FLAGS.HEADQUARTER,
};

// Create PieceStacker instance for board pieces
const pieceStacker = new PieceStacker<cg.Piece>(piece => boardRoleToFlagMap[piece.role] || 0);
/**
 * Attempts to combine two pieces into a stack
 * @param origPiece The piece being moved/dragged
 * @param destPiece The destination piece
 * @returns The combined piece if successful, undefined otherwise
 */
export function tryCombinePieces(origPiece: cg.Piece, destPiece: cg.Piece): cg.Piece | undefined {
  if (!origPiece || !destPiece) return undefined;

  try {
    const combined = pieceStacker.combine([origPiece, destPiece]);
    return combined ?? undefined;
  } catch (error) {
    console.error('Error combining pieces:', error);
    return undefined;
  }
}

export function createCombineStackFromPieces(pieces: cg.Piece[]): {
  combined: cg.Piece | undefined;
  uncombined: cg.Piece[] | undefined;
} {
  // Try to combine all pieces using PieceStacker
  const combined = pieceStacker.combine(pieces);

  if (combined) {
    // All pieces were successfully combined
    return { combined, uncombined: undefined };
  }

  // If combination failed, return all pieces as uncombined
  return { combined: undefined, uncombined: pieces };
}

/**
 * Remove a piece with specific role from a stack
 * @param stackPiece - The stack piece to remove from
 * @param roleToRemove - The role to remove (e.g., 'infantry', 'tank')
 * @returns The remaining stack/piece after removal, or null if no pieces remain
 */
export function removePieceFromStack(stackPiece: cg.Piece, roleToRemove: cg.Piece): cg.Piece | null {
  return pieceStacker.remove(stackPiece, roleToRemove);
}

export const COMBINED_PIECE_POPUP_TYPE = 'combined-piece';
const combinedPiecePopup = createPopupFactory<cg.Piece | EndMove>({
  type: COMBINED_PIECE_POPUP_TYPE,
  renderItem: (s: State, item: cg.Piece | EndMove, index: number) => {
    const squareSize = s.dom.bounds().width / 12;
    if (item === END_MOVE) {
      const el = createEl('cg-btn', 'end-stack-move');
      el.setAttribute('data-index', index.toString());
      el.style.width = squareSize + 'px';
      el.style.height = squareSize + 'px';
      return el;
    }
    const piece = createSinglePieceElement(item);
    piece.setAttribute('data-index', index.toString());
    piece.style.width = squareSize + 'px';
    piece.style.height = squareSize + 'px';
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

export function prepareCombinedPopup(
  state: HeadlessState,
  pieces: cg.Piece[],
  key: cg.Key,
): (cg.Piece | EndMove)[] {
  const movablePieces = pieces.filter(p => board.canSelectStackPiece(state, { square: key, type: p.role }));
  if (state.stackPieceMoves && movablePieces.length < 2) return [END_MOVE];
  const stackPieceMoves = state.stackPieceMoves;
  if (!stackPieceMoves) return movablePieces;
  return [...movablePieces, END_MOVE];
}

export const MOVE_WITH_CARRIER_POPUP_TYPE = 'move-with-carrier';
const moveWithCarrierPopup = createPopupFactory<cg.Piece>({
  type: MOVE_WITH_CARRIER_POPUP_TYPE,
  renderItem: (s: State, item: cg.Piece, index: number) => {
    const piece = createSinglePieceElement(item);
    const squareSize = s.dom.bounds().width / 12;
    piece.setAttribute('data-index', index.toString());
    piece.style.width = squareSize + 'px';
    piece.style.height = squareSize + 'px';
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
const AMBIGOUS_STACK_MOVE_STAY_PIECES_CANT_COMBINE = 'ambigous-stack-move-stay-pieces-cant-combine';
const ambigousStackMoveStayPiecesCantCombineHandling = createAmbigousModeHandling<cg.Piece>({
  type: AMBIGOUS_STACK_MOVE_STAY_PIECES_CANT_COMBINE,
  popup: moveWithCarrierPopup,
  renderAmbigousMoveElements: (s: State, popup: CTLPopup<cg.Piece>) => {
    if (!s.ambigousMove) return;
    const carrying = s.ambigousMove.pieceAtOrig!.carrying;
    if (!carrying) return;
    popup.setPopup(s, carrying, s.ambigousMove.destKey);
    const ambigousStackEl = createAmbigousPiecesStackElement(carrying);
    const squareSize = s.dom.bounds().width / 12;
    ambigousStackEl.cgKey = s.ambigousMove.destKey;
    ambigousStackEl.style.width = squareSize + 'px';
    ambigousStackEl.style.height = squareSize + 'px';
    s.ambigousMove.renderGuide = {
      atOrig: ambigousStackEl,
      atDest: createSinglePieceElement(s.ambigousMove.pieceThatMoves),
    };
    s.dom.redraw();
  },
});
export { ambigousStackMoveStayPiecesCantCombineHandling, AMBIGOUS_STACK_MOVE_STAY_PIECES_CANT_COMBINE };
