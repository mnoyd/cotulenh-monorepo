import { HeadlessState, State } from './state.js';
import * as board from './board.js';
import * as util from './util.js';
import { clear as drawClear } from './draw.js';
import * as cg from './types.js';
import { anim } from './anim.js';
import {
  isAirDefenseInfluenceZonePiece,
  isAirDefensePieceOrCarryingAirDefensePiece,
  updateAirDefenseInfluenceZones,
} from './air-defense.js';
import { showCombinedPiecePopup, isPositionInPopup, removeCombinedPiecePopup } from './combined-piece.js';

export interface DragCurrent {
  orig: cg.Key; // orig key of dragging piece
  piece: cg.Piece;
  origPos: cg.NumberPair; // first event position
  pos: cg.NumberPair; // latest event position
  started: boolean; // whether the drag has started; as per the distance setting
  element: cg.PieceNode | (() => cg.PieceNode | undefined);
  newPiece?: boolean; // it it a new piece from outside the board
  force?: boolean; // can the new piece replace an existing one (editor)
  previouslySelected?: cg.Key;
  originTarget: EventTarget | null;
  keyHasChanged: boolean; // whether the drag has left the orig key
  temporaryPos?: cg.Key; // potential new position
  originalStackKey?: cg.Key; // Add this to track if dragging whole stack
}

export function start(s: State, e: cg.MouchEvent): void {
  if (!(s.trustAllEvents || e.isTrusted)) return; // only trust when trustAllEvents is enabled
  if (e.buttons !== undefined && e.buttons > 1) return; // only touch or left click
  if (e.touches && e.touches.length > 1) return; // support one finger touch only

  const position = util.eventPosition(e)!;

  // Check if we have an active popup and if the click is inside it
  // In the start function where we handle combined piece popup clicks
  if (s.combinedPiecePopup) {
    const { inPopup, pieceIndex } = isPositionInPopup(s, position);
    if (inPopup) {
      e.preventDefault();
      if (!s.combinedPiecePopup) return;
      const { key, piece } = s.combinedPiecePopup;

      if (pieceIndex === -1) {
        // Carrier piece clicked

        // --- Select the entire stack for a subsequent move ---
        s.selected = key; // Select the square where the stack is
        s.selectedPieceInfo = undefined; // IMPORTANT: Clear stack info to indicate moving the whole piece
        // No drag initiated here, just selection set.
        // The next click on a valid square will trigger the move via selectSquare -> userMove -> baseMove
      } else if (pieceIndex !== undefined) {
        // Carried piece clicked (logic implemented previously)

        // --- Select the carried piece for a subsequent move ---
        s.selectedPieceInfo = {
          originalKey: key, // Key of the stack
          originalPiece: piece, // The whole stack piece
          carriedPieceIndex: pieceIndex, // Index of the selected piece within carrying array
          isFromStack: true,
        };
        s.selected = key; // Select the square where the stack is
        // No drag initiated here, just selection set.
        // The next click on a valid square will trigger the move via selectSquare -> userMove -> baseMove
      }

      removeCombinedPiecePopup(s); // Close popup after interaction
      // No return here, allow flow to continue if needed, though popup interaction usually ends here.
      // However, we need redraw after selection and popup removal.
      s.dom.redraw();

      // TODO: Add drag support to combined pieces
      return; // Explicitly return after handling popup interaction.
    } else {
      // Click outside popup, remove it
      removeCombinedPiecePopup(s);
    }
    // Remove this return statement to allow normal piece selection
    // return;
  }

  const bounds = s.dom.bounds(),
    orig = board.getKeyAtDomPos(position, board.redPov(s), bounds);
  if (!orig) return;
  const piece = s.pieces.get(orig);

  // Handle combined piece click: Show popup only if no piece is currently selected
  if (!s.selected && piece && piece.carrying && piece.carrying.length > 0) {
    showCombinedPiecePopup(s, orig, piece, position);
    return;
  }

  const previouslySelected = s.selected;
  if (
    !previouslySelected &&
    s.drawable.enabled &&
    (s.drawable.eraseOnClick || !piece || piece.color !== s.turnColor)
  )
    drawClear(s);
  // Prevent touch scroll and create no corresponding mouse event, if there
  // is an intent to interact with the board.
  if (
    e.cancelable !== false &&
    (!e.touches || s.blockTouchScroll || piece || previouslySelected || pieceCloseTo(s, position))
  )
    e.preventDefault();
  else if (e.touches) return; // Handle only corresponding mouse event https://github.com/lichess-org/chessground/pull/268

  s.stats.ctrlKey = e.ctrlKey;
  if (s.selected && board.canMove(s, s.selected, orig)) {
    anim(state => board.selectSquare(state, orig), s);
  } else {
    board.selectSquare(s, orig);
  }
  const stillSelected = s.selected === orig;
  const element = pieceElementByKey(s, orig);
  if (piece && element && stillSelected && board.isDraggable(s, orig)) {
    s.draggable.current = {
      orig,
      piece,
      origPos: position,
      pos: position,
      started: s.draggable.autoDistance && s.stats.dragged,
      element,
      previouslySelected,
      originTarget: e.target,
      keyHasChanged: false,
    };
    element.cgDragging = true;
    element.classList.add('dragging');
    // place ghost
    const ghost = s.dom.elements.ghost;
    if (ghost) {
      ghost.className = `ghost ${piece.color} ${piece.role}`;
      util.translate(ghost, util.posToTranslate(bounds)(util.key2pos(orig), board.redPov(s)));
      util.setVisible(ghost, true);
    }
    const defenseInfluenceZoneType = isAirDefenseInfluenceZonePiece(piece);
    if (s.showAirDefenseInfluence && defenseInfluenceZoneType !== undefined) {
      updateAirDefenseInfluenceZones(s, piece, defenseInfluenceZoneType);
    } else {
      s.highlight.custom.clear();
    }
    processDrag(s);
  }
  s.dom.redraw();
}

