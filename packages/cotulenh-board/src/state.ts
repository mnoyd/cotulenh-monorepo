import * as cg from './types.js';
import * as fen from './fen.js';
import { AnimCurrent } from './anim.js';
import { Drawable } from './draw.js';
import { DragCurrent } from './drag.js';

export interface HeadlessState {
  orientation: cg.Color;
  coordinates?: boolean;
  turnColor: cg.Color; // turn to play.
  pieces: cg.Pieces;
  check?: cg.Key;
  lastMove?: cg.Key[];
  animation: {
    enabled: boolean;
    duration: number;
    current?: AnimCurrent;
  };
  trustAllEvents?: boolean; // disable checking for human only input (e.isTrusted)
  blockTouchScroll: boolean; // block scrolling via touch dragging on the board, e.g. for coordinate training
  addDimensionsCssVarsTo?: HTMLElement; // add ---cg-width and ---cg-height CSS vars containing the board's dimensions to this element
  disableContextMenu: boolean; // because who needs a context menu on a chessboard
  movable: {
    free: boolean; // all moves are valid - board editor
    color?: cg.Color | 'both'; // color that can move. white | black | both
    dests?: cg.Dests; // valid moves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]}
    showDests: boolean; // whether to add the move-dest class on squares
    events: {
      after?: (orig: cg.Key, dest: cg.Key, metadata: cg.MoveMetadata) => void; // called after the move has been played
      afterNewPiece?: (role: cg.Role, key: cg.Key, metadata: cg.MoveMetadata) => void; // called after a new piece is dropped on the board
    };
  };
  drawable: Drawable;
  selectable: {
    // disable to enforce dragging over click-click move
    enabled: boolean;
  };
  showAirDefenseInfluence: boolean; // show air defense influence zones when air_force is selected
  viewOnly: boolean; // don't bind events: the user will never be able to move pieces around
  draggable: {
    enabled: boolean; // allow moves & premoves to use drag'n drop
    distance: number; // minimum distance to initiate a drag; in pixels
    autoDistance: boolean; // lets chessground set distance to zero when user drags pieces
    showGhost: boolean; // show ghost of piece being dragged
    deleteOnDropOff: boolean; // delete a piece when it is dropped off the board
    current?: DragCurrent;
  };
  dropmode: {
    active: boolean;
    piece?: cg.Piece;
  };
  events: {
    change?: () => void; // called after the situation changes on the board
    // called after a piece has been moved.
    // capturedPiece is undefined or like {color: 'white'; 'role': 'queen'}
    move?: (orig: cg.Key, dest: cg.Key, capturedPiece?: cg.Piece) => void;
    dropNewPiece?: (piece: cg.Piece, key: cg.Key) => void;
    select?: (key: cg.Key) => void; // called when a square is selected
    insert?: (elements: cg.Elements) => void; // when the board DOM has been (re)inserted
  };
  stats: {
    // was last piece dragged or clicked?
    // needs default to false for touch
    dragged: boolean;
    ctrlKey?: boolean;
  };
  hold: cg.Timer;
  selected?: cg.Key;
  highlight: {
    lastMove: boolean; // add last-move class to squares
    check: boolean; // add check class to squares
    custom: cg.SquareClasses; // add custom classes to custom squares
  };
  exploding?: cg.Exploding;
  addPieceZIndex: boolean; // adds z-index values to pieces (for 3D)
  selectedPieceInfo?: {
    originalKey: cg.Key;
    originalPiece: cg.Piece;
    carriedPieceIndex: number;
    isFromStack: boolean;
  };
  combinedPiecePopup?: {
    key: cg.Key;
    piece: cg.Piece;
    containerEl: HTMLElement;
  };
}

export interface State extends HeadlessState {
  dom: cg.Dom;
}

export function defaults(): HeadlessState {
  return {
    highlight: {
      lastMove: true,
      check: true,
      custom: new Map<cg.Key, string>(),
    },
    addPieceZIndex: false,
    viewOnly: false,
    pieces: fen.read(fen.initial),
    orientation: 'red',
    turnColor: 'red',
    coordinates: true,
    disableContextMenu: true,
    showAirDefenseInfluence: true,
    dropmode: {
      active: false,
    },
    animation: {
      enabled: true,
      duration: 200,
    },
    selectable: {
      enabled: true,
    },
    draggable: {
      enabled: true,
      distance: 3,
      autoDistance: true,
      showGhost: true,
      deleteOnDropOff: true,
    },
    movable: {
      free: true,
      color: 'both',
      showDests: true,
      events: {},
    },

    events: {},
    stats: {
      dragged: false,
    },
    trustAllEvents: false,
    blockTouchScroll: false,
    drawable: {
      enabled: true, // can draw
      visible: true, // can view
      defaultSnapToValidMove: true,
      eraseOnClick: true,
      shapes: [],
      autoShapes: [],
      brushes: {
        green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
        red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
        blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
        yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
        paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
        paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
        paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
        paleGrey: {
          key: 'pgr',
          color: '#4a4a4a',
          opacity: 0.35,
          lineWidth: 15,
        },
        purple: { key: 'purple', color: '#68217a', opacity: 0.65, lineWidth: 10 },
        pink: { key: 'pink', color: '#ee2080', opacity: 0.5, lineWidth: 10 },
        white: { key: 'white', color: 'white', opacity: 1, lineWidth: 10 },
      },
      prevSvgHash: '',
    },
    hold: {
      start: () => {},
      cancel: () => {},
      stop: () => 0,
    },
  };
}
