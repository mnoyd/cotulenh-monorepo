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
        <div class="title-text">
          <h1>{subject.title}</h1>
          <p class="subtitle">{subject.description}</p>
        </div>
      </div>
    </header>

    <SubjectIntro {subject} />

    <div class="sections-list">
      <h2>
        <span class="label">Curriculum</span>
        <span class="line"></span>
      </h2>
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
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    text-decoration: none;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .back-link:hover {
    color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .icon {
    font-size: 2.5rem;
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .title-text {
    flex: 1;
  }

  h1 {
    font-size: 2rem;
    margin: 0;
    color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .subtitle {
    margin: 0.5rem 0 0;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-size: 1rem;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 0 0 1rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
  }

  h2 .label {
    flex-shrink: 0;
  }

  h2 .line {
    flex: 1;
    height: 1px;
    background: linear-gradient(
      90deg,
      var(--theme-border, rgba(59, 130, 246, 0.4)) 0%,
      transparent 100%
    );
  }

  .error {
    text-align: center;
    padding: 4rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    border-radius: 4px;
  }
</style>
