import { unselect, userMove } from './board';
import { clearPopup, createPopupFactory } from './popup/popup-factory';
import { State } from './state';
import { createEl } from './util';

export function returnToOriginalPieceState(s: State) {
  const attackedPiece = s.ambigousMove?.attackedPiece;
  if (!attackedPiece) return;
  const originalPiece = attackedPiece.originalPiece ? attackedPiece.originalPiece : attackedPiece.attacker;
  s.pieces.set(attackedPiece.attackedSquare, attackedPiece.attacked);
  s.pieces.set(attackedPiece.attackerSquare, originalPiece);
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
    if (!s.ambigousMove?.attackedPiece) return;
    returnToOriginalPieceState(s);
    const origMove = {
      square: s.ambigousMove.attackedPiece.attackerSquare,
      type: s.ambigousMove.attackedPiece.attacker.role,
    };
    const destMove = {
      square: s.ambigousMove.attackedPiece.attackedSquare,
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
