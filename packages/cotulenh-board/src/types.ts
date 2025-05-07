export type Color = (typeof colors)[number];
export type Role = (typeof roles)[number];
export type File = (typeof files)[number];
export type Rank = (typeof ranks)[number];
export type Key = 'a0' | `${File}${Rank}`;
export type FEN = string;
export type Pos = [number, number];

export const TEMP_KEY = 'a0';

export const colors = ['red', 'blue'] as const;
export const roles = [
  'commander',
  'infantry',
  'tank',
  'militia',
  'engineer',
  'artillery',
  'anti_air',
  'missile',
  'air_force',
  'navy',
  'headquarter',
] as const;
export const airDefenseRoles: Role[] = ['anti_air', 'navy', 'missile'];
export const isAirDefense = (role: Role): boolean => airDefenseRoles.includes(role);

export const files: readonly string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
export const ranks: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export interface KeyedNode extends HTMLElement {
  cgKey: Key;
}
export interface PieceNode extends KeyedNode {
  tagName: 'PIECE';
  cgPiece: string;
  cgAnimating?: boolean;
  cgFading?: boolean;
  cgDragging?: boolean;
  cgScale?: number;
}
export interface SquareNode extends KeyedNode {
  tagName: 'SQUARE';
}

export interface Piece {
  role: Role;
  color: Color;
  promoted?: boolean;
  carrying?: Piece[];
}
export interface Drop {
  role: Role;
  key: Key;
}
export type Pieces = Map<Key, Piece>;
export type PiecesDiff = Map<Key, Piece | undefined>;
export type NumberPair = [number, number];
export type NumberQuad = [number, number, number, number];

export interface Elements {
  board: HTMLElement;
  wrap: HTMLElement;
  container: HTMLElement;
  ghost?: HTMLElement;
  svg?: SVGElement;
  customSvg?: SVGElement;
  autoPieces?: HTMLElement;
}
export interface Dom {
  elements: Elements;
  bounds: Memo<DOMRectReadOnly>;
  redraw: () => void;
  redrawNow: (skipSvg?: boolean) => void;
  unbind?: Unbind;
  destroyed?: boolean;
}

export interface Memo<A> {
  (): A;
  clear: () => void;
}

export type Redraw = () => void;
export type Unbind = () => void;
export type KHz = number;
export type Dests = Map<Key, Key[]>;
export interface MoveMetadata {
  premove: boolean;
  ctrlKey?: boolean;
  holdTime?: number;
  captured?: Piece;
  predrop?: boolean;
}
export type BrushColor = 'green' | 'red' | 'blue' | 'yellow';
export type KeyPair = [Key, Key];

export interface SetPremoveMetadata {
  ctrlKey?: boolean;
}
export type MouchEvent = Event & Partial<MouseEvent & TouchEvent>;

export interface Timer {
  start: () => void;
  cancel: () => void;
  stop: () => number;
}
export type SquareClasses = Map<Key, string>;
export interface Exploding {
  stage: number;
  keys: readonly Key[];
}
