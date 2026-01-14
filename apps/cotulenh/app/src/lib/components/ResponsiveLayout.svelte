<script lang="ts">
  import { onMount, type Component } from 'svelte';

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
     * Breakpoint in pixels. Defaults to 1024 (matches Tailwind's lg:)
     */
    breakpoint?: number;
    /**
     * Loading snippet to show during SSR/hydration
     */
    loading?: import('svelte').Snippet;
  }

  let { desktop, mobile, breakpoint = 1024, loading }: Props = $props();

  // undefined = not yet determined (SSR/hydration)
  let isMobile = $state<boolean | undefined>(undefined);

  onMount(() => {
    isMobile = window.innerWidth < breakpoint;
  });
</script>

{#if isMobile === undefined}
  {#if loading}
    {@render loading()}
  {:else}
    <div class="responsive-loading">
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
