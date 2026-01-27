<script lang="ts">
  import type { Subject } from '@cotulenh/learn';
  import { BookOpen, ChevronDown, ChevronUp } from 'lucide-svelte';

  interface Props {
    subject: Subject;
  }

  let { subject }: Props = $props();
  let expanded = $state(false);

  const excerpt = $derived(
    subject.description || subject.introduction.slice(0, 200).replace(/[#*_]/g, '').trim() + '...'
  );

  function formatMarkdown(text: string): string {
    return text
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hulo])/gm, '<p>')
      .replace(/(?<![>])$/gm, '</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<[hulo])/g, '$1')
      .replace(/(<\/[hulo][^>]*>)<\/p>/g, '$1');
  }
</script>

<div class="subject-intro hud-corners" id="intro">
  <button class="intro-header" onclick={() => (expanded = !expanded)}>
    <div class="header-left">
      <BookOpen size={20} />
      <span>Introduction</span>
    </div>
    <div class="toggle-icon">
      {#if expanded}
        <ChevronUp size={20} />
      {:else}
        <ChevronDown size={20} />
      {/if}
    </div>
  </button>

  {#if !expanded}
    <p class="excerpt">{excerpt}</p>
  {/if}

  {#if expanded}
    <div class="full-intro">
      {@html formatMarkdown(subject.introduction)}
    </div>
  {/if}
</div>

<style>
  .subject-intro {
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    padding: 1.5rem;
    border-radius: 4px;
    margin-bottom: 2rem;
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  .intro-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--theme-secondary, #10b981);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
  }

  .intro-header:hover {
    color: var(--theme-primary, #3b82f6);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-icon {
    opacity: 0.7;
  }

  .excerpt {
    color: var(--theme-text-primary, #f3f4f6);
    line-height: 1.7;
    margin: 0;
  }

  .full-intro {
    color: var(--theme-text-primary, #f3f4f6);
    line-height: 1.8;
  }

  .full-intro :global(h2) {
    color: var(--theme-primary, #3b82f6);
    font-size: 1.4rem;
    margin: 1.5rem 0 1rem;
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .full-intro :global(h3) {
    color: var(--theme-secondary, #10b981);
    font-size: 1.1rem;
    margin: 1.25rem 0 0.75rem;
  }

  .full-intro :global(h4) {
    color: var(--theme-text-primary, #f3f4f6);
    font-size: 1rem;
    margin: 1rem 0 0.5rem;
  }

  .full-intro :global(p) {
    margin: 0.75rem 0;
  }

  .full-intro :global(ul) {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }

  .full-intro :global(li) {
    margin: 0.35rem 0;
  }

  .full-intro :global(strong) {
    color: var(--theme-primary, #3b82f6);
  }
</style>
