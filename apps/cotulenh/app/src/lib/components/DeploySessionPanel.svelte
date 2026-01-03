<script lang="ts">
  import type { CoTuLenh } from '@cotulenh/core';
  import type { UIDeployState } from '$lib/types/game';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Plane, CheckCircle2, XCircle } from 'lucide-svelte';
  import { gameState } from '$lib/stores/game.svelte';

  let {
    game,
    deployState,
    onCommit,
    onCancel
  }: {
    game: CoTuLenh | null;
    deployState: UIDeployState | null;
    onCommit: () => void;
    onCancel: () => void;
  } = $props();

  let hasSession = $derived(deployState !== null);
  let canCommit = $derived.by(() => {
    void gameState.deployVersion;
    return deployState && game ? game.canCommitSession() : false;
  });
</script>

{#if hasSession}
  <Card.Root class="border-mw-border bg-mw-bg-panel/50 backdrop-blur-sm shadow-lg mt-2">
    <Card.Header class="p-2 pb-1 border-b border-border/50">
      <Card.Title
        class="text-[0.65rem] font-mono uppercase text-muted-foreground tracking-widest flex items-center gap-2"
      >
        <Plane class="w-3 h-3" />
        Deployment Control
      </Card.Title>
    </Card.Header>
    <Card.Content class="p-2">
      <div class="flex w-full gap-2">
        <Button
          variant="secondary"
          size="sm"
          class="h-7 text-xs flex-1 border border-mw-secondary/50 font-bold tracking-widest text-black uppercase transition-all hover:shadow-[0_0_15px_var(--color-mw-secondary)] hover:brightness-110 disabled:opacity-50"
          onclick={onCommit}
          disabled={!canCommit}
        >
          <CheckCircle2 class="w-3 h-3 mr-1" />
          Commit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          class="h-7 text-xs flex-1 border border-destructive/50 font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_15px_var(--color-destructive)] hover:brightness-110"
          onclick={onCancel}
        >
          <XCircle class="w-3 h-3 mr-1" />
          Abort
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
{/if}
