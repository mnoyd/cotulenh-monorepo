<script lang="ts">
  import { page } from '$app/stores';
  import LessonPlayer from '$lib/learn/components/LessonPlayer.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();
  const lessonId = $derived($page.params.lessonId ?? '');
</script>

{#if lessonId}
  <LessonPlayer {lessonId} />
{:else}
  <div class="error">{i18n.t('learn.lessonNotFound')}</div>
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
