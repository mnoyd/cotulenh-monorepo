<script lang="ts">
  import ResponsiveLayout from '$lib/components/ResponsiveLayout.svelte';
  import PracticeDesktop from './PracticeDesktop.svelte';
  import PracticeMobile from './PracticeMobile.svelte';
</script>

<ResponsiveLayout desktop={PracticeDesktop} mobile={PracticeMobile} />
