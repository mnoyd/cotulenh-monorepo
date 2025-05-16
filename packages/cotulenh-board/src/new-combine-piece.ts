import { createPopupFactory } from './popup/popup-factory';
import { createSinglePieceElement } from './render';
import * as cg from './types';
import { State } from './state';

const combinedPiecePopup = createPopupFactory<cg.Piece>({
  type: 'combined-piece',
  renderItem: (s: State, item: cg.Piece, index: number) => {
    const piece = createSinglePieceElement(s, item);
    piece.setAttribute('data-index', index.toString());
    return piece;
  },
  onSelect: (s: State, index: number) => {
    console.log('Selected piece:', index, s);
  },
});
export { combinedPiecePopup };
