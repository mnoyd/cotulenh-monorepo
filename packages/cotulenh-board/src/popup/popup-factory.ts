import { State } from '../state.js';
import * as board from '../board.js';
import * as util from '../util.js';
import * as types from '../types.js';

// Constants for popup dimensions and positioning
// These values serve as defaults and will be scaled based on board dimensions
const PIECE_WIDTH = 50;
const PIECE_GAP = 8;
const POPUP_PADDING = 8;
const POPUP_VERTICAL_OFFSET = 60;

type PopupFactoryOptions<T> = {
  /**
   * Type of the popup
   */
  type: string;
  /**
   * Function to convert each array element to an HTML element
   */
  renderItem: (item: T, index: number) => HTMLElement;
  /**
   * Function called when an item in the popup is selected
   */
  onSelect: (item: T, index: number) => void;
  /**
   * Optional class name for the popup container
   */
  className?: string;
};

interface CTLPopup<T> {
  setPopup(s: State, items: T[], position: types.NumberPair): HTMLElement | undefined;
  clearPopup(s: State): void;
  isPositionInPopup(s: State, position: types.NumberPair): { inPopup: boolean; pieceIndex?: number };
  handlePopupClick(s: State, event: MouseEvent, position: types.NumberPair): void;
}

/**
 * Removes the popup from the DOM and state
 * @param s Game state
 */
function clearPopup(s: State): void {
  if (!s) return;

  if (s.popup?.containerEl) {
    try {
      // Remove the element from DOM
      s.popup.containerEl.remove();
    } catch (error) {
      console.error('Error removing popup:', error);
    }
    // Clear the state reference
    s.popup = undefined;
  }
}

/**
 * Creates a popup factory function
 * @param options Configuration options for the popup factory
 * @returns A function that shows the popup when called with an array of items
 */
export function createPopupFactory<T>(options: PopupFactoryOptions<T>): CTLPopup<T> {
  const popup: CTLPopup<T> = {
    setPopup: createSetPopUp(options),
    clearPopup,
    isPositionInPopup,
    handlePopupClick: createHandlePopupClick(options),
  };

  return popup;
}

/**
 * Checks if a position is inside the popup and which piece was clicked
 * @param s Game state
 * @param position The position to check
 * @returns Object indicating if position is in popup and which piece was clicked
 */
export function isPositionInPopup(
  s: State,
  position: types.NumberPair,
): { inPopup: boolean; pieceIndex?: number } {
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
          // Find which piece was clicked
          const pieces = Array.from(popup.querySelectorAll('.popup-item'));
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
    }
  }

  return { inPopup: false };
}
export function calculatePopupPosition<T>(
  s: State,
  items: T[],
  position: types.NumberPair,
): { position: types.NumberPair; dimensions: { width: number; height: number } } {
  // Create popup container with appropriate class
  const containerEl = util.createEl('div', 'popup') as HTMLElement;
  const bounds = s.dom.bounds();
  const asRed = board.redPov(s);
  const posToTranslateFn = util.posToTranslate(bounds);
  const pieceKey = board.getKeyAtDomPos(position, asRed, bounds);

  // Default return for invalid cases
  const defaultReturn = {
    containerEl,
    position: [0, 0] as types.NumberPair,
    dimensions: { width: 0, height: 0 },
  };

  // Validate inputs
  if (!pieceKey || !items || items.length === 0) return defaultReturn;

  // Calculate dimensions based on the number of pieces and board size
  const totalPieces = items.length;

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

  const popupPosition: types.NumberPair = [popupX, popupY];

  return {
    position: popupPosition,
    dimensions: { width: popupWidth, height: popupHeight },
  };
}
function createSetPopUp<T>(options: PopupFactoryOptions<T>): CTLPopup<T>['setPopup'] {
  return (s: State, items: T[], position: types.NumberPair): HTMLElement | undefined => {
    // Remove any existing popup first
    clearPopup(s);
    const { position: popupPosition, dimensions: popupDimensions } = calculatePopupPosition(
      s,
      items,
      position,
    );
    const popup = createPopupElement(options, items, popupPosition, popupDimensions);
    if (!popup) {
      return undefined;
    }
    s.popup = {
      type: options.type,
      containerEl: popup,
    };
    s.dom.elements.board.appendChild(popup);
    return popup;
  };
}

function createPopupElement<T>(
  options: PopupFactoryOptions<T>,
  items: T[],
  position: types.NumberPair,
  dimensions: { width: number; height: number },
): HTMLElement | undefined {
  // Create container element
  const containerEl = util.createEl('popup', 'popup-container');

  // Apply dimensions
  containerEl.style.width = `${dimensions.width}px`;
  containerEl.style.height = `${dimensions.height}px`;

  // Position the popup
  containerEl.style.position = 'absolute';
  containerEl.style.left = `${position[0]}px`;
  containerEl.style.top = `${position[1]}px`;

  // Add items to popup
  items.forEach((item, index) => {
    const itemEl = options.renderItem(item, index);
    itemEl.classList.add('popup-item');
    containerEl.appendChild(itemEl);
  });

  // Set state to indicate popup is shown
  return containerEl;
}
function createHandlePopupClick<T>(
  options: PopupFactoryOptions<T>,
): (s: State, event: MouseEvent, position: types.NumberPair) => void {
  throw new Error('Function not implemented.');
}
