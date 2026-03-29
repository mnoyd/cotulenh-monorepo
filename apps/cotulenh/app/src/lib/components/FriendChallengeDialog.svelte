<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { TIME_PRESETS, type GameConfig } from '$lib/invitations/types';

  const i18n = getI18n();

  interface Props {
    open: boolean;
    friend: { id: string; displayName: string; rating?: number };
    onsubmit: (config: GameConfig & { toUserId: string }) => void;
    translate?: (key: TranslationKey) => string;
  }

  let { open = $bindable(), friend, onsubmit, translate = i18n.t }: Props = $props();

  let selectedPresetIndex = $state(7); // Default to 15+10 (Rapid)
  let isRated = $state(false);
  let preferredColor = $state<'random' | 'red' | 'blue'>('random');

  let dialogTitle = $derived(
    translate('friend.challenge.dialog.title').replace('{name}', friend.displayName)
  );
  let dialogRating = $derived(
    translate('friend.challenge.dialog.rating').replace('{rating}', String(friend.rating ?? ''))
  );

  function handleSubmit() {
    const preset = TIME_PRESETS[selectedPresetIndex];
    onsubmit({
      timeMinutes: preset.config.timeMinutes,
      incrementSeconds: preset.config.incrementSeconds,
      isRated,
      preferredColor,
      toUserId: friend.id
    });
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="challenge-dialog">
    <Dialog.Header>
      <Dialog.Title>{dialogTitle}</Dialog.Title>
      {#if friend.rating != null}
        <Dialog.Description>{dialogRating}</Dialog.Description>
      {/if}
    </Dialog.Header>

    <div class="dialog-body">
      <!-- Time control presets -->
      <div class="field-group">
        <span class="field-label">{translate('invitation.timeControl.title')}</span>
        <div class="toggle-group">
          {#each TIME_PRESETS as preset, idx}
            {#if idx > 0}
              <span class="separator">·</span>
            {/if}
            <button
              type="button"
              class:active={selectedPresetIndex === idx}
              onclick={() => { selectedPresetIndex = idx; }}
            >
              {preset.config.timeMinutes}+{preset.config.incrementSeconds}
            </button>
          {/each}
        </div>
      </div>

      <!-- Rated/Casual toggle -->
      <div class="field-group">
        <div class="toggle-group" role="group">
          <button
            type="button"
            class:active={!isRated}
            onclick={() => { isRated = false; }}
          >
            {translate('lobby.casual')}
          </button>
          <span class="separator">·</span>
          <button
            type="button"
            class:active={isRated}
            onclick={() => { isRated = true; }}
          >
            {translate('lobby.rated')}
          </button>
        </div>
      </div>

      <div class="field-group">
        <span class="field-label">{translate('friend.challenge.colorChoice.label')}</span>
        <div class="toggle-group" role="group">
          <button
            type="button"
            class:active={preferredColor === 'random'}
            onclick={() => { preferredColor = 'random'; }}
          >
            {translate('friend.challenge.colorChoice.random')}
          </button>
          <span class="separator">·</span>
          <button
            type="button"
            class:active={preferredColor === 'red'}
            onclick={() => { preferredColor = 'red'; }}
          >
            {translate('common.red')}
          </button>
          <span class="separator">·</span>
          <button
            type="button"
            class:active={preferredColor === 'blue'}
            onclick={() => { preferredColor = 'blue'; }}
          >
            {translate('common.blue')}
          </button>
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>
        {translate('common.cancel')}
      </Button>
      <Button onclick={handleSubmit}>
        {translate('friend.challenge.action.send')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .dialog-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem 0;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
  }
</style>
