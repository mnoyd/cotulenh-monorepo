<script lang="ts">
  import { onMount, onDestroy, type Component } from 'svelte';

  interface Props {
    /**
     * Component to render on desktop (viewport >= breakpoint)
     */
    desktop: Component;
    /**
     * Component to render on mobile (viewport < breakpoint)
     */
    mobile: Component;
    /**
     * Breakpoint in pixels. Defaults to 768 (matches Tailwind's md:)
     */
    breakpoint?: number;
    /**
     * Loading snippet to show during SSR/hydration
     */
    loading?: import('svelte').Snippet;
  }

  let { desktop, mobile, breakpoint = 768, loading }: Props = $props();

  // Start with null to minimize SSR flash
  let isMobile = $state<boolean | null>(null);

  function checkViewport() {
    isMobile = window.innerWidth < breakpoint;
  }

  onMount(() => {
    checkViewport();
    window.addEventListener('resize', checkViewport);
  });

  onDestroy(() => {
    window.removeEventListener('resize', checkViewport);
  });
</script>

{#if isMobile === null}
  {#if loading}
    {@render loading()}
  {:else}
    <!-- Minimal SSR placeholder -->
    <div class="responsive-loading" aria-live="polite" aria-busy="true">
      <div class="responsive-spinner"></div>
    </div>
  {/if}
{:else if isMobile}
  {@const Mobile = mobile}
  <Mobile />
{:else}
  {@const Desktop = desktop}
  <Desktop />
{/if}

<style>
  .responsive-loading {
    height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-bg-dark, #000);
  }

  .responsive-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #333;
    border-top-color: var(--theme-primary, #22c55e);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
