'use client';

import { useEffect, useRef, useCallback } from 'react';

import { getGame } from '@/lib/actions/game';
import { createClient } from '@/lib/supabase/browser';
import { useGameStore } from '@/stores/game-store';
import type { GameStatus } from '@/lib/types/game';
import type { RatingChanges } from '@/stores/game-store';

type GameEventEnvelope = {
  type:
    | 'deploy_submitted'
    | 'deploy_commit'
    | 'move'
    | 'clock_sync'
    | 'game_end'
    | 'draw_offer'
    | 'draw_declined'
    | 'draw_offer_expired'
    | 'takeback_request'
    | 'takeback_accept'
    | 'takeback_declined'
    | 'takeback_expired'
    | 'rematch_offer'
    | 'rematch_accepted'
    | 'rematch_declined'
    | 'rematch_expired';
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
  const handleDrawOffer = useGameStore((s) => s.handleDrawOffer);
  const handleDrawDeclined = useGameStore((s) => s.handleDrawDeclined);
  const handleDrawExpired = useGameStore((s) => s.handleDrawExpired);
  const handleTakebackRequest = useGameStore((s) => s.handleTakebackRequest);
  const handleTakebackAccept = useGameStore((s) => s.handleTakebackAccept);
  const handleTakebackDeclined = useGameStore((s) => s.handleTakebackDeclined);
  const handleTakebackExpired = useGameStore((s) => s.handleTakebackExpired);
  const handleRematchOffer = useGameStore((s) => s.handleRematchOffer);
  const handleRematchAccepted = useGameStore((s) => s.handleRematchAccepted);
  const handleRematchDeclined = useGameStore((s) => s.handleRematchDeclined);
  const handleRematchExpired = useGameStore((s) => s.handleRematchExpired);
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
          const { status, winner, result_reason, rating_changes } = eventPayload as {
            status: GameStatus;
            winner: 'red' | 'blue' | null;
            result_reason: string | null;
            rating_changes?: RatingChanges | null;
          };
          handleGameEnd(status, winner, result_reason, rating_changes ?? null);
          break;
        }
        case 'draw_offer': {
          const { offering_color } = eventPayload as { offering_color: 'red' | 'blue' };
          handleDrawOffer(offering_color);
          break;
        }
        case 'draw_declined': {
          handleDrawDeclined();
          break;
        }
        case 'draw_offer_expired': {
          handleDrawExpired();
          break;
        }
        case 'takeback_request': {
          const { requesting_color } = eventPayload as { requesting_color: 'red' | 'blue' };
          handleTakebackRequest(requesting_color);
          break;
        }
        case 'takeback_accept': {
          const { fen: takebackFen } = eventPayload as { fen: string };
          handleTakebackAccept(takebackFen);
          break;
        }
        case 'takeback_declined': {
          handleTakebackDeclined();
          break;
        }
        case 'takeback_expired': {
          handleTakebackExpired();
          break;
        }
        case 'rematch_offer': {
          const { offering_color } = eventPayload as { offering_color: 'red' | 'blue' };
          handleRematchOffer(offering_color);
          break;
        }
        case 'rematch_accepted': {
          const { new_game_id } = eventPayload as { new_game_id: string };
          handleRematchAccepted(new_game_id);
          break;
        }
        case 'rematch_declined': {
          handleRematchDeclined();
          break;
        }
        case 'rematch_expired': {
          handleRematchExpired();
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
      handleDrawOffer,
      handleDrawDeclined,
      handleDrawExpired,
      handleTakebackRequest,
      handleTakebackAccept,
      handleTakebackDeclined,
      handleTakebackExpired,
      handleRematchOffer,
      handleRematchAccepted,
      handleRematchDeclined,
      handleRematchExpired,
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
      .on('broadcast', { event: 'draw_offer' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'draw_declined' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'draw_offer_expired' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'takeback_request' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'takeback_accept' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'takeback_declined' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'takeback_expired' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'rematch_offer' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'rematch_accepted' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'rematch_declined' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .on('broadcast', { event: 'rematch_expired' }, ({ payload }: { payload: unknown }) => {
        void handleEvent(payload as GameEventEnvelope);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, handleEvent]);
}
