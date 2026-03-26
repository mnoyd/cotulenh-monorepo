import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/lib/components/OpenChallengeRow.svelte');

describe('OpenChallengeRow component', () => {
  const source = readFileSync(componentPath, 'utf8');

  it('accepts challenge, currentUserId, loadingAccept, loadingCancel, onaccept, oncancel props', () => {
    expect(source).toContain('challenge');
    expect(source).toContain('currentUserId');
    expect(source).toContain('loadingAccept');
    expect(source).toContain('loadingCancel');
    expect(source).toContain('onaccept');
    expect(source).toContain('oncancel');
  });

  it('derives isOwn by comparing challenge creator to current user', () => {
    expect(source).toContain('isOwn');
    expect(source).toContain('challenge.fromUser.id === currentUserId');
  });

  it('displays time control label from gameConfig', () => {
    expect(source).toContain('timeLabel');
    expect(source).toContain('challenge.gameConfig.timeMinutes');
    expect(source).toContain('challenge.gameConfig.incrementSeconds');
  });

  it('shows rated or casual label from gameConfig.isRated', () => {
    expect(source).toContain('matchTypeLabel');
    expect(source).toContain('challenge.gameConfig.isRated');
    expect(source).toContain("i18n.t('lobby.rated')");
    expect(source).toContain("i18n.t('lobby.casual')");
  });

  it('shows yourChallenge text and cancel button for own challenges', () => {
    expect(source).toContain("i18n.t('lobby.yourChallenge')");
    expect(source).toContain("i18n.t('lobby.cancel')");
    expect(source).toContain('oncancel(challenge.id)');
  });

  it('shows display name and accept button for other challenges', () => {
    expect(source).toContain('challenge.fromUser.displayName');
    expect(source).toContain("i18n.t('lobby.accept')");
    expect(source).toContain('onaccept(challenge.id)');
  });

  it('disables accept button when loadingAccept is true', () => {
    expect(source).toContain('disabled={loadingAccept}');
  });

  it('disables cancel button when loadingCancel is true', () => {
    expect(source).toContain('disabled={loadingCancel}');
  });

  it('uses flat-list-item class for consistent styling', () => {
    expect(source).toContain('flat-list-item');
  });
});
