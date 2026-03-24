import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(process.cwd(), 'src/routes/play/online/[gameId]/+page.svelte');

describe('online game disconnect UX wiring', () => {
  it('derives opponent reconnect countdown from opponentDisconnectAt and nowMs', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('let nowMs = $state(Date.now())');
    expect(source).toContain('if (!onlineSession?.opponentDisconnectAt) return 60;');
    expect(source).toContain('60 - elapsedSeconds');
    expect(source).toContain('setInterval(() => {');
  });

  it('passes timeout countdown props into the opponent reconnect banner', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('<ReconnectBanner');
    expect(source).toContain('mode="opponent"');
    expect(source).toContain('remainingSeconds={opponentReconnectSecondsRemaining}');
    expect(source).toContain('timedOut={opponentDisconnectTimedOut}');
  });

  it('shows paused clock copy on both player bars', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('onlineSession?.clocksPaused');
    expect(source.match(/game\.clocksPaused/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('locks the board visually and interactively while self disconnected', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('class:self-disconnected={showSelfDisconnectBanner}');
    expect(source).toContain('.board-sizer.self-disconnected');
    expect(source).toContain('pointer-events: none;');
    expect(source).toContain('opacity: 0.55;');
  });
});
