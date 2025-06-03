import { AnimCurrent, AnimFadings, AnimVector, AnimVectors } from './anim.js';
import { redPov } from './board.js';
import { DragCurrent } from './drag.js';
import { getAmbigousMoveHandling } from './popup/ambigous-move.js';
import { clearPopup } from './popup/popup-factory.js';
import { HeadlessState, State } from './state.js';
import * as cg from './types.js';
import { TEMP_KEY } from './types.js';
import {
  createEl,
  translate,
  posToTranslate as posToTranslateFromBounds,
  key2pos,
  pieceNameOf,
  setVisible,
  origMoveToKey,
  flattenPiece,
} from './util.js';

type PieceName = string; // `$color $role`
const COMBINED_PIECE_OFFSET_BASE = 50; // Determines the how much the combined pieces are offset from each other

function createPiecesStackElement(stackContainer: HTMLElement, pieces: cg.Piece[]): HTMLElement {
  if (!pieces.length) throw new Error('No pieces provided');

  // pieces = [{color:'blue', role: 'artillery', carrying: [{color: 'blue', role: 'engineer'}]}, {color: 'red', role: 'air_force'}]

  // Create base piece using createSinglePieceElement
  const basePiece = pieces[0];
  const basePieceNode = createSinglePieceElement(basePiece);

  // translate(basePieceNode, [0, 0]);
  // basePieceNode.style.zIndex = posZIndex(pos, asRed); // Use original pos for base zIndex
  stackContainer.appendChild(basePieceNode);

  const offsetStepX = 0.1 * COMBINED_PIECE_OFFSET_BASE;
  const offsetStepY = -0.2 * COMBINED_PIECE_OFFSET_BASE;
  let zIndex = parseInt(basePieceNode.style.zIndex || '1', 10) + 1;

  // Create carried pieces using createSinglePieceElement
  for (let i = 1; i < pieces.length; i++) {
    const carriedPiece = pieces[i];
    const carriedPieceNode = createSinglePieceElement(carriedPiece);

    const offsetX = offsetStepX * i; // Offset relative to the base piece
    const offsetY = offsetStepY * i; // Offset relative to the base piece

    translate(carriedPieceNode, [offsetX, offsetY]);
    carriedPieceNode.style.zIndex = `${zIndex++}`;
    stackContainer.appendChild(carriedPieceNode);
  }

  return stackContainer;
}

export function createSinglePieceElement(piece: cg.Piece): cg.PieceNode {
  const pieceName = pieceNameOf(piece);
  const pieceNode = createEl('piece', pieceName) as cg.PieceNode;

  if (piece.promoted) {
    const pieceStar = createEl('cg-piece-star') as HTMLElement;
    pieceNode.appendChild(pieceStar);
    pieceStar.style.zIndex = '3';
  }
  (pieceNode as cg.PieceNode).cgPiece = pieceName;
  return pieceNode;
}

function createCombinedPieceElement(piece: cg.Piece): cg.PieceNode {
  const container = createEl('piece', 'combined-stack') as cg.PieceNode;
  container.classList.add('piece');
  // Create the stack of pieces
  const allPiecesInStack: cg.Piece[] = flattenPiece(piece);
  createPiecesStackElement(container, allPiecesInStack);

  container.cgPiece = pieceNameOf(piece); // The cgPiece of the container refers to the base piece
  return container;
}

/**
 * Creates a stack of pieces with dynamic vertical offsets based on the number of pieces.
 * Pieces are rendered in order from bottom (first element) to top (last element).
 * @param pieces Array of pieces to stack, ordered from bottom to top
 * @returns A DOM element containing the stacked pieces
 */
export function createAmbigousPiecesStackElement(pieces: cg.Piece[]): cg.KeyedNode {
  if (!pieces.length) throw new Error('No pieces provided');

  const stackElement = createEl('piece-ambigous-stack') as cg.KeyedNode;
  stackElement.classList.add('piece-ambigous-stack'); // For potential styling via CSS

  // Calculate offset based on number of pieces in the stack
  // More pieces = smaller offset to prevent excessive height
  const offsetFactor = Math.max(5, 20 - pieces.length * 2); // Decreases as piece count increases
  const baseOffsetY = -offsetFactor; // Negative value moves upward

  let zIndex = 1;

  // Add pieces from bottom to top
  pieces.forEach((piece, index) => {
    // Create the piece element
    let pieceNode: cg.PieceNode;
    if (piece.carrying && piece.carrying.length > 0) {
      pieceNode = createCombinedPieceElement(piece);
    } else {
      pieceNode = createSinglePieceElement(piece);
    }

    // Calculate vertical offset (first piece has no offset)
    if (index > 0) {
      // Each subsequent piece is positioned higher than the previous one
      const offsetY = baseOffsetY * index;
      translate(pieceNode, [0, offsetY]);
    }

    // Set z-index to ensure proper stacking order
    pieceNode.style.zIndex = `${zIndex++}`;

    // Add to the stack container
    stackElement.appendChild(pieceNode);
  });

  return stackElement;
}

