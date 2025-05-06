import { State } from './state.js';
import * as cg from './types.js';
import { createEl, translate, posToTranslate } from './util.js';
import * as board from './board.js';
import * as util from './util.js';

import { formStack } from '@repo/cotulenh-combine-piece';

// Constants for popup dimensions and positioning
// These values serve as defaults and will be scaled based on board dimensions
const PIECE_WIDTH = 50;
const PIECE_GAP = 8;
const POPUP_PADDING = 8;
const POPUP_VERTICAL_OFFSET = 60;

// ----- Combined Piece Logic: Carrier Blueprints and Combining Rules -----

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

// ----- Combined Piece UI: Popup and Interaction -----

/**
 * Calculates the popup dimensions and position for a combined piece
 * @param s Game state
 * @param piece The piece to show in the popup
 * @param position The position where the popup should appear
 * @returns Object containing the container element, position, and dimensions
 */
export function calculatePopupPosition(
  s: State,
  piece: cg.Piece,
  position: cg.NumberPair,
): { containerEl: HTMLElement; position: cg.NumberPair; dimensions: { width: number; height: number } } {
  // Create popup container with appropriate class
  const containerEl = createEl('div', 'combined-piece-popup') as HTMLElement;
  const bounds = s.dom.bounds();
  const asRed = board.redPov(s);
  const posToTranslateFn = posToTranslate(bounds);
  const pieceKey = board.getKeyAtDomPos(position, asRed, bounds);

  // Default return for invalid cases
  const defaultReturn = {
    containerEl,
    position: [0, 0] as cg.NumberPair,
    dimensions: { width: 0, height: 0 },
  };

  // Validate inputs
  if (!pieceKey || !piece) return defaultReturn;
  if (!piece.carrying || piece.carrying.length === 0) return defaultReturn;

  // Calculate dimensions based on the number of pieces and board size
  const totalPieces = piece.carrying.length + 1;

  // Calculate piece width based on board dimensions for better scaling
  const scaledPieceWidth = Math.min(PIECE_WIDTH, bounds.width / 12);
  const scaledGap = Math.min(PIECE_GAP, bounds.width / 60);
  const scaledPadding = Math.min(POPUP_PADDING, bounds.width / 60);

  const popupWidth = totalPieces * scaledPieceWidth + (totalPieces - 1) * scaledGap + scaledPadding * 2;
  const popupHeight = scaledPieceWidth + scaledPadding * 2;

  // Calculate vertical offset based on board height
  const verticalOffset = Math.min(POPUP_VERTICAL_OFFSET, bounds.height / 8);

  // Position the popup centered above the clicked piece
  const piecePos = posToTranslateFn(util.key2pos(pieceKey), asRed);

  // Initial position calculation
  let popupX = piecePos[0] - popupWidth / 2;
  let popupY = piecePos[1] - verticalOffset;

  // Ensure popup stays within horizontal bounds
  popupX = Math.max(scaledPadding, Math.min(popupX, bounds.width - popupWidth - scaledPadding));

  // Ensure popup stays within vertical bounds
  // If not enough space above, try positioning below
  if (popupY < scaledPadding) {
    const belowY = piecePos[1] + scaledPieceWidth + scaledPadding;
    // Check if there's enough space below
    if (belowY + popupHeight < bounds.height - scaledPadding) {
      popupY = belowY;
    } else {
      // If neither above nor below works well, position at top with padding
      popupY = scaledPadding;
    }
  }

  const popupPosition: cg.NumberPair = [popupX, popupY];

  return {
    containerEl,
    position: popupPosition,
    dimensions: { width: popupWidth, height: popupHeight },
  };
}

/**
 * Shows a popup displaying a combined piece and its carried pieces
 * @param s Game state
 * @param key The key of the piece on the board
 * @param piece The piece to display in the popup
 * @param position The position where the popup should appear
 */
