<script lang="ts">
  import type { Subject } from '@cotulenh/learn';

  interface Props {
    subject: Subject;
  }

  let { subject }: Props = $props();
</script>

<div class="subject-intro">
  <!-- In the future, use a proper Markdown renderer here -->
  <div class="markdown-content">
    {@html subject.introduction.replace(/\n/g, '<br/>')}
  </div>
</div>

<style>
  .subject-intro {
    background: var(--surface-1);
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .markdown-content {
    color: var(--text-primary);
  }
</style>
