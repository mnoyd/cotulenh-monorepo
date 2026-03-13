'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createHintSystem,
  createLearnEngine,
  getLessonById,
  getLessonContext,
  getNextLessonInSubject,
  setLearnLocale,
  tLessonContent,
  tLessonFailureMessage,
  tLessonHint,
  tLessonInstruction,
  tLessonSuccessMessage
} from '@cotulenh/learn';
import type {
  BoardShape,
  HintLevel,
  HintSystem,
  LearnEngine,
  LearnStatus,
  LessonResult,
  SquareInfo
} from '@cotulenh/learn';
import type { Dests, Key, OrigMoveKey, Piece, SquareClasses } from '@cotulenh/board';

import { useAuthLearnProgress } from '@/hooks/use-auth-learn-progress';
import { useBoard } from '@/hooks/use-board';
import type { BoardHandle } from '@/hooks/use-board';
import { useLearnStore } from '@/stores/learn-store';

import { HintDisplay } from './hint-display';
import { LessonCompletion } from './lesson-completion';
import { LessonLayout } from './lesson-layout';
import { LessonMarkdown } from './lesson-markdown';
import { SignupPrompt } from './signup-prompt';

type BoardDrawShape = { orig: string; dest?: string; brush: string };
type LessonViewProps = {
  lessonId: string;
  subjectId: string;
};

type PersistedMove = {
  orig: Key;
  dest: Key;
  stay?: boolean;
};

const STORAGE_PREFIX = 'cotulenh.lesson-session';
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;

const SYMBOL_TO_ROLE: Record<string, string> = {
  c: 'commander',
  i: 'infantry',
  t: 'tank',
  m: 'militia',
  e: 'engineer',
  a: 'artillery',
  g: 'anti_air',
  s: 'missile',
  f: 'air_force',
  n: 'navy',
  h: 'headquarter'
};

const ROLE_LABELS: Record<string, string> = {
  commander: 'Tư lệnh',
  infantry: 'Bộ binh',
  tank: 'Xe tăng',
  militia: 'Dân quân',
  engineer: 'Công binh',
  artillery: 'Pháo binh',
  anti_air: 'Phòng không',
  missile: 'Tên lửa',
  air_force: 'Không quân',
  navy: 'Hải quân',
  headquarter: 'Sở chỉ huy'
};

const COLOR_LABELS: Record<'red' | 'blue', string> = {
  red: 'đỏ',
  blue: 'xanh'
};

function movesToDests(
  moves: {
    from: string;
    piece: { type: string };
    to: string | Map<string, unknown>;
    stay?: unknown;
  }[]
): Dests {
  const dests: Dests = new Map();

  for (const move of moves) {
    const role = SYMBOL_TO_ROLE[move.piece.type] ?? move.piece.type;
    const key = `${move.from}.${role}` as OrigMoveKey;
    const existing = dests.get(key) ?? [];

    if (move.to instanceof Map) {
      for (const square of move.to.keys()) {
        existing.push({ square: square as Key });
      }
    } else {
      existing.push({
        square: move.to as Key,
        stay: move.stay !== undefined ? true : undefined
      });
    }

    dests.set(key, existing);
  }

  return dests;
}

function toBoardDrawShape(shape: BoardShape): BoardDrawShape {
  return {
    orig: shape.from,
    dest: shape.to,
    brush: shape.color ?? 'green'
  };
}

function getLessonSessionKey(subjectId: string, lessonId: string): string {
  return `${STORAGE_PREFIX}.${subjectId}.${lessonId}`;
}

function readLessonSession(key: string): PersistedMove[] {
  if (typeof window === 'undefined') return [];

  const stored = window.localStorage.getItem(key);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as { moves?: PersistedMove[] };
    return Array.isArray(parsed.moves) ? parsed.moves : [];
  } catch {
    return [];
  }
}

function writeLessonSession(key: string, moves: PersistedMove[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify({ moves }));
}

function clearLessonSession(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}

function getHintTypeForLevel(
  lesson: NonNullable<ReturnType<typeof getLessonById>>,
  level: 'subtle' | 'medium' | 'explicit'
): HintLevel {
  if (level === 'subtle') return lesson.hints?.levels?.subtle ?? 'pulse-target';
  if (level === 'medium') return lesson.hints?.levels?.medium ?? 'show-arrow';
  return lesson.hints?.levels?.explicit ?? 'show-instruction';
}

