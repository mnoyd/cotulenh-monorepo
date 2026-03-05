import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editorPath = resolve(process.cwd(), 'src/routes/board-editor/EditorDesktop.svelte');

describe('board editor redesign', () => {
  it('uses CommandCenter', () => {
    const source = readFileSync(editorPath, 'utf8');
    expect(source).toContain('CommandCenter');
  });

  it('has no decorative header', () => {
    const source = readFileSync(editorPath, 'utf8');
    expect(source).not.toContain('editor-header');
  });

  it('uses text-link for editor controls', () => {
    const source = readFileSync(editorPath, 'utf8');
    expect(source).toContain('text-link');
  });

  it('uses section-header and divider', () => {
    const source = readFileSync(editorPath, 'utf8');
    expect(source).toContain('section-header');
    expect(source).toContain('divider');
  });
});
