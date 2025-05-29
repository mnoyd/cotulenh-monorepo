import { HeadlessState } from './state';
import {
  allPos,
  computeSquareCenter,
  findDestInDests,
  flattenPiece,
  getPieceFromOrigMove,
  isPieceFromStack,
  opposite,
  origMoveToKey,
  pos2key,
} from './util.js';
import * as cg from './types.js';
import {
  AMBIGOUS_STACK_MOVE_STAY_PIECES_CANT_COMBINE,
  createCombineStackFromPieces,
  tryCombinePieces,
} from './combined-piece.js';
import { AMBIGOUS_CAPTURE_STAY_BACK } from './piece-attack';
import { PopUpType } from './popup/popup-factory';

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
    (state.movable.free || !!findDestInDests(state, orig, dest))
  );
};
export const canSelectStackPiece = (state: HeadlessState, orig: cg.OrigMove): boolean => {
  return (
    isMovable(state, orig) &&
    (state.movable.free ||
      (state.movable.dests && state.movable.dests.has(origMoveToKey(orig))) ||
      state.movable.dests === undefined)
  );
};

export function isMovable(state: HeadlessState, orig: cg.OrigMove): boolean {
  const piece = state.pieces.get(orig.square);

  // If stackPieceMoves is active, only allow moves from the stack key
  if (state.stackPieceMoves) {
    // Only allow moves from the original stack position
    return (
      !!piece &&
      orig.square === state.stackPieceMoves.key &&
      (state.movable.color === 'both' ||
        (state.movable.color === piece.color && state.turnColor === piece.color))
    );
  }

  // Normal move validation when stackPieceMoves is not active
  return (
    !!piece &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

interface MoveResult {
  piecesPrepared?: PreparedPiece;
  stackMove?: cg.StackMove;
  moveFinished: boolean;
}

export function baseMove(
  state: HeadlessState,
  orig: cg.OrigMove,
  dest: cg.DestMove,
): PreparedPiece | AmbigousMove | boolean {
  if (orig.square === dest.square) return false;

  const prepareResult = preparePieceThatChanges(state, orig, dest);
  if ('type' in prepareResult) {
    return prepareResult as AmbigousMove;
  }

  if (dest.square === state.selected?.square) unselect(state);
  callUserFunction(state.events.move, orig, dest);

  const { pieceAtDest, pieceAtOrig } = prepareResult.updatedPieces;

  if (pieceAtDest) state.pieces.set(dest.square, pieceAtDest);
  else state.pieces.delete(dest.square);
  if (pieceAtOrig) state.pieces.set(orig.square, pieceAtOrig);
  else state.pieces.delete(orig.square);

  callUserFunction(state.events.change);
  return prepareResult;
}

function baseUserMove(state: HeadlessState, orig: cg.OrigMove, dest: cg.DestMove): MoveResult | boolean {
  const piecesPrepared = baseMove(state, orig, dest);
  if (piecesPrepared && typeof piecesPrepared === 'object') {
    //Move not finished
    if ('type' in piecesPrepared) {
      //Ambiguous move
      state.ambigousMove = {
        type: piecesPrepared.type,
        destKey: dest.square,
        origKey: orig.square,
        pieceAtDest: piecesPrepared.originalPiece.originalDestPiece,
        pieceAtOrig: piecesPrepared.originalPiece.originalOrigPiece,
        pieceThatMoves: piecesPrepared.originalPiece.pieceThatMoves,
      };
      return { moveFinished: false };
    } else {
      if (piecesPrepared.updatedPieces.isStackMove || state.stackPieceMoves) {
        handleStackPieceMoves(state, piecesPrepared, orig, dest);
        const stackMove = deployStateToMove(state);
        unselect(state);
        if (
          stackMove.stay === undefined ||
          !flattenPiece(stackMove.stay).some(piece =>
            canSelectStackPiece(state, { square: stackMove.orig, type: piece.role }),
          )
        ) {
          return { piecesPrepared, stackMove, moveFinished: true } as MoveResult;
        }
        return { piecesPrepared, stackMove, moveFinished: false } as MoveResult;
      }
    }
    //Move finished
    return { piecesPrepared, moveFinished: true } as MoveResult;
  }
  return false;
}

export function userMove(state: HeadlessState, origMove: cg.OrigMove, destMove: cg.DestMove): boolean {
  if (!canMove(state, origMove, destMove)) {
    unselect(state);
    return false;
  }

  const result = baseUserMove(state, origMove, destMove) as MoveResult;

  if (result) {
    if (!result.moveFinished) {
      return true;
    }
    if (result.stackMove) {
      return endUserStackMove(state);
    } else {
      return endUserNormalMove(state, result, origMove, destMove);
    }
  }

  unselect(state);
  return false;
}

export function endUserNormalMove(
  state: HeadlessState,
  result: MoveResult,
  origMove: cg.OrigMove,
  destMove: cg.DestMove,
): boolean {
  const holdTime = state.hold.stop();
  unselect(state);
  if (!result.piecesPrepared) {
    throw new Error('piecesPrepared is undefined in endUserNormalMove');
  }
  const metadata: cg.MoveMetadata = {
    ctrlKey: state.stats.ctrlKey,
    holdTime,
    ...(result.piecesPrepared.updatedPieces.capture && {
      captured: flattenPiece(result.piecesPrepared.updatedPieces.pieceAtDest!),
    }),
  };
  callUserFunction(state.movable.events.after, origMove, destMove, metadata);

  state.lastMove = [origMove.square, destMove.square];
  cleanupAfterMove(state);
  return true;
}

export function endUserStackMove(state: HeadlessState): boolean {
  const holdTime = state.hold.stop();
  unselect(state);
  const stackMove = deployStateToMove(state);
  let captures: cg.Piece[] = stackMove.moves
    .map(move => move.capturedPiece!)
    .filter(capture => capture !== undefined) as cg.Piece[];
  const capturesFlatedout = captures.reduce<cg.Piece[]>((acc, piece) => [...acc, ...flattenPiece(piece)], []);
  const metadata: cg.MoveMetadata = {
    holdTime,
    captured: capturesFlatedout,
  };
  callUserFunction(state.movable.events.afterStackMove, stackMove, metadata);

  cleanupAfterMove(state);
  return true;
}

function cleanupAfterMove(state: HeadlessState) {
  state.stackPieceMoves = undefined;
  state.check = undefined;
  state.movable.dests = undefined;
  state.turnColor = opposite(state.turnColor);
  state.animation.current = undefined;
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

export function selectSquare(
  state: HeadlessState,
  selectedSquare: cg.Key,
  selectedPiece?: cg.Role,
  stackMove?: boolean,
  force?: boolean,
): void {
  const origMove = { square: selectedSquare, type: selectedPiece, stackMove } as cg.OrigMove;
  callUserFunction(state.events.select, origMove);

  if (state.selected) {
    // If a piece from a stack is selected and we're clicking on a destination
    if (isPieceFromStack(state, state.selected)) {
      if (userMove(state, state.selected, { square: selectedSquare } as cg.DestMove)) {
        state.stats.dragged = false;
        return;
      }
    }
    // If the same square is selected and it's not a draggable piece
    else if (state.selected.square === selectedSquare && !state.draggable.enabled) {
      unselect(state);
      state.hold.cancel();
      return;
    } else if ((state.selectable.enabled || force) && state.selected.square !== selectedSquare) {
      if (userMove(state, state.selected, { square: selectedSquare } as cg.DestMove)) {
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
    callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {});
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

function prepareOrigPiece(
  captureMoveStay: CaptureMoveStay,
  pieceThatMoves: cg.Piece,
  stayPiece?: cg.Piece,
): cg.Piece | undefined {
  if (captureMoveStay === true) {
    //If stay capture original square remain unchanged
    return pieceThatMoves;
  }
  if (stayPiece) {
    return stayPiece;
  }
  return undefined;
}

function prepareDestPiece(
  captureMoveStay: CaptureMoveStay,
  pieceThatMoves: cg.Piece,
  pieceAtDest: cg.Piece | undefined,
): { piece: cg.Piece | undefined; capturedPiece?: cg.Piece } {
  if (!pieceAtDest) {
    return { piece: pieceThatMoves };
  }
  //Piece at destination square exists
  if (captureMoveStay === true) {
    return { piece: undefined };
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

const NeedClarifyCaptureMoveStay = 'need_clarify' as const;
type CaptureMoveStay = boolean | undefined | typeof NeedClarifyCaptureMoveStay;

function isStayCaptureMove(
  requestOrig: cg.OrigMove,
  requestDest: cg.DestMove,
  availableDests: cg.Dests | undefined,
): CaptureMoveStay {
  if (availableDests) {
    const availableDestsForPiece = availableDests.get(origMoveToKey(requestOrig));
    if (availableDestsForPiece) {
      const dests = availableDestsForPiece.filter(dest => dest.square === requestDest.square);
      const removeDuplicateDest = dests.reduce((acc: cg.DestMove[], dest) => {
        if (!acc.some(d => d.square === dest.square && d.stay === dest.stay)) {
          acc.push(dest);
        }
        return acc;
      }, [] as cg.DestMove[]);
      //dests should contain at least one as have been checked by isMovable
      if (removeDuplicateDest.length > 1) {
        if (requestDest.stay === undefined) {
          return 'need_clarify';
        } else {
          return requestDest.stay;
        }
      } else {
        return !!removeDuplicateDest[0].stay;
      }
    }
  }
  //available moves have not been set. Move freely (always move capture)
  return undefined;
}
interface PiecesUpdated {
  pieceAtDest: cg.Piece | undefined;
  pieceAtOrig: cg.Piece | undefined;
  capture: boolean;
  captureMoveStay: CaptureMoveStay;
  isStackMove: boolean;
}
interface OriginalPiece {
  pieceThatMoves: cg.Piece;
  originalOrigPiece: cg.Piece;
  originalDestPiece: cg.Piece | undefined;
}
interface PreparedPiece {
  updatedPieces: PiecesUpdated;
  originalPiece: OriginalPiece;
}
interface AmbigousMove {
  type: PopUpType;
  originalPiece: OriginalPiece;
}

function preparePieceThatChanges(
  state: HeadlessState,
  orig: cg.OrigMove,
  dest: cg.DestMove,
): PreparedPiece | AmbigousMove {
  const dests = state.movable.dests;
  const pieceAtDestBeforeMove = state.pieces.get(dest.square);
  const captureMoveStay = pieceAtDestBeforeMove ? isStayCaptureMove(orig, dest, dests) : false;
  const { piece: pieceThatMoves, stackMove } = getPieceFromOrigMove(state, orig);
  if (!pieceThatMoves) {
    throw new Error('No piece that moves');
  }
  const originalOrigPiece = state.pieces.get(orig.square);
  const originalPiece = {
    pieceThatMoves: pieceThatMoves,
    originalOrigPiece: originalOrigPiece!,
    originalDestPiece: pieceAtDestBeforeMove,
  };
  if (captureMoveStay === NeedClarifyCaptureMoveStay) {
    return {
      type: AMBIGOUS_CAPTURE_STAY_BACK,
      originalPiece,
    };
  }
  if (Array.isArray(stackMove?.stayPiece)) {
    return {
      type: AMBIGOUS_STACK_MOVE_STAY_PIECES_CANT_COMBINE,
      originalPiece,
    };
  }
  const preparedOrigPiece = prepareOrigPiece(captureMoveStay, pieceThatMoves, stackMove?.stayPiece);

  const { piece: preparedDestPiece, capturedPiece } = prepareDestPiece(
    captureMoveStay,
    pieceThatMoves,
    pieceAtDestBeforeMove,
  );
  return {
    updatedPieces: {
      pieceAtDest: preparedDestPiece,
      pieceAtOrig: preparedOrigPiece,
      capture: !!capturedPiece,
      captureMoveStay,
      isStackMove: !!stackMove,
    },
    originalPiece,
  };
}

function handleStackPieceMoves(
  state: HeadlessState,
  piecesPrepared: PreparedPiece,
  origMove: cg.OrigMove,
  destMove: cg.DestMove,
): void {
  const movedPieces = flattenPiece(piecesPrepared.originalPiece.pieceThatMoves!);
  if (!state.stackPieceMoves) {
    state.stackPieceMoves = {
      key: origMove.square,
      originalPiece: piecesPrepared.originalPiece.originalOrigPiece,
      moves: movedPieces.map(p => ({
        newSquare: destMove.square,
        ...(piecesPrepared.updatedPieces.capture && {
          capturedPiece: piecesPrepared.originalPiece.originalDestPiece,
        }),
        piece: p,
      })),
    };
  } else {
    state.stackPieceMoves.moves.push(
      ...movedPieces.map(p => ({
        newSquare: destMove.square,
        ...(piecesPrepared.updatedPieces.capture && {
          capturedPiece: piecesPrepared.originalPiece.originalDestPiece,
        }),
        piece: p,
      })),
    );
  }
  const originalPiece = state.stackPieceMoves.originalPiece;
  const allPieces = flattenPiece(originalPiece);
  const remainingPieces = allPieces.filter(
    p => !state.stackPieceMoves?.moves.some(m => m.piece.role === p.role),
  );
  const dests = state.movable.dests;
  if (dests) {
    const keys = remainingPieces.map(piece =>
      origMoveToKey({
        square: origMove.square,
        type: piece.role,
      }),
    );
    const newDest = new Map();
    keys.forEach(key => {
      const dest = dests.get(key);
      if (dest) {
        newDest.set(
          key,
          dest.filter(d => !state.stackPieceMoves?.moves.some(m => m.newSquare === d.square)),
        );
      }
    });
    remainingPieces.forEach(carriedPiece => {
      state.stackPieceMoves?.moves.forEach(m => {
        const combined = tryCombinePieces(m.piece, carriedPiece);
        if (combined && combined.role === m.piece.role) {
          const k = origMoveToKey({
            square: state.stackPieceMoves!.key,
            type: carriedPiece.role,
          });
          const dest = newDest.get(k)?.some((d: cg.DestMove) => d.square === m.newSquare);
          if (!dest) {
            newDest.get(k)?.push({
              square: m.newSquare,
              stay: false,
            });
          }
        }
      });
    });
    state.movable.dests = newDest;
    state.lastMove = [state.stackPieceMoves!.key, ...state.stackPieceMoves.moves.map(m => m.newSquare)];
  }
}

function deployStateToMove(s: HeadlessState): cg.StackMove {
  const deployState = s.stackPieceMoves;
  if (!deployState) {
    throw new Error('No deploy state');
  }
  const originalPiece = deployState.originalPiece;
  let remainingPieces = flattenPiece(originalPiece);
  const destsMap = new Map<cg.Key, { piece: cg.Piece[]; capturedPiece?: cg.Piece }>();
  deployState.moves.forEach(m => {
    const piece = m.piece;
    const key = m.newSquare;
    remainingPieces = remainingPieces.filter(p => p.role !== piece.role);
    if (destsMap.has(key)) {
      const value = destsMap.get(key)!;
      value.piece.push(piece);
      if (m.capturedPiece) {
        value.capturedPiece = m.capturedPiece;
      }
    } else {
      destsMap.set(key, { piece: [piece], capturedPiece: m.capturedPiece });
    }
  });
  const moves: cg.SingleMove[] = [];
  destsMap.forEach((value, key) => {
    const { combined, uncombined } = createCombineStackFromPieces([...value.piece]);
    if (combined == null && uncombined != null)
      throw new Error('the piece is not suitable to stay in one square');
    moves.push({
      piece: combined!,
      dest: key,
      ...(value.capturedPiece && { capturedPiece: value.capturedPiece }),
    });
  });
  const { combined: stayPiece, uncombined } = createCombineStackFromPieces([...remainingPieces]);
  if (stayPiece == null && uncombined != null)
    throw new Error('the piece is not suitable to stay in one square');
  return {
    moves,
    orig: deployState.key,
    stay: stayPiece!,
  };
}
