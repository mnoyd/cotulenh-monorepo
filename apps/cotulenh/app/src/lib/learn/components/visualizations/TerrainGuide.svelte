<script lang="ts">
  // Board dimensions from SVG: 720mm x 780mm
  // Grid: 11 columns (a-k) x 12 rows (1-12)
  // Each cell roughly: width ~65.45mm, height ~65mm
  export let maxWidth = '600px';

  let activeTerritory: 'sea' | 'land-north' | 'land-south' | null = null;
</script>

<div
  class="terrain-guide"
  style="--max-width: {maxWidth}"
  role="img"
  aria-label="Game board terrain guide showing water zone, coastal zone, land territories, and river barrier"
>
  <div class="board-container">
    <img src="/assets/board-grid.svg" alt="" class="board-grid" aria-hidden="true" />

    <div class="overlay-container">
      <!-- Zone Overlays -->
      <!-- Water: Cols a-b (2 cols) - Part of SEA -->
      <div
        class="zone water-zone"
        class:active={activeTerritory === 'sea'}
        style="grid-column: 1 / span 2; grid-row: 1 / -1;"
        aria-label="Water Zone - columns A and B"
        on:mouseenter={() => (activeTerritory = 'sea')}
        on:mouseleave={() => (activeTerritory = null)}
        role="region"
      >
        <span class="label top">WATER ZONE</span>
        <span class="label bottom">WATER ZONE</span>
      </div>

      <!-- Coastal: Col c (1 col) - Intersection of SEA and LAND -->
      <div
        class="zone coastal-zone"
        class:active={activeTerritory !== null}
        style="grid-column: 3 / span 1; grid-row: 1 / -1;"
        aria-label="Coastal Zone - column C"
        on:mouseenter={() => (activeTerritory = null)}
        role="region"
      >
        <span class="label top">COASTAL</span>
        <span class="label bottom">COASTAL</span>
      </div>

      <!-- North Land: Cols d-k, rows 1-6 (extended to river center) -->
      <div
        class="zone land-zone north"
        class:active={activeTerritory === 'land-north'}
        style="grid-column: 4 / -1; grid-row: 1 / 7;"
        aria-label="North Land Territory - columns D through K, ranks 7-12"
        on:mouseenter={() => (activeTerritory = 'land-north')}
        on:mouseleave={() => (activeTerritory = null)}
        role="region"
      >
        <span class="label north-land">NORTH LAND TERRITORY</span>
      </div>

      <!-- South Land: Cols d-k, rows 7-12 (extended to river center) -->
      <div
        class="zone land-zone south"
        class:active={activeTerritory === 'land-south'}
        style="grid-column: 4 / -1; grid-row: 7 / -1;"
        aria-label="South Land Territory - columns D through K, ranks 1-5"
        on:mouseenter={() => (activeTerritory = 'land-south')}
        on:mouseleave={() => (activeTerritory = null)}
        role="region"
      >
        <span class="label south-land">SOUTH LAND TERRITORY</span>
      </div>

      <!-- River Barrier: Between Rank 6 & 7 -->
      <div
        class="zone river-barrier"
        style="grid-column: 3 / -1; grid-row: 6 / span 2;"
        aria-label="River Barrier - between ranks 6 and 7"
      >
        <div class="river-label">RIVER BARRIER</div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Color variables for theming */
  .terrain-guide {
    /* Base colors (RGB values for usage with opacity) */
    --c-water: 2, 132, 199; /* Sky 600 */
    --c-coastal: 16, 185, 129; /* Emerald 500 */
    --c-land: 245, 158, 11; /* Amber 500 */
    --c-river: 59, 130, 246; /* Blue 500 */

    --water-bg: rgba(var(--c-water), 0.25);
    --water-border: rgba(var(--c-water), 0.5);

    --coastal-bg: rgba(var(--c-coastal), 0.25);
    --coastal-border: rgba(var(--c-coastal), 0.5);

    --land-bg: rgba(var(--c-land), 0.15);

    --river-bg: rgba(var(--c-river), 0.4);

    --label-color: rgba(255, 255, 255, 0.95);

    width: 100%;
    max-width: var(--max-width, 600px);
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
    border-radius: 4px;
    opacity: 0.6;
  }

  .overlay-container {
    position: absolute;
    top: 5.5%;
    left: 4.8%;
    width: 90.6%;
    height: 90%;
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    grid-template-rows: repeat(12, 1fr);
  }

  .zone {
    display: flex;
    justify-content: center;
    position: relative;
    pointer-events: auto;
    transition: background-color 0.2s ease;
  }

  .water-zone {
    background-color: var(--water-bg);
    border-right: 2px dashed var(--water-border);
  }

  .water-zone.active {
    background-color: rgba(var(--c-water), 0.65);
    box-shadow: inset 0 0 30px rgba(var(--c-water), 0.3);
  }

  .coastal-zone {
    background-color: var(--coastal-bg);
    border-right: 2px dashed var(--coastal-border);
    transition: all 0.2s ease;
  }

  .coastal-zone.active {
    background-color: rgba(var(--c-coastal), 0.5);
    box-shadow: inset 0 0 30px rgba(var(--c-coastal), 0.3);
  }

  .land-zone {
    background-color: var(--land-bg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .land-zone.active {
    background-color: rgba(var(--c-land), 0.35);
    box-shadow: inset 0 0 30px rgba(var(--c-land), 0.2);
  }

  .river-barrier {
    grid-row: 6 / span 2;
    align-self: stretch;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    line-height: normal;
    margin-top: -2px;
    background-color: var(--river-bg);
    animation: fadeIn 0.6s ease-out 0.3s both;
    pointer-events: none; /* Let hovers pass through to land underneath if desired, or keep as top layer */
  }
  /* River barrier doesn't need hover effect anymore if distinct from land logic, 
     or maybe it should just stay static blue? */

  .label {
    position: absolute;
    font-family: var(--font-header, 'Share Tech Mono', monospace);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--label-color);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    width: 100%;
    text-align: center;
    animation: fadeIn 0.5s ease-out both;
  }

  .label.top {
    top: 1rem;
    animation-delay: 0.1s;
  }

  .label.bottom {
    bottom: 1rem;
    animation-delay: 0.15s;
  }

  .label.north-land,
  .label.south-land {
    position: static;
    width: 100%;
    text-align: center;
    animation-delay: 0.2s;
  }

  .river-label {
    font-family: var(--font-header, 'Share Tech Mono', monospace);
    color: var(--label-color);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    background: none;
    border: none;
    padding: 0;
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
