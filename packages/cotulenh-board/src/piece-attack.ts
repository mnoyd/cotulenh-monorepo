import { unselect, userMove } from './board';
import { clearPopup, createPopupFactory } from './popup/popup-factory';
import { State } from './state';
import { createEl } from './util';

export function returnToOriginalPieceState(s: State) {
  if (!s.ambigousMove) return;
  const originalPiece = s.ambigousMove.pieceAtOrig;
  const pieceThatMoves = s.ambigousMove.pieceThatMoves;
  s.pieces.set(s.ambigousMove.destKey, pieceThatMoves);
  s.pieces.set(s.ambigousMove.origKey, originalPiece);
}

const pieceAttackPopup = createPopupFactory<string>({
  type: 'piece-attack',
  renderItem: (s: State, item: string, index: number) => {
    let className = '';
    if (index === 0) className = 'piece-attack ' + item;
    if (index === 1) className = 'piece-attack ' + item;
    const el = createEl('cg-btn', className);
    const squareSize = s.dom.bounds().squareSize;
    el.style.width = `${squareSize}px`;
    el.style.height = `${squareSize}px`;
    return el;
  },
  onSelect: (s: State, index: number) => {
    if (!s.ambigousMove) return;
    returnToOriginalPieceState(s);
    const origMove = {
      square: s.ambigousMove.origKey,
      type: s.ambigousMove.pieceThatMoves.role,
    };
    const destMove = {
      square: s.ambigousMove.destKey,
      stay: s.popup?.items[index] === 'stay',
    };
    const result = userMove(s, origMove, destMove);
    if (result) {
    }
    //Must clear attackedPiece before onClose as it will return board to original state if not cleared.
    s.ambigousMove = undefined;
    clearPopup(s);
    s.dom.redraw();
  },
  onClose: (s: State) => {
    returnToOriginalPieceState(s);
    s.ambigousMove = undefined;
    unselect(s);
  },
});
export { pieceAttackPopup };
