<script lang="ts">
  import type { GameSession } from '$lib/game-session.svelte';
  import { logRender } from '$lib/debug';

  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';
  import { History, Eye } from 'lucide-svelte';

  interface Props {
    session: GameSession;
  }

  let { session }: Props = $props();

  let historyContainer: HTMLDivElement;

  // Derive from session
  let history = $derived(session.history);
  let historyViewIndex = $derived(session.historyViewIndex);

  // Log renders
  logRender('🔄 [RENDER] MoveHistory.svelte component rendered', { historyLength: history.length, historyViewIndex });

  // Use $effect to auto-scroll when history changes
  $effect(() => {
    const idx = historyViewIndex;
    logRender('🔄 [RENDER] MoveHistory.svelte $effect (auto-scroll) triggered', { idx });
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

<div
  class="h-full flex flex-col border border-mw-border bg-mw-bg-panel overflow-hidden rounded-sm hud-corners panel-inset"
>
  <div
    class="px-2 py-1 border-b border-border/50 shrink-0 flex flex-row items-center justify-between h-6 bg-mw-surface/50"
  >
    <div
      class="text-[0.65rem] font-mono uppercase text-muted-foreground tracking-widest flex items-center gap-1.5"
    >
      <History class="w-3 h-3" />
      Mission Log
    </div>
    {#if historyViewIndex !== -1}
      <Button
        variant="ghost"
        size="sm"
        class="h-4 text-[0.6rem] px-1.5 text-mw-warning border border-mw-warning/50 hover:bg-mw-warning/10 hover:text-mw-warning"
        onclick={() => session.cancelPreview()}
      >
        <Eye class="w-2.5 h-2.5 mr-1" />
        LIVE
      </Button>
    {/if}
  </div>

  <div
    class="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
    bind:this={historyContainer}
  >
    {#if history.length === 0}
      <div
        class="h-full flex items-center justify-center text-[0.65rem] text-muted-foreground italic tracking-wide opacity-50"
      >
        -- NO DATA RECORDED --
      </div>
    {:else}
      <div class="flex flex-wrap gap-1.5 content-start">
        {#each history as move, index}
          <button
            class={cn(
              'move-chip relative flex items-center gap-1.5 px-1.5 py-0.5 border text-[0.65rem] font-mono rounded-sm',
              index % 2 === 0
                ? 'border-[color:var(--theme-team-red)]/30 bg-[color:var(--theme-team-red)]/10 text-[color:var(--theme-team-red)] hover:bg-[color:var(--theme-team-red)]/20'
                : 'border-[color:var(--theme-team-blue)]/30 bg-[color:var(--theme-team-blue)]/10 text-[color:var(--theme-team-blue)] hover:bg-[color:var(--theme-team-blue)]/20',
              (index === historyViewIndex ||
                (historyViewIndex === -1 && index === history.length - 1)) &&
                'ring-1 ring-mw-primary border-mw-primary bg-mw-primary/10 text-white'
            )}
            onclick={() => session.previewMove(index)}
          >
            <span class="text-[0.55rem] opacity-50"
              >{(Math.floor(index / 2) + 1).toString().padStart(2, '0')}</span
            >
            <span class="font-bold tracking-wide">{move.san}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
