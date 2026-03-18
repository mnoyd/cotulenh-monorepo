'use client';

import { useState, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils/cn';

type ChessClockProps = {
  timeMs: number;
  isRunning: boolean;
  isPlayerClock: boolean;
};

const TICK_INTERVAL = 100;
const CRITICAL_THRESHOLD = 30_000;
const DANGER_THRESHOLD = 10_000;

function formatClockTime(ms: number): string {
  const clamped = Math.max(0, ms);

  if (clamped < DANGER_THRESHOLD) {
    const totalTenths = Math.floor(clamped / 100);
    const secs = Math.floor(totalTenths / 10);
    const tenths = totalTenths % 10;
    return `0:${secs.toString().padStart(2, '0')}.${tenths}`;
  }

  const totalSeconds = Math.floor(clamped / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ChessClock({ timeMs, isRunning, isPlayerClock: _isPlayerClock }: ChessClockProps) {
  const [displayMs, setDisplayMs] = useState(timeMs);
  const [criticalAnnouncement, setCriticalAnnouncement] = useState('');
  const startTimeRef = useRef<number>(0);
  const baseMsRef = useRef(timeMs);
  const wasCriticalRef = useRef(timeMs < CRITICAL_THRESHOLD);

  // Reset local countdown when timeMs prop changes (server sync)
  useEffect(() => {
    baseMsRef.current = timeMs;
    startTimeRef.current = Date.now();
    if (!isRunning) {
      setDisplayMs(timeMs);
    }
  }, [timeMs, isRunning]);

  // Local countdown tick
  useEffect(() => {
    if (!isRunning) {
      setDisplayMs(baseMsRef.current);
      return;
    }

    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newMs = Math.max(0, baseMsRef.current - elapsed);
      setDisplayMs(newMs);
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [isRunning]);

  const isCritical = displayMs < CRITICAL_THRESHOLD;
  const isDanger = displayMs < DANGER_THRESHOLD;

  // Announce once when crossing into critical threshold.
  useEffect(() => {
    if (isCritical && !wasCriticalRef.current) {
      setCriticalAnnouncement('Con duoi 30 giay');
    }
    if (!isCritical && wasCriticalRef.current) {
      setCriticalAnnouncement('');
    }
    wasCriticalRef.current = isCritical;
  }, [isCritical]);

  return (
    <>
      <span
        role="timer"
        aria-live="off"
        className={cn(
          'font-[family-name:var(--font-mono)] tabular-nums',
          isCritical && 'text-[var(--color-clock-critical)]',
          isDanger && 'animate-clock-pulse bg-[var(--color-clock-critical,var(--color-error))]/10'
        )}
      >
        {formatClockTime(displayMs)}
      </span>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {criticalAnnouncement}
      </span>
    </>
  );
}
