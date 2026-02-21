<script lang="ts">
  import { subjects, translateSubject } from '@cotulenh/learn';
  import { subjectProgress } from '$lib/learn/learn-progress.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { GraduationCap, Play, Target } from 'lucide-svelte';

  const i18n = getI18n();

  let selectedSubjectId = $state(subjects[0]?.id ?? '');
  const locale = $derived(i18n.getLocale() as 'en' | 'vi');

  const selectedSubject = $derived.by(() => {
    return subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null;
  });

  const selectedProgress = $derived.by(() => {
    if (!selectedSubject) return null;
    return subjectProgress.getSubjectProgress(selectedSubject.id);
  });

  const selectedTranslation = $derived.by(() => {
    if (!selectedSubject) return null;
    return translateSubject(selectedSubject, locale);
  });

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

  const selectedLink = $derived.by(() => {
    if (!selectedSubject) return '/learn';
    const next = subjectProgress.getNextIncompleteLesson(selectedSubject.id);
    if (!next) return `/learn/${selectedSubject.id}`;
    return `/learn/${selectedSubject.id}/${next.sectionId}/${next.lessonId}`;
  });

  const selectedState = $derived.by(() => {
    if (!selectedSubject) return 'locked';
    const unlocked = subjectProgress.isSubjectUnlocked(selectedSubject.id);
    if (!unlocked) return 'locked';
    const progress = subjectProgress.getSubjectProgress(selectedSubject.id);
    if (progress.completed) return 'completed';
    if (progress.progress > 0) return 'active';
    return 'ready';
  });
</script>

