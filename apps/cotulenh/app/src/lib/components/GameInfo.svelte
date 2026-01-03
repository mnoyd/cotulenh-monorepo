<script lang="ts">
  import { getTurnColorName } from '$lib/utils';
  import { gameState } from '$lib/stores/game.svelte';
  import * as Card from '$lib/components/ui/card';
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

<Card.Root class="border-mw-border bg-mw-bg-panel/50 backdrop-blur-sm shadow-lg">
  <Card.Header class="p-3 pb-2">
    <Card.Title
      class="text-xs font-mono uppercase text-muted-foreground tracking-widest flex items-center gap-2"
    >
      <Timer class="w-3 h-3" />
      Mission Status
    </Card.Title>
  </Card.Header>
  <Card.Content class="p-3 pt-0 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-bold text-foreground">Current Turn</span>
      <Badge
        variant={badgeVariant}
        class="font-mono uppercase tracking-wider px-3 py-0.5 text-xs animate-pulse-glow"
      >
        {turn ? getTurnColorName(turn) : 'INITIALIZING...'}
      </Badge>
    </div>

    {#if check}
      <Alert.Root variant="destructive" class="py-2 px-3 border-destructive/50 bg-destructive/10">
        <ShieldAlert class="w-4 h-4" />
        <AlertDescription class="text-xs font-bold ml-2">COMMANDER UNDER THREAT</AlertDescription>
      </Alert.Root>
    {/if}

    {#if status !== 'playing'}
      <Alert.Root class="py-2 px-3 border-mw-primary/50 bg-mw-primary/10">
        <Trophy class="w-4 h-4 text-mw-primary" />
        <AlertTitle class="text-sm font-bold text-mw-primary ml-2">
          {status === 'checkmate' ? 'VICTORY' : status.toUpperCase()}
        </AlertTitle>
        <AlertDescription class="text-xs text-muted-foreground ml-9 mt-0">
          Operation {status === 'checkmate' ? 'Successful' : 'Terminated'}.
        </AlertDescription>
      </Alert.Root>
    {/if}
  </Card.Content>
</Card.Root>
