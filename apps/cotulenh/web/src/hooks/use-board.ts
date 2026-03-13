import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Api, Config, OrigMove, DestMove, Dests, SquareClasses } from '@cotulenh/board';

// DrawShape is internal to the board package; use structural type
type BoardDrawShape = { orig: string; dest?: string; brush: string; piece?: unknown };

export interface BoardHandle {
  setFen: (fen: string) => void;
  setDests: (dests: Dests) => void;
  setShapes: (shapes: BoardDrawShape[]) => void;
  setHighlight: (highlights: SquareClasses) => void;
  move: (orig: OrigMove, dest: DestMove) => void;
  destroy: () => void;
  set: (config: Config) => void;
  getState: () => Api['state'];
}

function createHandle(api: Api): BoardHandle {
  return {
    setFen: (fen: string) => api.set({ fen }),
    setDests: (dests: Dests) => api.set({ movable: { dests } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setShapes: (shapes: BoardDrawShape[]) => api.setShapes(shapes as any),
    setHighlight: (highlights: SquareClasses) => api.set({ highlight: { custom: highlights } }),
    move: (orig: OrigMove, dest: DestMove) => api.move(orig, dest),
    destroy: () => api.destroy(),
    set: (cfg: Config) => api.set(cfg),
    getState: () => api.state
  };
}

export function useBoard(
  containerRef: RefObject<HTMLElement | null>,
  config: Config
): BoardHandle | null {
  const apiRef = useRef<Api | null>(null);
  const configRef = useRef(config);
  const [handle, setHandle] = useState<BoardHandle | null>(null);

  configRef.current = config;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    import('@cotulenh/board').then(({ CotulenhBoard }) => {
      if (cancelled) return;

      const api = CotulenhBoard(el, configRef.current);
      apiRef.current = api;
      setHandle(createHandle(api));
    });

    return () => {
      cancelled = true;
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
      setHandle(null);
    };
  }, [containerRef]);

  useEffect(() => {
    if (!apiRef.current) return;
    apiRef.current.set(config);
  }, [config]);

  return handle;
}
