<script lang="ts">
  import { cn } from '$lib/utils';
  import {
    type ChessClockState,
    createChessClock,
    TIME_PRESETS,
    type ClockConfig,
    type ClockColor
  } from '$lib/clock/clock.svelte';
  import ChessClock from './ChessClock.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Play, Pause, RotateCcw } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  interface Props {
    clock?: ChessClockState;
    onTimeout?: (loser: ClockColor) => void;
    flipped?: boolean;
    class?: string;
  }

  let { clock: externalClock, onTimeout, flipped = false, class: className }: Props = $props();

  const defaultConfig: ClockConfig = {
    red: TIME_PRESETS.blitz5_3,
    blue: TIME_PRESETS.blitz5_3
  };

  const ownClock = createChessClock(defaultConfig);
  let clock = $derived(externalClock ?? ownClock);

  $effect(() => {
    return () => {
      ownClock.destroy();
    };
  });

  $effect(() => {
    if (onTimeout) {
      clock.onTimeout = (loser: ClockColor) => {
        toast.error(`${loser === 'r' ? 'Red' : 'Blue'} ran out of time!`);
        onTimeout(loser);
      };
    }
  });

  function handleStartPause() {
    if (clock.status === 'idle') {
      clock.start('r');
    } else if (clock.isRunning) {
      clock.pause();
    } else if (clock.status === 'paused') {
      clock.resume();
    }
  }

  function handleReset() {
    clock.reset();
  }

  function handleTap(side: ClockColor) {
    if (clock.status === 'idle') {
      clock.start(side === 'r' ? 'b' : 'r');
    } else if (clock.isRunning && clock.activeSide === side) {
      clock.switchSide();
    }
  }

  let topSide = $derived<ClockColor>(flipped ? 'r' : 'b');
  let bottomSide = $derived<ClockColor>(flipped ? 'b' : 'r');
</script>

<div class={cn('flex flex-col gap-2', className)}>
  <!-- Top Clock (opponent) -->
  <button
    type="button"
    class="w-full text-left"
    onclick={() => handleTap(topSide)}
    disabled={clock.status === 'timeout'}
  >
    <ChessClock {clock} side={topSide} />
  </button>

  <!-- Controls -->
  <div class="flex items-center justify-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onclick={handleStartPause}
      disabled={clock.status === 'timeout'}
      class="gap-1.5"
    >
      {#if clock.isRunning}
        <Pause class="w-3.5 h-3.5" />
        <span class="text-xs">PAUSE</span>
      {:else}
        <Play class="w-3.5 h-3.5" />
        <span class="text-xs">{clock.status === 'paused' ? 'RESUME' : 'START'}</span>
      {/if}
    </Button>

    <Button variant="ghost" size="sm" onclick={handleReset} class="gap-1.5">
      <RotateCcw class="w-3.5 h-3.5" />
      <span class="text-xs">RESET</span>
    </Button>
  </div>

  <!-- Bottom Clock (player) -->
  <button
    type="button"
    class="w-full text-left"
    onclick={() => handleTap(bottomSide)}
    disabled={clock.status === 'timeout'}
  >
    <ChessClock {clock} side={bottomSide} />
  </button>
</div>
