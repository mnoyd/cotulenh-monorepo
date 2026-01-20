<script lang="ts">
  import { onDestroy } from 'svelte';
  import { key2pos, posToTranslate, type Api } from '@cotulenh/board';

  type Props = {
    /** Target square in algebraic notation (e.g., 'f8') */
    square: string;
    /** Board API to get positioning */
    boardApi: Api | null;
  };

  let { square, boardApi }: Props = $props();

  let markerElement: HTMLElement | null = null;

  // Calculate position using board's positioning utilities
  function getTranslatePosition(bounds: DOMRectReadOnly, asRed: boolean): [number, number] {
    return posToTranslate(bounds)(key2pos(square), asRed);
  }

  function createMarker() {
    if (!boardApi) return;

    const board = boardApi.state.dom.elements.board;
    const bounds = boardApi.state.dom.bounds();
    const asRed = boardApi.state.orientation === 'red';

    // Remove existing marker if any
    if (markerElement) {
      markerElement.remove();
    }

    // Create marker element
    markerElement = document.createElement('div');
    markerElement.className = 'learn-target-marker';
    markerElement.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    `;

    // Position using same method as pieces
    const [x, y] = getTranslatePosition(bounds, asRed);
    markerElement.style.transform = `translate(${x}px, ${y}px)`;

    // Insert into board
    board.appendChild(markerElement);
  }

  // Watch for changes
  $effect(() => {
    if (boardApi && square) {
      createMarker();
    }
  });

  onDestroy(() => {
    if (markerElement) {
      markerElement.remove();
    }
  });
</script>

<style>
  :global(.learn-target-marker) {
    position: absolute;
    width: 8.33%;
    height: 7.69%;
    pointer-events: none;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(76, 175, 80, 0.9);
    filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.5));
    animation: learn-target-pulse 1.5s ease-in-out infinite;
  }

  :global(.learn-target-marker svg) {
    width: 80%;
    height: 80%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  @keyframes learn-target-pulse {
    0%, 100% {
      opacity: 0.7;
      filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.5));
    }
    50% {
      opacity: 1;
      filter: drop-shadow(0 0 8px rgba(76, 175, 80, 0.8));
    }
  }
</style>
