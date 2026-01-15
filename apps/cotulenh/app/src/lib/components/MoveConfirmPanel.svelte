<script lang="ts">
  import type { GameSession } from '$lib/game-session.svelte';
  import { logRender } from '$lib/debug';
  import { Button } from '$lib/components/ui/button';
  import { CheckCircle2, XCircle } from 'lucide-svelte';

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

{#if isDeploySession}
  <div class="flex w-full gap-2 p-2 border-t border-white/10 bg-black/40 backdrop-blur-sm">
    <Button
      variant="secondary"
      size="sm"
      class="h-8 text-xs flex-1 border border-mw-secondary/50 font-bold tracking-widest text-black uppercase transition-all hover:shadow-[0_0_15px_var(--color-mw-secondary)] hover:brightness-110 disabled:opacity-50"
      onclick={() => session.commitSession()}
      disabled={!canCommit}
    >
      <CheckCircle2 class="w-3.5 h-3.5 mr-1.5" />
      Commit
    </Button>
    <Button
      variant="destructive"
      size="sm"
      class="h-8 text-xs flex-1 border border-destructive/50 font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_15px_var(--color-destructive)] hover:brightness-110"
      onclick={() => session.cancelSession()}
    >
      <XCircle class="w-3.5 h-3.5 mr-1.5" />
      Cancel
    </Button>
  </div>
{/if}

<style>
</style>
