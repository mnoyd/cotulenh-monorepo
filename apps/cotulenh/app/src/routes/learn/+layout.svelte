<script lang="ts">
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

{#key $page.url.pathname}
  <div
    class="page-transition-wrapper"
    in:fly={{ x: 20, duration: 300, delay: 300, easing: cubicOut }}
    out:fly={{ x: -20, duration: 300, easing: cubicOut }}
  >
    {@render children()}
  </div>
{/key}

<style>
  .page-transition-wrapper {
    /* Ensure the wrapper takes up available space and doesn't collapse */
    width: 100%;
    /* Position absolute to allow overlap during transition if needed, 
       but standard flow is usually better for accessibility/layout.
       However, for cross-fading, grid overlap is often used. */
  }

  /* Grid trick for overlapping transitions */
  :global(.app-content) {
    display: grid;
    grid-template-areas: 'content';
  }

  .page-transition-wrapper {
    grid-area: content;
    width: 100%;
  }
</style>
