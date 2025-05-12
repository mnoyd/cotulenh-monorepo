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

  // Add height for stay buttons
  const popupWidth = totalPieces * scaledPieceWidth + (totalPieces - 1) * scaledGap + scaledPadding * 2;
  const popupHeight = scaledPieceWidth * 2 + scaledPadding * 2; // Double height to accommodate stay buttons

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
  if (!s || !key || !piece) return;
  if (!piece.carrying || piece.carrying.length === 0) return;

  const bounds = s.dom.bounds();
  // const position = getDomPosAtKey(key, board.redPov(s), bounds);

  // Remove any existing popup first
  removeCombinedPiecePopup(s);

  // Calculate popup position and create container
  const { containerEl, position: popupPosition, dimensions } = calculatePopupPosition(s, piece, position);

  // Add a class to identify this as a combined piece popup
  containerEl.classList.add('combined-piece-popup-container');

  // Apply initial position
  translate(containerEl, popupPosition);

  // Get board dimensions for scaling
  const scaledPieceWidth = Math.min(PIECE_WIDTH, bounds.width / 12);

  // Set container style with dynamic sizing
  containerEl.style.display = 'flex';
  containerEl.style.flexDirection = 'column'; // Changed to column to stack buttons above pieces
  containerEl.style.alignItems = 'center';
  containerEl.style.justifyContent = 'space-around';
  containerEl.style.padding = `${Math.min(POPUP_PADDING, bounds.width / 60)}px`;
  containerEl.style.gap = `${Math.min(PIECE_GAP, bounds.width / 60)}px`;

  // Create a row for stay buttons and a row for pieces
  const buttonRow = createEl('div', 'stay-button-row') as HTMLElement;
  buttonRow.style.display = 'flex';
  buttonRow.style.width = '100%';
  buttonRow.style.justifyContent = 'space-around';
  buttonRow.style.gap = `${Math.min(PIECE_GAP, bounds.width / 60)}px`;

  const pieceRow = createEl('div', 'piece-row') as HTMLElement;
  pieceRow.style.display = 'flex';
  pieceRow.style.width = '100%';
  pieceRow.style.justifyContent = 'space-around';
  pieceRow.style.gap = `${Math.min(PIECE_GAP, bounds.width / 60)}px`;

  containerEl.appendChild(buttonRow);
  containerEl.appendChild(pieceRow);

  // Initialize deployState if it doesn't exist
  if (!s.deployState) {
    s.deployState = new Map<cg.Key, cg.Piece[]>();
  }

  // Get the list of pieces marked to stay for this key
  const stayingPieces = s.deployState.get(key) || [];

  // Add carrier piece button
  const carrierButton = createEl('button', 'stay-button') as HTMLButtonElement;
  carrierButton.setAttribute('data-index', '-1');
  carrierButton.style.width = `${scaledPieceWidth}px`;
  carrierButton.style.height = `${scaledPieceWidth}px`;
  carrierButton.style.fontSize = `${Math.max(10, scaledPieceWidth / 4)}px`;
  carrierButton.style.padding = '2px';
  carrierButton.style.cursor = 'pointer';
  carrierButton.style.display = 'block';
  buttonRow.appendChild(carrierButton);

  // Add carrier piece to popup with appropriate styling
  const carrierEl = createEl('piece', `${piece.color} ${piece.role}`) as cg.PieceNode;
  carrierEl.classList.add('carrier-piece');
  carrierEl.setAttribute('data-key', key);
  carrierEl.setAttribute('data-index', '-1');
  carrierEl.setAttribute('title', `${piece.color} ${piece.role}`);

  // Apply dynamic sizing to piece
  carrierEl.style.width = `${scaledPieceWidth}px`;
  carrierEl.style.height = `${scaledPieceWidth}px`;

  if (piece.promoted) {
    const pieceStar = createEl('cg-piece-star') as HTMLElement;
    pieceStar.style.zIndex = '3';
    carrierEl.appendChild(pieceStar);
  }

  pieceRow.appendChild(carrierEl);

  // Add carried pieces to popup with appropriate styling and attributes
  piece.carrying.forEach((carriedPiece, index) => {
    // Check if this piece is marked to stay
    const isStaying = stayingPieces.some(p => p.role === carriedPiece.role && p.color === carriedPiece.color);

    // Add stay button for this piece
    const stayButton = createEl('button', 'stay-button') as HTMLButtonElement;
    stayButton.setAttribute('data-index', index.toString());
    stayButton.style.width = `${scaledPieceWidth}px`;
    stayButton.style.height = `${scaledPieceWidth}px`;
    stayButton.style.fontSize = `${Math.max(10, scaledPieceWidth / 4)}px`;
    stayButton.style.padding = '2px';
    stayButton.style.cursor = 'pointer';
    stayButton.style.display = isStaying ? 'none' : 'block';
    buttonRow.appendChild(stayButton);

    // Create piece element
    const pieceEl = createEl('piece', `${carriedPiece.color} ${carriedPiece.role}`) as cg.PieceNode;
    pieceEl.setAttribute('data-index', index.toString());
    pieceEl.setAttribute('title', `${carriedPiece.color} ${carriedPiece.role}`);

    // Set cursor and class based on staying status
    if (isStaying) {
      pieceEl.classList.add('staying-piece');
      pieceEl.style.cursor = 'pointer';
      pieceEl.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
      pieceEl.style.border = '2px solid green';
    } else {
      pieceEl.style.cursor = 'grab';
    }

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

    pieceRow.appendChild(pieceEl);
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
 * Checks if a position is inside the popup and which piece or button was clicked
 * @param s Game state
 * @param position The position to check
 * @returns Object indicating if position is in popup and details about what was clicked
 */
export function isPositionInPopup(
  s: State,
  position: cg.NumberPair,
): { inPopup: boolean; pieceIndex?: number; isButton?: boolean; isStayingPiece?: boolean } {
  // First check active popup if it exists
  if (s && position && s.combinedPiecePopup) {
    const popup = s.combinedPiecePopup.containerEl;
    if (popup) {
      try {
        const popupBounds = popup.getBoundingClientRect();

        // Check if position is within popup bounds
        if (
          position[0] >= popupBounds.left &&
          position[0] <= popupBounds.right &&
          position[1] >= popupBounds.top &&
          position[1] <= popupBounds.bottom
        ) {
          // Check if a stay button was clicked
          const buttons = Array.from(popup.querySelectorAll('button.stay-button'));
          for (let i = 0; i < buttons.length; i++) {
            const buttonBounds = buttons[i].getBoundingClientRect();
            if (
              position[0] >= buttonBounds.left &&
              position[0] <= buttonBounds.right &&
              position[1] >= buttonBounds.top &&
              position[1] <= buttonBounds.bottom
            ) {
              const index = parseInt(buttons[i].getAttribute('data-index') || '0');
              return { inPopup: true, pieceIndex: index, isButton: true };
            }
          }

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
              const index = parseInt(pieces[i].getAttribute('data-index') || '0');
              const isStaying = pieces[i].classList.contains('staying-piece');
              return { inPopup: true, pieceIndex: index, isStayingPiece: isStaying };
            }
          }
          return { inPopup: true }; // In popup but not on a piece
        }
      } catch (error) {
        console.error('Error checking position in popup:', error);
      }
    }
  }

  return { inPopup: false };
}
