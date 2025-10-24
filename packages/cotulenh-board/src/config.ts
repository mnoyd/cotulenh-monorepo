import { HeadlessState } from './state.js';
import * as cg from './types.js';
import { read as fenRead } from './fen.js';
import { DrawShape, DrawBrushes } from './draw.js';
import { setCheck, setSelected } from './board.js';

export interface Config {
  orientation?: cg.Color;
  numericCoordinates?: boolean;
  turnColor?: cg.Color;
  fen?: cg.FEN;
  check?: cg.Color | boolean; // true for current color, false to unset
  lastMove?: cg.Key[]; // squares part of the last move
  animation?: {
    enabled?: boolean;
    duration?: number;
  };
  movable?: {
    free?: boolean; // all moves are valid - board editor
    color?: cg.Color | 'both'; // color that can move. white | black | both | undefined
    dests?: cg.Dests; // valid moves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]}
    showDests?: boolean; // whether to add the move-dest class on squares
    events?: {
      after?: (orig: cg.OrigMove, dest: cg.DestMove, metadata: cg.MoveMetadata) => void; // called after the move has been played
      afterDeployStep?: (move: cg.SingleDeployMove, metadata: cg.DeployStepMetadata) => void; // called after each individual deploy step
      afterNewPiece?: (role: cg.Role, key: cg.Key, metadata: cg.MoveMetadata) => void; // called after a new piece is dropped on the board
    };
  };
  events?: {
    change?: () => void; // called after the situation changes on the board
    // called after a piece has been moved.
    // capturedPiece is undefined or like {color: 'white'; 'role': 'queen'}
    move?: (orig: cg.OrigMove, dest: cg.DestMove, capturedPiece?: cg.Piece) => void;
    dropNewPiece?: (piece: cg.Piece, key: cg.Key) => void;
    select?: (key: cg.OrigMove) => void; // called when a square is selected
    insert?: (elements: cg.Elements) => void; // when the board DOM has been (re)inserted
  };
  drawable?: {
    enabled?: boolean; // can draw
    visible?: boolean; // can view
    defaultSnapToValidMove?: boolean;
    // false to keep the drawing if a movable piece is clicked.
    // Clicking an empty square or immovable piece will clear the drawing regardless.
    eraseOnClick?: boolean;
    shapes?: DrawShape[];
    autoShapes?: DrawShape[];
    brushes?: DrawBrushes;
    onChange?: (shapes: DrawShape[]) => void; // called after drawable shapes change
  };
  airDefense?: {
    showInfluceZone?: boolean;
    influenceZone?: {
      red: Map<cg.Key, cg.Key[]>;
      blue: Map<cg.Key, cg.Key[]>;
    };
  };
}
export function applyAnimation(state: HeadlessState, config: Config): void {
  if (config.animation) {
    deepMerge(state.animation, config.animation);
    // no need for such short animations
    if ((state.animation.duration || 0) < 70) state.animation.enabled = false;
  }
}

function deepMerge(base: any, extend: any): void {
  for (const key in extend) {
    if (Object.prototype.hasOwnProperty.call(extend, key)) {
      if (
        Object.prototype.hasOwnProperty.call(base, key) &&
        isPlainObject(base[key]) &&
        isPlainObject(extend[key])
      )
        deepMerge(base[key], extend[key]);
      else base[key] = extend[key];
    }
  }
}

function isPlainObject(o: unknown): boolean {
  if (typeof o !== 'object' || o === null) return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}

export function configure(state: HeadlessState, config: Config): void {
  // don't merge destinations and autoShapes. Just override.
  if (config.movable?.dests) state.movable.dests = undefined;
  if (config.drawable?.autoShapes) state.drawable.autoShapes = [];

  deepMerge(state, config);

  // if a fen was provided, replace the pieces
  if (config.fen) {
    state.pieces = fenRead(config.fen);
    state.drawable.shapes = config.drawable?.shapes || [];
  }

  // apply config values that could be undefined yet meaningful
  if ('check' in config) setCheck(state, config.check || false);
  if ('lastMove' in config && !config.lastMove) state.lastMove = undefined;
  // in case of ZH drop last move, there's a single square.
  // if the previous last move had two squares,
  // the merge algorithm will incorrectly keep the second square.
  else if (config.lastMove) state.lastMove = config.lastMove;

  // fix move/premove dests
  if (state.selected) setSelected(state, state.selected);

  applyAnimation(state, config);
}
