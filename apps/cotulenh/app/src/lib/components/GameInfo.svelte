<script lang="ts">
  import { getTurnColorName } from '$lib/utils';
  import type { GameSession } from '$lib/game-session.svelte';
  import { logRender } from '$lib/debug';

  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import { Trophy, Timer, Skull, Handshake } from 'lucide-svelte';

  import CheckAlert from './game-info/CheckAlert.svelte';
  import MissionResult from './game-info/MissionResult.svelte';

  interface Props {
    session: GameSession;
  }

  let { session }: Props = $props();

  // Derive from session
  let turn = $derived(session.turn);
  let winner = $derived(session.winner);
  let check = $derived(session.check);
  let status = $derived(session.status);

  // Helper for colors based on state
  let turnColor = $derived(turn === 'r' ? 'text-red-500' : 'text-mw-primary');
  let turnBg = $derived(turn === 'r' ? 'bg-red-500/10' : 'bg-mw-primary/10');
  let turnBorder = $derived(turn === 'r' ? 'border-red-500/30' : 'border-mw-primary/30');

  // Winner color logic
  let winnerColor = $derived(winner === 'r' ? 'text-red-500' : 'text-mw-primary');
  let winnerBg = $derived(winner === 'r' ? 'bg-red-500/10' : 'bg-mw-primary/10');
  let winnerBorder = $derived(winner === 'r' ? 'border-red-500/30' : 'border-mw-primary/30');

  // Log renders
  logRender('🔄 [RENDER] GameInfo.svelte component rendered', { turn, winner, check, status });
</script>

<Card.Root
  class="border-mw-border bg-mw-bg-panel/50 backdrop-blur-sm shadow-lg rounded-sm overflow-hidden"
>
  <!-- Header / Status Bar -->
  <Card.Header
    class="px-2 py-1.5 md:px-3 md:py-2 flex flex-row items-center justify-between border-b border-mw-border/30 bg-mw-surface/50 space-y-0"
  >
    <div
      class="flex items-center gap-1.5 md:gap-2 text-[0.65rem] md:text-xs font-mono uppercase text-muted-foreground tracking-widest"
    >
      <Timer class="w-3 h-3 md:w-3.5 md:h-3.5" />
      <span>Mission Status</span>
    </div>

    {#if status === 'playing'}
      <div class="flex items-center gap-1.5 md:gap-2">
        <span
          class="hidden sm:inline-block text-[0.6rem] md:text-[0.65rem] uppercase text-muted-foreground font-mono tracking-wider"
          >Current Turn</span
        >
        <Badge
          variant="outline"
          class="font-mono uppercase tracking-wider px-1.5 py-0 md:px-2 md:py-0.5 text-[0.6rem] md:text-xs border bg-opacity-10 {turnBorder} {turnBg} {turnColor} backdrop-blur-sm animate-pulse-glow"
        >
          {turn ? getTurnColorName(turn) : '...'}
        </Badge>
      </div>
    {/if}
  </Card.Header>

  <Card.Content class="p-0">
    {#if status === 'playing'}
      {#if check}
        <CheckAlert />
      {/if}
    {:else}
      <div class="p-2 md:p-4">
        {#if status === 'checkmate' && winner}
          <MissionResult
            title="VICTORY"
            icon={Trophy}
            textColor={winnerColor}
            bgColor={winnerBg}
            borderColor={winnerBorder}
          >
            <div class="h-px w-10 md:w-16 {winnerBg} bg-current opacity-30 my-1.5 md:my-2"></div>

            <p
              class="text-xs md:text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground"
            >
              Winner: <span class="font-bold {winnerColor}">{getTurnColorName(winner)}</span>
            </p>

            <div
              class="mt-2 md:mt-4 px-2 py-0.5 md:px-3 md:py-1 bg-black/40 rounded text-[0.55rem] md:text-[0.6rem] font-mono text-muted-foreground border border-white/5"
            >
              MATE DETECTED
            </div>
          </MissionResult>
        {:else if status === 'stalemate'}
          <MissionResult
            title="STALEMATE"
            icon={Handshake}
            textColor="text-amber-500"
            bgColor="bg-amber-500/10"
            borderColor="border-amber-500/30"
          >
            <p
              class="text-[0.65rem] md:text-xs font-mono uppercase tracking-widest text-amber-500/70"
            >
              No Legal Moves
            </p>
          </MissionResult>
        {:else}
          <MissionResult
            title="DRAW"
            icon={Skull}
            textColor="text-zinc-400"
            bgColor="bg-zinc-500/10"
            borderColor="border-zinc-500/30"
          >
            <p class="text-[0.65rem] md:text-xs font-mono uppercase tracking-widest text-zinc-500">
              Operation Terminated
            </p>
          </MissionResult>
        {/if}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
