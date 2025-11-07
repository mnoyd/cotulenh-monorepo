<script lang="ts">
  import type { CoTuLenh, Piece } from '@repo/cotulenh-core';
  import { algebraic } from '@repo/cotulenh-core';
  import { gameStore } from '$lib/stores/game';
  
  export let game: CoTuLenh | null;
  export let onCommit: () => void;
  export let onCancel: () => void;
  
  // Helper function to flatten a piece
  function flattenPiece(piece: Piece): Piece[] {
    if (!piece.carrying?.length) return [piece];
    return [{ ...piece, carrying: undefined }, ...piece.carrying];
  }
  
  // Use the reactive store instead of reading directly from game
  $: deployState = $gameStore.deployState;
  $: hasSession = deployState !== null;
  // Make commitStatus reactive to deployState changes, not just game reference
  $: commitStatus = deployState && game ? game.canCommitDeploy() : { canCommit: false };
  $: canCommit = commitStatus.canCommit;
  $: commitMessage = canCommit 
    ? 'Finish deployment and add move to history' 
    : commitStatus.reason || 'Deploy at least one piece first';
  
  // Get piece candidates (original piece flattened)
  $: pieceCandidates = deployState 
    ? flattenPiece(deployState.originalPiece).map((p: Piece) => p.type.toUpperCase()).join(', ')
    : '';
  
  // Get moves played
  $: movesPlayed = deployState 
    ? deployState.actions.map(move => {
        const pieceType = move.piece.type.toUpperCase();
        const dest = algebraic(move.to);
        const capture = move.flags & 2 ? 'x' : ''; // BITS.CAPTURE = 2
        return `${pieceType}${capture}${dest}`;
      })
    : [];
  
  // Get remaining pieces
  $: remainingPieces = deployState 
    ? (() => {
        const remaining = deployState.remainingPieces;
        if (!remaining) return 'None';
        return flattenPiece(remaining).map((p: Piece) => p.type.toUpperCase()).join(', ');
      })()
    : '';
  
  $: stackSquare = deployState ? algebraic(deployState.stackSquare) : '';
</script>