function pieceCloseTo(s: State, pos: cg.NumberPair): boolean {
  const asRed = board.redPov(s),
    bounds = s.dom.bounds(),
    radiusSq = Math.pow(bounds.width / 12, 2);
  for (const key of s.pieces.keys()) {
    const center = util.computeSquareCenter(key, asRed, bounds);
    if (util.distanceSq(center, pos) <= radiusSq) return true;
  }
  return false;
}

function processDrag(s: State): void {
  requestAnimationFrame(() => {
    const cur = s.draggable.current;
    if (!cur) return;
    if (s.combinedPiecePopup) {
      removeCombinedPiecePopup(s);
    }
    // cancel animations while dragging
    if (s.animation.current?.plan.anims.has(cur.orig)) s.animation.current = undefined;
    // if moving piece is gone, cancel
    const origPiece = s.pieces.get(cur.orig);
    if (!origPiece || !util.samePiece(origPiece, cur.piece)) cancel(s);
    else {
      if (!cur.started && util.distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2))
        cur.started = true;
      if (cur.started) {
        // support lazy elements
        if (typeof cur.element === 'function') {
          const found = cur.element();
          if (!found) return;
          found.cgDragging = true;
          found.classList.add('dragging');
          cur.element = found;
        }

        const bounds = s.dom.bounds();
        const fileWidth = bounds.width / 12;
        const rankHeight = bounds.height / 13;
        const pieceWidth = bounds.width / 12;
        const pieceHeight = bounds.height / 13;
        util.translate(cur.element, [
          cur.pos[0] - bounds.left - fileWidth / 2 - pieceWidth / 2, // Calculate the extra offset
          cur.pos[1] - bounds.top - rankHeight / 2 - pieceHeight / 2, // Calculate the extra offset
        ]);
        const keyAtCurrentPosition = board.getKeyAtDomPos(cur.pos, board.redPov(s), bounds);
        cur.keyHasChanged ||= cur.orig !== keyAtCurrentPosition;

        if (
          s.showAirDefenseInfluence &&
          cur.temporaryPos !== keyAtCurrentPosition &&
          isAirDefensePieceOrCarryingAirDefensePiece(cur.piece) &&
          keyAtCurrentPosition
        ) {
          console.log('updateAirDefenseInfluenceZones called processDrag');
          // Store the current position to avoid calling updateAirDefenseInfluenceZones multiple times
          cur.temporaryPos = keyAtCurrentPosition;
          updateAirDefenseInfluenceZones(s, cur.piece, 'friendly', keyAtCurrentPosition); // Pass keyAtCurrentPosition
          s.dom.redraw();
        }
      }
    }
    processDrag(s);
  });
}

