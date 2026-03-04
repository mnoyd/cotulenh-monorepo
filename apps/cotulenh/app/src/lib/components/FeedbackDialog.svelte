<script lang="ts">
  import { page } from '$app/stores';
  import { getI18n } from '$lib/i18n/index.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';
  import { submitFeedback } from '$lib/feedback/submit';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  const i18n = getI18n();
  const MAX_LENGTH = 2000;

  let message = $state('');
  let submitting = $state(false);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error(i18n.t('feedback.emptyMessage'));
      return;
    }

    submitting = true;
    try {
      const result = await submitFeedback(
        $page.data.supabase,
        message,
        i18n.locale,
        $page.data.user?.id
      );

      if (result.error) {
        toast.error(i18n.t('feedback.error'));
      } else {
        toast.success(i18n.t('feedback.success'));
        message = '';
        open = false;
      }
    } catch {
      toast.error(i18n.t('feedback.error'));
    } finally {
      submitting = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="feedback-dialog">
    <Dialog.Header>
      <Dialog.Title>{i18n.t('feedback.title')}</Dialog.Title>
      <Dialog.Description>{i18n.t('feedback.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="feedback-form">
      <textarea
        class="feedback-textarea"
        bind:value={message}
        placeholder={i18n.t('feedback.messagePlaceholder')}
        maxlength={MAX_LENGTH}
        rows={5}
        disabled={submitting}
      ></textarea>
      <div class="char-count">{message.length}/{MAX_LENGTH}</div>
    </div>

    <Dialog.Footer>
      <Button onclick={handleSubmit} disabled={submitting || !message.trim()}>
        {submitting ? i18n.t('feedback.submitting') : i18n.t('feedback.submit')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .feedback-form {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0;
  }

  .feedback-textarea {
    width: 100%;
    min-height: 120px;
    padding: 0.75rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #444);
    border-radius: 0.5rem;
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-ui);
    font-size: 0.875rem;
    resize: vertical;
  }

  .feedback-textarea:focus {
    outline: none;
    border-color: var(--theme-primary, #06b6d4);
    box-shadow: 0 0 0 1px var(--theme-primary, #06b6d4);
  }

  .feedback-textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .feedback-textarea::placeholder {
    color: var(--theme-text-secondary, #aaa);
  }

  .char-count {
    text-align: right;
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
    font-family: var(--font-mono);
  }
</style>
