import { AnimCurrent, AnimFadings, AnimVector, AnimVectors } from './anim.js';
import { redPov } from './board.js';
import { DragCurrent } from './drag.js';
import { pieceAttackPopup } from './piece-attack.js';
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
  flatOutPiece,
} from './util.js';

type PieceName = string; // `$color $role`
const COMBINED_PIECE_OFFSET_BASE = 50; // Determines the how much the combined pieces are offset from each other

function createPiecesStackElement(s: State, stackContainer: HTMLElement, pieces: cg.Piece[]): HTMLElement {
  if (!pieces.length) throw new Error('No pieces provided');

  // pieces = [{color:'blue', role: 'artillery', carrying: [{color: 'blue', role: 'engineer'}]}, {color: 'red', role: 'air_force'}]

  // Create base piece using createSinglePieceElement
  const basePiece = pieces[0];
  const basePieceNode = createSinglePieceElement(s, basePiece);

  // translate(basePieceNode, [0, 0]);
  // basePieceNode.style.zIndex = posZIndex(pos, asRed); // Use original pos for base zIndex
  stackContainer.appendChild(basePieceNode);

  const offsetStepX = 0.1 * COMBINED_PIECE_OFFSET_BASE;
  const offsetStepY = -0.2 * COMBINED_PIECE_OFFSET_BASE;
  let zIndex = parseInt(basePieceNode.style.zIndex || '1', 10) + 1;

  // Create carried pieces using createSinglePieceElement
  for (let i = 1; i < pieces.length; i++) {
    const carriedPiece = pieces[i];
    const carriedPieceNode = createSinglePieceElement(s, carriedPiece);

    const offsetX = offsetStepX * i; // Offset relative to the base piece
    const offsetY = offsetStepY * i; // Offset relative to the base piece

    translate(carriedPieceNode, [offsetX, offsetY]);
    carriedPieceNode.style.zIndex = `${zIndex++}`;
    stackContainer.appendChild(carriedPieceNode);
  }

  return stackContainer;
}

export function createSinglePieceElement(s: State, piece: cg.Piece): cg.PieceNode {
  const pieceName = pieceNameOf(piece);
  const pieceNode = createEl('piece', pieceName) as cg.PieceNode;

  pieceNode.style.width = `${s.dom.bounds().squareSize}px`;
  pieceNode.style.height = `${s.dom.bounds().squareSize}px`;
  if (piece.promoted) {
    const pieceStar = createEl('cg-piece-star') as HTMLElement;
    pieceNode.appendChild(pieceStar);
    pieceStar.style.zIndex = '3';
  }
  (pieceNode as cg.PieceNode).cgPiece = pieceName;
  return pieceNode;
}

function createCombinedPieceElement(s: State, piece: cg.Piece): cg.PieceNode {
  const container = createEl('piece', 'combined-stack') as cg.PieceNode;
  container.classList.add('piece');
  // Create the stack of pieces
  const allPiecesInStack: cg.Piece[] = flatOutPiece(piece);
  createPiecesStackElement(s, container, allPiecesInStack);

  container.cgPiece = pieceNameOf(piece); // The cgPiece of the container refers to the base piece
  return container;
}

function createPieceAttackElement(s: State, attackerPiece: cg.Piece, attackedPiece: cg.Piece): cg.KeyedNode {
  const attackElement = createEl('piece-attack') as cg.KeyedNode;
  attackElement.classList.add('piece-attack'); // For potential styling via CSS

  // Create attacked element (rendered visually below)
  let attackedElementNode: cg.PieceNode;
  if (attackedPiece.carrying && attackedPiece.carrying.length > 0) {
    attackedElementNode = createCombinedPieceElement(s, attackedPiece);
  } else {
    attackedElementNode = createSinglePieceElement(s, attackedPiece);
  }

  // Create attacker element (rendered visually above and offset)
  let attackerElementNode: cg.PieceNode;
  if (attackerPiece.carrying && attackerPiece.carrying.length > 0) {
    attackerElementNode = createCombinedPieceElement(s, attackerPiece);
  } else {
    attackerElementNode = createSinglePieceElement(s, attackerPiece);
  }

  // Apply a slight vertical offset to the attacker piece to position it above the attacked piece.
  // translate uses percentages of the element's own size.
  // A negative Y value moves it upwards.
  translate(attackerElementNode, [0, -15]); // Offset by -25% of its height upwards

  // Append attacked piece first (bottom layer), then attacker piece (top layer, offset)
  attackElement.appendChild(attackedElementNode);
  attackElement.appendChild(attackerElementNode);

  // The caller will be responsible for positioning this 'attackElement' onto the board square.
  // Example usage by caller:
  // const visualAttack = createPieceAttackElement(attacker, attacked);
  // visualAttack.cgKey = square; // Assign key for reference if needed
  // translate(visualAttack, posToTranslate(key2pos(square), asRed));
  // boardEl.appendChild(visualAttack);

  return attackElement;
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
    } else if (isAttackNode(el)) {
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
        squareNode.style.height = `${s.dom.bounds().squareSize}px`;
        squareNode.style.width = `${s.dom.bounds().squareSize}px`;
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
    if (!samePieces.has(k) && s.attackedPiece?.attackedSquare !== k) {
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
          pieceNode = createCombinedPieceElement(s, p);
        } else {
          pieceNode = createSinglePieceElement(s, p);
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
  if (s.attackedPiece) {
    if (!attackedPieceNode) {
      const attackElement = createPieceAttackElement(s, s.attackedPiece.attacker, s.attackedPiece.attacked);
      attackElement.cgKey = s.attackedPiece.attackedSquare;
      translate(attackElement, posToTranslate(key2pos(s.attackedPiece.attackedSquare), asRed));
      boardEl.appendChild(attackElement);
      pieceAttackPopup.setPopup(s, ['normal', 'stay'], s.attackedPiece.attackedSquare);
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
const isAttackNode = (el: HTMLElement): el is cg.AttackNode => el.tagName === 'PIECE-ATTACK';

function addSquare(squares: cg.SquareClasses, key: cg.Key, klass: string): void {
  const classes = squares.get(key);
  if (classes) squares.set(key, `${classes} ${klass}`);
  else squares.set(key, klass);
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
