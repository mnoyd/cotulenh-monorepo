import { createPopupFactory } from './popup/popup-factory';
import { State } from './state';
import * as cg from './types.js';
import { createEl } from './util';

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
  onSelect: (s: State, index: number, e?: cg.MouchEvent) => {
    console.log('Selected piece:', index, s, e);
  },
  onClose: (s: State) => {
    console.log('Popup closed:', s);
    const attackedPiece = s.attackedPiece;
    if (!attackedPiece) return;
    const originalPiece = attackedPiece.originalPiece ? attackedPiece.originalPiece : attackedPiece.attacker;
    s.pieces.set(attackedPiece.attackedSquare, attackedPiece.attacked);
    s.pieces.set(attackedPiece.attackerSquare, originalPiece);
    s.attackedPiece = undefined;
  },
});
export { pieceAttackPopup };
