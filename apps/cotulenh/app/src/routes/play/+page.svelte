<script lang="ts">
  import ResponsiveLayout from '$lib/components/ResponsiveLayout.svelte';
  import LobbyDesktop from './LobbyDesktop.svelte';
  import LobbyMobile from './LobbyMobile.svelte';
</script>

<ResponsiveLayout desktop={LobbyDesktop} mobile={LobbyMobile} />
