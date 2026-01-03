<script lang="ts">
  import { getTurnColorName } from '$lib/utils';
  import { gameState } from '$lib/stores/game.svelte';

  import { Badge } from '$lib/components/ui/badge';
  import * as Alert from '$lib/components/ui/alert';
  import AlertDescription from '$lib/components/ui/alert/alert-description.svelte';
  import AlertTitle from '$lib/components/ui/alert/alert-title.svelte';
  import { ShieldAlert, Trophy, Timer } from 'lucide-svelte';

  // Use $derived to create reactive values from gameState
  let turn = $derived(gameState.turn);
  let check = $derived(gameState.check);
  let status = $derived(gameState.status);

  // Helper for badge variant based on turn
  let badgeVariant = $derived(turn === 'r' ? 'destructive' : 'default');
</script>

<div class="border border-mw-border bg-mw-bg-panel/50 backdrop-blur-sm shadow-lg rounded-sm">
  <div class="px-2 py-1 flex flex-row items-center justify-between h-6 bg-mw-surface/50">
    <div
      class="flex items-center gap-1.5 text-[0.65rem] font-mono uppercase text-muted-foreground tracking-widest"
    >
      <Timer class="w-3 h-3" />
      Mission Status
    </div>
    <Badge
      variant={badgeVariant}
      class="font-mono uppercase tracking-wider px-1.5 py-0 text-[0.6rem] h-4 animate-pulse-glow"
    >
      {turn ? getTurnColorName(turn) : '...'}
    </Badge>
  </div>

  {#if check || status !== 'playing'}
    <div class="p-2 pt-1 flex flex-col gap-2">
      {#if check}
        <Alert.Root
          variant="destructive"
          class="py-1 px-2 border-destructive/50 bg-destructive/10 flex items-center gap-2"
        >
          <ShieldAlert class="w-3 h-3 shrink-0" />
          <AlertDescription class="text-[0.65rem] font-bold">
            COMMANDER UNDER THREAT
          </AlertDescription>
        </Alert.Root>
      {/if}

      {#if status !== 'playing'}
        <Alert.Root class="py-1 px-2 border-mw-primary/50 bg-mw-primary/10">
          <div class="flex items-center gap-2 mb-1">
            <Trophy class="w-3 h-3 text-mw-primary" />
            <AlertTitle class="text-xs font-bold text-mw-primary">
              {status === 'checkmate' ? 'VICTORY' : status.toUpperCase()}
            </AlertTitle>
          </div>
          <AlertDescription class="text-[0.65rem] text-muted-foreground">
            Operation {status === 'checkmate' ? 'Successful' : 'Terminated'}.
          </AlertDescription>
        </Alert.Root>
      {/if}
    </div>
  {/if}
</div>
