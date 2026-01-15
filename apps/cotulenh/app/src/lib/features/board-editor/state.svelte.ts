import { logger } from '@cotulenh/common';
import { validateFenString } from '@cotulenh/core';
import type { Api, Config, Role, Color, Piece } from '@cotulenh/board';
import { goto } from '$app/navigation';
import { toast } from 'svelte-sonner';
import type { EditorMode, SelectedPiece, GhostPosition } from './types.js';
import { EMPTY_FEN, STARTING_FEN, DELETE_MARKER } from './constants.js';

export function createBoardEditorState() {
  let boardApi = $state.raw<Api | null>(null);
  let fenInput = $state('');
  let copyButtonText = $state('Copy');
  let boardOrientation = $state<'red' | 'blue'>('red');
  let editorMode = $state<EditorMode>('hand');
  let selectedPiece = $state<SelectedPiece | null>(null);
  let ghostPosition = $state<GhostPosition>({ x: 0, y: 0 });
  let showGhost = $state(false);
  let isOverRelevantArea = $state(false);
  let heroicMode = $state(false);
  let validationError = $state('');
  let currentTurn = $state<'red' | 'blue'>('red');
  let initialFen = $state('');
  let boardReady = $state(false);

  const isFenValid = $derived.by(() => {
    if (!fenInput) return false;
    return validateFenString(fenInput);
  });

  function updateFEN() {
    if (boardApi) {
      const rawFen = boardApi.getFen();
      const fenParts = rawFen.split(' ');
      const boardPart = fenParts[0];

      if (fenParts.length >= 2) {
        currentTurn = fenParts[1] === 'b' ? 'blue' : 'red';
      }

      const turnChar = currentTurn === 'red' ? 'r' : 'b';
      fenInput = `${boardPart} ${turnChar} - - 0 1`;
    }
  }

  function applyFEN() {
    if (boardApi && fenInput) {
      try {
        const fenParts = fenInput.split(' ');
        const boardPart = fenParts[0];

        if (fenParts.length >= 2) {
          currentTurn = fenParts[1] === 'b' ? 'blue' : 'red';
        } else {
          currentTurn = 'red';
        }

        const turnChar = currentTurn === 'red' ? 'r' : 'b';
        const normalizedFen = `${boardPart} ${turnChar} - - 0 1`;

        // Validate FEN before applying
        const isValid = validateFenString(normalizedFen);
        if (!isValid) {
          throw new Error('Invalid FEN format');
        }

        boardApi.set({
          fen: normalizedFen,
          lastMove: undefined
        });

        fenInput = normalizedFen;
        validationError = ''; // Clear any previous errors
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        validationError = errorMsg;
        toast.error('Invalid FEN: ' + errorMsg);
      }
    }
  }

  function clearBoard() {
    if (boardApi) {
      currentTurn = 'red';
      boardApi.set({
        fen: EMPTY_FEN,
        lastMove: undefined
      });
      updateFEN();
    }
  }

  function flipBoard() {
    if (boardApi) {
      boardApi.toggleOrientation();
      boardOrientation = boardOrientation === 'red' ? 'blue' : 'red';
    }
  }

  function setMode(mode: EditorMode) {
    if (!boardApi) return;

    logger.debug('Setting mode to:', { mode });
    editorMode = mode;

    if (mode === 'hand') {
      selectedPiece = null;
      showGhost = false;
      boardApi.setDropMode(false);
      boardApi.state.movable.color = 'both';
      document.body.style.cursor = 'default';
    } else if (mode === 'delete') {
      selectedPiece = null;
      showGhost = false;
      boardApi.setDropMode(true, DELETE_MARKER);
      document.body.style.cursor = 'not-allowed';
    } else if (mode === 'drop') {
      document.body.style.cursor = 'default';
    }
  }

  function toggleHandMode() {
    setMode('hand');
  }

  function toggleDeleteMode() {
    setMode(editorMode === 'delete' ? 'hand' : 'delete');
  }

  function scrollToBoard() {
    const boardSection = document.querySelector('.board-section');
    if (boardSection) {
      boardSection.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }

  function handlePieceSelect(role: Role, color: Color) {
    if (!boardApi) return;

    const isPromoted = heroicMode && role !== 'commander';
    if (
      selectedPiece?.role === role &&
      selectedPiece?.color === color &&
      selectedPiece?.promoted === isPromoted
    ) {
      selectedPiece = null;
      showGhost = false;
      setMode('hand');
    } else {
      selectedPiece = { role, color, promoted: isPromoted ? true : undefined };
      editorMode = 'drop';
      showGhost = true;
      scrollToBoard();

      const piece: Piece = { role, color };
      if (isPromoted) {
        piece.promoted = true;
      }

      boardApi.setDropMode(true, piece);

      document.body.style.cursor = 'default';
    }
  }

  function toggleHeroicMode() {
    heroicMode = !heroicMode;
    if (selectedPiece) {
      const { role, color } = selectedPiece;
      selectedPiece = null;
      handlePieceSelect(role, color);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (selectedPiece || editorMode === 'delete') {
      ghostPosition = { x: e.clientX, y: e.clientY };

      const target = e.target as HTMLElement;
      isOverRelevantArea = !!(
        target.closest('.palette-section') ||
        target.closest('.board-container') ||
        target.closest('.board-section')
      );
    }
  }

  function handleAfterNewPiece(role: Role, key: string) {
    if (!boardApi) return;

    logger.debug('afterNewPiece:', { role, at: key, mode: editorMode });

    if (editorMode === 'delete' && role === DELETE_MARKER.role) {
      logger.debug('Delete mode detected! Removing piece at', { key });
      boardApi.setPieces(new Map([[key, undefined]]));
      boardApi.state.lastMove = undefined;
      updateFEN();
    } else {
      logger.debug('Normal placement:', { role, at: key });
      boardApi.state.lastMove = undefined;
      updateFEN();
    }
  }

  function cancelSelection(e: MouseEvent) {
    if (!boardApi) return;

    const target = e.target as HTMLElement;
    if (
      target.closest('.board-container') ||
      target.closest('.board-section') ||
      target.closest('.palette-section') ||
      target.closest('.editor-panel') ||
      target.closest('.sidebar')
    ) {
      return;
    }

    selectedPiece = null;
    showGhost = false;
    setMode('hand');
  }

  function loadStartingPosition() {
    if (boardApi) {
      boardApi.set({
        fen: STARTING_FEN,
        lastMove: undefined
      });
      updateFEN();
    }
  }

  async function copyFEN() {
    try {
      await navigator.clipboard.writeText(fenInput);
      copyButtonText = 'Copied!';
      setTimeout(() => {
        copyButtonText = 'Copy';
      }, 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = fenInput;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      copyButtonText = 'Copied!';
      setTimeout(() => {
        copyButtonText = 'Copy';
      }, 2000);
    }
  }

  function toggleTurn() {
    currentTurn = currentTurn === 'red' ? 'blue' : 'red';

    if (fenInput) {
      const fenParts = fenInput.split(' ');
      const boardPart = fenParts[0];
      const turnChar = currentTurn === 'red' ? 'r' : 'b';

      fenInput = `${boardPart} ${turnChar} - - 0 1`;

      if (boardApi) {
        try {
          boardApi.set({
            fen: fenInput,
            lastMove: undefined
          });
        } catch (error) {
          logger.error(error, 'Error updating turn:');
        }
      }
    }
  }

  function validateAndPlay() {
    validationError = '';

    if (!fenInput) {
      validationError = 'Please enter a FEN position first';
      return;
    }

    try {
      const isValid = validateFenString(fenInput);

      if (!isValid) {
        validationError = 'Invalid FEN format';
        return;
      }

      const encodedFen = encodeURIComponent(fenInput);
      goto(`/play?fen=${encodedFen}`);
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Invalid FEN';
    }
  }

  function createEditorConfig(): Config {
    return {
      fen: initialFen || EMPTY_FEN,
      orientation: 'red',
      turnColor: currentTurn,
      movable: {
        free: true,
        color: 'both',
        showDests: false,
        events: {
          after: () => {
            if (boardApi) {
              boardApi.state.lastMove = undefined;
            }
            updateFEN();
          },
          afterNewPiece: handleAfterNewPiece
        }
      },
      events: {
        change: updateFEN
      }
    } as Config;
  }

  function handleBoardReady(api: Api) {
    boardApi = api;
    boardReady = true;

    api.state.highlight.lastMove = false;
    api.state.highlight.check = false;

    updateFEN();
    logger.debug('Board editor ready');
  }

  function handleBoardDestroy() {
    logger.debug('Cleaning up board editor.');
    document.body.style.cursor = 'default';
    if (boardApi) {
      boardApi.setDropMode(false);
    }
  }

  function initializeFromUrl(urlFen: string | null) {
    if (urlFen) {
      try {
        const decodedFen = decodeURIComponent(urlFen);
        const fenParts = decodedFen.split(' ');
        const boardPart = fenParts[0];

        if (fenParts.length >= 2) {
          currentTurn = fenParts[1] === 'b' ? 'blue' : 'red';
        }

        const turnChar = currentTurn === 'red' ? 'r' : 'b';
        initialFen = `${boardPart} ${turnChar} - - 0 1`;
        fenInput = initialFen;
      } catch (error) {
        logger.error(error, 'Error decoding FEN from URL:');
        initialFen = EMPTY_FEN;
      }
    } else {
      initialFen = EMPTY_FEN;
    }
  }

  return {
    get boardApi() {
      return boardApi;
    },
    set boardApi(v) {
      boardApi = v;
    },
    get fenInput() {
      return fenInput;
    },
    set fenInput(v) {
      fenInput = v;
    },
    get copyButtonText() {
      return copyButtonText;
    },
    get boardOrientation() {
      return boardOrientation;
    },
    get editorMode() {
      return editorMode;
    },
    get selectedPiece() {
      return selectedPiece;
    },
    get ghostPosition() {
      return ghostPosition;
    },
    get showGhost() {
      return showGhost;
    },
    get isOverRelevantArea() {
      return isOverRelevantArea;
    },
    get heroicMode() {
      return heroicMode;
    },
    get validationError() {
      return validationError;
    },
    get currentTurn() {
      return currentTurn;
    },
    get initialFen() {
      return initialFen;
    },
    get boardReady() {
      return boardReady;
    },
    get isFenValid() {
      return isFenValid;
    },

    updateFEN,
    applyFEN,
    clearBoard,
    flipBoard,
    setMode,
    toggleHandMode,
    toggleDeleteMode,
    handlePieceSelect,
    toggleHeroicMode,
    handleMouseMove,
    handleAfterNewPiece,
    cancelSelection,
    loadStartingPosition,
    copyFEN,
    toggleTurn,
    validateAndPlay,
    createEditorConfig,
    handleBoardReady,
    handleBoardDestroy,
    initializeFromUrl
  };
}

export type BoardEditorStateReturn = ReturnType<typeof createBoardEditorState>;
