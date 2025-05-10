import { HeadlessState } from './state';
import {
  allPos,
  computeSquareCenter,
  getPieceFromOrigMove,
  opposite,
  origMoveToKey,
  pos2key,
} from './util.js';
import * as cg from './types.js';
import { tryCombinePieces } from './combined-piece.js';

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

export function setSelected(state: HeadlessState, origMove: cg.OrigMove): void {
  state.selected = origMove;
}

export function unselect(state: HeadlessState): void {
  state.selected = undefined;
  state.hold.cancel();
}

export const canMove = (state: HeadlessState, orig: cg.OrigMove, dest: cg.DestMove): boolean => {
  // If moving from a stack, use the original key for validation
  return (
    orig.square !== dest.square &&
    isMovable(state, orig) &&
    (state.movable.free || !!state.movable.dests?.get(origMoveToKey(orig))?.includes(dest))
  );
};

export function isMovable(state: HeadlessState, orig: cg.OrigMove): boolean {
  const piece = state.pieces.get(orig.square);
  return (
    !!piece &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

interface MoveResult {
  pieceType: cg.Role;
  deployed?: boolean;
  capturedPiece?: cg.Piece;
}

export function baseMove(state: HeadlessState, orig: cg.OrigMove, dest: cg.DestMove): MoveResult | boolean {
  if (orig.square === dest.square) return false;

  const { piece: pieceThatMoves, carrier } = getPieceFromOrigMove(state, orig);
  if (!pieceThatMoves) return false;
  const pieceAtDest = state.pieces.get(dest.square);
  const { piece: preparedDestPiece, capturedPiece } = prepareDestPiece(pieceThatMoves, pieceAtDest);
  const { piece: preparedOrigPiece, deployed } = prepareOrigPiece(pieceThatMoves, carrier);

  if (dest.square === state.selected?.square) unselect(state);
  callUserFunction(state.events.move, orig, dest);

  if (preparedDestPiece) state.pieces.set(dest.square, preparedDestPiece);
  else state.pieces.delete(dest.square);
  if (preparedOrigPiece) state.pieces.set(orig.square, preparedOrigPiece);
  else state.pieces.delete(orig.square);

  state.lastMove = [orig.square, dest.square];
  state.check = undefined;
  callUserFunction(state.events.change);
  return {
    pieceType: pieceThatMoves.role,
    deployed,
    capturedPiece,
  };
}

function baseUserMove(state: HeadlessState, orig: cg.OrigMove, dest: cg.DestMove): MoveResult | boolean {
  const result = baseMove(state, orig, dest) as MoveResult;
  if (result) {
    state.movable.dests = undefined;
    state.turnColor = result.deployed ? state.turnColor : opposite(state.turnColor);
    state.animation.current = undefined;
  }
  return result;
}

export function userMove(state: HeadlessState, origMove: cg.OrigMove, destMove: cg.DestMove): boolean {
  if (!canMove(state, origMove, destMove)) {
    unselect(state);
    return false;
  }

  const result = baseUserMove(state, origMove, destMove) as MoveResult;

  if (result) {
    const holdTime = state.hold.stop();
    unselect(state);
    const metadata: cg.MoveMetadata = {
      premove: false,
      ctrlKey: state.stats.ctrlKey,
      holdTime,
      ...(result.capturedPiece && { captured: result.capturedPiece }),
    };
    callUserFunction(state.movable.events.after, origMove, destMove, metadata);
    return true;
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

  return pos2key([file, rank]);
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

export function selectSquare(state: HeadlessState, origMove: cg.OrigMove, force?: boolean): void {
  callUserFunction(state.events.select, origMove);

  if (state.selected) {
    // If a piece from a stack is selected and we're clicking on a destination
    if (getPieceFromOrigMove(state, state.selected).carrier !== undefined) {
      if (userMove(state, state.selected, { square: origMove.square } as cg.DestMove)) {
        state.stats.dragged = false;
        return;
      }
    }
    // If the same square is selected and it's not a draggable piece
    else if (state.selected === origMove && !state.draggable.enabled) {
      unselect(state);
      state.hold.cancel();
      return;
    } else if ((state.selectable.enabled || force) && state.selected !== origMove) {
      if (userMove(state, state.selected, { square: origMove.square } as cg.DestMove)) {
        state.stats.dragged = false;
        return;
      }
    }
  }

  // Handle new selection
  if ((state.selectable.enabled || state.draggable.enabled) && isMovable(state, origMove)) {
    setSelected(state, origMove);
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

export function setPieces(state: HeadlessState, pieces: cg.PiecesDiff): void {
  for (const [key, piece] of pieces) {
    if (piece) state.pieces.set(key, piece);
    else state.pieces.delete(key);
  }
}

export function stop(state: HeadlessState): void {
  state.movable.color = state.movable.dests = state.animation.current = undefined;
  cancelMove(state);
}

function prepareDestPiece(
  pieceThatMoves: cg.Piece,
  pieceAtDest: cg.Piece | undefined,
): { piece: cg.Piece | undefined; capturedPiece?: cg.Piece } {
  if (!pieceAtDest) {
    return { piece: pieceThatMoves };
  }
  if (pieceAtDest.color === pieceThatMoves.color) {
    const combinedPiece = tryCombinePieces(pieceThatMoves, pieceAtDest);
    if (!combinedPiece) {
      return { piece: pieceThatMoves };
    }
    return { piece: combinedPiece };
  }
  if (pieceAtDest.color !== pieceThatMoves.color) {
    return { piece: pieceThatMoves, capturedPiece: pieceAtDest };
  }
  return { piece: undefined };
}

function prepareOrigPiece(
  pieceThatMoves: cg.Piece,
  carrier?: cg.Piece,
): { piece: cg.Piece | undefined; deployed?: boolean } {
  if (carrier) {
    const newCarrying = [...carrier.carrying!];
    newCarrying.splice(newCarrying.indexOf(pieceThatMoves), 1);
    const updatedCarrier = {
      ...carrier,
      carrying: newCarrying.length > 0 ? newCarrying : undefined,
    };
    return { piece: updatedCarrier, deployed: true };
  }
  return { piece: undefined };
}