export function render(s: State): void {
  const asRed: boolean = orientRed(s),
    posToTranslate = posToTranslateFromBounds(s.dom.bounds()),
    pieces: cg.Pieces = s.pieces,
    boardEl: HTMLElement = s.dom.elements.board,
    curAnim: AnimCurrent | undefined = s.animation.current,
    anims: AnimVectors = curAnim ? curAnim.plan.anims : new Map(),
    fadings: AnimFadings = curAnim ? curAnim.plan.fadings : new Map(),
    curDrag: DragCurrent | undefined = s.draggable.current,
    squares: cg.SquareClasses = computeSquareClasses(s),
    samePieces: Set<cg.Key> = new Set(),
    sameSquares: Set<cg.Key> = new Set(),
    movedPieces: Map<PieceName, cg.PieceNode[]> = new Map(),
    movedSquares: Map<string, cg.SquareNode[]> = new Map(); // by class name
  let attackedPieceNode: cg.PieceNode | undefined;

  let k: cg.Key,
    el: cg.PieceNode | cg.SquareNode | undefined,
    pieceAtKey: cg.Piece | undefined,
    elPieceName: PieceName,
    anim: AnimVector | undefined,
    fading: cg.Piece | undefined,
    pMvdset: cg.PieceNode[] | undefined,
    pMvd: cg.PieceNode | undefined,
    sMvdset: cg.SquareNode[] | undefined,
    sMvd: cg.SquareNode | undefined;

  // walk over all board dom elements, apply animations and flag moved pieces
  el = boardEl.firstChild as cg.PieceNode | cg.SquareNode | undefined;
  while (el) {
    k = el.cgKey;
    if (isPieceNode(el)) {
      pieceAtKey = pieces.get(k);
      anim = anims.get(k);
      fading = fadings.get(k);
      elPieceName = el.cgPiece;
      // if piece not being dragged anymore, remove dragging style
      if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
        el.classList.remove('dragging');
        // No need to call translate, will be done by parent div
        translate(el, posToTranslate(key2pos(k), asRed));
        el.cgDragging = false;
      }
      // remove fading class if it still remains
      if (!fading && el.cgFading) {
        el.cgFading = false;
        el.classList.remove('fading');
      }
      // there is now a piece at this dom key
      if (pieceAtKey) {
        // continue animation if already animating and same piece
        // (otherwise it could animate a captured piece)
        if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
          const pos = key2pos(k);
          pos[0] += anim[2];
          pos[1] += anim[3];
          el.classList.add('anim');
          // No need to call translate, will be done by parent div
          translate(el, posToTranslate(pos, asRed));
        } else if (el.cgAnimating) {
          el.cgAnimating = false;
          el.classList.remove('anim');
          // No need to call translate, will be done by parent div
          translate(el, posToTranslate(key2pos(k), asRed));
          if (s.addPieceZIndex) el.style.zIndex = posZIndex(key2pos(k), asRed);
        }
        //With ambigous move presents, rendering at orig and dest square will be handle by ambigous handling
        if (s.ambigousMove?.destKey === k || s.ambigousMove?.origKey === k) {
          appendValue(movedPieces, elPieceName, el);
        }
        // same piece: flag as same
        if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
          samePieces.add(k);
        }
        // different piece: flag as moved unless it is a fading piece
        else {
          if (fading && elPieceName === pieceNameOf(fading)) {
            el.classList.add('fading');
            el.cgFading = true;
          } else {
            appendValue(movedPieces, elPieceName, el);
          }
        }
      }
      // no piece: flag as moved
      else {
        appendValue(movedPieces, elPieceName, el);
      }
    } else if (isSquareNode(el)) {
      const cn = el.className;
      if (squares.get(k) === cn) sameSquares.add(k);
      else appendValue(movedSquares, cn, el);
    } else if (isAmbigousStackNode(el)) {
      attackedPieceNode = el;
    }
    el = el.nextSibling as cg.PieceNode | cg.SquareNode | undefined;
  }

  // walk over all squares in current set, apply dom changes to moved squares
  // or append new squares
  for (const [sk, className] of squares) {
    if (!sameSquares.has(sk)) {
      sMvdset = movedSquares.get(className);
      sMvd = sMvdset && sMvdset.pop();
      const translation = posToTranslate(key2pos(sk), asRed);
      if (sMvd) {
        sMvd.cgKey = sk;
        translate(sMvd, translation);
      } else {
        const squareNode = createEl('square', className) as cg.SquareNode;
        squareNode.cgKey = sk;
        translate(squareNode, translation);
        boardEl.insertBefore(squareNode, boardEl.firstChild);
      }
    }
  }

  // walk over all pieces in current set, apply dom changes to moved pieces
  // or append new pieces
  for (const [k, p] of pieces) {
    anim = anims.get(k);
    if (!samePieces.has(k) && (s.ambigousMove?.destKey !== k || s.ambigousMove?.origKey !== k)) {
      pMvdset = movedPieces.get(pieceNameOf(p));
      pMvd = pMvdset && pMvdset.pop();
      // a same piece was moved
      if (pMvd) {
        // apply dom changes
        pMvd.cgKey = k;
        if (pMvd.cgFading) {
          pMvd.classList.remove('fading');
          pMvd.cgFading = false;
        }
        const pos = key2pos(k);
        if (s.addPieceZIndex) pMvd.style.zIndex = posZIndex(pos, asRed);
        if (anim) {
          pMvd.cgAnimating = true;
          pMvd.classList.add('anim');
          pos[0] += anim[2];
          pos[1] += anim[3];
        }
        translate(pMvd, posToTranslate(pos, asRed));
      }
      // no piece in moved obj: insert the new piece
      // assumes the new piece is not being dragged
      else {
        const pos = key2pos(k);
        let pieceNode: cg.PieceNode;
        if (p.carrying && p.carrying.length > 0) {
          pieceNode = createCombinedPieceElement(p);
        } else {
          pieceNode = createSinglePieceElement(p);
        }
        if (anim) {
          pieceNode.classList.add('anim'); // Fix: Use classList.add
        }
        translate(pieceNode, posToTranslate(pos, asRed));
        pieceNode.cgKey = k;
        if (k === TEMP_KEY) {
          setVisible(pieceNode, false);
        }
        if (s.addPieceZIndex) pieceNode.style.zIndex = posZIndex(pos, asRed);
        boardEl.appendChild(pieceNode);
      }
    }
  }

  //render attack element
  if (s.ambigousMove) {
    if (!attackedPieceNode) {
      getAmbigousMoveHandling(s)?.start(s);
      if (s.ambigousMove.renderGuide) {
        const { atOrig, atDest } = s.ambigousMove.renderGuide;
        if (atOrig) {
          translate(atOrig, posToTranslate(key2pos(s.ambigousMove.origKey), redPov(s)));
          boardEl.appendChild(atOrig);
        }
        if (atDest) {
          translate(atDest, posToTranslate(key2pos(s.ambigousMove.destKey), redPov(s)));
          boardEl.appendChild(atDest);
        }
      }
      s.dom.redraw();
    }
  } else {
    //remove attacked piece
    if (attackedPieceNode) removeNodes(s, [attackedPieceNode]);
  }

  // remove any element that remains in the moved sets
  for (const nodes of movedPieces.values()) removeNodes(s, nodes);
  for (const nodes of movedSquares.values()) removeNodes(s, nodes);
}

