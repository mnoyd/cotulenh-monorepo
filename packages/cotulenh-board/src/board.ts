import { HeadlessState } from './state';
import { allPos, computeSquareCenter, opposite, pos2key } from './util.js';
import * as cg from './types.js';
import { tryCombinePieces } from './combined-piece.js'; // Import

export function toggleOrientation(state: HeadlessState): void {
  state.orientation = opposite(state.orientation);
}
export function callUserFunction<T extends (...args: any[]) => void>(
  f: T | undefined,
  ...args: Parameters<T>
): void {
  if (f) setTimeout(() => f(...args), 1);
}
export function setCheck(state: HeadlessState, color: cg.Color | boolean): void {
  state.check = undefined;
  if (color === true) color = state.turnColor;
  if (color)
    for (const [k, p] of state.pieces) {
      //TODO: Should hight light check for both navy and air_force as well
      if (p.role === 'commander' && p.color === color) {
        state.check = k;
      }
    }
}

export function setSelected(state: HeadlessState, key: cg.Key): void {
  state.selected = key;
}

export function unselect(state: HeadlessState): void {
  state.selected = undefined;
  state.hold.cancel();
}

export const canMove = (state: HeadlessState, orig: cg.Key, dest: cg.Key): boolean => {
  // If moving from a stack, use the original key for validation
  if (state.selectedPieceInfo?.isFromStack) {
    return (
      orig === state.selectedPieceInfo.originalKey &&
      isMovable(state, orig) &&
      (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest))
    );
  }

  return (
    orig !== dest &&
    isMovable(state, orig) &&
    (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest))
  );
};

function isMovable(state: HeadlessState, orig: cg.Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}
export function baseMove(state: HeadlessState, orig: cg.Key, dest: cg.Key): cg.Piece | boolean {
  const origPiece = state.pieces.get(orig);
  const destPiece = state.pieces.get(dest);

  if (orig === dest || !origPiece) return false;

  // Handle moving a piece from a stack (either by selection or drag)
  if (state.selectedPieceInfo?.isFromStack) {
    const { originalKey, originalPiece, carriedPieceIndex } = state.selectedPieceInfo;
    const carriedPiece = originalPiece.carrying![carriedPieceIndex];

    // If destination has a piece, check for capture or combination
    if (destPiece) {
      if (destPiece.color === carriedPiece.color) {
        // Try to combine the carried piece with destination piece
        const combined = tryCombinePieces(carriedPiece, destPiece);
        if (combined) {
          state.pieces.set(dest, combined);
        } else {
          return false;
        }
      } else if (isMovable(state, orig)) {
        // Handle capture
        state.pieces.set(dest, carriedPiece);
      } else {
        return false;
      }
    } else {
      // Moving to empty square
      state.pieces.set(dest, carriedPiece);
    }

    // Update the original stack
    const newCarrying = [...originalPiece.carrying!];
    newCarrying.splice(carriedPieceIndex, 1);

    const updatedOriginalPiece = {
      ...originalPiece,
      carrying: newCarrying.length > 0 ? newCarrying : undefined,
    };
    state.pieces.set(originalKey, updatedOriginalPiece);

    // Update state
    state.lastMove = [originalKey, dest];
    state.check = undefined;
    state.selectedPieceInfo = undefined;

    callUserFunction(state.events.move, originalKey, dest, destPiece);
    callUserFunction(state.events.change);
    return destPiece || true;
  }

  // Regular piece move handling
  // 1. Check for Same Color and Combination
  if (destPiece && destPiece.color === origPiece.color) {
    // Attempt to combine using tryCombinePieces
    const combined = tryCombinePieces(origPiece, destPiece);
    if (combined) {
      state.pieces.set(dest, combined);
      state.pieces.delete(orig);
      state.lastMove = [orig, dest];
      state.check = undefined;
      callUserFunction(state.events.move, orig, dest, undefined); // No capture
      callUserFunction(state.events.change);
      return true;
    }
  }

  // ... (rest of baseMove - capture and normal move logic) ...
  const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
  if (dest === state.selected) unselect(state);
  callUserFunction(state.events.move, orig, dest, captured);

  state.pieces.set(dest, origPiece);
  state.pieces.delete(orig);

  state.lastMove = [orig, dest];
  state.check = undefined;
  callUserFunction(state.events.change);
  return captured || true;
}

