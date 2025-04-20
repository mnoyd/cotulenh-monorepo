import { State } from './state.js';
import * as cg from './types.js';
import { createEl, translate, posToTranslate } from './util.js';
import * as board from './board.js';
import * as util from './util.js';

import { formStack } from '@repo/cotulenh-combine-piece';

// ----- Combined Piece Logic: Carrier Blueprints and Combining Rules -----

// The main function to try combining pieces
export function tryCombinePieces(origPiece: cg.Piece, destPiece: cg.Piece): cg.Piece | undefined {
  const combined = formStack(
    origPiece,
    destPiece,
    p => p.role,
    r => r,
  );
  return combined ?? undefined;
}

export function findCarriedPieceMatching(
  piece: cg.Piece,
  predicate: (p: cg.Piece) => boolean,
): cg.Piece | undefined {
  if (!piece.carrying) {
    return undefined;
  }
  return piece.carrying.find(predicate);
}

// ----- Combined Piece UI: Popup and Interaction -----

// Calculate popup dimensions and position
export function calculatePopupPosition(
  s: State,
  piece: cg.Piece,
  position: cg.NumberPair,
): { containerEl: HTMLElement; position: cg.NumberPair; dimensions: { width: number; height: number } } {
  // Create popup container
  const containerEl = createEl('div', 'combined-piece-popup') as HTMLElement;
  const bounds = s.dom.bounds();
  const asRed = board.redPov(s);
  const posToTranslateFn = posToTranslate(bounds);
  const pieceKey = board.getKeyAtDomPos(position, asRed, bounds);

  if (!pieceKey) {
    return { containerEl, position: [0, 0], dimensions: { width: 0, height: 0 } };
  }

  // Calculate dimensions
  if (!piece.carrying || piece.carrying.length === 0) {
    return { containerEl, position: [0, 0], dimensions: { width: 0, height: 0 } };
  }
  const totalPieces = piece.carrying.length + 1;
  const pieceWidth = 50;
  const gap = 8;
  const padding = 8;
  const popupWidth = totalPieces * pieceWidth + (totalPieces - 1) * gap + padding * 2;
  const popupHeight = pieceWidth + padding * 2;

  // Position the popup closer to the clicked piece
  const piecePos = posToTranslateFn(util.key2pos(pieceKey), asRed);
  const popupPosition: cg.NumberPair = [
    piecePos[0] - popupWidth / 2, // Center horizontally
    piecePos[1] - 60, // Position closer to piece
  ];

  return {
    containerEl,
    position: popupPosition,
    dimensions: { width: popupWidth, height: popupHeight },
  };
}

export function showCombinedPiecePopup(
  s: State,
  key: cg.Key,
  piece: cg.Piece,
  position: cg.NumberPair,
): void {
  if (!piece.carrying || piece.carrying.length === 0) return;

  // Calculate popup position and create container
  const { containerEl, position: popupPosition } = calculatePopupPosition(s, piece, position);

  // Apply position
  translate(containerEl, popupPosition);

  // Add carrier piece to popup
  const carrierEl = createEl('piece', `${piece.color} ${piece.role}`) as cg.PieceNode;
  carrierEl.classList.add('carrier-piece');
  carrierEl.setAttribute('data-key', key);
  if (piece.promoted) {
    const pieceStar = createEl('cg-piece-star') as HTMLElement;
    pieceStar.style.zIndex = '3';
    carrierEl.appendChild(pieceStar);
  }

  containerEl.appendChild(carrierEl);

  // Add carried pieces to popup
  piece.carrying.forEach((carriedPiece, index) => {
    const pieceEl = createEl('piece', `${carriedPiece.color} ${carriedPiece.role}`) as cg.PieceNode;
    pieceEl.setAttribute('data-index', index.toString());
    pieceEl.style.cursor = 'grab';

    if (carriedPiece.promoted) {
      const pieceStar = createEl('cg-piece-star') as HTMLElement;
      pieceStar.style.zIndex = '3';
      pieceEl.appendChild(pieceStar);
    }

    containerEl.appendChild(pieceEl);
  });

  // Add popup to DOM
  s.dom.elements.board.appendChild(containerEl);

  // Ensure popup stays within board bounds
  const popupBounds = containerEl.getBoundingClientRect();
  const boardBounds = s.dom.elements.board.getBoundingClientRect();

  // Adjust horizontal position if needed
  if (popupBounds.left < boardBounds.left) {
    translate(containerEl, [0, popupBounds.top - boardBounds.top]);
  } else if (popupBounds.right > boardBounds.right) {
    translate(containerEl, [boardBounds.width - popupBounds.width, popupBounds.top - boardBounds.top]);
  }

  // Adjust vertical position if needed
  if (popupBounds.top < boardBounds.top) {
    translate(containerEl, [
      popupBounds.left - boardBounds.left,
      popupPosition[1] + 100, // Show below the piece if not enough space above
    ]);
  }

  // Set state to indicate popup is shown
  s.combinedPiecePopup = {
    key,
    piece,
    containerEl,
  };
}

// Add this function to check if a piece in a stack is selected
export function isStackPieceSelected(s: State, index: number): boolean {
  return !!(
    s.selectedPieceInfo?.isFromStack &&
    s.selectedPieceInfo.originalKey === s.selected &&
    s.selectedPieceInfo.carriedPieceIndex === index
  );
}

export function removeCombinedPiecePopup(s: State): void {
  if (s.combinedPiecePopup?.containerEl) {
    s.combinedPiecePopup.containerEl.remove();
    s.combinedPiecePopup = undefined;
  }
}

// Check if a position is inside the popup
export function isPositionInPopup(
  s: State,
  position: cg.NumberPair,
): { inPopup: boolean; pieceIndex?: number } {
  if (!s.combinedPiecePopup) return { inPopup: false };

  const popup = s.combinedPiecePopup.containerEl;
  const popupBounds = popup.getBoundingClientRect();

  // Check if position is within popup bounds
  if (
    position[0] >= popupBounds.left &&
    position[0] <= popupBounds.right &&
    position[1] >= popupBounds.top &&
    position[1] <= popupBounds.bottom
  ) {
    // Find which piece was clicked
    const pieces = Array.from(popup.querySelectorAll('piece'));
    for (let i = 0; i < pieces.length; i++) {
      const pieceBounds = pieces[i].getBoundingClientRect();
      if (
        position[0] >= pieceBounds.left &&
        position[0] <= pieceBounds.right &&
        position[1] >= pieceBounds.top &&
        position[1] <= pieceBounds.bottom
      ) {
        // If it's the carrier piece (first piece)
        if (i === 0) {
          return { inPopup: true, pieceIndex: -1 }; // -1 indicates carrier piece
        } else {
          return { inPopup: true, pieceIndex: i - 1 }; // Adjust index for carried pieces
        }
      }
    }
    return { inPopup: true }; // In popup but not on a piece
  }

  return { inPopup: false };
}
