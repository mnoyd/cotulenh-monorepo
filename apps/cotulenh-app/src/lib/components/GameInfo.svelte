<script lang="ts">
    import type { Move, Color } from '@repo/cotulenh-core'; // Use project's core types
    import MoveHistory from './MoveHistory.svelte';
    import { getTurnColorName } from '$lib/utils'; // Import helper

    // Props from the main page
    export let turn: Color | null; // Use Color type ('r' | 'b' or null if not started)
    export let history: Move[];
    // export let gameStatus: string | null = null; // Optional: Add later for checkmate/stalemate messages

</script>

<div class="game-info-panel">
    <div class="turn-indicator">
        Current Turn: <strong>{turn ? getTurnColorName(turn) : '...'}</strong>
    </div>

    <!-- Optional: Display game status messages -->
    <!-- {#if gameStatus}
        <div class="game-status {turn === 'w' ? 'black-wins' : 'white-wins'}">
            {gameStatus}
        </div>
    {/if} -->

    <MoveHistory {history} />
</div>

<style>
    .game-info-panel {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 15px;
        border: 1px solid var(--border-color, #ccc);
        border-radius: 5px;
        background-color: var(--bg-primary, #fff);
        min-width: 200px; /* Ensure it has some width */
    }

    .turn-indicator {
        text-align: center;
        font-size: 1.1em;
        padding: 8px;
        background-color: var(--bg-accent, #e0e0e0);
        border-radius: 4px;
        color: var(--text-primary, #333);
    }

    .turn-indicator strong {
        color: var(--text-emphasis, #000);
    }

    /* Styles for optional game status */
    /* .game-status {
        text-align: center;
        font-weight: bold;
        padding: 8px;
        border-radius: 4px;
        margin-top: -5px; /* Adjust spacing */
    /* }
    .white-wins { background-color: lightgreen; color: black; }
    .black-wins { background-color: lightcoral; color: white; } */

</style>
