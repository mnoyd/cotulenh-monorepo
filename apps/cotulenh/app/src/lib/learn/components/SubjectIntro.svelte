<script lang="ts">
  import type { Subject } from '@cotulenh/learn';
  import { BookOpen, ChevronRight } from 'lucide-svelte';

  interface Props {
    subject: Subject;
  }

  let { subject }: Props = $props();
  
  // Show a brief excerpt instead of full intro
  const excerpt = $derived(
    subject.description || subject.introduction.slice(0, 200).replace(/[#*_]/g, '').trim() + '...'
  );
</script>

<div class="subject-intro hud-corners">
  <div class="intro-header">
    <BookOpen size={20} />
    <span>Introduction</span>
  </div>
  
  <p class="excerpt">{excerpt}</p>
  
  <a href="/learn/{subject.id}/content" class="read-more btn-game-subtle">
    Read Full Introduction
    <ChevronRight size={16} />
  </a>
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
    gap: 0.5rem;
    color: var(--theme-secondary, #10b981);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
  }

  .excerpt {
    color: var(--theme-text-primary, #f3f4f6);
    line-height: 1.7;
    margin: 0 0 1.5rem;
  }

  .read-more {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
  }

  .read-more:hover {
    box-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }
</style>
