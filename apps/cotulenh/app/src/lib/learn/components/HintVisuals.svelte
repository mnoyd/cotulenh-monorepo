<script lang="ts">
  import type { LearnSession } from '../learn-session.svelte';
  
  interface Props {
    session: LearnSession;
  }
  
  let { session }: Props = $props();
  
  const hintType = $derived(session.currentHintType);
  const targets = $derived(session.remainingTargets);
</script>

{#if hintType === 'pulse-target'}
  <!-- Subtle: Pulse animation on target squares -->
  {#each targets as target}
    <div class="hint-pulse" data-square={target}></div>
  {/each}
  
{:else if hintType === 'show-arrow'}
  <!-- Medium: Show arrows to targets -->
  <div class="hint-arrow-container">
    <div class="hint-message">
      Move to the highlighted square 🎯
    </div>
  </div>
  
{:else if hintType === 'show-instruction'}
  <!-- Explicit: Show text instruction -->
  <div class="hint-instruction">
    {session.lesson?.hints?.messages?.explicit || session.hint || 'Complete the objective to continue'}
  </div>
{/if}

<style>
  .hint-pulse {
    position: absolute;
    width: 12.5%;  /* 1/8 of board width */
    aspect-ratio: 1;
    border-radius: 8px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.1) 100%);
    animation: pulse 2s ease-in-out infinite;
    pointer-events: none;
    z-index: 5;
  }
  
  @keyframes pulse {
    0%, 100% { 
      opacity: 0.3; 
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    }
    50% { 
      opacity: 0.7; 
      transform: scale(1.05);
      box-shadow: 0 0 20px 10px rgba(59, 130, 246, 0.3);
    }
  }
  
  .hint-arrow-container {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    pointer-events: none;
  }
  
  .hint-message {
    background: rgba(59, 130, 246, 0.95);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(59, 130, 246, 0.5);
    animation: slide-up 0.3s ease-out;
  }
  
  .hint-instruction {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(234, 179, 8, 0.98);  /* Warning yellow */
    color: #1f2937;
    padding: 1rem 1.75rem;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    box-shadow: 
      0 6px 16px rgba(0, 0, 0, 0.4),
      0 0 30px rgba(234, 179, 8, 0.6);
    animation: slide-up 0.4s ease-out;
    z-index: 100;
    pointer-events: none;
    max-width: 80%;
    text-align: center;
  }
  
  @keyframes slide-up {
    from { 
      transform: translate(-50%, 20px); 
      opacity: 0; 
    }
    to { 
      transform: translate(-50%, 0); 
      opacity: 1; 
    }
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    .hint-message,
    .hint-instruction {
      font-size: 0.9rem;
      padding: 0.75rem 1.25rem;
      max-width: 90%;
    }
  }
</style>