export const orientRed = (s: HeadlessState): boolean => s.orientation === 'red';

export function updateBounds(s: State): void {
  const bounds = s.dom.elements.wrap.getBoundingClientRect();
  const container = s.dom.elements.container;
  const ratio = bounds.height / bounds.width;
  const width = (Math.floor((bounds.width * window.devicePixelRatio) / 12) * 12) / window.devicePixelRatio;
  const height = width * ratio;
  container.style.width = width + 'px';
  container.style.height = height + 'px';
  s.dom.bounds.clear();

  s.addDimensionsCssVarsTo?.style.setProperty('---cg-width', width + 'px');
  s.addDimensionsCssVarsTo?.style.setProperty('---cg-height', height + 'px');
}

export function renderResized(s: State): void {
  const asRed: boolean = redPov(s),
    posToTranslate = posToTranslateFromBounds(s.dom.bounds());
  let el = s.dom.elements.board.firstChild as cg.PieceNode | cg.SquareNode | undefined;
  if (s.popup) {
    clearPopup(s);
  }
  while (el) {
    if ((isPieceNode(el) && !el.cgAnimating) || isSquareNode(el)) {
      translate(el, posToTranslate(key2pos(el.cgKey), asRed));
    }
    el = el.nextSibling as cg.PieceNode | cg.SquareNode | undefined;
  }
}

