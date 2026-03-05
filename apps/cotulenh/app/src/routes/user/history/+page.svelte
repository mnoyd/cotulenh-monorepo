<script lang="ts">
	import { getI18n } from '$lib/i18n/index.svelte';
	import type { TranslationKey } from '$lib/i18n/types';
	import CommandCenter from '$lib/components/CommandCenter.svelte';
	import type { PageData } from './$types';
	import type { GameHistoryItem } from '$lib/game/history';
	import {
		getGameResult,
		getDurationParts,
		formatTimeControl,
		getGameHistoryReasonKey
	} from '$lib/game/history';

	import '$lib/styles/command-center.css';

	const i18n = getI18n();

	let { data }: { data: PageData } = $props();

	function getResultLabel(result: 'win' | 'loss' | 'draw' | 'aborted'): string {
		const key = `gameHistory.result.${result}` as TranslationKey;
		return i18n.t(key);
	}

	function getResultColor(result: 'win' | 'loss' | 'draw' | 'aborted'): string {
		switch (result) {
			case 'win': return '#22c55e';
			case 'loss': return 'var(--theme-text-primary, #eee)';
			case 'draw': return '#f59e0b';
			case 'aborted': return 'var(--theme-text-secondary, #aaa)';
		}
	}

	function getReasonLabel(game: GameHistoryItem): string {
		const key = getGameHistoryReasonKey(game.resultReason);
		if (!key) return '';
		return i18n.t(key);
	}

	function getDurationLabel(game: GameHistoryItem): string {
		const duration = getDurationParts(game.startedAt, game.endedAt);
		if (!duration) return '—';
		return i18n.t('gameHistory.duration')
			.replace('{minutes}', String(duration.minutes))
			.replace('{seconds}', String(duration.seconds));
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		const date = new Date(dateStr);
		return date.toLocaleDateString(i18n.getLocale() === 'vi' ? 'vi-VN' : 'en-US', {
			day: 'numeric', month: 'short', year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{i18n.t('gameHistory.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<CommandCenter center={centerContent} />

{#snippet centerContent()}
	<div class="history-center">
		<h1 class="section-header">{i18n.t('gameHistory.title')}</h1>

		{#if data.games.length === 0}
			<span class="text-secondary">{i18n.t('gameHistory.empty.title')}</span>
		{:else}
			<div class="flat-list">
				{#each data.games as game (game.id)}
					{@const result = getGameResult(game)}
					<a href="/user/history/{game.id}" class="game-row">
						<div class="game-left">
							<span class="color-dot" class:red={game.playerColor === 'red'} class:blue={game.playerColor === 'blue'}></span>
							<span class="opponent">{i18n.t('gameHistory.vs')} {game.opponentDisplayName}</span>
							<span class="time-control">{formatTimeControl(game.timeControl)}</span>
						</div>
						<div class="game-right">
							<span class="result" style="color: {getResultColor(result)}">{getResultLabel(result)}</span>
							{#if getReasonLabel(game)}
								<span class="reason">{getReasonLabel(game)}</span>
							{/if}
							<span class="date">{formatDate(game.endedAt ?? game.startedAt)}</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<style>
	.history-center {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 1rem;
	}

	.text-secondary {
		color: var(--theme-text-secondary, #aaa);
		font-size: 0.8125rem;
	}

	.game-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0;
		text-decoration: none;
		color: inherit;
		gap: 0.5rem;
	}

	.game-row:hover {
		background: var(--theme-bg-dark, #111);
	}

	.game-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	.color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.color-dot.red { background: #ef4444; }
	.color-dot.blue { background: #3b82f6; }

	.opponent {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--theme-text-primary, #eee);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.time-control {
		font-family: var(--font-mono, monospace);
		font-size: 0.6875rem;
		color: var(--theme-text-secondary, #aaa);
	}

	.game-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.result {
		font-size: 0.8125rem;
		font-weight: 700;
	}

	.reason {
		font-size: 0.6875rem;
		color: var(--theme-text-secondary, #aaa);
	}

	.date {
		font-size: 0.6875rem;
		color: var(--theme-text-secondary, #aaa);
	}
</style>
