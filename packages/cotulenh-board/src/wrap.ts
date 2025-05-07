import { HeadlessState } from './state.js';
import { files, ranks, Color as cgColor } from './types.js'; // Import Color as cgColor to avoid conflict if any
import { createEl } from './util.js';

export function renderWrap(element: HTMLElement, s: HeadlessState): any {
  element.innerHTML = '';

  // ensure the cg-wrap class is set
  // so bounds calculation can use the CSS width/height values
  // add that class yourself to the element before calling chessground
  // for a slight performance improvement! (avoids recomputing style)
  element.classList.add('cg-wrap');
  const container = createEl('cg-container');
  element.appendChild(container);
  const board = createEl('cg-board');
  const background = createEl('cg-background');
  if (s.orientation === 'blue') background.classList.add('board-orientation-blue');

  container.appendChild(background);
  container.appendChild(board);

  if (s.coordinates) {
    const orientClass = s.orientation === 'blue' ? 'blue' : '';

    container.appendChild(renderCoords(ranks, 'ranks ' + orientClass, s.numericCoordinates, s.orientation));
    container.appendChild(renderCoords(files, 'files ' + orientClass, s.numericCoordinates, s.orientation));
  }

  return {
    board,
    container,
    wrap: element,
  };
}

// function renderCoords(coordType: string, className: string): HTMLElement {
//   const el = createEl('coords', `${coordType} ${className}`);
//   let f: HTMLElement;
//   const numberOfLine = coordType === 'ranks' ? 11 : 10;
//   for (let i = 0; i <= numberOfLine; i++) {
//     f = createEl('coord');
//     f.textContent = i.toString();
//     el.appendChild(f);
//   }
//   return el;
// }

function renderCoords(
  elems: readonly string[],
  className: string,
  numeric?: boolean,
  orientation?: cgColor,
): HTMLElement {
  const el = createEl('coords', className);
  let f: HTMLElement;
  let coordElements = [...elems];

  if (numeric) {
    coordElements = Array.from({ length: elems.length }, (_, i) => i.toString());
  }
  // For ranks, numbers are already used, so no change if numeric is true.
  // If numeric is false for ranks (though not typical for chess), it would still use the default rank numbers.

  if (orientation === 'blue') {
    coordElements.reverse();
  }

  for (const elem of coordElements) {
    f = createEl('coord');
    f.textContent = elem;
    el.appendChild(f);
  }
  return el;
}
