<script lang="ts">
	import { afterUpdate } from 'svelte';
	import type { Move } from '@repo/cotulenh-core'; // Use project's core types

	// Prop received from parent component
	export let history: Move[] = []; // Default to empty array

	let historyContainer: HTMLDivElement; // Bind to the div element for scrolling

	// Scroll to the bottom whenever the history updates
	afterUpdate(() => {
		if (historyContainer) {
			historyContainer.scrollTop = historyContainer.scrollHeight;
		}
	});
</script>

<div class="move-history-container" bind:this={historyContainer}>
	<h3>Move History</h3>
	{#if history.length === 0}
		<p>No moves yet.</p>
	{:else}
		<ol class="moves-list">
			{#each history as move, index}
				{#if index % 2 === 0}
					<li>
						<span class="move-number">{Math.floor(index / 2) + 1}.</span>
						<span class="move-san">{move.san}</span>
						{#if history[index + 1]}
							<span class="move-san">{history[index + 1].san}</span>
						{/if}
					</li>
				{/if}
			{/each}
		</ol>
	{/if}
</div>

<style>
	.move-history-container {
		border: 1px solid var(--border-color, #ccc);
		padding: 10px 15px;
		max-height: 400px; /* Adjust as needed */
		min-width: 180px;
		overflow-y: auto;
		background-color: var(--bg-secondary, #f9f9f9);
		border-radius: 4px;
	}

	h3 {
		margin-top: 0;
		margin-bottom: 10px;
		font-size: 1.1em;
		text-align: center;
		color: var(--text-primary, #333);
	}

	.moves-list {
		list-style: none;
		padding: 0;
		margin: 0;
		font-family: monospace;
		font-size: 0.95em;
		color: var(--text-secondary, #555);
	}

	.moves-list li {
		padding: 4px 0;
		display: flex;
		gap: 10px;
		border-bottom: 1px dashed var(--border-light, #eee);
	}
    .moves-list li:last-child {
        border-bottom: none;
    }

	.move-number {
		display: inline-block;
		min-width: 25px; /* Align move numbers */
		color: var(--text-muted, #777);
        text-align: right;
	}
    .move-san {
        min-width: 50px; /* Ensure space for moves */
        display: inline-block;
    }
	p {
		text-align: center;
		color: var(--text-muted, #777);
	}
</style>