function computeSquareClasses(s: State): cg.SquareClasses {
  const squares: cg.SquareClasses = new Map();
  let isFirstSquareInLastMove = true;
  if (s.lastMove && s.highlight.lastMove)
    for (const k of s.lastMove) {
      addSquare(squares, k, 'last-move ' + (isFirstSquareInLastMove ? 'from' : 'to'));
      isFirstSquareInLastMove = false;
    }
  if (s.check && s.highlight.check) addSquare(squares, s.check, 'check');
  if (s.selected) {
    addSquare(squares, s.selected.square, 'selected' + (s.selected.stackMove ? ' sm' : ''));
    if (s.movable.showDests) {
      const dests = s.movable.dests?.get(origMoveToKey(s.selected)) || [];
      if (dests)
        for (const k of dests) {
          addSquare(squares, k.square, 'move-dest' + (s.pieces.has(k.square) ? ' oc' : ''));
        }
    }
    if (s.airDefense?.showInfluceZone) {
      const side = s.airDefense?.showInfluceZone;
      if (s.airDefense?.influenceZone) {
        const zone = s.airDefense.influenceZone[side];
        if (zone) {
          renderInfluenceZones(squares, zone);
        }
      }
    }
  }

  const o = s.exploding;
  if (o) for (const k of o.keys) addSquare(squares, k, 'exploding' + o.stage);

  if (s.highlight.custom) {
    s.highlight.custom.forEach((v: string, k: cg.Key) => {
      addSquare(squares, k, v);
    });
  }

  return squares;
}

// const isPieceNode = (el: cg.PieceNode | cg.SquareNode): el is cg.PieceNode => el.tagName === 'PIECE';
const isPieceNode = (el: HTMLElement): el is cg.PieceNode =>
  el.tagName === 'PIECE' || el.classList.contains('combined-stack');
const isSquareNode = (el: cg.PieceNode | cg.SquareNode): el is cg.SquareNode => el.tagName === 'SQUARE';
const isAmbigousStackNode = (el: HTMLElement): el is cg.AttackNode => el.tagName === 'PIECE-AMBIGOUS-STACK';

function addSquare(squares: cg.SquareClasses, key: cg.Key, klass: string): void {
  const classes = squares.get(key);
  if (classes) squares.set(key, `${classes} ${klass}`);
  else squares.set(key, klass);
}

/**
 * Renders influence zones with two distinct styles:
 * 1. Single influence - standard opponent color
 * 2. Overlapping zones - special highlight color
 */
function renderInfluenceZones(squares: cg.SquareClasses, zone: Map<cg.Key, cg.Key[]>): void {
  // Apply appropriate classes based on the number of origins
  zone.forEach((origins, square) => {
    if (origins.length === 1) {
      // Single origin - standard opponent color
      addSquare(squares, square, 'air-defense-influence opponent');
    } else {
      // Multiple origins - special overlap class
      addSquare(squares, square, 'air-defense-influence opponent overlap');

      // Add data attribute with origins and set overlap intensity
      setTimeout(() => {
        const squareEl = document.querySelector(`cg-board square[data-key="${square}"]`) as HTMLElement;
        if (squareEl) {
          // Store origins as a data attribute
          squareEl.setAttribute('data-origins', origins.join(','));

          // Set the intensity based on number of overlaps
          squareEl.style.setProperty('--overlap-intensity', origins.length.toString());
        }
      }, 0);
    }
  });
}

function posZIndex(pos: cg.Pos, asRed: boolean): string {
  const minZ = 3;
  const rank = pos[1];
  const z = asRed ? minZ + 11 - rank : minZ + rank;

  return `${z}`;
}

function appendValue<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

function removeNodes(s: State, nodes: HTMLElement[]): void {
  for (const node of nodes) s.dom.elements.board.removeChild(node);
}
