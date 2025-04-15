import { ANNOTATION_INFO, type Annotation } from "$lib/utils/annotation";
import { positionFromFen } from "$lib/utils/core-intergrate";
import { createNode, defaultTree, getNodeAtPath, type GameHeaders, type TreeNode, type TreeState } from "$lib/utils/treReducer";
import type { Outcome } from "$lib/utils/types";
import type { DrawShape } from "@repo/cotulenh-board/draw";
import type { Move } from "@repo/cotulenh-core";
import { writable } from 'svelte/store';

export interface TreeStoreState {
  root: TreeNode;
  headers: GameHeaders;
  position: number[];
  dirty: boolean;

  currentNode: () => TreeNode;

  goToNext: () => void;
  goToPrevious: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  goToMove: (move: number[]) => void;
  goToBranchStart: () => void;
  goToBranchEnd: () => void;
  nextBranch: () => void;
  previousBranch: () => void;
  nextBranching: () => void;
  previousBranching: () => void;

  goToAnnotation: (annotation: Annotation, color: "white" | "black") => void;

  makeMove: (args: {
    payload: string | Move;
    changePosition?: boolean;
    mainline?: boolean;
    clock?: number;
    changeHeaders?: boolean;
  }) => void;

  appendMove: (args: {
    payload: Move;
    clock?: number;
  }) => void;

  makeMoves: (args: {
    payload: string[];
    mainline?: boolean;
    changeHeaders?: boolean;
  }) => void;
  deleteMove: (path?: number[]) => void;
  promoteVariation: (path: number[]) => void;
  promoteToMainline: (path: number[]) => void;
  copyVariationPgn: (path: number[]) => void;

  setStart: (start: number[]) => void;

  setAnnotation: (payload: Annotation) => void;
  setComment: (payload: string) => void;
  setHeaders: (payload: GameHeaders) => void;
  setResult: (payload: Outcome) => void;
  setShapes: (shapes: DrawShape[]) => void;

  clearShapes: () => void;

  setFen: (fen: string) => void;

  setState: (state: TreeState) => void;
  reset: () => void;
  save: () => void;
}

export type TreeStore = ReturnType<typeof createTreeStore>;

