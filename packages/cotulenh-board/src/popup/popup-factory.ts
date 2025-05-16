import { State } from '../state.js';
import * as board from '../board.js';
import * as util from '../util.js';
import * as cg from '../types.js';
import { combinedPiecePopup } from '../new-combine-piece.js';

// Constants for popup dimensions and positioning
// These values serve as defaults and will be scaled based on board dimensions
const ITEM_GAP = 6;
const POPUP_PADDING = 6;
const POPUP_VERTICAL_OFFSET = 60;

type PopupFactoryOptions<T> = {
  /**
   * Type of the popup
   */
  type: string;
  /**
   * Function to convert each array element to an HTML element
   */
  renderItem: (s: State, item: T, index: number) => HTMLElement;
  /**
   * Function called when an item in the popup is selected
   */
  onSelect: (s: State, index: number, e?: cg.MouchEvent) => void;
  /**
   * Optional class name for the popup container
   */
  className?: string;
};

export interface CTLPopup<T> {
  setPopup(s: State, items: T[], position: cg.NumberPair): HTMLElement | undefined;
  handlePopupClick(s: State, itemIndex: number, e?: cg.MouchEvent): void;
}

/**
 * Removes the popup from the DOM and state
 * @param s Game state
 */
export function clearPopup(s: State): void {
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
  position: cg.NumberPair,
): { inPopup: boolean; itemIndex?: number } {
  // First check active popup if it exists
  if (s && position && s.popup) {
    const popup = s.popup.containerEl;
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
              return { inPopup: true, itemIndex: i };
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
export function calculatePopupPosition(
  s: State,
  items: HTMLElement[],
  position: cg.NumberPair,
): { position: cg.NumberPair; dimensions: { width: number; height: number } } {
  // Create popup container with appropriate class
  const bounds = s.dom.bounds();
  const asRed = board.redPov(s);
  const posToTranslateFn = util.posToTranslate(bounds);
  const pieceKey = board.getKeyAtDomPos(position, asRed, bounds);

  // Default return for invalid cases
  const defaultReturn = {
    position: [0, 0] as cg.NumberPair,
    dimensions: { width: 0, height: 0 },
  };

  // Validate inputs
  if (!pieceKey || !items || items.length === 0) return defaultReturn;

  // Calculate dimensions based on the actual HTML elements
  const totalItems = items.length;

  // Calculate scaled gap and padding based on board dimensions
  const scaledGap = Math.min(ITEM_GAP, bounds.width / 60);
  const scaledPadding = Math.min(POPUP_PADDING, bounds.width / 60);

  // Calculate total width and maximum height from actual item elements
  let totalWidth = 0;
  let maxHeight = 0;

  // Measure each item's dimensions
  items.forEach((itemEl, index) => {
    // Get the actual size of each item element
    const itemWidth = itemEl.offsetWidth || itemEl.clientWidth || parseInt(itemEl.style.width);
    const itemHeight = itemEl.offsetHeight || itemEl.clientHeight || parseInt(itemEl.style.height);

    // Add item width to total
    totalWidth += itemWidth;

    // Add gap between items (except after the last item)
    if (index < totalItems - 1) {
      totalWidth += scaledGap;
    }

    // Track maximum height
    maxHeight = Math.max(maxHeight, itemHeight);
  });

  // Add padding to dimensions
  const popupWidth = totalWidth + scaledPadding * 2;
  const popupHeight = maxHeight + scaledPadding * 2;

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
    // Use the height of the first item or maxHeight if no items
    const itemHeight = items.length > 0 ? items[0].offsetHeight || items[0].clientHeight : maxHeight;
    const belowY = piecePos[1] + itemHeight + scaledPadding;
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
    position: popupPosition,
    dimensions: { width: popupWidth, height: popupHeight },
  };
}

function createSetPopUp<T>(options: PopupFactoryOptions<T>): CTLPopup<T>['setPopup'] {
  return (s: State, items: T[], position: cg.NumberPair): HTMLElement | undefined => {
    // Remove any existing popup first
    clearPopup(s);
    const itemElements = items.map((item, index) => {
      const itemEl = options.renderItem(s, item, index);
      itemEl.classList.add('popup-item');
      itemEl.setAttribute('data-index', index.toString());
      return itemEl;
    });
    const { position: popupPosition } = calculatePopupPosition(s, itemElements, position);
    const popup = createPopupElement(itemElements, popupPosition);
    if (!popup) {
      return undefined;
    }
    // Ensure popup stays within board bounds by adjusting position if needed
    // adjustPopupPosition(popup, s.dom.elements.board, popupPosition, popupDimensions);
    s.popup = {
      square: board.getKeyAtDomPos(position, board.redPov(s), s.dom.bounds()),
      items,
      type: options.type,
      containerEl: popup,
    };
    s.dom.elements.board.appendChild(popup);
    return popup;
  };
}

function createPopupElement(itemElements: HTMLElement[], position: cg.NumberPair): HTMLElement | undefined {
  // Create container element
  const containerEl = util.createEl('popup', 'popup-container');

  // Position the popup
  containerEl.style.position = 'absolute';
  containerEl.style.left = `${position[0]}px`;
  containerEl.style.top = `${position[1]}px`;

  // Add items to popup
  itemElements.forEach(itemEl => {
    containerEl.appendChild(itemEl);
  });

  // Set state to indicate popup is shown
  return containerEl;
}
function createHandlePopupClick<T>(
  options: PopupFactoryOptions<T>,
): (s: State, itemIndex: number, e?: cg.MouchEvent) => void {
  return (s: State, itemIndex: number, e?: cg.MouchEvent) => {
    if (itemIndex === undefined) return;
    options.onSelect(s, itemIndex, e);
  };
}

export function getPopup(s: State, type: string): CTLPopup<any> | undefined {
  if (!s.popup || s.popup.type !== type) {
    return undefined;
  }
  const filter = type ? type : s.popup.type;
  switch (filter) {
    case 'combined-piece':
      return combinedPiecePopup;
    default:
      return undefined;
  }
}
