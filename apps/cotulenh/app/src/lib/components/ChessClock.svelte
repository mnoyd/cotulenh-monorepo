<script lang="ts">
  import { cn } from '$lib/utils';
  import {
    type ChessClockState,
    type ClockColor,
    formatClockTime
  } from '$lib/clock/clock.svelte';
  import { Timer } from 'lucide-svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    clock: ChessClockState;
    side: ClockColor;
    class?: string;
  }

  let { clock, side, class: className }: Props = $props();

  const i18n = getI18n();

  // Reactive translations
  let tRed = $derived.by(() => i18n.t('common.red'));
  let tBlue = $derived.by(() => i18n.t('common.blue'));
  let tActive = $derived.by(() => i18n.t('clock.active'));
  let tTimeout = $derived.by(() => i18n.t('clock.timeout'));

  let time = $derived(side === 'r' ? clock.redTime : clock.blueTime);
  let isActive = $derived(clock.activeSide === side && clock.isRunning);
  let isTimeout = $derived(clock.status === 'timeout' && time === 0);

  let progressPercent = $derived.by(() => {
    const initial = side === 'r' ? clock.initialRedTime : clock.initialBlueTime;
    if (initial === 0) return 0;
    return Math.max(0, Math.min(100, (time / initial) * 100));
  });

  let isLowTime = $derived(time < 30_000 && time > 0);
  let isCriticalTime = $derived(time < 10_000 && time > 0);

  let sideLabel = $derived(side === 'r' ? tRed : tBlue);
  let sideColor = $derived(side === 'r' ? 'text-red-500' : 'text-mw-primary');
  let sideBg = $derived(side === 'r' ? 'bg-red-500' : 'bg-mw-primary');
  let sideBorder = $derived(side === 'r' ? 'border-red-500/30' : 'border-mw-primary/30');
</script>

<div
  class={cn(
    'relative flex flex-col rounded-sm border bg-mw-bg-panel overflow-hidden transition-all duration-200',
    sideBorder,
    isActive && 'ring-2 ring-offset-1 ring-offset-mw-bg',
    isActive && (side === 'r' ? 'ring-red-500/50' : 'ring-mw-primary/50'),
    isTimeout && 'opacity-60',
    className
  )}
>
  <!-- Header -->
  <div
    class={cn(
      'flex items-center justify-between px-2 py-1 border-b border-mw-border/30',
      isActive ? (side === 'r' ? 'bg-red-500/10' : 'bg-mw-primary/10') : 'bg-mw-surface/50'
    )}
  >
    <div class="flex items-center gap-1.5">
      <Timer class={cn('w-3 h-3', isActive ? sideColor : 'text-muted-foreground')} />
      <span
        class={cn(
          'text-[0.6rem] font-mono uppercase tracking-widest',
          isActive ? sideColor : 'text-muted-foreground'
        )}
      >
        {sideLabel}
      </span>
    </div>
    {#if isActive}
      <span class="text-[0.5rem] font-mono uppercase tracking-wider text-muted-foreground animate-pulse">
        {tActive}
      </span>
    {/if}
  </div>

  <!-- Time Display -->
  <div class="flex-1 flex items-center justify-center p-3">
    <span
      class={cn(
        'font-mono text-2xl md:text-3xl font-bold tabular-nums tracking-tight transition-colors',
        isTimeout && 'text-red-600',
        isCriticalTime && !isTimeout && 'text-red-500 animate-pulse',
        isLowTime && !isCriticalTime && !isTimeout && 'text-amber-500',
        !isLowTime && !isTimeout && (isActive ? sideColor : 'text-foreground')
      )}
    >
      {formatClockTime(time)}
    </span>
  </div>

  <!-- Progress Bar -->
  <div class="h-1 w-full bg-mw-surface/50">
    <div
      class={cn(
        'h-full transition-all duration-100',
        isTimeout && 'bg-red-600',
        isCriticalTime && !isTimeout && 'bg-red-500',
        isLowTime && !isCriticalTime && !isTimeout && 'bg-amber-500',
        !isLowTime && !isTimeout && sideBg
      )}
      style="width: {progressPercent}%"
    ></div>
  </div>

  <!-- Timeout Overlay -->
  {#if isTimeout}
    <div class="absolute inset-0 flex items-center justify-center bg-black/50">
      <span class="font-mono text-xs uppercase tracking-widest text-red-500">{tTimeout}</span>
    </div>
  {/if}
</div>
