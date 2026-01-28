<script lang="ts">
  import { onMount } from 'svelte';

  // Board dimensions from SVG: 720mm x 780mm
  // Grid: 11 columns (a-k) x 12 rows (1-12)
  // Each cell roughly: width ~65.45mm, height ~65mm
</script>

<div class="terrain-guide">
  <div class="board-container">
    <img src="/assets/board-grid.svg" alt="Game Board Grid" class="board-grid" />

    <div class="overlay-container">
      <!-- Zone Overlays -->
      <!-- Water: Cols a-b (2 cols) -->
      <div class="zone water-zone" style="grid-column: 1 / span 2; grid-row: 1 / -1;">
        <span class="label top">WATER ZONE</span>
        <span class="label bottom">WATER ZONE</span>
      </div>

      <!-- Coastal: Col c (1 col) -->
      <div class="zone coastal-zone" style="grid-column: 3 / span 1; grid-row: 1 / -1;">
        <span class="label top">COASTAL</span>
        <span class="label bottom">COASTAL</span>
      </div>

      <!-- Land: Cols d-k (8 cols) -->
      <div class="zone land-zone" style="grid-column: 3 / -1; grid-row: 2 / -1;">
        <span class="label upper-land">UPPER LAND TERRITORY</span>
        <span class="label lower-land">LOWER LAND TERRITORY</span>
      </div>

      <!-- River Barrier: Between Rank 6 & 7 (Row 6 from bottom, so Row 7 from top visually?) -->
      <!-- Board is 12 ranks high. Rank 1 is at bottom. Rank 12 is at top. -->
      <!-- Rank 1-6 = Rows 7-12. Rank 7-12 = Rows 1-6. -->
      <!-- River is between Rank 6 and 7. -->
      <!-- Visually occupying the boundary between grid row 6 and 7 -->
      <div class="zone river-barrier" style="grid-column: 3 / -1; grid-row: 6 / span 2;">
        <div class="river-label">RIVER BARRIER</div>
      </div>
    </div>
  </div>
</div>

<style>
  .terrain-guide {
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
    background: none;
    border-radius: 4px;
    overflow: hidden;
  }

  .board-container {
    position: relative;
    width: 100%;
    aspect-ratio: 720 / 780; /* Based on SVG viewBox */
  }

  .board-grid {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 4px; /* Match HUD aesthetic */
    opacity: 0.6; /* Dim the grid slightly to make text pop */
  }

  .overlay-container {
    position: absolute;
    top: 5.5%; /* Approximate margin from top */
    left: 4.8%; /* Approximate margin from left */
    width: 90.6%; /* Adjust width to account for margins (100 - 4.8*2 roughly, or visual tuning) */
    height: 90%; /* Adjust height */
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    grid-template-rows: repeat(12, 1fr);
  }

  .zone {
    display: flex;
    justify-content: center;
    position: relative;
    pointer-events: none; /* Let clicks pass through if needed */
  }

  .water-zone {
    background-color: rgba(59, 130, 246, 0.3); /* Blue tint */
    border-right: 2px dashed rgba(59, 130, 246, 0.5);
  }

  .coastal-zone {
    background-color: rgba(16, 185, 129, 0.2); /* Greenish/Teal tint */
    border-right: 2px dashed rgba(16, 185, 129, 0.5);
  }

  .land-zone {
    background-color: rgba(107, 114, 128, 0.1); /* Neutral gray tint */
  }

  .river-barrier {
    /* This needs to sit ON the line between row 6 and 7 in our 12-row grid. 
        Actually, let's make it a horizontal stripe that covers part of row 6 and 7 or just sits there.
        In the mockup it looks like a blue bar. */
    /* If we target grid-row 7, that's Rank 6 (top-down 1..12: Row 1 is Rank 12, Row 12 is Rank 1). 
        Wait, standard chess board: Rank 1 is bottom. 
        So Row 12 = Rank 1. Row 7 = Rank 6. Row 6 = Rank 7.
        River is between Rank 6 and 7.
        So boundary between Row 7 and Row 6. 
     */
    grid-row: 6 / span 2; /* Span across the boundary */
    align-self: stretch; /* Stretch to fill the height to find true center */
    position: relative; /* Context for pseudo-element */
    display: flex;
    align-items: center; /* Vertical center */
    justify-content: center; /* Center horizontally in the Land grid area */
    z-index: 10;
    line-height: normal; /* Use normal line height for centering */
    margin-top: -2px; /* Micro adjustment if visual center is off due to border overlap */
  }

  /* The visual highlight line - REMOVED per user request */
  .river-barrier::before {
    content: none;
  }

  .label {
    position: absolute;
    font-family: var(--font-header, 'Share Tech Mono', monospace);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    width: 100%;
    text-align: center;
  }

  .label.top {
    top: 1rem;
  }

  .label.bottom {
    bottom: 1rem;
  }

  .label.upper-land {
    top: 25%;
    width: 100%;
    text-align: center;
    color: rgba(255, 165, 0, 0.9); /* Orange tint to match screenshot hint */
  }

  .label.lower-land {
    bottom: 25%;
    width: 100%;
    text-align: center;
    color: rgba(255, 165, 0, 0.9); /* Orange tint to match screenshot hint */
  }

  .river-label {
    /* Match usage of other labels - plain text, no box */
    font-family: var(--font-header, 'Share Tech Mono', monospace);
    color: rgba(255, 255, 255, 0.9);
    font-size: 1rem; /* Match other labels */
    font-weight: 700;
    letter-spacing: 0.1em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    background: none;
    border: none;
    padding: 0;
    backdrop-filter: none;
  }
</style>
