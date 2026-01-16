<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
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

  // Get i18n instance - needs to be module level, but we'll use derived values for reactivity
  const i18n = getI18n();

  // Track locale for reactivity
  let locale = $derived(i18n.locale);

  // Reactive translations that update when locale changes
  let tMissionStatus = $derived.by(() => i18n.t('game.missionStatus'));
  let tCurrentTurn = $derived.by(() => i18n.t('game.currentTurn'));
  let tRed = $derived.by(() => i18n.t('game.red'));
  let tBlue = $derived.by(() => i18n.t('game.blue'));
  let tVictory = $derived.by(() => i18n.t('game.victory'));
  let tWinner = $derived.by(() => i18n.t('game.winner'));
  let tMateDetected = $derived.by(() => i18n.t('game.mateDetected'));
  let tStalemate = $derived.by(() => i18n.t('game.stalemate'));
  let tNoLegalMoves = $derived.by(() => i18n.t('game.noLegalMoves'));
  let tDraw = $derived.by(() => i18n.t('game.draw'));
  let tOperationTerminated = $derived.by(() => i18n.t('game.operationTerminated'));

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

  // Helper for turn color name using i18n
  function getTurnColorName(color: 'r' | 'b' | null | undefined): string {
    if (!color) return '...';
    return color === 'r' ? tRed : tBlue;
  }

  // Log renders in effect to track reactive changes
  $effect(() => {
    logRender('🔄 [RENDER] GameInfo.svelte component rendered', { turn, winner, check, status, locale });
  });
</script>

<Card.Root
  class="border-mw-border bg-mw-bg-panel rounded-sm overflow-hidden hud-corners panel-inset"
>
  <!-- Header / Status Bar -->
  <Card.Header
    class="px-2 py-1.5 md:px-3 md:py-2 flex flex-row items-center justify-between border-b border-mw-border/30 bg-mw-surface/50 space-y-0"
  >
    <div
      class="flex items-center gap-1.5 md:gap-2 text-[0.65rem] md:text-xs font-mono uppercase text-muted-foreground tracking-widest"
    >
      <Timer class="w-3 h-3 md:w-3.5 md:h-3.5" />
      <span>{tMissionStatus}</span>
    </div>

    {#if status === 'playing'}
      <div class="flex items-center gap-1.5 md:gap-2">
        <span
          class="hidden sm:inline-block text-[0.6rem] md:text-[0.65rem] uppercase text-muted-foreground font-mono tracking-wider"
          >{tCurrentTurn}</span
        >
        <Badge
          variant="outline"
          class="font-mono uppercase tracking-wider px-1.5 py-0 md:px-2 md:py-0.5 text-[0.6rem] md:text-xs border bg-opacity-10 {turnBorder} {turnBg} {turnColor}"
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
            title={tVictory}
            icon={Trophy}
            textColor={winnerColor}
            bgColor={winnerBg}
            borderColor={winnerBorder}
          >
            <div class="h-px w-10 md:w-16 {winnerBg} bg-current opacity-30 my-1.5 md:my-2"></div>

            <p
              class="text-xs md:text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground"
            >
              {tWinner}: <span class="font-bold {winnerColor}">{getTurnColorName(winner)}</span>
            </p>

            <div
              class="mt-2 md:mt-4 px-2 py-0.5 md:px-3 md:py-1 bg-black/40 rounded text-[0.55rem] md:text-[0.6rem] font-mono text-muted-foreground border border-white/5"
            >
              {tMateDetected}
            </div>
          </MissionResult>
        {:else if status === 'stalemate'}
          <MissionResult
            title={tStalemate}
            icon={Handshake}
            textColor="text-amber-500"
            bgColor="bg-amber-500/10"
            borderColor="border-amber-500/30"
          >
            <p
              class="text-[0.65rem] md:text-xs font-mono uppercase tracking-widest text-amber-500/70"
            >
              {tNoLegalMoves}
            </p>
          </MissionResult>
        {:else}
          <MissionResult
            title={tDraw}
            icon={Skull}
            textColor="text-zinc-400"
            bgColor="bg-zinc-500/10"
            borderColor="border-zinc-500/30"
          >
            <p class="text-[0.65rem] md:text-xs font-mono uppercase tracking-widest text-zinc-500">
              {tOperationTerminated}
            </p>
          </MissionResult>
        {/if}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