function getNextHintType(
  lesson: NonNullable<ReturnType<typeof getLessonById>>,
  currentLevel: 'none' | 'subtle' | 'medium' | 'explicit'
): HintLevel {
  if (currentLevel === 'none') return getHintTypeForLevel(lesson, 'subtle');
  if (currentLevel === 'subtle') return getHintTypeForLevel(lesson, 'medium');
  return getHintTypeForLevel(lesson, 'explicit');
}

function describeSquare(square: Key, piece: Piece | undefined, isSelected: boolean): string {
  const squarePrefix = isSelected ? `Ô ${square}, đang chọn` : `Ô ${square}`;

  if (!piece) {
    return `${squarePrefix}, trống`;
  }

  const color = COLOR_LABELS[piece.color];
  const role = ROLE_LABELS[piece.role] ?? piece.role;
  return `${squarePrefix}, ${role} ${color}`;
}

function getAdjacentSquare(
  square: Key,
  direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
): Key | null {
  const file = square.match(/[a-k]/)?.[0] as (typeof FILES)[number] | undefined;
  const rank = square.slice(file?.length ?? 0);
  if (!file) return null;

  const fileIndex = FILES.indexOf(file);
  const rankIndex = RANKS.indexOf(rank as (typeof RANKS)[number]);
  if (fileIndex === -1 || rankIndex === -1) return null;

  if (direction === 'ArrowLeft' && fileIndex > 0)
    return `${FILES[fileIndex - 1]}${RANKS[rankIndex]}` as Key;
  if (direction === 'ArrowRight' && fileIndex < FILES.length - 1)
    return `${FILES[fileIndex + 1]}${RANKS[rankIndex]}` as Key;
  if (direction === 'ArrowUp' && rankIndex < RANKS.length - 1)
    return `${FILES[fileIndex]}${RANKS[rankIndex + 1]}` as Key;
  if (direction === 'ArrowDown' && rankIndex > 0)
    return `${FILES[fileIndex]}${RANKS[rankIndex - 1]}` as Key;

  return null;
}

