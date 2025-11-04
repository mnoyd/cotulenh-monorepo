<script lang="ts">
  import type { CoTuLenh } from '@repo/cotulenh-core';
  
  export let game: CoTuLenh | null;
  export let onCommit: () => void;
  export let onCancel: () => void;
  
  $: deploySession = game?.getDeploySession();
  $: hasSession = deploySession !== null;
  $: commitStatus = game?.canCommitDeploy() ?? { canCommit: false };
  $: canCommit = commitStatus.canCommit;
  $: commitMessage = canCommit 
    ? 'Finish deployment' 
    : commitStatus.reason || 'Deploy at least one piece first';
</script>

{#if hasSession}
  <div class="deploy-controls">
    <div class="deploy-info">
      <h3>🚀 Deploying Pieces</h3>
      <p class="hint">Move remaining pieces or finish deployment</p>
      
      {#if !canCommit && commitStatus.suggestion}
        <p class="warning">💡 {commitStatus.suggestion}</p>
      {/if}
    </div>
    
    <div class="deploy-buttons">
      <button 
        class="btn-finish" 
        on:click={onCommit}
        disabled={!canCommit}
        title={commitMessage}
      >
        ✓ Finish Deployment
      </button>
      
      <button 
        class="btn-cancel" 
        on:click={onCancel}
        title="Cancel and restore board"
      >
        ✕ Cancel
      </button>
    </div>
  </div>
{/if}

<style>
  .deploy-controls {
    padding: 1rem;
    background: linear-gradient(135deg, rgba(100, 200, 255, 0.15), rgba(100, 150, 255, 0.1));
    border: 2px solid rgba(100, 200, 255, 0.4);
    border-radius: 0.75rem;
    margin: 1rem 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .deploy-info {
    margin-bottom: 1rem;
  }
  
  .deploy-info h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
    color: #4a9eff;
    font-weight: 600;
  }
  
  .hint {
    margin: 0;
    font-size: 0.9rem;
    color: #888;
  }
  
  .deploy-buttons {
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
  
  .btn-finish {
    background: linear-gradient(135deg, #4caf50, #45a049);
    color: white;
    box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
  }
  
  .btn-finish:hover:not(:disabled) {
    background: linear-gradient(135deg, #45a049, #3d8b40);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
  }
  
  .btn-finish:disabled {
    background: #ccc;
    color: #666;
    cursor: not-allowed;
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
  
  .warning {
    margin: 0.5rem 0 0 0;
    padding: 0.5rem;
    background: rgba(255, 152, 0, 0.1);
    border-left: 3px solid #ff9800;
    font-size: 0.85rem;
    color: #666;
    border-radius: 0.25rem;
  }
</style>
