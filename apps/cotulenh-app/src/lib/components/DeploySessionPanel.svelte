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
    background: linear-gradient(135deg, rgba(150, 150, 150, 0.1), rgba(120, 120, 120, 0.05));
    border: 2px solid rgba(150, 150, 150, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }
  
  .deploy-session-panel.active {
    background: linear-gradient(135deg, rgba(100, 200, 255, 0.15), rgba(100, 150, 255, 0.1));
    border: 2px solid rgba(100, 200, 255, 0.4);
    box-shadow: 0 6px 12px rgba(100, 200, 255, 0.2);
  }
  
  .panel-header {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid rgba(100, 200, 255, 0.3);
  }
  
  .panel-header h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.2rem;
    color: #4a9eff;
    font-weight: 600;
  }
  
  .stack-info {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
  }
  
  .stack-info strong {
    color: #333;
    font-weight: 600;
  }
  
  .panel-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .info-section {
    background: rgba(255, 255, 255, 0.6);
    border-radius: 0.5rem;
    padding: 0.75rem;
  }
  
  .info-section h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.95rem;
    color: #555;
    font-weight: 600;
  }
  
  .pieces-list {
    margin: 0;
    font-family: monospace;
    font-size: 0.9rem;
    color: #333;
    font-weight: 500;
  }
  
  .empty-text {
    margin: 0;
    font-size: 0.85rem;
    color: #999;
    font-style: italic;
  }
  
  .moves-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-family: monospace;
    font-size: 0.9rem;
  }
  
  .moves-list li {
    padding: 0.25rem 0.5rem;
    margin-bottom: 0.25rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 0.25rem;
    color: #333;
  }
  
  .warning {
    padding: 0.5rem;
    background: rgba(255, 152, 0, 0.1);
    border-left: 3px solid #ff9800;
    border-radius: 0.25rem;
  }
  
  .warning p {
    margin: 0;
    font-size: 0.85rem;
    color: #666;
  }
  
  .panel-actions {
    display: flex;
    gap: 0.75rem;
  }
  
  button {
    padding: 0.75rem 1.25rem;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.2s ease;
    flex: 1;
  }
  
  .btn-commit {
    background: linear-gradient(135deg, #4caf50, #45a049);
    color: white;
    box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
  }
  
  .btn-commit:hover:not(:disabled) {
    background: linear-gradient(135deg, #45a049, #3d8b40);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
  }
  
  .btn-commit:disabled {
    background: #ccc;
    color: #666;
    cursor: not-allowed;
    box-shadow: none;
  }
  
  .btn-cancel {
    background: linear-gradient(135deg, #f44336, #da190b);
    color: white;
    box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
  }
  
  .btn-cancel:hover {
    background: linear-gradient(135deg, #da190b, #c41408);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(244, 67, 54, 0.4);
  }
  
  .btn-demo {
    padding: 0.75rem 1.25rem;
    border-radius: 0.5rem;
    border: none;
    cursor: not-allowed;
    font-weight: 600;
    font-size: 0.95rem;
    background: #e0e0e0;
    color: #999;
    width: 100%;
  }
  
  .demo-text {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.5;
  }
  
  .info-section.demo {
    background: rgba(255, 255, 255, 0.4);
  }
</style>
