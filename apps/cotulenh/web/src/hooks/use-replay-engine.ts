import { useMemo, useState, useCallback, useEffect } from 'react';
import { CoTuLenh, DEFAULT_POSITION } from '@cotulenh/core';

type ReplayEngine = {
  currentFen: string;
  currentIndex: number;
  totalMoves: number;
  lastMoveSan: string | null;
  fenAtIndex: (index: number) => string;
  goTo: (index: number) => void;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;
};

export function useReplayEngine(moveHistory: string[]): ReplayEngine {
  const fens = useMemo(() => {
    const engine = new CoTuLenh(DEFAULT_POSITION);
    const result: string[] = [engine.fen()];

    for (const san of moveHistory) {
      const moveResult = engine.move(san);
      if (!moveResult) break;
      result.push(engine.fen());
    }

    return result;
  }, [moveHistory]);

  const totalMoves = fens.length - 1;
  const [currentIndex, setCurrentIndex] = useState(totalMoves);

  // Keep index valid if move history changes after initialization.
  useEffect(() => {
    setCurrentIndex((index) => Math.max(0, Math.min(index, totalMoves)));
  }, [totalMoves]);

  const fenAtIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, totalMoves));
      return fens[clampedIndex] ?? fens[0];
    },
    [fens, totalMoves]
  );

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, totalMoves)));
    },
    [totalMoves]
  );

  const goFirst = useCallback(() => setCurrentIndex(0), []);
  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setCurrentIndex((i) => Math.max(0, Math.min(i + 1, totalMoves))),
    [totalMoves]
  );
  const goLast = useCallback(() => setCurrentIndex(totalMoves), [totalMoves]);

  const lastMoveSan =
    currentIndex > 0 && currentIndex <= moveHistory.length ? moveHistory[currentIndex - 1] : null;

  return {
    currentFen: fens[currentIndex] ?? fens[0],
    currentIndex,
    totalMoves,
    lastMoveSan,
    fenAtIndex,
    goTo,
    goFirst,
    goPrev,
    goNext,
    goLast
  };
}
