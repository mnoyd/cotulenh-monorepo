<script lang="ts">
  import type { CoTuLenh } from '@cotulenh/core';
  import type { UIDeployState } from '$lib/types/game';
  import { Button } from '$lib/components/ui/button';

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
  let canCommit = $derived(deployState && game ? game.canCommitSession() : false);
</script>

<div
  class="mt-2 flex min-h-[40px] items-center rounded-sm border-l-2 border-mw-border bg-mw-bg-panel p-2 shadow-[inset_0_0_10px_rgba(0,243,255,0.05)] backdrop-blur-sm"
>
  {#if hasSession}
    <div class="flex w-full gap-2">
      <Button
        variant="secondary"
        size="sm"
        class="h-8 flex-1 border border-mw-secondary/50 font-bold tracking-widest text-black uppercase transition-all hover:shadow-[0_0_15px_var(--color-mw-secondary)] hover:brightness-110 disabled:opacity-50"
        onclick={onCommit}
        disabled={!canCommit}
      >
        Commit Deploy
      </Button>
      <Button
        variant="destructive"
        size="sm"
        class="h-8 flex-1 border border-destructive/50 font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_15px_var(--color-destructive)] hover:brightness-110"
        onclick={onCancel}
      >
        Abort
      </Button>
    </div>
  {:else}
    <div
      class="w-full text-center text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase"
    >
      Right Click on Piece to Open Deploy
    </div>
  {/if}
</div>