{#if true}
  <div class="deploy-session-panel" class:active={hasSession}>
    <div class="panel-header">
      <h3>{hasSession ? '🚀 Deploy Session Active' : '🎯 Deploy Session Panel'}</h3>
      {#if hasSession}
        <p class="stack-info">Deploying from: <strong>{stackSquare}</strong></p>
      {:else}
        <p class="stack-info">Select a stack piece to start deploying</p>
      {/if}
    </div>
    
    <div class="panel-content">
      {#if hasSession}
        <div class="info-section">
          <h4>📦 Original Pieces</h4>
          <p class="pieces-list">{pieceCandidates}</p>
        </div>
        
        <div class="info-section">
          <h4>✅ Moves Played ({movesPlayed.length})</h4>
          {#if movesPlayed.length === 0}
            <p class="empty-text">No moves yet</p>
          {:else}
            <ol class="moves-list">
              {#each movesPlayed as move}
                <li>{move}</li>
              {/each}
            </ol>
          {/if}
        </div>
        
        <div class="info-section">
          <h4>⏳ Not Yet Moved</h4>
          <p class="pieces-list">{remainingPieces}</p>
        </div>
        
        {#if !canCommit && commitStatus.suggestion}
          <div class="warning">
            <p>💡 {commitStatus.suggestion}</p>
          </div>
        {/if}
      {:else}
        <div class="info-section demo">
          <h4>📦 How Deploy Works</h4>
          <p class="demo-text">1. Select a stack piece on the board</p>
          <p class="demo-text">2. Move pieces one by one to deploy</p>
          <p class="demo-text">3. Commit when ready or cancel to undo</p>
        </div>
      {/if}
    </div>
    
    {#if hasSession}
      <div class="panel-actions">
        <button 
          class="btn-commit" 
          on:click={onCommit}
          disabled={!canCommit}
          title={commitMessage}
        >
          ✓ Commit Deploy
        </button>
        
        <button 
          class="btn-cancel" 
          on:click={onCancel}
          title="Cancel and restore board"
        >
          ✕ Cancel
        </button>
      </div>
    {:else}
      <div class="panel-actions demo">
        <button class="btn-demo" disabled>
          Waiting for deploy session...
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .deploy-session-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    transition: all var(--transition-slow);
  }
  
  .deploy-session-panel.active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2), var(--shadow-lg);
    animation: activePulse 2s ease-in-out infinite;
  }

  @keyframes activePulse {
    0%, 100% {
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2), var(--shadow-lg);
    }
    50% {
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.4), var(--shadow-xl);
    }
  }
  
  .panel-header {
    padding: var(--spacing-md) var(--spacing-lg);
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(124, 58, 237, 0.1));
    border-bottom: 1px solid var(--color-border);
  }
  
  .panel-header h3 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: 1.1rem;
    color: var(--color-text-primary);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  
  .stack-info {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  
  .stack-info strong {
    color: var(--color-primary);
    font-weight: 600;
    padding: 2px var(--spacing-xs);
    background: rgba(37, 99, 235, 0.1);
    border-radius: var(--radius-sm);
  }
  
  .panel-content {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .info-section {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    transition: all var(--transition-base);
  }

  .info-section:hover {
    background: var(--color-bg-tertiary);
  }
  
  .info-section h4 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .pieces-list {
    margin: 0;
    font-family: 'Courier New', monospace;
    font-size: 0.95rem;
    color: var(--color-text-primary);
    font-weight: 600;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: rgba(37, 99, 235, 0.1);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-primary);
  }
  
  .empty-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-tertiary);
    font-style: italic;
  }
  
  .moves-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .moves-list li {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    border-left: 3px solid var(--color-success);
    transition: all var(--transition-fast);
  }

  .moves-list li:hover {
    transform: translateX(4px);
    background: var(--color-surface-overlay);
  }
  
  .warning {
    padding: var(--spacing-md);
    background: rgba(245, 158, 11, 0.1);
    border-left: 3px solid var(--color-warning);
    border-radius: var(--radius-md);
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .warning p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
  
  .panel-actions {
    padding: 0 var(--spacing-lg) var(--spacing-lg);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
  
  button {
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all var(--transition-base);
    position: relative;
    overflow: hidden;
  }
  
  .btn-commit {
    background: linear-gradient(135deg, var(--color-success), #059669);
    color: white;
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);
  }
  
  .btn-commit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px -2px rgba(16, 185, 129, 0.5);
  }

  .btn-commit:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .btn-commit:disabled {
    background: var(--color-bg-tertiary);
    color: var(--color-text-muted);
    cursor: not-allowed;
    box-shadow: none;
    opacity: 0.6;
  }
  
  .btn-cancel {
    background: linear-gradient(135deg, var(--color-error), #dc2626);
    color: white;
    box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.4);
  }
  
  .btn-cancel:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px -2px rgba(239, 68, 68, 0.5);
  }

  .btn-cancel:active {
    transform: translateY(0);
  }
  
  .btn-demo {
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-md);
    border: 1px dashed var(--color-border);
    cursor: not-allowed;
    font-weight: 600;
    font-size: 0.95rem;
    background: transparent;
    color: var(--color-text-tertiary);
    grid-column: 1 / -1;
  }
  
  .demo-text {
    margin: var(--spacing-xs) 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    padding-left: var(--spacing-md);
    position: relative;
  }

  .demo-text::before {
    content: '•';
    position: absolute;
    left: 0;
    color: var(--color-primary);
    font-weight: bold;
  }
  
  .info-section.demo {
    background: transparent;
    border-style: dashed;
  }

  @media (max-width: 768px) {
    .panel-header {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .panel-content {
      padding: var(--spacing-md);
    }

    .panel-actions {
      padding: 0 var(--spacing-md) var(--spacing-md);
      grid-template-columns: 1fr;
    }

    button {
      font-size: 0.875rem;
    }
  }
</style>
