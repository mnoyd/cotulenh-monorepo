import { unselect, userMove } from './board';
import { AmbigousMoveType, createAmbigousModeHandling } from './popup/ambigous-move';
import { clearPopup, createPopupFactory, CTLPopup } from './popup/popup-factory';
import { createAmbigousPiecesStackElement } from './render';
import { State } from './state';
import { createEl } from './util';
import { PopUpType } from './popup/popup-factory';
import { popupRegistry } from './popup/popup-registry';
import { ambigousMoveRegistry } from './popup/ambigous-move-registry';

export const PIECE_ATTACK_POPUP_TYPE: PopUpType = 'piece-attack';
const pieceAttackPopup = createPopupFactory<string>({
  type: PIECE_ATTACK_POPUP_TYPE,
  renderItem: (_s: State, item: string, index: number) => {
    let className = '';
    if (index === 0) className = 'piece-attack ' + item;
    if (index === 1) className = 'piece-attack ' + item;
    const el = createEl('cg-btn', className);
    const squareSize = _s.dom.bounds().width / 12;
    el.style.width = squareSize + 'px';
    el.style.height = squareSize + 'px';
    el.setAttribute('data-index', index.toString());
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

// Register the popup in the registry to avoid circular dependencies
popupRegistry.register(PIECE_ATTACK_POPUP_TYPE, pieceAttackPopup);

const AMBIGOUS_CAPTURE_STAY_BACK: AmbigousMoveType = 'capture-stay-back-ambigous';
const ambigousCaptureStayBackHandling = createAmbigousModeHandling({
  type: AMBIGOUS_CAPTURE_STAY_BACK,
  popup: pieceAttackPopup,
  renderAmbigousMoveElements: (s: State, popup: CTLPopup<string>) => {
    if (!s.ambigousMove) return;
    popup.setPopup(s, ['normal', 'stay'], s.ambigousMove.destKey);
    const elAtDest = createAmbigousPiecesStackElement([
      s.ambigousMove.pieceAtDest!,
      s.ambigousMove.pieceThatMoves,
    ]);
    const squareSize = s.dom.bounds().width / 12;
    elAtDest.cgKey = s.ambigousMove.destKey;
    elAtDest.style.width = squareSize + 'px';
    elAtDest.style.height = squareSize + 'px';
    s.ambigousMove.renderGuide = {
      atOrig: undefined,
      atDest: elAtDest,
    };
    s.dom.redraw();
  },
});

// Register the ambiguous move handler in the registry to avoid circular dependencies
ambigousMoveRegistry.register(AMBIGOUS_CAPTURE_STAY_BACK, ambigousCaptureStayBackHandling);

export { ambigousCaptureStayBackHandling, AMBIGOUS_CAPTURE_STAY_BACK };
