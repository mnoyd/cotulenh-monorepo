<script lang="ts">
  import type { GameSession } from '$lib/game-session.svelte';
  import { logRender } from '$lib/debug';
  import { Button } from '$lib/components/ui/button';
  import { CheckCircle2, XCircle } from 'lucide-svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();

  interface Props {
    session: GameSession;
  }

  let { session }: Props = $props();

  let isDeploySession = $derived(session.isDeploySession);
  let canCommit = $derived(session.canCommitSession);

  $effect(() => {
    logRender('🔄 [RENDER] MoveConfirmPanel.svelte component rendered', {
      isDeploySession,
      canCommit
    });
  });
</script>

<div class="move-confirm-panel">
  {#if isDeploySession}
    <Button
      variant="secondary"
      size="sm"
      class="h-8 text-xs flex-1 border border-mw-secondary/50 font-bold tracking-widest text-black uppercase transition-all hover:shadow-[0_0_15px_var(--color-mw-secondary)] hover:brightness-110 disabled:opacity-50"
      onclick={() => session.commitSession()}
      disabled={!canCommit}
    >
      <CheckCircle2 class="w-3.5 h-3.5 mr-1.5" />
      {i18n.t('common.commit')}
    </Button>
    <Button
      variant="destructive"
      size="sm"
      class="h-8 text-xs flex-1 border border-destructive/50 font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_15px_var(--color-destructive)] hover:brightness-110"
      onclick={() => session.cancelSession()}
    >
      <XCircle class="w-3.5 h-3.5 mr-1.5" />
      {i18n.t('common.cancel')}
    </Button>
  {/if}
</div>

<style>
  .move-confirm-panel {
    display: flex;
    width: 100%;
    height: 3rem; /* Fixed: h-8 buttons (2rem) + padding (1rem) */
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(15, 15, 20, 0.95);
    border: 1px solid var(--mw-border-color, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    margin-top: 0.25rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    box-sizing: border-box;
  }
</style>
