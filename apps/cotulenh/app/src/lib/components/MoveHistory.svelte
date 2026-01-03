<script lang="ts">
  import { gameState } from '$lib/stores/game.svelte';
  import type { CoTuLenh } from '@cotulenh/core';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { ScrollArea } from 'bits-ui';
  import { cn } from '$lib/utils';
  import { History, Eye } from 'lucide-svelte';

  let { game } = $props<{ game: CoTuLenh | null }>();

  let historyContainer: HTMLDivElement;

  // Use $derived to create reactive values from gameState
  let history = $derived(gameState.history);
  let historyViewIndex = $derived(gameState.historyViewIndex);

  // Use $effect to auto-scroll when history changes
  $effect(() => {
    const idx = historyViewIndex;
    let cleanup: (() => void) | undefined;

    if (historyContainer) {
      if (idx === -1) {
        const timeoutId = setTimeout(() => {
          historyContainer.scrollTop = historyContainer.scrollHeight;
        }, 0);
        cleanup = () => clearTimeout(timeoutId);
      } else {
        const buttons = historyContainer.querySelectorAll('.move-chip');
        const activeBtn = buttons[idx] as HTMLElement;
        if (activeBtn) {
          activeBtn.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
      }
    }
    return cleanup;
  });
</script>

<Card.Root
  class="h-full flex flex-col border-mw-border bg-mw-bg-panel/50 backdrop-blur-sm shadow-lg overflow-hidden"
>
  <Card.Header
    class="p-3 pb-2 border-b border-border/50 shrink-0 flex flex-row items-center justify-between space-y-0"
  >
    <Card.Title
      class="text-xs font-mono uppercase text-muted-foreground tracking-widest flex items-center gap-2"
    >
      <History class="w-3 h-3" />
      Mission Log
    </Card.Title>
    {#if historyViewIndex !== -1}
      <Button
        variant="ghost"
        size="sm"
        class="h-6 text-[0.65rem] text-mw-warning border border-mw-warning/50 hover:bg-mw-warning/10 hover:text-mw-warning animate-pulse"
        onclick={() => {
          if (game) gameState.cancelPreview(game);
        }}
      >
        <Eye class="w-3 h-3 mr-1" />
        RESUME LIVE
      </Button>
    {/if}
  </Card.Header>

  <div
    class="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
    bind:this={historyContainer}
  >
    {#if history.length === 0}
      <div
        class="h-full flex items-center justify-center text-xs text-muted-foreground italic tracking-wide opacity-50"
      >
        -- NO DATA RECORDED --
      </div>
    {:else}
      <div class="flex flex-wrap gap-2 content-start">
        {#each history as move, index}
          <button
            class={cn(
              'move-chip relative flex items-center gap-2 px-2 py-1 border text-xs font-mono transition-all rounded-sm',
              index % 2 === 0
                ? 'border-red-900/50 bg-red-950/30 text-red-200 hover:bg-red-900/40'
                : 'border-blue-900/50 bg-blue-950/30 text-blue-200 hover:bg-blue-900/40',
              (index === historyViewIndex ||
                (historyViewIndex === -1 && index === history.length - 1)) &&
                'ring-1 ring-mw-primary border-mw-primary bg-mw-primary/10 text-white shadow-[0_0_10px_rgba(0,243,255,0.2)]'
            )}
            onclick={() => gameState.previewMove(index)}
          >
            <span class="text-[0.6rem] opacity-50"
              >{(Math.floor(index / 2) + 1).toString().padStart(2, '0')}</span
            >
            <span class="font-bold tracking-wide">{move.san}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</Card.Root>
