<script lang="ts">
  import type { Subject } from '@cotulenh/learn';
  import { BookOpen } from 'lucide-svelte';

  interface Props {
    subject: Subject;
  }

  let { subject }: Props = $props();
  
  // Show a brief excerpt instead of full intro
  const excerpt = $derived(
    subject.description || subject.introduction.slice(0, 200).replace(/[#*_]/g, '').trim() + '...'
  );
</script>

<div class="subject-intro">
  <p class="excerpt">{excerpt}</p>
  
  <a href="/learn/{subject.id}/content" class="read-more">
    <BookOpen size={18} />
    Read Full Introduction
  </a>
</div>

<style>
  .subject-intro {
    background: var(--surface-1);
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
  }

  .excerpt {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0 0 1rem;
  }

  .read-more {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
  }

  .read-more:hover {
    text-decoration: underline;
  }
</style>