<div class="learn-command">
  <header class="hero hud-corners">
    <div class="hero-title">
      <GraduationCap size={32} />
      <div>
        <h1>{i18n.t('learn.title')} Command Center</h1>
        <p>{i18n.t('learn.description')}</p>
      </div>
    </div>
    <div class="mastery">
      <span>Mastery</span>
      <strong>{overallMastery}%</strong>
    </div>
  </header>

  {#if nextMission}
    <a
      class="continue-mission hud-corners"
      href="/learn/{nextMission.subject.id}/{nextMission.sectionId}/{nextMission.lessonId}"
    >
      <div class="left">
        <Play size={18} />
        <div>
          <span class="label">Continue Mission</span>
          <strong>{nextMission.subject.icon} {nextMission.subject.title}</strong>
        </div>
      </div>
      <span class="lesson-name">{nextMission.title}</span>
    </a>
  {/if}

  <div class="subject-map hud-corners">
    <div class="map-header">
      <Target size={16} />
      <span>Curriculum Map</span>
    </div>

    <div class="nodes" role="listbox" aria-label="Subjects">
      {#each subjects as subject}
        {@const translated = translateSubject(subject, locale)}
        {@const progress = subjectProgress.getSubjectProgress(subject.id)}
        {@const unlocked = subjectProgress.isSubjectUnlocked(subject.id)}
        {@const isSelected = selectedSubjectId === subject.id}
        <button
          class="node"
          class:selected={isSelected}
          class:locked={!unlocked}
          class:completed={progress.completed}
          class:active={!progress.completed && progress.progress > 0 && unlocked}
          onclick={() => (selectedSubjectId = subject.id)}
        >
          <span class="icon">{subject.icon}</span>
          <span class="title">{translated.title}</span>
          <span class="percent">{progress.progress}%</span>
        </button>
      {/each}
    </div>
  </div>

  {#if selectedSubject && selectedProgress}
    <section class="subject-panel hud-corners state-{selectedState}">
      <div class="panel-head">
        <h2>{selectedSubject.icon} {selectedTranslation?.title}</h2>
        <span class="state">{selectedState}</span>
      </div>
      <p>{selectedTranslation?.description}</p>
      <div class="meta">
        <span>{selectedSubject.sections.length} sections</span>
        <span>{selectedProgress.completedLessons}/{selectedProgress.totalLessons} lessons</span>
      </div>
      <a class="panel-cta" href={selectedLink}>
        {selectedState === 'completed' ? 'Review Subject' : 'Open Mission'}
      </a>
    </section>
  {/if}
</div>

<style>
  .learn-command {
    max-width: 1080px;
    margin: 0 auto;
    padding: 1.5rem 1rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.35));
    background: radial-gradient(circle at 20% 20%, rgba(34, 197, 94, 0.13), transparent 50%),
      var(--theme-bg-panel, rgba(15, 23, 42, 0.9));
    border-radius: 8px;
    padding: 1rem 1.1rem;
  }

  .hero-title {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    color: var(--theme-primary, #60a5fa);
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .hero p {
    margin: 0.3rem 0 0;
    color: var(--theme-text-secondary, #cbd5e1);
    font-size: 0.95rem;
  }

  .mastery {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.2rem;
    font-family: var(--font-mono, monospace);
  }

  .mastery span {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--theme-text-secondary, #94a3b8);
  }

  .mastery strong {
    color: var(--theme-secondary, #10b981);
    font-size: 1.15rem;
  }

  .continue-mission {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    text-decoration: none;
    color: inherit;
    border: 1px solid rgba(34, 197, 94, 0.45);
    background: rgba(34, 197, 94, 0.1);
    border-radius: 8px;
    padding: 0.8rem 1rem;
  }

  .continue-mission .left {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    color: #22c55e;
  }

  .continue-mission .label {
    display: block;
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #86efac;
  }

  .continue-mission strong {
    color: #f0fdf4;
    font-size: 0.98rem;
  }

  .continue-mission .lesson-name {
    color: #bbf7d0;
    font-size: 0.84rem;
  }

  .subject-map {
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.35));
    background: var(--theme-bg-panel, rgba(15, 23, 42, 0.9));
    border-radius: 8px;
    padding: 0.95rem;
  }

  .map-header {
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, #94a3b8);
    font-family: var(--font-mono, monospace);
  }

  .nodes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.65rem;
  }

  .node {
    text-align: left;
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.22);
    background: rgba(15, 23, 42, 0.7);
    padding: 0.55rem 0.65rem;
    color: inherit;
    cursor: pointer;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.5rem;
  }

  .node.selected {
    border-color: rgba(59, 130, 246, 0.65);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35) inset;
  }

  .node.locked {
    opacity: 0.55;
  }

  .node.completed {
    border-color: rgba(34, 197, 94, 0.6);
  }

  .node.active {
    border-color: rgba(245, 158, 11, 0.6);
  }

  .node .icon {
    font-size: 1.05rem;
  }

  .node .title {
    font-size: 0.85rem;
    color: var(--theme-text-primary, #e2e8f0);
  }

  .node .percent {
    font-size: 0.72rem;
    color: var(--theme-text-secondary, #94a3b8);
    font-family: var(--font-mono, monospace);
  }

  .subject-panel {
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.35));
    background: var(--theme-bg-panel, rgba(15, 23, 42, 0.9));
    border-radius: 8px;
    padding: 1rem;
  }

  .subject-panel.state-completed {
    border-color: rgba(34, 197, 94, 0.55);
  }

  .subject-panel.state-active {
    border-color: rgba(245, 158, 11, 0.5);
  }

  .subject-panel.state-locked {
    border-color: rgba(148, 163, 184, 0.35);
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .panel-head h2 {
    margin: 0;
    font-size: 1.15rem;
    color: var(--theme-text-primary, #f8fafc);
  }

  .state {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, #94a3b8);
    font-family: var(--font-mono, monospace);
  }

  .subject-panel p {
    margin: 0;
    color: var(--theme-text-secondary, #cbd5e1);
  }

  .meta {
    margin-top: 0.65rem;
    display: flex;
    gap: 1rem;
    font-size: 0.78rem;
    color: var(--theme-text-secondary, #94a3b8);
    font-family: var(--font-mono, monospace);
  }

  .panel-cta {
    margin-top: 0.8rem;
    display: inline-flex;
    text-decoration: none;
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.45);
    border-radius: 6px;
    padding: 0.48rem 0.72rem;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  @media (max-width: 700px) {
    .hero {
      flex-direction: column;
    }

    .mastery {
      align-items: flex-start;
    }

    .continue-mission {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
