<script lang="ts">
  import { subjects, translateSubject } from '@cotulenh/learn';
  import { subjectProgress } from '$lib/learn/learn-progress.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  const locale = $derived(i18n.getLocale() as 'en' | 'vi');

  const completedSubjects = $derived(subjects.filter((subject) => subjectProgress.isSubjectCompleted(subject.id)).length);
  const overallMastery = $derived(subjects.length ? Math.round((completedSubjects / subjects.length) * 100) : 0);

  const nextMission = $derived.by(() => {
    for (const subject of subjects) {
      if (!subjectProgress.isSubjectUnlocked(subject.id)) continue;
      const next = subjectProgress.getNextIncompleteLesson(subject.id);
      if (next) {
        return {
          subject,
          sectionId: next.sectionId,
          lessonId: next.lessonId,
          title: next.title
        };
      }
    }
    return null;
  });
</script>

<CommandCenter center={centerContent} />

{#snippet centerContent()}
  <div class="learn-center">
    <h1 class="section-header">{i18n.t('learn.title')}</h1>
    <p class="text-secondary">{i18n.t('learn.description')}</p>

    <div class="mastery-row">
      <span class="section-header">{i18n.t('learn.mastery')}</span>
      <span class="mastery-value">{overallMastery}%</span>
    </div>

    {#if nextMission}
      <hr class="divider" />
      <span class="section-header">{i18n.t('learn.continueMission')}</span>
      <a
        class="text-link"
        href="/learn/{nextMission.subject.id}/{nextMission.sectionId}/{nextMission.lessonId}"
      >
        {nextMission.subject.icon} {nextMission.title}
      </a>
    {/if}

    <hr class="divider" />

    <span class="section-header">{i18n.t('learn.curriculumMap')}</span>
    <div class="flat-list">
      {#each subjects as subject}
        {@const translated = translateSubject(subject, locale)}
        {@const progress = subjectProgress.getSubjectProgress(subject.id)}
        {@const unlocked = subjectProgress.isSubjectUnlocked(subject.id)}
        <a
          class="flat-list-item"
          href="/learn/{subject.id}"
          class:locked={!unlocked}
        >
          <span class="subject-icon">{subject.icon}</span>
          <span class="subject-name">{translated.title}</span>
          <span class="subject-progress">{progress.progress}%</span>
        </a>
      {/each}
    </div>
  </div>
{/snippet}

<style>
  .learn-center {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
    margin: 0;
  }

  .mastery-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mastery-value {
    font-family: var(--font-mono, monospace);
    font-size: 1rem;
    font-weight: 700;
    color: var(--theme-primary, #06b6d4);
  }

  .subject-icon {
    font-size: 1rem;
    width: 1.5rem;
    text-align: center;
  }

  .subject-name {
    flex: 1;
    font-size: 0.875rem;
    color: var(--theme-text-primary, #eee);
  }

  .subject-progress {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .locked {
    opacity: 0.5;
    pointer-events: none;
  }
</style>
