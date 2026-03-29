<script lang="ts">
  interface Props {
    open?: boolean;
    friend?: { id: string; displayName: string; rating?: number };
    onsubmit?: (config: unknown) => void;
    translate?: (key: string) => string;
  }

  let { open = false }: Props = $props();
</script>

{#if open}
  <div data-testid="friend-challenge-dialog-stub"></div>
{/if}
