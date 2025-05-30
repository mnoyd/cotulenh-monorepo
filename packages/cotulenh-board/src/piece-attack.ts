import { unselect, userMove } from './board';
import { AmbigousMoveType, createAmbigousModeHandling } from './popup/ambigous-move';
import { clearPopup, createPopupFactory, CTLPopup } from './popup/popup-factory';
import { createAmbigousPiecesStackElement } from './render';
import { State } from './state';
import { createEl } from './util';
import { PopUpType } from './popup/popup-factory';

export const PIECE_ATTACK_POPUP_TYPE: PopUpType = 'piece-attack';
const pieceAttackPopup = createPopupFactory<string>({
  type: PIECE_ATTACK_POPUP_TYPE,
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
    const origMove = {
      square: s.ambigousMove.origKey,
      type: s.ambigousMove.pieceThatMoves.role,
    };
    const destMove = {
      square: s.ambigousMove.destKey,
      stay: s.popup?.items[index] === 'stay',
    };
    userMove(s, origMove, destMove);
    s.ambigousMove = undefined;
    clearPopup(s);
    s.dom.redraw();
  },
  onClose: (s: State) => {
    s.ambigousMove = undefined;
    unselect(s);
  },
});
const AMBIGOUS_CAPTURE_STAY_BACK: AmbigousMoveType = 'capture-stay-back-ambigous';
const ambigousCaptureStayBackHandling = createAmbigousModeHandling({
  type: AMBIGOUS_CAPTURE_STAY_BACK,
  popup: pieceAttackPopup,
  renderAmbigousMoveElements: (s: State, popup: CTLPopup<string>) => {
    if (!s.ambigousMove) return;
    popup.setPopup(s, ['normal', 'stay'], s.ambigousMove.destKey);
    const elAtDest = createAmbigousPiecesStackElement(s, [
      s.ambigousMove.pieceAtDest!,
      s.ambigousMove.pieceThatMoves,
    ]);
    elAtDest.style.width = s.dom.bounds().squareSize + 'px';
    elAtDest.style.height = s.dom.bounds().squareSize + 'px';
    elAtDest.cgKey = s.ambigousMove.destKey;
    s.ambigousMove.renderGuide = {
      atOrig: undefined,
      atDest: elAtDest,
    };
    s.dom.redraw();
  },
});
export { ambigousCaptureStayBackHandling, AMBIGOUS_CAPTURE_STAY_BACK };
