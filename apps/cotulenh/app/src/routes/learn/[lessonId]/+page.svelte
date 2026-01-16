<script lang="ts">
  import { page } from '$app/stores';
  import LessonPlayer from '$lib/learn/components/LessonPlayer.svelte';

  const lessonId = $derived($page.params.lessonId ?? '');
</script>

{#if lessonId}
  <LessonPlayer {lessonId} />
{:else}
  <div class="error">Lesson not found</div>
{/if}

<style>
  .error {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    color: #aaa;
  }
</style>
