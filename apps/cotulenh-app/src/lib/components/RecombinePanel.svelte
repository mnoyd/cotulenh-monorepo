<script lang="ts">
  import type { CoTuLenh } from '@repo/cotulenh-core';
  import { algebraic } from '@repo/cotulenh-core';
  
  export let game: CoTuLenh | null;
  export let onRecombine: (piece: string, target: string) => void;
  
  $: deploySession = game?.getDeploySession();
  $: remainingPieces = deploySession?.getRemainingPieces();
  
  // Get recombine options for the stack square
  $: stackSquare = deploySession ? algebraic(deploySession.stackSquare) : null;
  $: recombineOptions = deploySession && remainingPieces 
    ? game?.getRecombineOptions(stackSquare!) || []
    : [];
  
  function handleRecombine(piece: string, target: string) {
    if (!stackSquare) return;
    onRecombine(piece, target);
  }
  
  function handleUndoRecombine() {
    game?.undoRecombineInstruction();
  }
  
  // Get instruction count
  $: instructionCount = (deploySession as any)?.recombineInstructions?.length || 0;
</script>

{#if recombineOptions.length > 0 || instructionCount > 0}
  <div class="recombine-panel">
    <div class="panel-header">
      <h3>🔄 Recombine Options</h3>
      <p class="hint">Rejoin pieces that were deployed</p>
    </div>
    
    {#if recombineOptions.length > 0}
      <div class="options-list">
        {#each recombineOptions as option}
          <button
            class="recombine-option"
            class:safe={option.isSafe}
            on:click={() => handleRecombine(option.piece.type, algebraic(option.targetSquare))}
            title={option.isSafe ? 'Safe recombine' : 'Commander would be exposed'}
          >
            <span class="piece-type">{option.piece.type.toUpperCase()}</span>
            <span class="arrow">→</span>
            <span class="target">{algebraic(option.targetSquare)}</span>
            {#if !option.isSafe}
              <span class="warning">⚠️</span>
            {/if}
          </button>
        {/each}
      </div>
    {:else}
      <p class="no-options">No more pieces to recombine</p>
    {/if}
    
    {#if instructionCount > 0}
      <div class="instruction-status">
        <span class="count">{instructionCount} recombine(s) queued</span>
        <button
          class="undo-recombine"
          on:click={handleUndoRecombine}
          title="Undo last recombine"
        >
          ↩️ Undo
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .recombine-panel {
    padding: 1rem;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 180, 0, 0.1));
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 0.75rem;
    margin: 1rem 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .panel-header {
    margin-bottom: 1rem;
  }
  
  .panel-header h3 {
    margin: 0 0 0.5rem 0;
    color: #ffa500;
    font-size: 1.2rem;
    font-weight: 600;
  }
  
  .hint {
    margin: 0;
    font-size: 0.9rem;
    color: #888;
  }
  
  .options-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  
  .recombine-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 2px solid #4caf50;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .recombine-option.safe {
    border-color: #4caf50;
  }
  
  .recombine-option:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
    background: #f0fff0;
  }
  
  .piece-type {
    font-weight: bold;
    font-size: 1.1rem;
    color: #333;
    min-width: 2rem;
  }
  
  .arrow {
    color: #999;
    font-size: 1.2rem;
  }
  
  .target {
    font-weight: 600;
    color: #4a9eff;
    font-size: 1.05rem;
  }
  
  .warning {
    margin-left: auto;
    font-size: 1.2rem;
  }
  
  .no-options {
    padding: 1rem;
    text-align: center;
    color: #999;
    font-style: italic;
    margin: 0.5rem 0;
  }
  
  .instruction-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: rgba(255, 215, 0, 0.2);
    border-radius: 0.5rem;
    margin-top: 1rem;
  }
  
  .count {
    font-weight: 600;
    color: #ff8c00;
  }
  
  .undo-recombine {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }
  
  .undo-recombine:hover {
    background: #f5f5f5;
    transform: scale(1.05);
  }
</style>
