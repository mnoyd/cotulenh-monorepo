<script lang="ts">
  import { subjects } from '@cotulenh/learn';
  import SubjectCard from '$lib/learn/components/SubjectCard.svelte';
  import { subjectProgress } from '$lib/learn/learn-progress.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();
</script>

<div class="learn-container">
  <div class="header">
    <h1>{i18n.t('learn.title')}</h1>
    <p>{i18n.t('learn.description')}</p>
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

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(to right, var(--primary), var(--secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: var(--text-secondary);
    font-size: 1.1rem;
  }

  .subjects-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
</style>
