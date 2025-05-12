import { State } from './state.js';
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
import { TEMP_KEY } from './types.js';

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
  fromStack?: boolean;
}

export function start(s: State, e: cg.MouchEvent): void {
  if (!(s.trustAllEvents || e.isTrusted)) return; // only trust when trustAllEvents is enabled
  if (e.buttons !== undefined && e.buttons > 1) return; // only touch or left click
  if (e.touches && e.touches.length > 1) return; // support one finger touch only

  const position = util.eventPosition(e)!;

  // Handle popup interaction if active popup exists
  if (handlePopupInteraction(s, e, position)) {
    return; // Return if popup interaction was handled
  }

  const bounds = s.dom.bounds(),
    keyAtPosition = board.getKeyAtDomPos(position, board.redPov(s), bounds);
  if (!keyAtPosition) return;
  const piece = s.pieces.get(keyAtPosition);

  // Handle combined piece click: Show popup only if no piece is currently selected
  if (
    !s.selected &&
    piece &&
    piece.carrying &&
    piece.carrying.length > 0 &&
    board.isMovable(s, { square: keyAtPosition } as cg.OrigMove)
  ) {
    showCombinedPiecePopup(s, keyAtPosition, piece, position);
    return;
  }

  const previouslySelected = s.selected?.square;
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
  if (s.selected && board.canMove(s, s.selected, { square: keyAtPosition } as cg.DestMove)) {
    anim(state => board.selectSquare(state, keyAtPosition, piece?.role), s);
  } else {
    board.selectSquare(s, keyAtPosition, piece?.role);
  }
  const stillSelected = s.selected?.square === keyAtPosition;
  const element = pieceElementByKey(s, keyAtPosition);
  if (piece && element && stillSelected && board.isDraggable(s, keyAtPosition)) {
    s.draggable.current = {
      orig: keyAtPosition,
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
      util.translate(ghost, util.posToTranslate(bounds)(util.key2pos(keyAtPosition), board.redPov(s)));
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

/**
 * Handles interaction with combined piece popup
 * @param s Game state
 * @param e Mouse/touch event
 * @param position Event position
 * @returns True if popup interaction was handled
 */
function handlePopupInteraction(s: State, e: cg.MouchEvent, position: cg.NumberPair): boolean {
  const { inPopup, pieceIndex, isButton, isStayingPiece } = isPositionInPopup(s, position);

  // No popup or not interacting with popup
  if (!inPopup) {
    // If we have an active popup but clicked outside, remove it
    if (s.combinedPiecePopup) {
      removeCombinedPiecePopup(s);
    }
    return false;
  }

  // We're interacting with a popup
  e.preventDefault();
  if (!s.combinedPiecePopup) return false;
  const { key, piece } = s.combinedPiecePopup;

  // Initialize deployState if it doesn't exist
  if (!s.deployState) {
    s.deployState = new Map<cg.Key, cg.Piece[]>();
  }

  // Handle stay button click
  if (isButton && pieceIndex !== undefined) {
    // Get current staying pieces for this key
    const stayingPieces = s.deployState.get(key) || [];

    // Determine which piece to mark as staying
    let pieceToStay: cg.Piece;
    if (pieceIndex === -1) {
      // Carrier piece
      pieceToStay = piece;
    } else {
      // Carried piece
      pieceToStay = piece.carrying![pieceIndex];
    }

    // Add piece to staying pieces if not already there
    if (!stayingPieces.some(p => p.role === pieceToStay.role && p.color === pieceToStay.color)) {
      stayingPieces.push(pieceToStay);
      s.deployState.set(key, stayingPieces);
    }

    // Redraw the popup to reflect changes
    removeCombinedPiecePopup(s);
    showCombinedPiecePopup(s, key, piece, position);
    return true;
  }

  // Handle clicking on a staying piece (to unmark it)
  if (isStayingPiece && pieceIndex !== undefined) {
    // Get current staying pieces for this key
    const stayingPieces = s.deployState.get(key) || [];

    // Determine which piece to unmark
    let pieceToUnmark: cg.Piece;
    if (pieceIndex === -1) {
      // Carrier piece
      pieceToUnmark = piece;
    } else {
      // Carried piece
      pieceToUnmark = piece.carrying![pieceIndex];
    }

    // Remove piece from staying pieces
    const updatedStayingPieces = stayingPieces.filter(
      p => p.role !== pieceToUnmark.role || p.color !== pieceToUnmark.color,
    );

    // Update state
    if (updatedStayingPieces.length === 0) {
      s.deployState.delete(key);
    } else {
      s.deployState.set(key, updatedStayingPieces);
    }

    // Redraw the popup to reflect changes
    removeCombinedPiecePopup(s);
    showCombinedPiecePopup(s, key, piece, position);
    return true;
  }

  // Handle regular piece interaction (not staying pieces)
  if (!isStayingPiece) {
    if (pieceIndex === -1) {
      // Carrier piece clicked - select the entire stack
      board.selectSquare(s, key, piece.role);
      const previouslySelected = s.selected?.square;
      const element = pieceElementByKey(s, key) as cg.PieceNode;
      s.draggable.current = {
        fromStack: true,
        orig: key,
        piece,
        origPos: position,
        pos: position,
        started: false,
        element,
        previouslySelected,
        originTarget: e.target,
        keyHasChanged: false,
      };
      element.cgDragging = true;
      element.classList.add('dragging');
      processDrag(s);

      // Clean up and redraw
      removeCombinedPiecePopup(s);
      s.dom.redraw();
      return true;
    } else if (pieceIndex !== undefined) {
      // Carried piece clicked - select the specific piece from the stack
      board.selectSquare(s, key, piece.carrying![pieceIndex].role);

      // Create temporary piece for dragging
      const selectedPiece = piece.carrying![pieceIndex];
      const tempKey = TEMP_KEY;
      s.pieces.set(tempKey, selectedPiece);
      s.dom.redraw();

      // Initialize drag
      s.draggable.current = {
        orig: tempKey,
        piece: selectedPiece,
        origPos: position,
        pos: position,
        started: false,
        element: () => pieceElementByKey(s, tempKey),
        originTarget: e.target,
        newPiece: true,
        keyHasChanged: false,
      };
      processDrag(s);

      // Clean up and redraw
      removeCombinedPiecePopup(s);
      s.dom.redraw();
      return true;
    }
  }

  return true;
}

function processDrag(s: State): void {
  requestAnimationFrame(() => {
    const cur = s.draggable.current;
    if (!cur) return;

    // cancel animations while dragging
    if (s.animation.current?.plan.anims.has(cur.orig)) s.animation.current = undefined;
    // if moving piece is gone, cancel
    const origPiece = s.pieces.get(cur.orig);
    if (!origPiece || !util.samePiece(origPiece, cur.piece)) cancel(s);
    else {
      if (!cur.started && util.distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2)) {
        cur.started = true;
      }
      if (cur.started) {
        // Remove any active popup during drag
        if (s.combinedPiecePopup) {
          removeCombinedPiecePopup(s);
        }
        // support lazy elements
        if (typeof cur.element === 'function') {
          const found = cur.element();
          if (!found) return;
          found.cgDragging = true;
          found.classList.add('dragging');
          cur.element = found;
        }
        if (!util.isVisible(cur.element)) {
          util.setVisible(cur.element, true);
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

/**
 * Cleans up popup-related state
 * @param s Game state
 */
function cleanupPopupState(s: State): void {
  s.draggable.current = undefined;
  s.pieces.delete(TEMP_KEY);
  s.dom.redraw();
}

export function end(s: State, e: cg.MouchEvent): void {
  console.log('end', e);
  const cur = s.draggable.current;
  if (!cur) return;

  // Handle touch event specifics
  if (e.type === 'touchend' && e.cancelable !== false) e.preventDefault();
  if (e.type === 'touchend' && cur.originTarget !== e.target && !cur.newPiece) {
    s.draggable.current = undefined;
    return;
  }

  // Get position (touchend has no position; use the last touchmove position)
  const eventPos = util.eventPosition(e) || cur.pos;

  // Check if cursor is still within popup
  const { inPopup } = isPositionInPopup(s, eventPos);
  if (inPopup) {
    cleanupPopupState(s);
    util.translate(
      cur.element as cg.PieceNode,
      util.posToTranslate(s.dom.bounds())(util.key2pos(cur.orig), board.redPov(s)),
    );
    finalizeDrag(s);
    return;
  }

  const keyAtCurrentPosition = board.getKeyAtDomPos(eventPos, board.redPov(s), s.dom.bounds());

  // Check if this was a click in a combined piece popup that shouldn't trigger a move
  const isPopupPieceSelection =
    s.selected && util.isPieceFromStack(s, s.selected) && cur.newPiece && !cur.started;

  if (keyAtCurrentPosition && cur.started && cur.orig !== keyAtCurrentPosition && !isPopupPieceSelection) {
    // Handle different types of moves based on piece origin
    handlePieceMove(s, e, cur, keyAtCurrentPosition);
  } else if (!keyAtCurrentPosition && !cur.newPiece) {
    // Handle case when piece is dropped off board or returned to original position
    handlePieceReturn(s, cur);
  } else if (cur.newPiece) {
    s.pieces.delete(cur.orig);
  } else if (s.draggable.deleteOnDropOff && !keyAtCurrentPosition) {
    s.pieces.delete(cur.orig);
    board.callUserFunction(s.events.change);
  }

  // Handle selection state
  if (
    (cur.orig === cur.previouslySelected || cur.keyHasChanged) &&
    (cur.orig === keyAtCurrentPosition || !keyAtCurrentPosition)
  )
    board.unselect(s);
  else if (!s.selectable.enabled) board.unselect(s);

  // Clean up drag elements and state
  finalizeDrag(s);
}

/**
 * Handles moving a piece to a destination
 */
function handlePieceMove(s: State, e: cg.MouchEvent, cur: DragCurrent, dest: cg.Key): void {
  console.log('handlePieceMove', e, cur, dest);
  // Handle piece from stack being dragged
  if (s.selected && util.isPieceFromStack(s, s.selected) && cur.newPiece) {
    // Treat this as a move from the original position to the destination
    board.userMove(s, s.selected, { square: dest } as cg.DestMove);
    s.pieces.delete(TEMP_KEY);
  } else if (cur.fromStack) {
    // Handle dragging whole stack
    board.userMove(
      s,
      { square: cur.orig, type: cur.piece.role } as cg.OrigMove,
      { square: dest } as cg.DestMove,
    );
    s.pieces.delete(TEMP_KEY);
  } else if (cur.newPiece) {
    board.dropNewPiece(s, cur.orig, dest, cur.force);
  } else {
    s.stats.ctrlKey = e.ctrlKey;
    if (
      board.userMove(
        s,
        { square: cur.orig, type: cur.piece.role } as cg.OrigMove,
        { square: dest } as cg.DestMove,
      )
    )
      s.stats.dragged = true;
  }
}

/**
 * Handles returning a piece to its original position
 */
function handlePieceReturn(s: State, cur: DragCurrent): void {
  if (cur.fromStack) {
    s.pieces.delete(TEMP_KEY);
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
}

/**
 * Finalizes drag operation by cleaning up elements and state
 */
function finalizeDrag(s: State): void {
  removeDragElements(s);

  if (
    s.draggable.current &&
    s.showAirDefenseInfluence &&
    isAirDefenseInfluenceZonePiece(s.draggable.current.piece)
  ) {
    s.highlight.custom.clear();
  }

  s.draggable.current = undefined;
  s.dom.redraw();
}

export function cancel(s: State): void {
  const cur = s.draggable.current;
  if (cur) {
    if (cur.newPiece) s.pieces.delete(cur.orig);
    board.unselect(s);
    finalizeDrag(s);
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

export function dragNewPiece(s: State, piece: cg.Piece, e: cg.MouchEvent, force?: boolean): void {
  const key: cg.Key = '0.0';
  s.pieces.set(key, piece);
  s.dom.redraw();

  const position = util.eventPosition(e)!;

  s.draggable.current = {
    orig: key,
    piece,
    origPos: position,
    pos: position,
    started: true,
    element: () => pieceElementByKey(s, key),
    originTarget: e.target,
    newPiece: true,
    force: !!force,
    keyHasChanged: false,
  };
  processDrag(s);
}
