<script lang="ts">
  import { gameStore } from '$lib/stores/game';
  import { CoTuLenh } from '@repo/cotulenh-core';
  import type { Square, Color, Move, Piece } from '@repo/cotulenh-core';
  import { numericToAlgebraic } from '@repo/cotulenh-notation';
  import { getTurnColorName } from '$lib/utils';

  export let game: CoTuLenh | null = null;

  // Track the currently selected carrier
  let selectedCarrier: { square: Square; pieces: Piece[] } | null = null;

  // Track the deploy state
  $: deployState = $gameStore.deployState;
  $: canDeploy = !!deployState && deployState.turn === $gameStore.turn;

  // Get the carrier's pieces when deploy state changes
  $: {
    if (game && deployState) {
      const carrierSquare = numericToAlgebraic(deployState.stackSquare);
      const carrier = game.getPieceAt(deployState.stackSquare);

      if (carrier && carrier.carrying && carrier.carrying.length > 0) {
        selectedCarrier = {
          square: carrierSquare,
          pieces: [...carrier.carrying]
        };
      } else {
        selectedCarrier = null;
      }
    } else {
      selectedCarrier = null;
    }
  }

  // Handle deployment of a piece
  function handleDeploy(pieceType: string, targetSquare: Square) {
    if (!game || !selectedCarrier || !canDeploy) return;

    try {
      // Attempt to make the deploy move
      const moveResult = game.move({
        from: selectedCarrier.square,
        to: targetSquare,
        piece: { type: pieceType, color: $gameStore.turn || 'r' }
      });

      if (moveResult) {
        console.log('Deploy move successful:', moveResult);
        gameStore.applyMove(game, moveResult);
      } else {
        console.warn('Illegal deploy move attempted');
      }
    } catch (error) {
      console.error('Error making deploy move:', error);
    }
  }

  // Get possible deploy destinations for a piece type
  function getDeployDestinations(pieceType: string): Square[] {
    if (!game || !selectedCarrier || !canDeploy) return [];

    const allMoves = game.moves({ verbose: true }) as Move[];
    return allMoves
      .filter(
        (move) =>
          move.from === selectedCarrier.square &&
          move.piece.type === pieceType &&
          move.flags.includes('d') // 'd' for deploy flag
      )
      .map((move) => move.to);
  }

  // Get piece display name
  function getPieceDisplayName(pieceType: string): string {
    const pieceNames: Record<string, string> = {
      c: 'Commander',
      i: 'Infantry',
      t: 'Tank',
      m: 'Militia',
      e: 'Engineer',
      a: 'Artillery',
      g: 'Anti-Air',
      s: 'Missile',
      f: 'Air Force',
      n: 'Navy',
      h: 'Headquarter'
    };
    return pieceNames[pieceType] || pieceType.toUpperCase();
  }

  // Get piece CSS class
  function getPieceClass(pieceType: string, color: Color): string {
    return `piece-${pieceType} ${color === 'r' ? 'red' : 'blue'}`;
  }
</script>

<div class="deploy-panel" class:active={canDeploy}>
  <h3>Deploy Panel</h3>

  {#if canDeploy && selectedCarrier}
    <div class="carrier-info">
      <span class="label">Carrier at:</span>
      <span class="value">{selectedCarrier.square}</span>
    </div>

    <div class="pieces-container">
      <h4>Available Pieces</h4>
      {#if selectedCarrier.pieces.length === 0}
        <p>No pieces available to deploy.</p>
      {:else}
        <div class="pieces-grid">
          {#each selectedCarrier.pieces as piece}
            <button
              class="piece-button"
              on:click={() => {
                const destinations = getDeployDestinations(piece.type);
                if (destinations.length > 0) {
                  // For simplicity, deploy to the first valid destination
                  // In a full implementation, you'd show these options to the user
                  handleDeploy(piece.type, destinations[0]);
                }
              }}
              disabled={getDeployDestinations(piece.type).length === 0}
            >
              <div class={getPieceClass(piece.type, piece.color)}></div>
              <span>{getPieceDisplayName(piece.type)}</span>
              <span class="deploy-count">{getDeployDestinations(piece.type).length} moves</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else if $gameStore.status === 'playing'}
    <p class="info-message">
      {#if !deployState}
        No carrier selected. Move a carrier piece to deploy from it.
      {:else}
        Waiting for {getTurnColorName(deployState.turn === 'r' ? 'b' : 'r')} to deploy.
      {/if}
    </p>
  {:else}
    <p class="info-message">Game over. {$gameStore.status}</p>
  {/if}
</div>

<style>
  .deploy-panel {
    background: var(--surface-2, #f0f0f0);
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    border: 2px solid transparent;
    transition: border-color 0.3s ease;
  }

  .deploy-panel.active {
    border-color: var(--accent-color, #4caf50);
  }

  h3,
  h4 {
    margin-top: 0;
    color: var(--text-primary, #333);
  }

  .carrier-info {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .label {
    font-weight: bold;
  }

  .pieces-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .piece-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    background: var(--surface-1, #fff);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .piece-button:hover:not(:disabled) {
    background-color: var(--hover-bg, #f5f5f5);
  }

  .piece-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .deploy-count {
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
    margin-top: 0.25rem;
  }

  /* Piece visualization classes - these should match your board styling */
  [class^='piece-'] {
    width: 30px;
    height: 30px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    margin-bottom: 0.5rem;
  }

  .info-message {
    color: var(--text-secondary, #666);
    font-style: italic;
  }
</style>