export function move(s: State, e: cg.MouchEvent): void {
  // support one finger touch only
  if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
    s.draggable.current.pos = util.eventPosition(e)!;
  }
}

export function end(s: State, e: cg.MouchEvent): void {
  const cur = s.draggable.current;
  if (!cur) return;
  // create no corresponding mouse event
  if (e.type === 'touchend' && e.cancelable !== false) e.preventDefault();
  // comparing with the origin target is an easy way to test that the end event
  // has the same touch origin
  if (e.type === 'touchend' && cur.originTarget !== e.target && !cur.newPiece) {
    s.draggable.current = undefined;
    return;
  }

  // touchend has no position; so use the last touchmove position instead
  const eventPos = util.eventPosition(e) || cur.pos;
  const dest = board.getKeyAtDomPos(eventPos, board.redPov(s), s.dom.bounds());

  if (dest && cur.started && cur.orig !== dest) {
    // Handle piece from stack being dragged
    if (s.selectedPieceInfo?.isFromStack && cur.newPiece) {
      const { originalKey } = s.selectedPieceInfo;

      // Treat this as a move from the original position to the destination
      board.userMove(s, originalKey, dest);
      s.pieces.delete('11-12');
      // The userMove function in board.ts will handle removing the piece from the stack
      // and placing it at the destination, including captures and combinations
    } else if (cur.originalStackKey) {
      // Handle dragging whole stack
      board.userMove(s, cur.originalStackKey, dest);
      s.pieces.delete('11-12');
    } else if (cur.newPiece) {
      board.dropNewPiece(s, cur.orig, dest, cur.force);
    } else {
      s.stats.ctrlKey = e.ctrlKey;
      if (board.userMove(s, cur.orig, dest)) s.stats.dragged = true;
    }
  } else if (!dest && !cur.newPiece) {
    if (cur.originalStackKey) {
      s.pieces.delete('11-12');
    }
    // Reset the piece to original position
    if (typeof cur.element === 'function') {
      const found = cur.element();
      if (!found) return;
      found.cgDragging = true;
      found.classList.add('dragging');
      cur.element = found;
    }
    const origPos = util.posToTranslate(s.dom.bounds())(util.key2pos(cur.orig), board.redPov(s));
    util.translate(cur.element, origPos);
  } else if (cur.newPiece) {
    s.pieces.delete(cur.orig);
  } else if (s.draggable.deleteOnDropOff && !dest) {
    s.pieces.delete(cur.orig);
    board.callUserFunction(s.events.change);
  }

  if ((cur.orig === cur.previouslySelected || cur.keyHasChanged) && (cur.orig === dest || !dest))
    board.unselect(s);
  else if (!s.selectable.enabled) board.unselect(s);

  removeDragElements(s);

  if (
    s.draggable.current &&
    s.showAirDefenseInfluence &&
    isAirDefenseInfluenceZonePiece(s.draggable.current.piece)
  ) {
    s.highlight.custom.clear();
    s.dom.redraw();
  }

  s.draggable.current = undefined;
  s.dom.redraw();
}

export function cancel(s: State): void {
  const cur = s.draggable.current;
  if (cur) {
    if (cur.newPiece) s.pieces.delete(cur.orig);
    s.draggable.current = undefined;
    board.unselect(s);
    removeDragElements(s);
    s.dom.redraw();
  }
}

function removeDragElements(s: State): void {
  const e = s.dom.elements;
  if (e.ghost) util.setVisible(e.ghost, false);
}

function pieceElementByKey(s: State, key: cg.Key): cg.PieceNode | undefined {
  let el = s.dom.elements.board.firstChild;
  while (el) {
    if ((el as cg.KeyedNode).cgKey === key && (el as cg.KeyedNode).tagName === 'PIECE')
      return el as cg.PieceNode;
    el = el.nextSibling;
  }
  return;
}

export function unselect(state: HeadlessState): void {
  state.selected = undefined;
  state.hold.cancel();
}

export function callUserFunction<T extends (...args: any[]) => void>(
  f: T | undefined,
  ...args: Parameters<T>
): void {
  if (f) setTimeout(() => f(...args), 1);
}
