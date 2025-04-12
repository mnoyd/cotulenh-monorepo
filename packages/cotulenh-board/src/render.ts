import { AnimCurrent, AnimFadings, AnimVector, AnimVectors } from './anim.js';
import { redPov } from './board.js';
import { DragCurrent } from './drag.js';
import { HeadlessState, State } from './state.js';
import * as cg from './types.js';
import { createEl, translate, posToTranslate as posToTranslateFromBounds, key2pos, pos2key } from './util.js';

type PieceName = string; // `$color $role`
const COMBINED_PIECE_OFFSET_BASE = 50; // Determines the how much the combined pieces are offset from each other

function createCombinedPieceElement(
  piece: cg.Piece,
  pos: cg.Pos,
  posToTranslate: (pos: cg.Pos, asRed: boolean) => cg.Pos,
  asRed: boolean,
  anim?: AnimVector,
  state?: State,
): cg.PieceNode {
  const container = createEl('piece', 'combined-stack') as cg.PieceNode;
  container.classList.add('piece');
  if (anim) {
    container.classList.add('anim');
  }

  // Create base piece (carrier)
  const basePieceName = `${piece.color} ${piece.role}`;
  const basePieceNode = createEl('piece', basePieceName) as cg.PieceNode;
  basePieceNode.cgPiece = basePieceName;

  // Apply opacity if there's a selected piece from the stack
  if (state?.selectedPieceInfo?.isFromStack && state.selectedPieceInfo.originalKey === pos2key(pos)) {
    basePieceNode.style.opacity = '0.4';
  }

  translate(basePieceNode, [0, 0]);
  basePieceNode.style.zIndex = posZIndex(pos, asRed);
  container.appendChild(basePieceNode);

  if (piece.promoted) {
    const pieceStar = createEl('cg-piece-star') as HTMLElement;
    pieceStar.style.zIndex = '3';
    basePieceNode.appendChild(pieceStar);
  }

  if (piece.carrying) {
    const offsetStepX = 0.1 * COMBINED_PIECE_OFFSET_BASE;
    const offsetStepY = -0.2 * COMBINED_PIECE_OFFSET_BASE;
    let zIndex = parseInt(basePieceNode.style.zIndex, 10) + 1;

    for (let i = 0; i < piece.carrying.length; i++) {
      const carriedPiece = piece.carrying[i];
      const carriedPieceName = `${carriedPiece.color} ${carriedPiece.role}`;
      const carriedPieceNode = createEl('piece', carriedPieceName) as cg.PieceNode;
      carriedPieceNode.cgPiece = carriedPieceName;

      // Apply opacity and highlight class based on selection
      if (state?.selectedPieceInfo?.isFromStack && state.selectedPieceInfo.originalKey === pos2key(pos)) {
        if (state.selectedPieceInfo.carriedPieceIndex === i) {
          // This is the selected piece in the stack
          carriedPieceNode.style.opacity = '1'; // Ensure full opacity
          carriedPieceNode.classList.add('selected-stack-piece'); // Add highlight class
        } else {
          // Other pieces in the stack when one is selected
          carriedPieceNode.style.opacity = '0.4'; // Dim other pieces
          carriedPieceNode.classList.remove('selected-stack-piece'); // Ensure highlight class is removed
        }
      } else {
        // No piece selected from this stack, ensure normal state
        carriedPieceNode.style.opacity = '1';
        carriedPieceNode.classList.remove('selected-stack-piece');
      }

      const offsetX = offsetStepX * (i + 1);
      const offsetY = offsetStepY * (i + 1);

      translate(carriedPieceNode, [offsetX, offsetY]);
      carriedPieceNode.style.zIndex = `${zIndex++}`;
      container.appendChild(carriedPieceNode);

      if (carriedPiece.promoted) {
        const pieceStar = createEl('cg-piece-star') as HTMLElement;
        pieceStar.style.zIndex = '3';
        carriedPieceNode.appendChild(pieceStar);
      }
    }
  }
  container.cgPiece = pieceNameOf(piece);

  // Calculate the final destination position
  const destinationPos = posToTranslate(pos, asRed);

  if (anim) {
    // Calculate the ORIGIN position for animation start
    const originPosVec = [...pos] as cg.Pos; // Start with destination coords
    originPosVec[0] -= anim[2]; // Subtract delta X -> origin X
    originPosVec[1] -= anim[3]; // Subtract delta Y -> origin Y
    const originPos = posToTranslate(originPosVec, asRed); // Convert to translation

    // Apply origin position first
    translate(container, originPos);
    // Force reflow to apply the transform before adding class/changing transform
    container.offsetWidth;
    // Apply destination position - the .anim class handles the transition
    translate(container, destinationPos);
  } else {
    // No animation, just apply the final destination position
    translate(container, destinationPos);
  }

  return container;
}

