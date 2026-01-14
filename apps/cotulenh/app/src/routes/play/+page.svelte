<script lang="ts">
  import ResponsiveLayout from '$lib/components/ResponsiveLayout.svelte';
  import PlayDesktop from './PlayDesktop.svelte';
  import PlayMobile from './PlayMobile.svelte';
</script>

<ResponsiveLayout desktop={PlayDesktop} mobile={PlayMobile} />