export function createTreeStore(initialTree?: TreeState) {
  const { subscribe, set, update } = writable<TreeState>({
    ...(initialTree ?? defaultTree()),
    currentNode: function () {
      return getNodeAtPath(this.root, this.position);
    },
    setState: function (state: TreeState) {
      set({ ...this, ...state });
    },
    reset: function () {
      set(defaultTree());
    },
    save: function () {
      update((state) => ({ ...state, dirty: false }));
    },
    setFen: function (fen: string) {
      update((state) => {
        const newTree = defaultTree(fen);
        return {
          ...state,
          dirty: true,
          root: newTree.root,
          position: [],
        };
      });
    },
    goToNext: function () {
      update((state) => {
        const node = getNodeAtPath(state.root, state.position);
        const [pos] = positionFromFen(node.fen);
        if (!pos || !node.children[0]?.move) return state;
        const san = makeSan(pos, node.children[0].move);
        playSound(san.includes('x'), san.includes('+'));
        if (node && node.children.length > 0) {
          return {
            ...state,
            position: [...state.position, 0],
          };
        }
        return state;
      });
    },
    goToPrevious: function () {
      update((state) => ({ ...state, position: state.position.slice(0, -1) }));
    },
    goToAnnotation: function (annotation: Annotation, color: 'white' | 'black') {
      update((state) => {
        const colorN = color === "white" ? 1 : 0;

        let p: number[] = state.position;
        let node = getNodeAtPath(state.root, p);
        while (true) {
          if (node.children.length === 0) {
            p = [];
          } else {
            p.push(0);
          }

          node = getNodeAtPath(state.root, p);

          if (
            node.annotations.includes(annotation) &&
            node.halfMoves % 2 === colorN
          ) {
            break;
          }
        }

        return { ...state, position: p };
      });
    },
    makeMove: function ({
      payload,
      changePosition,
      mainline,
      clock,
      changeHeaders = true,
    }) {
      update((state) => {
        if (typeof payload === "string") {
          const node = getNodeAtPath(state.root, state.position);
          if (!node) return state;
          const [pos] = positionFromFen(node.fen);
          if (!pos) return state;
          const move = parseSan(pos, payload);
          if (!move) return state;
          payload = move;
        }
        makeMove({
          state,
          move: payload,
          last: false,
          changePosition,
          changeHeaders,
          mainline,
          clock,
        });
        return state;
      });
    },
    appendMove: function ({ payload, clock }) {
      update((state) => {
        makeMove({ state, move: payload, last: true, clock });
        return state;
      });
    },
    makeMoves: function ({ payload, mainline, changeHeaders = true }) {
      update((state) => {
        state.dirty = true;
        const node = getNodeAtPath(state.root, state.position);
        const [pos] = positionFromFen(node.fen);
        if (!pos) return state;
        for (const [i, move] of payload.entries()) {
          const m = parseSanOrUci(pos, move);
          if (!m) return state;
          pos.play(m);
          makeMove({
            state,
            move: m,
            last: false,
            mainline,
            sound: i === payload.length - 1,
            changeHeaders,
          });
        }
        return state;
      });
    },
    goToEnd: function () {
      update((state) => {
        const endPosition: number[] = [];
        let currentNode = state.root;
        while (currentNode.children.length > 0) {
          endPosition.push(0);
          currentNode = currentNode.children[0];
        }
        return { ...state, position: endPosition };
      });
    },
    goToStart: function () {
      update((state) => ({ ...state, position: state.headers.start || [] }));
    },
    goToMove: function (move) {
      update((state) => ({ ...state, position: move }));
    },
    goToBranchStart: function () {
      update((state) => {
        if (
          state.position.length > 0 &&
          state.position[state.position.length - 1] !== 0
        ) {
          return { ...state, position: state.position.slice(0, -1) };
        }

        while (
          state.position.length > 0 &&
          state.position[state.position.length - 1] === 0
        ) {
          return { ...state, position: state.position.slice(0, -1) };
        }
        return state;
      });
    },
    goToBranchEnd: function () {
      update((state) => {
        let currentNode = getNodeAtPath(state.root, state.position);
        while (currentNode.children.length > 0) {
          state.position.push(0);
          currentNode = currentNode.children[0];
        }
        return state;
      });
    },
    nextBranch: function () {
      update((state) => {
        if (state.position.length === 0) return state;

        const parent = getNodeAtPath(state.root, state.position.slice(0, -1));
        const branchIndex = state.position[state.position.length - 1];
        const node = parent.children[branchIndex];

        // Makes the navigation more fluid and compatible with next/previous branching
        if (node.children.length >= 2 && parent.children.length <= 1) {
          state.position.push(0);
        }

        state.position = [
          ...state.position.slice(0, -1),
          (branchIndex + 1) % parent.children.length,
        ];
        return state;
      });
    },
    previousBranch: function () {
      update((state) => {
        if (state.position.length === 0) return state;

        const parent = getNodeAtPath(state.root, state.position.slice(0, -1));
        const branchIndex = state.position[state.position.length - 1];
        const node = parent.children[branchIndex];

        // Makes the navigation more fluid and compatible with next/previous branching
        if (node.children.length >= 2 && parent.children.length <= 1) {
          state.position.push(0);
        }

        state.position = [
          ...state.position.slice(0, -1),
          (branchIndex + parent.children.length - 1) % parent.children.length,
        ];
        return state;
      });
    },
    nextBranching: function () {
      update((state) => {
        let node = getNodeAtPath(state.root, state.position);
        let branchCount = node.children.length;

        if (branchCount === 0) return state;

        do {
          state.position.push(0);
          node = node.children[0];
          branchCount = node.children.length;
        } while (branchCount === 1);
        return state;
      });
    },
    previousBranching: function () {
      update((state) => {
        let node = getNodeAtPath(state.root, state.position);
        let branchCount = node.children.length;

        if (state.position.length === 0) return state;

        do {
          state.position = state.position.slice(0, -1);
          node = getNodeAtPath(state.root, state.position);
          branchCount = node.children.length;
        } while (branchCount === 1 && state.position.length > 0);
        return state;
      });
    },
    deleteMove: function (path) {
      update((state) => {
        state.dirty = true;
        deleteMove(state, path ?? state.position);
        return state;
      });
    },
    promoteVariation: function (path) {
      update((state) => {
        state.dirty = true;
        promoteVariation(state, path);
        return state;
      });
    },
    promoteToMainline: function (path) {
      update((state) => {
        state.dirty = true;
        while (!promoteVariation(state, path)) {}
        return state;
      });
    },
    copyVariationPgn: function (path) {
      const { root } = get();
      const pgn = getPGN(root, {
        headers: null,
        comments: false,
        extraMarkups: false,
        glyphs: true,
        variations: false,
        path,
      });
      navigator.clipboard.writeText(pgn);
    },
    setStart: function (start) {
      update((state) => ({ ...state, dirty: true, headers: { ...state.headers, start } }));
    },
    setAnnotation: function (payload) {
      update((state) => {
        state.dirty = true;
        const node = getNodeAtPath(state.root, state.position);
        if (node) {
          if (node.annotations.includes(payload)) {
            node.annotations = node.annotations.filter((a) => a !== payload);
          } else {
            const newAnnotations = node.annotations.filter(
              (a) =>
                !ANNOTATION_INFO[a].group ||
                ANNOTATION_INFO[a].group !== ANNOTATION_INFO[payload].group,
            );
            node.annotations = [...newAnnotations, payload].sort((a, b) =>
              ANNOTATION_INFO[a].nag > ANNOTATION_INFO[b].nag ? 1 : -1,
            );
          }
        }
        return state;
      });
    },
    setComment: function (payload) {
      update((state) => {
        state.dirty = true;
        const node = getNodeAtPath(state.root, state.position);
        if (node) {
          node.comment = payload;
        }
        return state;
      });
    },
    setHeaders: function (headers) {
      update((state) => {
        state.dirty = true;
        state.headers = headers;
        if (headers.fen && headers.fen !== state.root.fen) {
          state.root = defaultTree(headers.fen).root;
          state.position = [];
        }
        return state;
      });
    },
    setResult: function (result) {
      update((state) => ({ ...state, dirty: true, headers: { ...state.headers, result } }));
    },
    setShapes: function (shapes) {
      update((state) => {
        state.dirty = true;
        setShapes(state, shapes);
        return state;
      });
    },
    clearShapes: function () {
      update((state) => {
        const node = getNodeAtPath(state.root, state.position);
        if (node && node.shapes.length > 0) {
          state.dirty = true;
          node.shapes = [];
        }
        return state;
      });
    },
  });

  return {
    subscribe,
    setState: (state: TreeState) => update((s) => ({ ...s, ...state })),
    reset: () => set(defaultTree()),
    save: () => update((state) => ({ ...state, dirty: false })),
    setFen: (fen: string) => update((state) => {
      const newTree = defaultTree(fen);
      return {
        ...state,
        dirty: true,
        root: newTree.root,
        position: [],
      };
    }),
    goToNext: () => update((state) => {
      const node = getNodeAtPath(state.root, state.position);
      const [pos] = positionFromFen(node.fen);
      if (!pos || !node.children[0]?.move) return state;
      const san = makeSan(pos, node.children[0].move);
      playSound(san.includes('x'), san.includes('+'));
      if (node && node.children.length > 0) {
        return {
          ...state,
          position: [...state.position, 0],
        };
      }
      return state;
    }),
    goToPrevious: () => update((state) => ({ ...state, position: state.position.slice(0, -1) })),
    // ...export other methods as needed...
  };
}

