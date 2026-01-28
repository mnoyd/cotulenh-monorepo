<script lang="ts">
  import { browser } from '$app/environment';
  import { marked } from 'marked';
  import createDOMPurify from 'dompurify';

  interface Props {
    content: string;
  }

  let { content }: Props = $props();

  // Configure marked options for safety
  marked.use({
    gfm: true,
    breaks: true
  });

  const domPurify = browser ? createDOMPurify(window) : null;

  function formatMarkdown(text: string): string {
    const html = marked.parse(text) as string;

    if (!domPurify) {
      return html;
    }

    return domPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'em',
        'u',
        's',
        'code',
        'pre',
        'blockquote',
        'ul',
        'ol',
        'li',
        'a',
        'img',
        'hr'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'title'],
      ALLOW_DATA_ATTR: false
    });
  }

  const htmlContent = $derived(formatMarkdown(content));
</script>

<div class="lesson-content">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html htmlContent}
</div>

<style>
  .lesson-content {
    color: var(--theme-text-primary, #f3f4f6);
    line-height: 1.7;
    margin-bottom: 1rem;
  }

  .lesson-content :global(h2) {
    color: var(--theme-primary, #3b82f6);
    font-size: 1.25rem;
    margin: 1rem 0 0.75rem;
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .lesson-content :global(h3) {
    color: var(--theme-secondary, #10b981);
    font-size: 1.1rem;
    margin: 0.75rem 0 0.5rem;
  }

  .lesson-content :global(h4) {
    color: var(--theme-text-primary, #f3f4f6);
    font-size: 1rem;
    margin: 0.75rem 0 0.5rem;
  }

  .lesson-content :global(p) {
    margin: 0.5rem 0;
  }

  .lesson-content :global(ul),
  .lesson-content :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .lesson-content :global(li) {
    margin: 0.25rem 0;
  }

  .lesson-content :global(strong) {
    color: var(--theme-primary, #3b82f6);
  }

  .lesson-content :global(em) {
    color: var(--theme-secondary, #10b981);
    font-style: italic;
  }

  .lesson-content :global(code) {
    background: rgba(59, 130, 246, 0.2);
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
  }

  .lesson-content :global(blockquote) {
    border-left: 3px solid var(--theme-primary, #3b82f6);
    margin: 0.75rem 0;
    padding-left: 1rem;
    color: var(--theme-text-secondary, #aaa);
    font-style: italic;
  }

  .lesson-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 0.75rem 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  .lesson-content :global(hr) {
    border: none;
    border-top: 1px solid var(--theme-border, #444);
    margin: 1rem 0;
  }
</style>
