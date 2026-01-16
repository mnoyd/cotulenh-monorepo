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
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    clock?: ChessClockState;
    onTimeout?: (loser: ClockColor) => void;
    flipped?: boolean;
    class?: string;
  }

  let { clock: externalClock, onTimeout, flipped = false, class: className }: Props = $props();

  const i18n = getI18n();

  // Reactive translations
  let tPause = $derived.by(() => i18n.t('clock.pause'));
  let tResume = $derived.by(() => i18n.t('clock.resume'));
  let tStart = $derived.by(() => i18n.t('clock.start'));
  let tReset = $derived.by(() => i18n.t('common.reset'));
  let tRed = $derived.by(() => i18n.t('common.red'));
  let tBlue = $derived.by(() => i18n.t('common.blue'));
  let tRanOutOfTime = $derived.by(() => i18n.t('clock.ranOutOfTime'));

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
        const color = loser === 'r' ? tRed : tBlue;
        toast.error(tRanOutOfTime.replace('{color}', color));
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
        <span class="text-xs">{tPause}</span>
      {:else}
        <Play class="w-3.5 h-3.5" />
        <span class="text-xs">{clock.status === 'paused' ? tResume : tStart}</span>
      {/if}
    </Button>

    <Button variant="ghost" size="sm" onclick={handleReset} class="gap-1.5">
      <RotateCcw class="w-3.5 h-3.5" />
      <span class="text-xs">{tReset}</span>
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