export function LessonView({ lessonId, subjectId }: LessonViewProps) {
  setLearnLocale('vi');

  const lesson = useMemo(() => getLessonById(lessonId), [lessonId]);
  const lessonContext = useMemo(() => getLessonContext(lessonId), [lessonId]);
  const nextLesson = useMemo(
    () => getNextLessonInSubject(subjectId, lessonId),
    [lessonId, subjectId]
  );
  const sessionKey = getLessonSessionKey(subjectId, lessonId);

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const boardHandleRef = useRef<BoardHandle | null>(null);
  const engineRef = useRef<LearnEngine | null>(null);
  const hintSystemRef = useRef<HintSystem | null>(null);
  const persistedMovesRef = useRef<PersistedMove[]>([]);
  const successFlashTimeoutRef = useRef<number | null>(null);
  const failureFlashTimeoutRef = useRef<number | null>(null);

  const [status, setStatus] = useState<LearnStatus>('loading');
  const [moveCount, setMoveCount] = useState(0);
  const [completionResult, setCompletionResult] = useState<LessonResult | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [manualHintLevel, setManualHintLevel] = useState<'none' | 'subtle' | 'medium' | 'explicit'>(
    'none'
  );
  const [scenarioProgress, setScenarioProgress] = useState<number | null>(null);
  const [scenarioTotal, setScenarioTotal] = useState<number | null>(null);
  const [shapes, setShapes] = useState<BoardDrawShape[]>([]);
  const [highlights, setHighlights] = useState<SquareClasses>(new Map());
  const [ariaMessage, setAriaMessage] = useState('');

  const initializeLearnStore = useLearnStore((state) => state.initialize);
  const { authState, saveLessonProgress } = useAuthLearnProgress();
  const getTotalCompletedCount = useLearnStore((s) => s.getTotalCompletedCount);

  const syncBoardAccessibility = useCallback(() => {
    const boardHandle = boardHandleRef.current;
    const container = boardContainerRef.current;
    if (!boardHandle || !container) return;

    window.requestAnimationFrame(() => {
      const boardState = boardHandle.getState();
      const squares = Array.from(container.querySelectorAll('square')) as Array<
        HTMLElement & { cgKey?: Key }
      >;
      const squareElements = new Map<Key, HTMLElement>();

      for (const square of squares) {
        const key = square.cgKey;
        if (!key) continue;

        squareElements.set(key, square);
        square.dataset.lessonFocusable = 'true';
        square.tabIndex = 0;
        square.setAttribute('role', 'button');
        square.setAttribute(
          'aria-label',
          describeSquare(key, boardState.pieces.get(key), boardState.selected?.square === key)
        );
        square.setAttribute('aria-pressed', boardState.selected?.square === key ? 'true' : 'false');

        square.onkeydown = (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            square.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            square.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            square.click();
            return;
          }

          if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            return;
          }

          event.preventDefault();
          const nextSquare = getAdjacentSquare(
            key,
            event.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
          );
          if (!nextSquare) return;

          const nextElement = squareElements.get(nextSquare);
          nextElement?.focus();
        };
      }
    });
  }, []);

  const applyHintType = useCallback(
    (type: HintLevel | undefined) => {
      if (!lesson) return;

      switch (type) {
        case 'pulse-target':
        case 'highlight-piece': {
          const pulseHighlights = new Map(highlights);
          for (const square of lesson.targetSquares ?? []) {
            pulseHighlights.set(square as Key, 'lesson-target lesson-pulse');
          }
          boardHandleRef.current?.setHighlight(pulseHighlights);
          setHintText(null);
          break;
        }
        case 'show-arrow':
        case 'show-path': {
          if (lesson.arrows?.length) {
            const hintShapes = lesson.arrows.map(toBoardDrawShape);
            setShapes(hintShapes);
            boardHandleRef.current?.setShapes(hintShapes);
          }
          setHintText(null);
          break;
        }
        case 'show-instruction':
        case 'show-tutorial': {
          const translatedHint = lesson.hint
            ? (tLessonHint(subjectId, lessonId, lesson.hint) ?? lesson.hint)
            : null;
          setHintText(translatedHint);
          if (translatedHint) {
            setAriaMessage(translatedHint);
          }
          break;
        }
        default: {
          setHintText(null);
          boardHandleRef.current?.setHighlight(highlights);
          if (shapes.length > 0) {
            boardHandleRef.current?.setShapes(shapes);
          }
        }
      }

      syncBoardAccessibility();
    },
    [highlights, lesson, lessonId, shapes, subjectId, syncBoardAccessibility]
  );

  const restoreBoardState = useCallback(() => {
    const boardHandle = boardHandleRef.current;
    const engine = engineRef.current;
    if (!boardHandle || !engine) return;

    boardHandle.set({
      fen: engine.fen,
      lastMove: undefined,
      movable: {
        dests: movesToDests(engine.getPossibleMoves())
      }
    });

    if (highlights.size > 0) {
      boardHandle.setHighlight(highlights);
    }
    if (shapes.length > 0) {
      boardHandle.setShapes(shapes);
    }

    syncBoardAccessibility();
  }, [highlights, shapes, syncBoardAccessibility]);

  const boardConfig = useMemo(() => {
    if (!lesson) return {};

    return {
      fen: lesson.startFen,
      orientation: 'red' as const,
      viewOnly: false,
      movable: {
        color: 'red' as const,
        dests: new Map() as Dests,
        showDests: lesson.showValidMoves !== false,
        events: {
          after: (orig: { square: Key; type: string }, dest: { square: Key; stay?: boolean }) => {
            const engine = engineRef.current;
            if (!engine) return;

            const accepted = engine.makeMove(orig.square, dest.square, dest.stay);
            if (!accepted) {
              restoreBoardState();
              return;
            }

            persistedMovesRef.current = [
              ...persistedMovesRef.current,
              { orig: orig.square, dest: dest.square, stay: dest.stay }
            ];
            writeLessonSession(sessionKey, persistedMovesRef.current);
          }
        }
      },
      events: {
        change: () => {
          syncBoardAccessibility();
        },
        select: (orig: { square: Key }) => {
          const info = engineRef.current?.handleSelect(orig.square);
          if (info) {
            const selectionMessage = info.hasPiece
              ? describeSquare(
                  info.square,
                  boardHandleRef.current?.getState().pieces.get(info.square),
                  true
                )
              : `Ô ${info.square}, trống`;
            setAriaMessage(selectionMessage);
          }
          syncBoardAccessibility();
        }
      },
      drawable: {
        enabled: false,
        autoShapes: [] as BoardDrawShape[]
      },
      highlight: {
        lastMove: true,
        custom: new Map() as SquareClasses
      },
      animation: {
        enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: 200
      }
    };
  }, [lesson, restoreBoardState, sessionKey, syncBoardAccessibility]);

  const boardHandle = useBoard(boardContainerRef, boardConfig);

  useEffect(() => {
    initializeLearnStore();
  }, [initializeLearnStore]);

  useEffect(() => {
    boardHandleRef.current = boardHandle;
    if (boardHandle) {
      restoreBoardState();
    }
  }, [boardHandle, restoreBoardState]);

  useEffect(() => {
    if (!lesson) return;

    const baseHighlights: SquareClasses = new Map();

    for (const square of lesson.highlightSquares ?? []) {
      baseHighlights.set(square as Key, 'lesson-highlight');
    }

    for (const square of lesson.targetSquares ?? []) {
      const existing = baseHighlights.get(square as Key);
      baseHighlights.set(square as Key, existing ? `${existing} lesson-target` : 'lesson-target');
    }

    setHighlights(baseHighlights);

    const baseShapes = lesson.arrows?.map(toBoardDrawShape) ?? [];
    setShapes(baseShapes);
  }, [lesson]);

  useEffect(() => {
    if (!lesson) return;

    const engine = createLearnEngine({
      onMove: (count, fen) => {
        setMoveCount(count);
        setFailureMessage(null);

        const boardHandleInstance = boardHandleRef.current;
        boardHandleInstance?.setFen(fen);
        boardHandleInstance?.setDests(movesToDests(engine.getPossibleMoves()));
        boardHandleInstance?.setHighlight(highlights);
        hintSystemRef.current?.onMove();

        if (engine.hasScenario && engine.scenario) {
          setScenarioProgress(Math.min(engine.moveCount, engine.scenario.playerMoveCount));
        }

        if (persistedMovesRef.current.length > 0) {
          const lastMove = persistedMovesRef.current[persistedMovesRef.current.length - 1];
          const successHighlight = new Map(highlights);
          successHighlight.set(lastMove.dest, 'lesson-target lesson-correct-move');
          boardHandleInstance?.setHighlight(successHighlight);

          if (successFlashTimeoutRef.current) {
            window.clearTimeout(successFlashTimeoutRef.current);
          }

          successFlashTimeoutRef.current = window.setTimeout(() => {
            boardHandleRef.current?.setHighlight(highlights);
          }, 700);

          setAriaMessage(`Nước đi ${count} chính xác.`);
        }

        setManualHintLevel('none');

        syncBoardAccessibility();
      },
      onComplete: (result: LessonResult) => {
        setCompletionResult(result);
        setStatus('completed');
        setHintText(null);
        setManualHintLevel('none');
        hintSystemRef.current?.stop();
        saveLessonProgress(result.lessonId, result.stars, result.moveCount);
        clearLessonSession(sessionKey);
        persistedMovesRef.current = [];
        setAriaMessage('Hoàn thành bài học!');
      },
      onStateChange: (newStatus: LearnStatus) => {
        setStatus(newStatus);
      },
      onOpponentMove: (_move, fen) => {
        window.setTimeout(() => {
          boardHandleRef.current?.setFen(fen);
          boardHandleRef.current?.setDests(movesToDests(engine.getPossibleMoves()));
          syncBoardAccessibility();
        }, engine.scenario?.opponentDelay ?? 500);
      },
      onFail: (_expected, actual) => {
        const message =
          (lesson.failureMessage
            ? tLessonFailureMessage(subjectId, lessonId, lesson.failureMessage)
            : undefined) ?? 'Sai rồi. Thử lại nhé!';

        setFailureMessage(message);
        hintSystemRef.current?.onWrongMove();
        setAriaMessage(message);

        restoreBoardState();

        const failureHighlights = new Map(highlights);
        failureHighlights.set(actual as Key, 'lesson-wrong-move');
        boardHandleRef.current?.setHighlight(failureHighlights);

        if (failureFlashTimeoutRef.current) {
          window.clearTimeout(failureFlashTimeoutRef.current);
        }

        failureFlashTimeoutRef.current = window.setTimeout(() => {
          boardHandleRef.current?.setHighlight(highlights);
        }, 900);
      },
      onShapes: (boardShapes: BoardShape[]) => {
        const nextShapes = boardShapes.map(toBoardDrawShape);
        setShapes(nextShapes);
        boardHandleRef.current?.setShapes(nextShapes);
        syncBoardAccessibility();
      },
      onSelect: (info: SquareInfo) => {
        if (info.feedbackCode === 'hint.moveToTarget') {
          setAriaMessage(`Hãy thử ô ${info.square}.`);
        }
      }
    });

    engineRef.current = engine;
    engine.loadLesson(lessonId);

    const storedMoves = readLessonSession(sessionKey);
    if (storedMoves.length > 0) {
      const replayedMoves: PersistedMove[] = [];
      let replayFailed = false;

      for (const move of storedMoves) {
        if (!engine.makeMove(move.orig, move.dest, move.stay)) {
          replayFailed = true;
          break;
        }

        replayedMoves.push(move);
      }

      if (replayFailed) {
        clearLessonSession(sessionKey);
      } else {
        persistedMovesRef.current = replayedMoves;
        if (replayedMoves.length > 0) {
          setAriaMessage(`Đã khôi phục ${replayedMoves.length} nước trước đó.`);
        }
      }
    }

    if (engine.hasScenario && engine.scenario) {
      setScenarioProgress(Math.min(engine.moveCount, engine.scenario.playerMoveCount));
      setScenarioTotal(engine.scenario.playerMoveCount);
    } else {
      setScenarioProgress(null);
      setScenarioTotal(null);
    }

    if (lesson.allowHints !== false) {
      const hintSystem = createHintSystem(lesson.hints ?? { enabled: true }, {
        onHintChange: (level, type) => {
          setManualHintLevel(level);
          if (level === 'none') {
            setHintText(null);
            boardHandleRef.current?.setHighlight(highlights);
            if (shapes.length > 0) {
              boardHandleRef.current?.setShapes(shapes);
            }
            return;
          }

          applyHintType(type);
        }
      });

      hintSystemRef.current = hintSystem;
      hintSystem.start();
    }

    restoreBoardState();

    return () => {
      hintSystemRef.current?.stop();
      hintSystemRef.current = null;
      engineRef.current = null;

      if (successFlashTimeoutRef.current) {
        window.clearTimeout(successFlashTimeoutRef.current);
      }
      if (failureFlashTimeoutRef.current) {
        window.clearTimeout(failureFlashTimeoutRef.current);
      }
    };
  }, [
    applyHintType,
    highlights,
    lesson,
    lessonId,
    restoreBoardState,
    saveLessonProgress,
    sessionKey,
    shapes,
    subjectId,
    syncBoardAccessibility
  ]);

  const handleRestart = useCallback(() => {
    engineRef.current?.restart();
    persistedMovesRef.current = [];
    clearLessonSession(sessionKey);
    setCompletionResult(null);
    setFailureMessage(null);
    setHintText(null);
    setManualHintLevel('none');
    setMoveCount(0);
    setStatus('ready');
    setScenarioProgress(engineRef.current?.scenario?.playerMoveCount ? 0 : null);
    hintSystemRef.current?.reset();
    hintSystemRef.current?.start();
    setAriaMessage('Bài học đã được đặt lại.');
    restoreBoardState();
  }, [restoreBoardState, sessionKey]);

  const handleUndo = useCallback(() => {
    const didUndo = engineRef.current?.undo();
    if (!didUndo) return;

    persistedMovesRef.current = persistedMovesRef.current.slice(0, -1);
    if (persistedMovesRef.current.length === 0) {
      clearLessonSession(sessionKey);
    } else {
      writeLessonSession(sessionKey, persistedMovesRef.current);
    }

    setMoveCount(engineRef.current?.moveCount ?? 0);
    setFailureMessage(null);
    setHintText(null);
    setManualHintLevel('none');
    setAriaMessage('Đã hoàn tác nước đi gần nhất.');
    restoreBoardState();
  }, [restoreBoardState, sessionKey]);

  const handleRequestHint = useCallback(() => {
    if (!lesson) return;

    const nextLevel =
      manualHintLevel === 'none' ? 'subtle' : manualHintLevel === 'subtle' ? 'medium' : 'explicit';
    const nextType = getNextHintType(lesson, manualHintLevel);
    setManualHintLevel(nextLevel);
    applyHintType(nextType);
  }, [applyHintType, lesson, manualHintLevel]);

  if (!lesson || !lessonContext) {
    return null;
  }

  const instruction = tLessonInstruction(subjectId, lessonId, lesson.instruction);
  const content = lesson.content ? tLessonContent(subjectId, lessonId, lesson.content) : null;
  const successMessage =
    (lesson.successMessage
      ? tLessonSuccessMessage(subjectId, lessonId, lesson.successMessage)
      : undefined) ?? 'Tuyệt vời! Bạn đã hoàn thành bài học!';

  const nextLessonHref = nextLesson ? `/learn/${subjectId}/${nextLesson.id}` : null;
  const subjectHref = `/learn/${subjectId}`;

  const boardElement = (
    <div
      ref={boardContainerRef}
      className="aspect-square w-full max-w-[600px]"
      role="application"
      aria-label="Bàn cờ tư lệnh"
    />
  );

  const panelElement = (
    <div className="flex h-full flex-col p-[var(--space-4)]">
      <div className="space-y-[var(--space-2)]">
        <span className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
          Bài {lessonContext.positionInSubject}/{lessonContext.totalInSubject}
        </span>

        {scenarioProgress !== null && scenarioTotal !== null ? (
          <div className="text-[var(--text-sm)] font-medium text-[var(--color-text)]">
            Bước {Math.max(1, Math.min(scenarioProgress + 1, scenarioTotal))}/{scenarioTotal}
          </div>
        ) : null}
      </div>

      {content ? <LessonMarkdown content={content} className="mt-[var(--space-3)]" /> : null}

      <p className="mt-[var(--space-3)] text-[var(--text-base)] text-[var(--color-text)]">
        {instruction}
      </p>

      {lesson.showMoveCount && moveCount > 0 ? (
        <div className="mt-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          Số nước: {moveCount}
        </div>
      ) : null}

      {failureMessage ? (
        <div
          className="mt-[var(--space-3)] border border-[var(--color-error)] bg-[var(--color-error-bg,transparent)] p-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-error)]"
          role="alert"
        >
          {failureMessage}
        </div>
      ) : null}

      <HintDisplay text={hintText} className="mt-[var(--space-3)]" />

      {completionResult ? (
        <div className="mt-[var(--space-4)]">
          <LessonCompletion
            result={completionResult}
            successMessage={successMessage}
            nextLessonHref={nextLessonHref}
            subjectHref={subjectHref}
            onRestart={handleRestart}
          />
          <SignupPrompt
            isAuthenticated={authState === 'authenticated'}
            completedLessonCount={getTotalCompletedCount()}
            className="mt-[var(--space-4)]"
          />
        </div>
      ) : null}

      {status !== 'completed' ? (
        <div className="mt-auto flex flex-wrap gap-[var(--space-2)] pt-[var(--space-4)]">
          {lesson.allowHints !== false ? (
            <button
              type="button"
              onClick={handleRequestHint}
              className="min-h-[44px] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
            >
              Gợi ý
            </button>
          ) : null}
          {lesson.allowUndo !== false ? (
            <button
              type="button"
              onClick={handleUndo}
              className="min-h-[44px] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
            >
              Hoàn tác
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleRestart}
            className="min-h-[44px] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
          >
            Làm lại
          </button>
        </div>
      ) : null}

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ariaMessage}
      </div>
    </div>
  );

  return <LessonLayout board={boardElement} panel={panelElement} />;
}
