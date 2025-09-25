<script lang="ts">
  import type { CoTuLenh } from '@repo/cotulenh-core';
  import type { Api } from '@repo/cotulenh-board';
  
  export let game: CoTuLenh | null = null;
  export let boardApi: Api | null = null;
  
  let deployActive = false;
  let remainingPieces: any[] = [];
  let selectedSquare = '';
  
  // Check deploy status
  $: if (game) {
    deployActive = game.isDeployActive?.() ?? false;
    if (deployActive) {
      remainingPieces = game.getRemainingDeployPieces?.() ?? [];
    }
  }
  
  function startDeploy() {
    if (boardApi && selectedSquare) {
      const success = boardApi.startDeploy(selectedSquare);
      if (success) {
        console.log('Deploy session started for square:', selectedSquare);
      } else {
        console.error('Failed to start deploy session');
      }
    }
  }
  
  function deployPiece(pieceType: string, targetSquare: string) {
    if (boardApi && deployActive) {
      const result = boardApi.deployStep({
        from: selectedSquare,
        to: targetSquare,
        piece: pieceType as any
      });
      
      if (result.success) {
        console.log('Deploy step successful:', result);
      } else {
        console.error('Deploy step failed');
      }
    }
  }
  
  function stayPiece(pieceType: string) {
    if (boardApi && deployActive) {
      const result = boardApi.stayMove(pieceType as any);
      
      if (result.success) {
        console.log('Stay move successful:', result);
      } else {
        console.error('Stay move failed');
      }
    }
  }
  
  function completeDeploy() {
    if (boardApi && deployActive) {
      boardApi.completeDeploy();
      console.log('Deploy session completed manually');
    }
  }
</script>

<div class="deploy-panel">
  <h3>Deploy Control</h3>
  
  {#if !deployActive}
    <div class="start-deploy">
      <label>
        Stack Square:
        <input type="text" bind:value={selectedSquare} placeholder="e.g., e4" />
      </label>
      <button on:click={startDeploy} disabled={!selectedSquare}>Start Deploy</button>
    </div>
  {:else}
    <div class="active-deploy">
      <p>Deploy session active on: <strong>{selectedSquare}</strong></p>
      
      <div class="remaining-pieces">
        <h4>Remaining Pieces:</h4>
        {#each remainingPieces as piece}
          <div class="piece-control">
            <span>{piece.role} ({piece.color})</span>
            <div class="piece-actions">
              <input type="text" placeholder="Target square" id="target-{piece.role}" />
              <button on:click={() => {
                const input = document.getElementById(`target-${piece.role}`) as HTMLInputElement;
                if (input.value) deployPiece(piece.role, input.value);
              }}>Deploy</button>
              <button on:click={() => stayPiece(piece.role)}>Stay</button>
            </div>
          </div>
        {/each}
      </div>
      
      <button on:click={completeDeploy} class="complete-btn">Complete Deploy</button>
    </div>
  {/if}
</div>

<style>
  .deploy-panel {
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    background: #f9f9f9;
  }
  
  .deploy-panel h3 {
    margin-top: 0;
    color: #333;
  }
  
  .start-deploy {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .start-deploy label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .start-deploy input {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .start-deploy button {
    padding: 0.5rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .start-deploy button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .active-deploy {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .remaining-pieces {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.5rem;
    background: white;
  }
  
  .remaining-pieces h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
  }
  
  .piece-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding: 0.25rem;
    border: 1px solid #eee;
    border-radius: 4px;
  }
  
  .piece-control span {
    flex: 1;
    font-weight: 500;
  }
  
  .piece-actions {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  
  .piece-actions input {
    width: 60px;
    padding: 0.25rem;
    border: 1px solid #ddd;
    border-radius: 3px;
    font-size: 0.8rem;
  }
  
  .piece-actions button {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
  
  .piece-actions button:first-of-type {
    background: #28a745;
    color: white;
  }
  
  .piece-actions button:last-of-type {
    background: #ffc107;
    color: black;
  }
  
  .complete-btn {
    padding: 0.5rem 1rem;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    align-self: flex-start;
  }
  
  .complete-btn:hover {
    background: #c82333;
  }
</style>