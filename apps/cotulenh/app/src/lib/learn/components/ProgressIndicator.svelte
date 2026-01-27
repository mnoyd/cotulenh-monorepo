<script lang="ts">
  interface Props {
    /** Progress percentage (0-100) */
    value: number;
    /** Size of the indicator */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to show the numeric value */
    showValue?: boolean;
    /** Custom class */
    class?: string;
  }

  let { value, size = 'md', showValue = false, class: className = '' }: Props = $props();

  const circumference = 2 * Math.PI * 45; // r=45
  const offset = $derived(circumference - (value / 100) * circumference);
</script>

<div class="progress-container {size} {className}">
  {#if showValue}
    <div class="value">{Math.round(value)}%</div>
  {/if}

  <svg viewBox="0 0 100 100" class="progress-ring">
    <!-- Background circle -->
    <circle class="track" cx="50" cy="50" r="45" />
    <!-- Progress circle -->
    <circle
      class="indicator"
      cx="50"
      cy="50"
      r="45"
      transform="rotate(-90 50 50)"
      style:stroke-dasharray={circumference}
      style:stroke-dashoffset={offset}
    />
  </svg>
</div>

<style>
  .progress-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sm {
    width: 24px;
    height: 24px;
    font-size: 0.6rem;
  }
  .md {
    width: 48px;
    height: 48px;
    font-size: 0.8rem;
  }
  .lg {
    width: 64px;
    height: 64px;
    font-size: 1rem;
  }

  .value {
    position: absolute;
    font-weight: bold;
    color: var(--text-secondary);
  }

  .progress-ring {
    width: 100%;
    height: 100%;
  }

  circle {
    fill: none;
    stroke-width: 10;
    stroke-linecap: round;
  }

  .track {
    stroke: var(--surface-3);
  }

  .indicator {
    stroke: var(--primary);
    transition: stroke-dashoffset 0.5s ease;
  }
</style>
