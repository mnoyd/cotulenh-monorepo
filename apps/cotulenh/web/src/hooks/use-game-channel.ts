'use client';

import { useEffect, useRef, useCallback } from 'react';

import { getGame } from '@/lib/actions/game';
import { createClient } from '@/lib/supabase/browser';
import { useGameStore } from '@/stores/game-store';

type GameEventEnvelope = {
  type: 'deploy_submitted' | 'deploy_commit' | 'move' | 'clock_sync' | 'game_end';
  payload: Record<string, unknown>;
  seq: number;
};

type LegacyGameEvent = {
  seq: number;
  color?: 'r' | 'b';
  sans?: { red: string[]; blue: string[] };
  fen?: string;
  san?: string;
  red?: number;
  blue?: number;
};

export function useGameChannel(gameId: string | null) {
  const lastSeenSeqRef = useRef(0);
  const processedEventKeysRef = useRef<Set<string>>(new Set());
  const setOpponentDeploySubmitted = useGameStore((s) => s.setOpponentDeploySubmitted);
  const applyDeployCommit = useGameStore((s) => s.applyDeployCommit);
  const syncFromServerState = useGameStore((s) => s.syncFromServerState);
  const applyOpponentMove = useGameStore((s) => s.applyOpponentMove);
  const syncClocks = useGameStore((s) => s.syncClocks);
  const handleGameEnd = useGameStore((s) => s.handleGameEnd);
  const setLastSeenSeq = useGameStore((s) => s.setLastSeenSeq);

  const refreshFromServer = useCallback(async () => {
    if (!gameId) return;

    const result = await getGame(gameId);
    if (result.success) {
      syncFromServerState(result.data.game_state);
    }
  }, [gameId, syncFromServerState]);

  const handleEvent = useCallback(
    async (rawEvent: GameEventEnvelope | LegacyGameEvent) => {
      const isEnvelope = 'type' in rawEvent && 'payload' in rawEvent;
      const eventType = isEnvelope ? rawEvent.type : undefined;
      const eventPayload = isEnvelope ? rawEvent.payload : rawEvent;
      const eventSeq = rawEvent.seq;
      const eventKey = `${eventSeq}:${eventType ?? 'legacy'}`;

      // Discard stale or malformed events.
      if (!Number.isFinite(eventSeq) || eventSeq <= 0) return;
      if (processedEventKeysRef.current.has(eventKey)) return;
      if (eventSeq < lastSeenSeqRef.current) return;

      // Detect gaps and trigger full state re-fetch.
      if (lastSeenSeqRef.current > 0 && eventSeq > lastSeenSeqRef.current + 1) {
        await refreshFromServer();
      }
      lastSeenSeqRef.current = Math.max(lastSeenSeqRef.current, eventSeq);
      setLastSeenSeq(lastSeenSeqRef.current);
      processedEventKeysRef.current.add(eventKey);

      if (processedEventKeysRef.current.size > 200) {
        const keys = Array.from(processedEventKeysRef.current).slice(-100);
        processedEventKeysRef.current = new Set(keys);
      }

      switch (eventType) {
        case 'deploy_submitted': {
          const { color } = eventPayload as { color: 'r' | 'b' };
          setOpponentDeploySubmitted(color);
          break;
        }
        case 'deploy_commit': {
          const { sans, fen } = eventPayload as {
            sans: { red: string[]; blue: string[] };
            fen: string;
          };
          applyDeployCommit(sans.red, sans.blue, fen);
          break;
        }
        case 'move': {
          const { san, fen } = eventPayload as { san: string; fen: string };
          applyOpponentMove(san, fen);
          break;
        }
        case 'clock_sync': {
          const { red, blue } = eventPayload as { red: number; blue: number };
          syncClocks(red, blue);
          break;
        }
        case 'game_end': {
          const { status, winner, result_reason } = eventPayload as {
            status: string;
            winner: 'red' | 'blue' | null;
            result_reason: string | null;
          };
          handleGameEnd(status as import('@/lib/types/game').GameStatus, winner, result_reason);
          break;
        }
      }
    },
    [
      setOpponentDeploySubmitted,
      applyDeployCommit,
      applyOpponentMove,
      syncClocks,
      handleGameEnd,
      refreshFromServer,
      setLastSeenSeq
    ]
  );

  useEffect(() => {
    if (!gameId) return;

    lastSeenSeqRef.current = 0;
    processedEventKeysRef.current = new Set();

    const supabase = createClient();
    const channel = supabase.channel(`game:${gameId}`);

    channel
      .on('broadcast', { event: 'deploy_submitted' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'deploy_commit' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'move' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'clock_sync' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, handleEvent]);
}
