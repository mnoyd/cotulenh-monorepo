<script lang="ts">
  import type { Subject } from '@cotulenh/learn';
  import { translateSubject, type LearnLocale } from '@cotulenh/learn';
  import { BookOpen, ChevronDown, ChevronUp } from 'lucide-svelte';
  import TerrainGuide from './visualizations/TerrainGuide.svelte';
  import BridgeDetail from './visualizations/BridgeDetail.svelte';
  import { browser } from '$app/environment';
  import { marked } from 'marked';
  import createDOMPurify from 'dompurify';
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    subject: Subject;
  }

  let { subject }: Props = $props();
  let expanded = $state(false);

  const i18n = getI18n();

  // Reactive translations based on current locale
  const locale = $derived(i18n.getLocale() as LearnLocale);
  const translatedSubject = $derived(translateSubject(subject, locale));

  const excerpt = $derived(
    translatedSubject.description || stripMarkdown(translatedSubject.introduction).slice(0, 200).trim() + '...'
  );

  // Configure marked options for safety
  marked.use({
    gfm: true,
    breaks: false
  });

  const domPurify = browser ? createDOMPurify(window) : null;

  function stripMarkdown(text: string): string {
    return text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '') // Remove images
      .replace(/[#*_`~\[\]()]/g, '') // Remove markdown syntax chars
      .replace(/\n{2,}/g, ' ') // Normalize whitespace
      .trim();
  }

  function formatMarkdown(text: string): string {
    // Parse markdown to HTML using marked (safe parser)
    const html = marked.parse(text) as string;

    // Sanitize HTML to prevent XSS attacks
    // Only allows safe tags and attributes
    if (!domPurify) {
      return html;
    }

    return domPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'hr'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'title'],
      ALLOW_DATA_ATTR: false
    });
  }

  type ContentPart = { type: 'html'; content: string } | { type: 'component'; name: string };

  const contentParts = $derived.by(() => {
    const text = translatedSubject.introduction;
    const parts: ContentPart[] = [];
    const regex = /!\[.*?\]\((custom:[^)]+)\)/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'html',
          content: formatMarkdown(text.slice(lastIndex, match.index))
        });
      }

      // Add the component
      parts.push({
        type: 'component',
        name: match[1]
      });

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'html',
        content: formatMarkdown(text.slice(lastIndex))
      });
    }

    return parts;
  });
</script>

<div class="subject-intro hud-corners" id="intro">
  <button class="intro-header" onclick={() => (expanded = !expanded)}>
    <div class="header-left">
      <BookOpen size={20} />
      <span>{i18n.t('learn.introduction')}</span>
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
      {#each contentParts as part}
        {#if part.type === 'html'}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html part.content}
        {:else if part.type === 'component'}
          {#if part.name === 'custom:terrain-guide'}
            <TerrainGuide />
          {:else if part.name === 'custom:bridge-detail'}
            <BridgeDetail />
          {/if}
        {/if}
      {/each}
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

  :global(.content-image) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 1.5rem 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }
</style>
