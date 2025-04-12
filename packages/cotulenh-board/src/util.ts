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
    ((asRed ? pos[0] : 10 - pos[0]) * bounds.width) / 12,
    ((asRed ? 11 - pos[1] : pos[1]) * bounds.height) / 13,
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

export const allKeys: readonly cg.Key[] = (() => {
  let allKeys: cg.Key[] = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 11; j++) {
      allKeys.push(`${i}-${j}`);
    }
  }
  return allKeys;
})();

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

export const key2pos = (k: cg.Key): cg.Pos => k.split('-').map(Number) as cg.Pos;
export const pos2key = (pos: cg.Pos): cg.Key => `${pos[0]}-${pos[1]}`;

export const isRightButton = (e: cg.MouchEvent): boolean => e.button === 2;
export const allPos: readonly cg.Pos[] = allKeys.map(key2pos);

export function computeSquareCenter(key: cg.Key, asWhite: boolean, bounds: DOMRectReadOnly): cg.NumberPair {
  const pos = key2pos(key);
  if (!asWhite) {
    pos[0] = 7 - pos[0];
    pos[1] = 7 - pos[1];
  }
  return [
    bounds.left + (bounds.width * pos[0]) / 8 + bounds.width / 16,
    bounds.top + (bounds.height * (7 - pos[1])) / 8 + bounds.height / 16,
  ];
}

export const setVisible = (el: HTMLElement, v: boolean): void => {
  el.style.visibility = v ? 'visible' : 'hidden';
};
export const invRanks: readonly cg.Rank[] = [...cg.ranks].reverse();
