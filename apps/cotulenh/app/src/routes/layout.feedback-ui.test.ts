import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutPath = resolve(process.cwd(), 'src/routes/+layout.svelte');
const feedbackDialogPath = resolve(process.cwd(), 'src/lib/components/FeedbackDialog.svelte');

describe('feedback UI wiring', () => {
  it('wires feedback entry points in desktop and mobile layout navigation', () => {
    const source = readFileSync(layoutPath, 'utf8');

    expect(source).toContain("import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';");
    expect(source).toContain('let feedbackOpen = $state(false);');

    // Desktop sidebar entry point (icon-only rail, no text labels)
    expect(source).toContain('onclick={() => (feedbackOpen = true)}');

    // Mobile dropdown entry point
    expect(source).toContain('<MessageSquare size={16} />');

    // Dialog render binding
    expect(source).toContain('<FeedbackDialog bind:open={feedbackOpen} />');
  });

  it('shows error and supports resubmission flow in feedback dialog implementation', () => {
    const source = readFileSync(feedbackDialogPath, 'utf8');

    expect(source).toContain('async function handleSubmit()');
    expect(source).toContain("toast.error(i18n.t('feedback.error'))");
    expect(source).toContain('submitting = true;');
    expect(source).toContain('submitting = false;');
    expect(source).toContain('disabled={submitting || !message.trim()}');
  });
});
