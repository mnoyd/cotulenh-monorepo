<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  let fen = '';
  let gameState = '';
  let issueDescription = '';
  let title = 'Bug Report';
  let copied = false;

  onMount(() => {
    fen = localStorage.getItem('report_fen') || '';
    gameState = localStorage.getItem('report_state') || '';
  });

  function createGithubIssue() {
    const body = `
**Description**
${issueDescription}

**FEN**
\`\`\`
${fen}
\`\`\`

**Game State**
\`\`\`json
${gameState}
\`\`\`
    `.trim();

    // Since URL length limits might prevent full pre-filling, we copy to clipboard first
    navigator.clipboard.writeText(body).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 3000);

      // Open GitHub issues page
      window.open('https://github.com/mnoyd/cotulenh-monorepo/issues/new', '_blank');
    });
  }
</script>

<div class="report-container" in:fade>
  <div class="report-card">
    <div class="header">
      <h1>Report an Issue</h1>
      <p>Found a bug? Help us improve Co Tu Lenh.</p>
    </div>

    <div class="connect-section">
      <div class="info-box">
        <h3>🌟 Support the Project</h3>
        <p>Please consider giving a star to our repository to support open source development.</p>
        <a href="https://github.com/mnoyd/cotulenh-monorepo" target="_blank" class="github-link">
          Visit Repository
        </a>
      </div>
      <div class="info-box">
        <h3>📝 GitHub Account</h3>
        <p>You'll need a GitHub account to report issues. It's free and owned by Microsoft.</p>
      </div>
    </div>

    <div class="form-group">
      <label for="fen">Current FEN</label>
      <input id="fen" type="text" value={fen} readonly />
    </div>

    <div class="form-group">
      <label for="state">Game State (JSON)</label>
      <textarea id="state" readonly value={gameState} rows="4"></textarea>
    </div>

    <div class="form-group">
      <label for="desc">Issue Description</label>
      <textarea
        id="desc"
        bind:value={issueDescription}
        placeholder="Describe what happened, what you expected, and steps to reproduce..."
        rows="6"
      ></textarea>
    </div>

    <div class="actions">
      <button class="submit-btn" on:click={createGithubIssue} disabled={!issueDescription}>
        {#if copied}
          Copied to Clipboard & Opening GitHub...
        {:else}
          Copy Data & Create GitHub Issue
        {/if}
      </button>
      <a href="/" class="cancel-link">Back to Game</a>
    </div>
  </div>
</div>

<style>
  .report-container {
    padding: var(--spacing-lg);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: calc(100vh - 70px);
    background-color: var(--mw-bg-dark);
    font-family: var(--font-ui);
  }

  .report-card {
    background: var(--mw-bg-panel);
    padding: var(--spacing-xl);
    border: 1px solid var(--mw-border-color);
    border-radius: var(--radius-sm);
    box-shadow:
      0 0 20px rgba(0, 0, 0, 0.5),
      inset 0 0 100px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 800px;
    position: relative;
    overflow: hidden;
  }

  /* Tactical corner accents */
  .report-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 20px;
    height: 20px;
    border-top: 2px solid var(--mw-primary);
    border-left: 2px solid var(--mw-primary);
  }

  .report-card::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    border-bottom: 2px solid var(--mw-primary);
    border-right: 2px solid var(--mw-primary);
  }

  .header {
    margin-bottom: var(--spacing-lg);
    text-align: center;
    border-bottom: 1px solid var(--mw-border-color);
    padding-bottom: var(--spacing-md);
  }

  h1 {
    font-family: var(--font-display);
    font-size: 2rem;
    color: var(--mw-primary);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: var(--spacing-xs);
    text-shadow: var(--mw-text-glow);
  }

  .header p {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    letter-spacing: 1px;
  }

  .connect-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }

  .info-box {
    background: rgba(0, 243, 255, 0.05); /* Very dim cyan */
    padding: var(--spacing-md);
    border: 1px solid var(--mw-border-color);
    border-radius: var(--radius-sm);
  }

  .info-box h3 {
    font-family: var(--font-display);
    font-size: 1.1rem;
    margin-bottom: var(--spacing-xs);
    color: var(--mw-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .info-box p {
    font-size: 0.9rem;
    color: #a0a0a0;
    margin-bottom: var(--spacing-sm);
  }

  .github-link {
    display: inline-block;
    font-size: 0.9rem;
    color: var(--mw-primary);
    text-decoration: none;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.2s;
  }

  .github-link:hover {
    color: #fff;
    text-shadow: 0 0 5px var(--mw-primary);
  }

  .form-group {
    margin-bottom: var(--spacing-lg);
  }

  label {
    display: block;
    font-family: var(--font-display);
    font-size: 0.9rem;
    margin-bottom: var(--spacing-xs);
    color: var(--mw-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  input,
  textarea {
    width: 100%;
    padding: var(--spacing-md);
    border: 1px solid var(--mw-border-color);
    border-radius: var(--radius-sm);
    background: rgba(0, 0, 0, 0.4);
    color: #e0e0e0;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  textarea#desc {
    font-family: var(--font-ui);
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--mw-primary);
    background: rgba(0, 243, 255, 0.05);
    box-shadow: 0 0 10px rgba(0, 243, 255, 0.1);
  }

  input[readonly],
  textarea[readonly] {
    background: rgba(0, 0, 0, 0.6);
    color: #707070;
    border-color: rgba(255, 255, 255, 0.1);
    cursor: default;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: center;
    margin-top: var(--spacing-xl);
    border-top: 1px solid var(--mw-border-color);
    padding-top: var(--spacing-lg);
  }

  .submit-btn {
    background: rgba(0, 243, 255, 0.1);
    border: 1px solid var(--mw-primary);
    color: var(--mw-primary);
    padding: var(--spacing-md) var(--spacing-xl);
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    transition: all 0.2s;
    min-width: 300px;
    box-shadow: 0 0 10px rgba(0, 243, 255, 0.1);
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--mw-primary);
    color: #000;
    box-shadow: 0 0 20px var(--mw-primary);
    transform: translateY(-2px);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: var(--color-text-muted);
    color: var(--color-text-muted);
    background: transparent;
    box-shadow: none;
  }

  .cancel-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.95rem;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: color 0.2s;
  }

  .cancel-link:hover {
    color: var(--mw-primary);
  }

  @media (max-width: 768px) {
    .connect-section {
      grid-template-columns: 1fr;
    }

    .report-container {
      padding: var(--spacing-md);
    }

    .report-card {
      padding: var(--spacing-lg);
    }

    .submit-btn {
      width: 100%;
      min-width: auto;
    }
  }
</style>