export function render(s: State): void {
  // console.log('render', s);
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
    if (!samePieces.has(k)) {
      pMvdset = movedPieces.get(pieceNameOf(p));
      pMvd = pMvdset && pMvdset.pop();

      // a same piece was moved
      if (pMvd) {
        const pos = key2pos(k);
        const isCombined = p.carrying && p.carrying.length > 0;

        // Apply common DOM changes that should happen before animation/placement
        pMvd.cgKey = k;
        if (pMvd.cgFading) {
          pMvd.classList.remove('fading');
          pMvd.cgFading = false;
        }
        // Set z-index early for stacking during potential animation
        if (!isCombined && s.addPieceZIndex) {
          pMvd.style.zIndex = posZIndex(pos, asRed);
        }

        // Define the final state action (after animation or immediately)
        const onFinish = () => {
          // Ensure the element still exists in the DOM before modifying/replacing
          if (!pMvd!.parentNode) return;

          if (isCombined) {
            // --- Combined Piece Final State ---
            // Clean up any children (like promotion stars from previous state) before replacing
            while (pMvd!.firstChild) {
              pMvd!.removeChild(pMvd!.firstChild);
            }
            const parent = pMvd!.parentNode;
            if (parent) {
              const combinedPieceElement = createCombinedPieceElement(
                p,
                pos,
                posToTranslate,
                asRed,
                undefined,
                s,
              );
              parent.removeChild(pMvd!); // Explicitly remove old node
              parent.appendChild(combinedPieceElement); // Append new node
            }
          } else {
            // --- Normal Piece Final State ---
            // Remove animation class and flag if it was animating
            if (pMvd!.cgAnimating) {
              pMvd!.classList.remove('anim');
              pMvd!.cgAnimating = false;
            }

            // Handle promotion star based on the final piece state 'p'
            if (p.promoted) {
              if (!pMvd!.querySelector('cg-piece-star')) {
                const pieceStar = createEl('cg-piece-star') as HTMLElement;
                pieceStar.style.zIndex = '3';
                pMvd!.appendChild(pieceStar);
              }
            } else {
              const pieceStarNode = pMvd!.querySelector('cg-piece-star') as HTMLElement;
              if (pieceStarNode) pMvd!.removeChild(pieceStarNode);
            }
          }
        };

        // Apply animation or final position to the existing pMvd element
        if (anim) {
          pMvd.cgAnimating = true;
          pMvd.classList.add('anim');
          // Calculate the ORIGIN position for the start of the animation
          const animPos = [...pos] as cg.Pos; // Start with destination
          animPos[0] -= anim[2]; // Subtract delta X to get origin X
          animPos[1] -= anim[3]; // Subtract delta Y to get origin Y
          translate(pMvd, posToTranslate(animPos, asRed)); // Position pMvd at origin

          // Force reflow to ensure the transform is applied before the transition starts
          pMvd.offsetWidth;

          // Set the destination position to trigger the CSS transition
          translate(pMvd, posToTranslate(pos, asRed));

          // Add the listener to handle the final state after animation
          pMvd.addEventListener('transitionend', onFinish, { once: true });
        } else {
          // No animation, directly apply final position and state
          translate(pMvd, posToTranslate(pos, asRed));
          // Ensure animation properties are cleared if somehow set previously
          if (pMvd.cgAnimating) {
            pMvd.classList.remove('anim');
            pMvd.cgAnimating = false;
          }
          onFinish(); // Apply final state immediately
        }
      }
      // no piece in moved obj: insert the new piece
      // assumes the new piece is not being dragged
      else {
        const pos = key2pos(k);
        let pieceNode: cg.PieceNode;
        if (p.carrying && p.carrying.length > 0) {
          pieceNode = createCombinedPieceElement(p, pos, posToTranslate, asRed, anim, s);
        } else {
          const pieceName = pieceNameOf(p);
          pieceNode = createEl('piece', pieceName) as cg.PieceNode;

          if (p.promoted) {
            const pieceStar = createEl('cg-piece-star') as HTMLElement;
            pieceNode.appendChild(pieceStar);
            pieceStar.style.zIndex = '3';
          }
          (pieceNode as cg.PieceNode).cgPiece = pieceName;
          if (anim) {
            pieceNode.classList.add('anim'); // Fix: Use classList.add
          }
          translate(pieceNode, posToTranslate(pos, asRed));
        }
        pieceNode.cgKey = k;
        if (s.addPieceZIndex) pieceNode.style.zIndex = posZIndex(pos, asRed);
        boardEl.appendChild(pieceNode);
      }
    }
  }

  // remove any element that remains in the moved sets
  for (const nodes of movedPieces.values()) removeNodes(s, nodes);
  for (const nodes of movedSquares.values()) removeNodes(s, nodes);
}
const pieceNameOf = (piece: cg.Piece): string => {
  const base = `${piece.color} ${piece.role} ${piece.promoted ? 'promoted' : ''}`;
  const carrying = piece.carrying?.reduce((acc, p) => acc + ' ' + pieceNameOf(p), '-');
  return base + (carrying ?? '');
};

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
  if (s.lastMove && s.highlight.lastMove)
    for (const k of s.lastMove) {
      addSquare(squares, k, 'last-move');
    }
  if (s.check && s.highlight.check) addSquare(squares, s.check, 'check');
  if (s.selected) {
    addSquare(squares, s.selected, 'selected');
    if (s.movable.showDests) {
      const dests = s.movable.dests?.get(s.selected);
      if (dests)
        for (const k of dests) {
          addSquare(squares, k, 'move-dest' + (s.pieces.has(k) ? ' oc' : ''));
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