// Example usage:
// export const gameStore = createTreeStore();

function setShapes(state: TreeState, shapes: DrawShape[]) {
    const node = getNodeAtPath(state.root, state.position);
    if (!node) return state;
  
    const [shape] = shapes;
    if (shape) {
      const index = node.shapes.findIndex(
        (s) => s.orig === shape.orig && s.dest === shape.dest,
      );
  
      if (index !== -1) {
        node.shapes.splice(index, 1);
      } else {
        node.shapes.push(shape);
      }
    } else {
      node.shapes = [];
    }
  
    return state;
  }

  function makeMove({
    state,
    move,
    last,
    changePosition = true,
    changeHeaders = true,
    mainline = false,
    clock,
    sound = true,
  }: {
    state: TreeState;
    move: Move;
    last: boolean;
    changePosition?: boolean;
    changeHeaders?: boolean;
    mainline?: boolean;
    clock?: number;
    sound?: boolean;
  }) {
    const mainLine = Array.from(treeIteratorMainLine(state.root));
    const position = last
      ? mainLine[mainLine.length - 1].position
      : state.position;
    const moveNode = getNodeAtPath(state.root, position);
    if (!moveNode) return;
    const [pos] = positionFromFen(moveNode.fen);
    if (!pos) return;
    const san = makeSan(pos, move);
    if (san === "--") return; // invalid move
    pos.play(move);
    if (sound) {
      playSound(san.includes("x"), san.includes("+"));
    }
    if (changeHeaders && pos.isEnd()) {
      if (pos.isCheckmate()) {
        state.headers.result = pos.turn === "white" ? "0-1" : "1-0";
      }
      if (pos.isStalemate() || pos.isInsufficientMaterial()) {
        state.headers.result = "1/2-1/2";
      }
    }
  
    const newFen = makeFen(pos.toSetup());
  
    if (
      (changeHeaders && isThreeFoldRepetition(state, newFen)) ||
      is50MoveRule(state)
    ) {
      state.headers.result = "1/2-1/2";
    }
  
    const i = moveNode.children.findIndex((n) => n.san === san);
    if (i !== -1) {
      if (changePosition) {
        if (state.position === position) {
          state.position.push(i);
        } else {
          state.position = [...position, i];
        }
      }
    } else {
      state.dirty = true;
      const newMoveNode = createNode({
        fen: newFen,
        move,
        san,
        halfMoves: moveNode.halfMoves + 1,
        clock,
      });
      if (mainline) {
        moveNode.children.unshift(newMoveNode);
      } else {
        moveNode.children.push(newMoveNode);
      }
      if (changePosition) {
        if (state.position === position) {
          if (mainline) {
            state.position.push(0);
          } else {
            state.position.push(moveNode.children.length - 1);
          }
        } else {
          state.position = [...position, moveNode.children.length - 1];
        }
      }
    }
  }