import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/lib/components/LobbyEmptyState.svelte');

describe('LobbyEmptyState component', () => {
  const source = readFileSync(componentPath, 'utf8');

  it('accepts oncreate callback prop', () => {
    expect(source).toContain('oncreate');
    expect(source).toContain('() => void');
  });

  it('displays no open challenges message', () => {
    expect(source).toContain("i18n.t('lobby.noOpenChallenges')");
  });

  it('has create game action button', () => {
    expect(source).toContain("i18n.t('lobby.createGame')");
    expect(source).toContain('onclick={oncreate}');
  });

  it('has play AI action button', () => {
    expect(source).toContain("i18n.t('lobby.playAI')");
    expect(source).toContain("goto('/play/practice')");
  });

  it('uses empty-state layout class', () => {
    expect(source).toContain('empty-state');
  });

  it('uses text-link class for action button', () => {
    expect(source).toContain('text-link');
  });
});
