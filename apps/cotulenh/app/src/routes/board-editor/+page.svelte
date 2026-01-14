<script lang="ts">
  import ResponsiveLayout from '$lib/components/ResponsiveLayout.svelte';
  import EditorDesktop from './EditorDesktop.svelte';
  import EditorMobile from './EditorMobile.svelte';
</script>

<ResponsiveLayout desktop={EditorDesktop} mobile={EditorMobile} />