function baseUserMove(state: HeadlessState, orig: cg.Key, dest: cg.Key): cg.Piece | boolean {
  const result = baseMove(state, orig, dest);
  if (result) {
    state.movable.dests = undefined;
    state.turnColor = opposite(state.turnColor);
    state.animation.current = undefined;
  }
  return result;
}
export function userMove(state: HeadlessState, orig: cg.Key, dest: cg.Key): boolean {
  // Special handling for stack piece moves
  if (state.selectedPieceInfo?.isFromStack && orig === state.selectedPieceInfo.originalKey) {
    if (canMove(state, orig, dest)) {
      const result = baseMove(state, orig, dest);
      if (result) {
        const holdTime = state.hold.stop();
        unselect(state);
        const metadata: cg.MoveMetadata = {
          premove: false,
          ctrlKey: state.stats.ctrlKey,
          holdTime,
        };
        if (result !== true) metadata.captured = result;
        callUserFunction(state.movable.events.after, orig, dest, metadata);
        return true;
      }
    }
    unselect(state);
    return false;
  }

  // Regular piece move handling
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const holdTime = state.hold.stop();
      unselect(state);
      const metadata: cg.MoveMetadata = {
        premove: false,
        ctrlKey: state.stats.ctrlKey,
        holdTime,
      };
      if (result !== true) metadata.captured = result;
      callUserFunction(state.movable.events.after, orig, dest, metadata);
      return true;
    }
  }
  unselect(state);
  return false;
}

export function cancelMove(state: HeadlessState): void {
  unselect(state);
}

export function getKeyAtDomPos(
  pos: cg.NumberPair,
  asRed: boolean,
  bounds: DOMRectReadOnly,
): cg.Key | undefined {
  // Calculate the file (x-coordinate)
  const boardWidth = bounds.width;
  const fileWidth = boardWidth / 12; // 12 total lines, including decorative ones
  let file = Math.round((pos[0] - bounds.left) / fileWidth) - 1;

  // Calculate the rank (y-coordinate)
  const boardHeight = bounds.height;
  const rankHeight = boardHeight / 13; // 13 total lines, including decorative ones
  let rank = 11 - Math.round((pos[1] - bounds.top) / rankHeight) + 1;

  // Adjust for red perspective
  if (!asRed) {
    file = 10 - file;
    rank = 11 - rank;
  }

  // Check if it is inside the valid range
  if (file < 0 || file > 10 || rank < 0 || rank > 11) return undefined;

  return `${file}-${rank}`;
}

export const redPov = (s: HeadlessState): boolean => s.orientation === 'red';

export function getSnappedKeyAtDomPos(
  // orig: cg.Key,
  pos: cg.NumberPair,
  asRed: boolean,
  bounds: DOMRectReadOnly,
): cg.Key | undefined {
  const validSnapPos = allPos;
  const validSnapCenters = validSnapPos.map(pos2 => computeSquareCenter(pos2key(pos2), asRed, bounds));
  const validSnapDistances = validSnapCenters.map(pos2 => distanceSq(pos, pos2));
  const [, closestSnapIndex] = validSnapDistances.reduce(
    (a, b, index) => (a[0] < b ? a : [b, index]),
    [validSnapDistances[0], 0],
  );
  return pos2key(validSnapPos[closestSnapIndex]);
}

export const distanceSq = (pos1: cg.Pos, pos2: cg.Pos): number => {
  const dx = pos1[0] - pos2[0],
    dy = pos1[1] - pos2[1];
  return dx * dx + dy * dy;
};

export function selectSquare(state: HeadlessState, key: cg.Key, force?: boolean): void {
  callUserFunction(state.events.select, key);

  if (state.selected) {
    // If a piece from a stack is selected and we're clicking on a destination
    if (state.selectedPieceInfo?.isFromStack && state.selected === state.selectedPieceInfo.originalKey) {
      if (userMove(state, state.selected, key)) {
        state.stats.dragged = false;
        return;
      }
    }
    // If the same square is selected and it's not a draggable piece
    else if (state.selected === key && !state.draggable.enabled) {
      unselect(state);
      state.hold.cancel();
      return;
    } else if ((state.selectable.enabled || force) && state.selected !== key) {
      if (userMove(state, state.selected, key)) {
        state.stats.dragged = false;
        return;
      }
    }
  }

  // Handle new selection
  if ((state.selectable.enabled || state.draggable.enabled) && isMovable(state, key)) {
    setSelected(state, key);
    state.hold.start();
  }
}

export function isDraggable(state: HeadlessState, orig: cg.Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    state.draggable.enabled &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

export function dropNewPiece(state: HeadlessState, orig: cg.Key, dest: cg.Key, force?: boolean): void {
  const piece = state.pieces.get(orig);
  if (piece && (canDrop(state, orig, dest) || force)) {
    state.pieces.delete(orig);
    baseNewPiece(state, piece, dest, force);
    callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
      premove: false,
      predrop: false,
    });
  }
  state.pieces.delete(orig);
  unselect(state);
}

function canDrop(state: HeadlessState, orig: cg.Key, dest: cg.Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (orig === dest || !state.pieces.has(dest)) &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

export function baseNewPiece(state: HeadlessState, piece: cg.Piece, key: cg.Key, force?: boolean): boolean {
  if (state.pieces.has(key)) {
    if (force) state.pieces.delete(key);
    else return false;
  }
  callUserFunction(state.events.dropNewPiece, piece, key);
  state.pieces.set(key, piece);
  state.lastMove = [key];
  state.check = undefined;
  callUserFunction(state.events.change);
  state.movable.dests = undefined;
  state.turnColor = opposite(state.turnColor);
  return true;
}
