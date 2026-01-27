<script lang="ts">
  import { page } from '$app/stores';
  import { getSubjectById } from '@cotulenh/learn';
  import SubjectIntro from '$lib/learn/components/SubjectIntro.svelte';
  import SectionCard from '$lib/learn/components/SectionCard.svelte';
  import { ArrowLeft } from 'lucide-svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();
  const subjectId = $derived($page.params.subjectId ?? '');
  const subject = $derived(subjectId ? getSubjectById(subjectId) : null);
</script>

<div class="subject-page">
  {#if subject}
    <header>
      <a href="/learn" class="back-link">
        <ArrowLeft size={20} />
        {i18n.t('learn.backToSubjects')}
      </a>
      <div class="title-row">
        <span class="icon">{subject.icon}</span>
        <h1>{subject.title}</h1>
      </div>
    </header>

    <SubjectIntro {subject} />

    <div class="sections-list">
      <h2>Curriculum</h2>
      {#each subject.sections as section}
        <SectionCard {section} />
      {/each}
    </div>
  {:else}
    <div class="error">Subject not found</div>
  {/if}
</div>

<style>
  .subject-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  header {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    text-decoration: none;
    margin-bottom: 1.5rem;
  }

  .back-link:hover {
    color: var(--primary);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .icon {
    font-size: 2.5rem;
    background: var(--surface-2);
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }

  h1 {
    font-size: 2rem;
    margin: 0;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h2 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .error {
    text-align: center;
    padding: 4rem;
    color: var(--text-secondary);
  }
</style>
