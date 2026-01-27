<script lang="ts">
  import { subjects } from '@cotulenh/learn';
  import SubjectCard from '$lib/learn/components/SubjectCard.svelte';
  import { subjectProgress } from '$lib/learn/learn-progress.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { GraduationCap } from 'lucide-svelte';

  const i18n = getI18n();
</script>

<div class="learn-container">
  <div class="header">
    <div class="title-row">
      <GraduationCap size={40} />
      <h1>{i18n.t('learn.title')}</h1>
    </div>
    <p class="subtitle">{i18n.t('learn.description')}</p>
    <div class="header-line"></div>
  </div>

  <div class="section-label">
    <span class="label">Available Subjects</span>
    <span class="line"></span>
  </div>

  <div class="subjects-grid">
    {#each subjects as subject}
      {@const progress = subjectProgress.getSubjectProgress(subject.id)}
      {@const isLocked = !subjectProgress.isSubjectUnlocked(subject.id)}
      <SubjectCard {subject} {progress} {isLocked} />
    {/each}
  </div>
</div>

<style>
  .learn-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .title-row {
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    color: var(--theme-primary, #3b82f6);
    margin-bottom: 0.75rem;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0;
    color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .subtitle {
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-size: 1.1rem;
    margin: 0;
  }

  .header-line {
    margin: 1.5rem auto 0;
    width: 200px;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--theme-primary, #3b82f6) 50%,
      transparent 100%
    );
  }

  .section-label {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
  }

  .section-label .label {
    flex-shrink: 0;
  }

  .section-label .line {
    flex: 1;
    height: 1px;
    background: linear-gradient(
      90deg,
      var(--theme-border, rgba(59, 130, 246, 0.4)) 0%,
      transparent 100%
    );
  }

  .subjects-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
</style>
