import { createCombineStackFromPieces } from './combined-piece.js';
import { HeadlessState } from './state.js';
import * as cg from './types.js';

export const createEl = (tagName: string, className?: string): HTMLElement => {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  return el;
};
export const translate = (el: HTMLElement, pos: cg.NumberPair): void => {
  el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
};

export const posToTranslate =
  (bounds: DOMRectReadOnly): ((pos: cg.Pos, asRed: boolean) => cg.NumberPair) =>
  (pos, asRed) => [
    ((asRed ? pos[0] : 10 - pos[0]) * bounds.width) / 12 + bounds.width / 24,
    ((asRed ? 11 - pos[1] : pos[1]) * bounds.height) / 13 + bounds.height / 26,
  ];

export function memo<A>(f: () => A): cg.Memo<A> {
  let v: A | undefined;
  const ret = (): A => {
    if (v === undefined) v = f();
    return v;
  };
  ret.clear = () => {
    v = undefined;
  };
  return ret;
}
export const opposite = (c: cg.Color): cg.Color => (c === 'red' ? 'blue' : 'red');

// export const allKeys: readonly cg.Key[] = (() => {
//   let allKeys: cg.Key[] = [];
//   for (let i = 0; i < 10; i++) {
//     for (let j = 0; j < 11; j++) {
//       allKeys.push(`${i}.${j}`);
//     }
//   }
//   return allKeys;
// })();

export const samePiece = (p1: cg.Piece, p2: cg.Piece): boolean =>
  p1.role === p2.role && p1.color === p2.color;

export const distanceSq = (pos1: cg.Pos, pos2: cg.Pos): number => {
  const dx = pos1[0] - pos2[0],
    dy = pos1[1] - pos2[1];
  return dx * dx + dy * dy;
};

export const eventPosition = (e: cg.MouchEvent): cg.NumberPair | undefined => {
  if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY!];
  if (e.targetTouches?.[0]) return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  return; // touchend has no position!
};

// export const key2pos = (k: cg.Key): cg.Pos => k.split('.').map(Number) as cg.Pos;
// export const pos2key = (pos: cg.Pos): cg.Key => `${pos[0]}.${pos[1]}`;
export const allKeys: readonly cg.Key[] = Array.prototype.concat(
  ...cg.files.map(c => cg.ranks.map(r => c + r)),
);

export const pos2key = (pos: cg.Pos): cg.Key => allKeys[12 * pos[0] + pos[1]];

export const key2pos = (k: cg.Key): cg.Pos => [k.charCodeAt(0) - 97, Number(k.substring(1)) - 1];

export const isRightButton = (e: cg.MouchEvent): boolean => e.button === 2;
export const allPos: readonly cg.Pos[] = allKeys.map(key2pos);

export function computeSquareCenter(key: cg.Key, asRed: boolean, bounds: DOMRectReadOnly): cg.NumberPair {
  const pos = key2pos(key);
  if (!asRed) {
    pos[0] = 11 - pos[0];
    pos[1] = 10 - pos[1];
  }
  return [
    bounds.left + (bounds.width * pos[0]) / 12 + bounds.width / 24,
    bounds.top + (bounds.height * (10 - pos[1])) / 11 + bounds.height / 22,
  ];
}

export const setVisible = (el: HTMLElement, v: boolean): void => {
  el.style.visibility = v ? 'visible' : 'hidden';
};

export const isVisible = (el: HTMLElement): boolean => {
  return el.style.visibility === 'visible';
};
export const invRanks: readonly cg.Rank[] = [...cg.ranks].reverse();

export function computeSquareSize(bounds: DOMRectReadOnly): number {
  return Math.min(bounds.width / 12, bounds.height / 11);
}

export const pieceNameOf = (piece: cg.Piece): string => {
  const base = `${piece.color} ${piece.role} ${piece.promoted ? 'promoted' : ''}`;
  const carrying = piece.carrying?.reduce((acc, p) => acc + ' ' + pieceNameOf(p), '-');
  return base + (carrying ?? '');
};

interface PieceFound {
  piece: cg.Piece | undefined;
  stackMove?: {
    stayPiece?: cg.Piece | cg.Piece[] | undefined;
    original: cg.Piece;
  };
}

export function getPieceFromOrigMove(state: HeadlessState, origMove: cg.OrigMove): PieceFound {
  const pieceAtSquare = state.pieces.get(origMove.square);
  if (!pieceAtSquare) return { piece: undefined };
  if (!origMove.type) return { piece: pieceAtSquare };
  if (!origMove.stackMove && origMove.type === pieceAtSquare.role) {
    return { piece: pieceAtSquare };
  }
  //Handle stack move
  const flattenPieces = flattenPiece(pieceAtSquare);
  let carrierPiece: cg.Piece | undefined = undefined;
  const movingCarryingPieces: cg.Piece[] = [];
  const stayingPieces: cg.Piece[] = [];
  for (const piece of flattenPieces) {
    if (piece.role === origMove.type) {
      carrierPiece = piece;
    } else {
      if (origMove.carrying?.includes(piece.role)) {
        movingCarryingPieces.push(piece);
      } else {
        stayingPieces.push(piece);
      }
    }
  }
  if (!carrierPiece) {
    return { piece: undefined };
  }
  const { combined: moving, uncombined: movingUncombined } = createCombineStackFromPieces([
    ...movingCarryingPieces,
    carrierPiece,
  ]);
  if (movingUncombined && movingUncombined.length > 0) {
    //this should not happened
    throw new Error('The moving piece is not suitable to stay in one square');
  }
  const { combined: stay, uncombined: stayUncombined } = createCombineStackFromPieces(stayingPieces);
  if (stayUncombined && stayUncombined.length > 0) {
    //this is expected bahvior and will trigger ambigous moving with carrier popup.
    return { piece: moving, stackMove: { stayPiece: stayingPieces, original: pieceAtSquare } };
  }
  return { piece: moving, stackMove: { stayPiece: stay, original: pieceAtSquare } };
}

export function isPieceFromStack(state: HeadlessState, origMove: cg.OrigMove): boolean {
  const { piece, stackMove } = getPieceFromOrigMove(state, origMove);
  return piece !== undefined && stackMove !== undefined;
}
export const origMoveToKey = (origMove: cg.OrigMove): cg.OrigMoveKey => `${origMove.square}.${origMove.type}`;

export const keyToOrigMove = (key: cg.OrigMoveKey): cg.OrigMove => {
  const [square, type] = key.split('.');
  return { square, type: type as cg.Role };
};
export function findDestInDests(
  state: HeadlessState,
  orig: cg.OrigMove,
  dest: cg.DestMove,
): cg.DestMove | undefined {
  return state.movable.dests?.get(origMoveToKey(orig))?.find(d => d.square === dest.square);
}

export const flattenPiece = (p: cg.Piece): cg.Piece[] => {
  if (!p.carrying) return [p];
  return [{ ...p, carrying: undefined }, ...p.carrying];
};