export function showCombinedPiecePopup(
  s: State,
  key: cg.Key,
  piece: cg.Piece,
  position: cg.NumberPair,
): void {
  // Validate inputs
  if (!s || !key || !piece || !position) return;
  if (!piece.carrying || piece.carrying.length === 0) return;

  // Remove any existing popup first
  removeCombinedPiecePopup(s);

  // Calculate popup position and create container
  const { containerEl, position: popupPosition, dimensions } = calculatePopupPosition(s, piece, position);

  // Add a class to identify this as a combined piece popup
  containerEl.classList.add('combined-piece-popup-container');

  // Apply initial position
  translate(containerEl, popupPosition);

  // Get board dimensions for scaling
  const bounds = s.dom.bounds();
  const scaledPieceWidth = Math.min(PIECE_WIDTH, bounds.width / 12);

  // Set container style with dynamic sizing
  containerEl.style.display = 'flex';
  containerEl.style.alignItems = 'center';
  containerEl.style.justifyContent = 'space-around';
  containerEl.style.padding = `${Math.min(POPUP_PADDING, bounds.width / 60)}px`;
  containerEl.style.gap = `${Math.min(PIECE_GAP, bounds.width / 60)}px`;

  // Add carrier piece to popup with appropriate styling
  const carrierEl = createEl('piece', `${piece.color} ${piece.role}`) as cg.PieceNode;
  carrierEl.classList.add('carrier-piece');
  carrierEl.setAttribute('data-key', key);
  carrierEl.setAttribute('title', `${piece.color} ${piece.role}`);

  // Apply dynamic sizing to piece
  carrierEl.style.width = `${scaledPieceWidth}px`;
  carrierEl.style.height = `${scaledPieceWidth}px`;

  if (piece.promoted) {
    const pieceStar = createEl('cg-piece-star') as HTMLElement;
    pieceStar.style.zIndex = '3';
    carrierEl.appendChild(pieceStar);
  }

  containerEl.appendChild(carrierEl);

  // Add carried pieces to popup with appropriate styling and attributes
  piece.carrying.forEach((carriedPiece, index) => {
    const pieceEl = createEl('piece', `${carriedPiece.color} ${carriedPiece.role}`) as cg.PieceNode;
    pieceEl.setAttribute('data-index', index.toString());
    pieceEl.setAttribute('title', `${carriedPiece.color} ${carriedPiece.role}`);
    pieceEl.style.cursor = 'grab';

    // Add visual indication for pieces that can be selected
    pieceEl.classList.add('carried-piece');

    // Apply dynamic sizing to piece
    pieceEl.style.width = `${scaledPieceWidth}px`;
    pieceEl.style.height = `${scaledPieceWidth}px`;

    if (carriedPiece.promoted) {
      const pieceStar = createEl('cg-piece-star') as HTMLElement;
      pieceStar.style.zIndex = '3';
      pieceEl.appendChild(pieceStar);
    }

    containerEl.appendChild(pieceEl);
  });

  // Add popup to DOM
  s.dom.elements.board.appendChild(containerEl);

  // Ensure popup stays within board bounds by adjusting position if needed
  adjustPopupPosition(containerEl, s.dom.elements.board, popupPosition, dimensions);

  // Set state to indicate popup is shown
  s.combinedPiecePopup = {
    key,
    piece,
    containerEl,
  };
}

/**
 * Adjusts the popup position to ensure it stays within the board boundaries
 * @param popupEl The popup element
 * @param boardEl The board element
 * @param initialPosition The initial calculated position
 * @param dimensions The popup dimensions
 */
function adjustPopupPosition(
  popupEl: HTMLElement,
  boardEl: HTMLElement,
  initialPosition: cg.NumberPair,
  dimensions: { width: number; height: number },
): void {
  const popupBounds = popupEl.getBoundingClientRect();
  const boardBounds = boardEl.getBoundingClientRect();
  let adjustedPosition = [...initialPosition] as cg.NumberPair;

  // Calculate padding based on board size
  const padding = Math.max(5, Math.min(POPUP_PADDING, boardBounds.width / 60));

  // Adjust horizontal position if needed
  if (popupBounds.left < boardBounds.left + padding) {
    // Align with left edge of board with padding
    adjustedPosition[0] = padding;
  } else if (popupBounds.right > boardBounds.right - padding) {
    // Align with right edge of board with padding
    adjustedPosition[0] = boardBounds.width - dimensions.width - padding;
  }

  // Adjust vertical position if needed
  if (popupBounds.top < boardBounds.top + padding) {
    // Check if there's enough space below
    const belowPosition = initialPosition[1] + dimensions.height + padding * 2;
    if (belowPosition + dimensions.height < boardBounds.height - padding) {
      // Show below the piece
      adjustedPosition[1] = belowPosition;
    } else {
      // If neither above nor below works well, position at top with padding
      adjustedPosition[1] = padding;
    }
  } else if (popupBounds.bottom > boardBounds.bottom - padding) {
    // If popup extends beyond bottom edge, move it up
    adjustedPosition[1] = boardBounds.height - dimensions.height - padding;
  }

  // Apply the adjusted position
  translate(popupEl, adjustedPosition);
}

/**
 * Checks if a specific piece in a stack is currently selected
 * @param s Game state
 * @param index Index of the piece in the stack
 * @returns True if the piece at the given index is selected
 */
export function isStackPieceSelected(s: State, index: number): boolean {
  if (!s || index < 0) return false;

  return !!(
    s.selectedPieceInfo?.isFromStack &&
    s.selectedPieceInfo.originalKey === s.selected &&
    s.selectedPieceInfo.carriedPieceIndex === index
  );
}

/**
 * Removes the combined piece popup from the DOM and state
 * @param s Game state
 */
export function removeCombinedPiecePopup(s: State): void {
  if (!s) return;

  if (s.combinedPiecePopup?.containerEl) {
    try {
      // Remove the element from DOM
      s.combinedPiecePopup.containerEl.remove();
    } catch (error) {
      console.error('Error removing combined piece popup:', error);
    }
    // Clear the state reference
    s.combinedPiecePopup = undefined;
  }
}

/**
 * Checks if a position is inside the popup and which piece was clicked
 * @param s Game state
 * @param position The position to check
 * @returns Object indicating if position is in popup and which piece was clicked
 */
export function isPositionInPopup(
  s: State,
  position: cg.NumberPair,
): { inPopup: boolean; pieceIndex?: number } {
  if (!s || !position || !s.combinedPiecePopup) return { inPopup: false };

  const popup = s.combinedPiecePopup.containerEl;
  if (!popup) return { inPopup: false };

  try {
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
  } catch (error) {
    console.error('Error checking position in popup:', error);
  }

  return { inPopup: false };
}
