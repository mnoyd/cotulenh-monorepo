<script lang="ts">
  import { page } from '$app/stores';
  import LessonPlayer from '$lib/learn/components/LessonPlayer.svelte';
  import { getNextLessonInSubject, getSubjectById } from '@cotulenh/learn';

  const params = $derived($page.params);
  const lessonId = $derived(params.lessonId);
  const subjectId = $derived(params.subjectId);
  const sectionId = $derived(params.sectionId);

  // Calculate Next URL
  const nextUrl = $derived.by(() => {
    if (!subjectId || !lessonId) return '/learn';
    const nextLesson = getNextLessonInSubject(subjectId, lessonId);
    if (!nextLesson) {
      // If no next lesson, go back to subject page
      return `/learn/${subjectId}`;
    }
    return `/learn/${nextLesson.subjectId}/${nextLesson.sectionId}/${nextLesson.id}`;
  });

  const backUrl = $derived(subjectId ? `/learn/${subjectId}` : '/learn');
</script>

{#if lessonId}
  <LessonPlayer {lessonId} {nextUrl} {backUrl} />
{/if}
