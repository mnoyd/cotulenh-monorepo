<script lang="ts">
  import { CoTuLenh } from '@repo/cotulenh-core';
  import { gameStore } from '$lib/stores/game';

  export let game: CoTuLenh | null = null;

  function resetGame() {
    if (!game) return;

    // Create a new game instance with the default position
    game = new CoTuLenh();

    // Initialize the store with the new game
    gameStore.initialize(game);

    console.log('Game reset to initial position');
  }
</script>

<div class="controls-card">
  <div class="card-header">
    <svg class="header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h3>Game Controls</h3>
  </div>

  <div class="controls-grid">
    <button class="control-btn reset-btn" on:click={resetGame}>
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 2V8M21 8H15M21 8L18 5C16.7429 3.74292 15.1767 2.84567 13.4606 2.40013C11.7444 1.95459 9.93987 1.97668 8.23463 2.46393C6.5294 2.95118 4.98747 3.88737 3.76909 5.17452C2.55071 6.46168 1.70003 8.05374 1.30469 9.78535M3 22V16M3 16H9M3 16L6 19C7.25715 20.2571 8.82331 21.1543 10.5394 21.5999C12.2556 22.0454 14.0601 22.0233 15.7654 21.5361C17.4706 21.0488 19.0125 20.1126 20.2309 18.8255C21.4493 17.5383 22.3 15.9463 22.6953 14.2147" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Reset Game</span>
    </button>

    <!-- Additional controls placeholder for future features -->
    <div class="future-controls">
      <div class="coming-soon-badge">
        <svg class="badge-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>More controls coming soon</span>
      </div>
    </div>
  </div>
</div>

<style>
  .controls-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    transition: box-shadow var(--transition-base);
  }

  .controls-card:hover {
    box-shadow: var(--shadow-lg);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(124, 58, 237, 0.1));
    border-bottom: 1px solid var(--color-border);
  }

  .header-icon {
    width: 20px;
    height: 20px;
    color: var(--color-primary);
    stroke-width: 2;
  }

  .card-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .controls-grid {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all var(--transition-base);
    border: none;
    position: relative;
    overflow: hidden;
  }

  .control-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .control-btn:hover::before {
    width: 300px;
    height: 300px;
  }

  .btn-icon {
    width: 20px;
    height: 20px;
    stroke-width: 2;
    position: relative;
    z-index: 1;
  }

  .control-btn span {
    position: relative;
    z-index: 1;
  }

  .reset-btn {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: white;
    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.4);
  }

  .reset-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px -2px rgba(37, 99, 235, 0.5);
  }

  .reset-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px -1px rgba(37, 99, 235, 0.4);
  }

  .future-controls {
    margin-top: var(--spacing-sm);
  }

  .coming-soon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: rgba(245, 158, 11, 0.1);
    border: 1px dashed var(--color-accent);
    border-radius: var(--radius-md);
    color: var(--color-accent);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .badge-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2;
  }

  @media (max-width: 768px) {
    .card-header {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .controls-grid {
      padding: var(--spacing-md);
    }

    .control-btn {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: 0.95rem;
    }

    .coming-soon-badge {
      font-size: 0.8rem;
    }
  }
</style>
