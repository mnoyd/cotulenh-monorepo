<script lang="ts">
  // BridgeDetail.svelte
  // Visualizes the River Barrier and the Bridges (f6/f7 and h6/h7)
  // Reuses the grid system from TerrainGuide for consistency
  import BridgeSvg from './BridgeSvg.svelte';
  import { getI18n } from '$lib/i18n';

  const i18n = getI18n();
</script>

<div class="bridge-detail">
  <div class="board-container">
    <img src="/assets/board-grid.svg" alt="Game Board Grid" class="board-grid" />

    <div class="overlay-container">
      <!-- Shared Defs -->
      <svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
        <defs>
          <filter id="wood-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" result="noise" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.6  0 0 0 0 0.4  0 0 0 0 0.2  0 0 0 0.5 0"
              in="noise"
              result="coloredNoise"
            />
            <!-- Use lighter composite operation or just blend -->
            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
            <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
          </filter>
        </defs>
      </svg>

      <!-- River Barrier: Blue strip across the board -->
      <!-- Between Rank 6 and 7.
           In grid (12 rows): Row 1=Rank 12 ... Row 6=Rank 7, Row 7=Rank 6.
           So the river is the boundary between grid row 6 and 7.
           We'll position it to span column 1-11 (entire width) and cover the middle area.
      -->
      <div class="river-strip"></div>

      <!-- Bridges -->
      <!-- Bridge 1: f6/f7. File f is 6th column (a,b,c,d,e,f).
           Ranks 6 & 7 correspond to grid rows 7 & 6.
           So Grid Col 6, Grid Rows 6-7.
      -->
      <div class="bridge" style="grid-column: 6; grid-row: 6;">
        <BridgeSvg />
      </div>

      <!-- Bridge 2: h6/h7. File h is 8th column (a,b,c,d,e,f,g,h).
           Grid Col 8, Grid Rows 6-7.
      -->
      <div class="bridge" style="grid-column: 8; grid-row: 6;">
        <BridgeSvg />
      </div>

      <!-- Labels with Arrows (Visualized via absolute positioning) -->
      <!-- River Label -->
      <div class="label-container river-label-pos">
        <div class="label-box">{i18n.t('learn.diagram.river')}</div>
        <div class="arrow-down"></div>
      </div>

      <!-- Bridge Label -->
      <div class="label-container bridge-label-pos">
        <div class="label-box">{i18n.t('learn.diagram.bridge')}</div>
        <div class="arrow-lines">
          <!-- Left arrow pointing to f-file bridge -->
          <svg width="60" height="40" viewBox="0 0 60 40" class="bridge-arrow-left">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="0"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
              </marker>
            </defs>
            <line
              x1="50"
              y1="0"
              x2="10"
              y2="30"
              stroke="#cbd5e1"
              stroke-width="2"
              marker-end="url(#arrowhead)"
            />
          </svg>
          <!-- Right arrow pointing to h-file bridge -->
          <svg width="60" height="40" viewBox="0 0 60 40" class="bridge-arrow-right">
            <line
              x1="10"
              y1="0"
              x2="50"
              y2="30"
              stroke="#cbd5e1"
              stroke-width="2"
              marker-end="url(#arrowhead)"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .bridge-detail {
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
    aspect-ratio: 720 / 780;
  }

  .board-grid {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 4px;
    opacity: 0.5;
  }

  .overlay-container {
    position: absolute;
    /* Estimated 60mm border on 720x780mm SVG */
    top: 7.7%; /* 60 / 780 */
    left: 8.3%; /* 60 / 720 */
    width: 83.4%; /* 600 / 720 */
    height: 84.6%; /* 660 / 780 */
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    grid-template-rows: repeat(11, 1fr);
  }


  /* River Strip Design */
  .river-strip {
    grid-column: 3 / 11; /* Start from Coastal (Col 3) to end (Col 10 end) */
    grid-row: 6; /* Occupy exactly the river row (between Rank 7 and 6) */
    align-self: center;
    height: 64%; /* Reduced height to avoid overflowing onto banks */
    position: relative;
    overflow: hidden; /* Clip the sliding texture */

    background-color: rgba(59, 130, 246, 0.3); /* Base color */

    margin-left: 0;
    margin-right: 0;

    border-radius: 4px;
    box-shadow: inset 0 0 10px rgba(29, 78, 216, 0.3); /* Inner glow for depth */
    z-index: 1;

    /* River Banks */
    border-top: 2px solid rgba(30, 58, 138, 0.6);
    border-bottom: 2px solid rgba(30, 58, 138, 0.6);
  }

  /* Static Water Texture Layer */
  .river-strip::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    background-image: repeating-linear-gradient(
      -45deg,
      rgba(59, 130, 246, 0.4) 0px,
      rgba(59, 130, 246, 0.4) 20px,
      rgba(37, 99, 235, 0.4) 20px,
      rgba(37, 99, 235, 0.4) 40px
    );
    background-size: 50% 100%;
  }

  /* Bridge Design */
  .bridge {
    position: relative;
    z-index: 2; /* Above river */
    display: flex;
    align-items: center;
    justify-content: center;
    /* Align to the start of the column (the grid line) and center itself on it */
    justify-self: start;
    transform: translateX(-50%);
    width: 0; /* Container has no width, children determine size centered on line */
  }

  /* Labels */
  .label-container {
    position: absolute;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .label-box {
    background: #f1f5f9;
    color: #0f172a;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: var(--font-body, system-ui, sans-serif);
    font-weight: 700;
    font-size: 0.9rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* Positioning Labels */
  /* We need to place them roughly where they are in the mockup */
  /* "River" label is vaguely above the leftish side */
  .river-label-pos {
    /* Adjusted for new container coordinates */
    /* Previous relative to full board: ~40% Y, ~29% X */
    /* New container is smaller and shifted. */
    /* Let's keep them roughly centered in their respective zones for now */
    top: 38%;
    left: 27%;
  }

  .river-label-pos .arrow-down {
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 20px solid #cbd5e1; /* Arrow color */
    margin-top: 2px;
  }

  /* "Bridge" label is centered above the two bridges (cols 6 & 8) */
  /* Col 6 center is roughly ~50% wide? */
  /* Col 1-11. Center is Col 6. So directly above Col 7? Or between 6 and 8 is 7. */
  .bridge-label-pos {
    top: 35%;
    left: 59%; /* Geometric center between 50% (Col 6) and 68% (Col 8) */
    transform: translateX(-50%);
  }

  .arrow-lines {
    display: flex;
    justify-content: center;
    gap: 0;
    margin-top: 2px;
  }

  /* Adjust arrow positions to point to the bridges */
  .bridge-arrow-left {
    margin-right: -10px; /* Overlap slightly if needed */
  }
  .bridge-arrow-right {
    margin-left: -10px;
  }
</style>
