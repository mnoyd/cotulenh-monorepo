<script lang="ts">
	import { getI18n } from '$lib/i18n/index.svelte';
	import type { TranslationKey } from '$lib/i18n/types';
	import { History, ChevronRight } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { GameHistoryItem } from '$lib/game/history';
	import {
		getGameResult,
		getDurationParts,
		formatTimeControl,
		getGameHistoryReasonKey
	} from '$lib/game/history';

	const i18n = getI18n();

	let { data }: { data: PageData } = $props();

	function getResultLabel(result: 'win' | 'loss' | 'draw' | 'aborted'): string {
		const key = `gameHistory.result.${result}` as TranslationKey;
		return i18n.t(key);
	}

	function getResultColor(result: 'win' | 'loss' | 'draw' | 'aborted'): string {
		switch (result) {
			case 'win':
				return '#22c55e';
			case 'loss':
				return 'var(--theme-text-primary, #eee)';
			case 'draw':
				return '#f59e0b';
			case 'aborted':
				return 'var(--theme-text-secondary, #aaa)';
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
		return i18n
			.t('gameHistory.duration')
			.replace('{minutes}', String(duration.minutes))
			.replace('{seconds}', String(duration.seconds));
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		const date = new Date(dateStr);
		return date.toLocaleDateString(i18n.getLocale() === 'vi' ? 'vi-VN' : 'en-US', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{i18n.t('gameHistory.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="history-page">
	<div class="history-container">
		<h1 class="history-title">{i18n.t('gameHistory.title')}</h1>

		{#if data.games.length === 0}
			<div class="empty-state">
				<History size={48} class="empty-icon" />
				<p class="empty-title">{i18n.t('gameHistory.empty.title')}</p>
				<p class="empty-subtitle">{i18n.t('gameHistory.empty.subtitle')}</p>
			</div>
		{:else}
			<div class="game-list">
				{#each data.games as game (game.id)}
					{@const result = getGameResult(game)}
					<a href="/user/history/{game.id}" class="game-row">
						<div class="game-row-left">
							<span class="color-dot" class:red={game.playerColor === 'red'} class:blue={game.playerColor === 'blue'}></span>
							<div class="game-info">
								<div class="game-opponent">
									<span class="opponent-name">{i18n.t('gameHistory.vs')} {game.opponentDisplayName}</span>
									<span class="time-control">{formatTimeControl(game.timeControl)}</span>
								</div>
									<div class="game-meta">
										<span class="game-date">{formatDate(game.endedAt ?? game.startedAt)}</span>
										<span class="meta-sep">·</span>
										<span class="game-duration">{getDurationLabel(game)}</span>
									</div>
							</div>
						</div>
						<div class="game-row-right">
							<div class="result-info">
								<span class="result-label" style="color: {getResultColor(result)}">{getResultLabel(result)}</span>
								{#if getReasonLabel(game)}
									<span class="result-reason">{getReasonLabel(game)}</span>
								{/if}
							</div>
							<ChevronRight size={18} class="chevron-icon" />
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.history-page {
		display: flex;
		justify-content: center;
		padding: 2rem 1rem;
		min-height: 100vh;
	}

	.history-container {
		width: 100%;
		max-width: 800px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.history-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--theme-text-primary, #eee);
		margin: 0;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		text-align: center;
	}

	:global(.empty-icon) {
		color: var(--theme-text-secondary, #666);
	}

	.empty-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--theme-text-primary, #eee);
		margin: 0;
	}

	.empty-subtitle {
		font-size: 0.875rem;
		color: var(--theme-text-secondary, #aaa);
		margin: 0;
	}

	/* Game List */
	.game-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.game-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 1rem;
		background: var(--theme-bg-panel, #222);
		border: 1px solid var(--theme-border, #444);
		border-radius: 12px;
		text-decoration: none;
		color: inherit;
		min-height: 44px;
		transition: border-color 0.15s;
	}

	.game-row:hover {
		border-color: var(--theme-primary, #06b6d4);
	}

	.game-row:focus-visible {
		outline: 2px solid var(--theme-primary, #06b6d4);
		outline-offset: 2px;
	}

	.game-row-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		flex: 1;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.color-dot.red {
		background: #ef4444;
	}

	.color-dot.blue {
		background: #3b82f6;
	}

	.game-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.game-opponent {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.opponent-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--theme-text-primary, #eee);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.time-control {
		font-size: 0.75rem;
		color: var(--theme-text-secondary, #aaa);
		white-space: nowrap;
		padding: 0.1rem 0.4rem;
		background: var(--theme-bg-dark, #111);
		border-radius: 4px;
	}

	.game-meta {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--theme-text-secondary, #aaa);
	}

	.meta-sep {
		opacity: 0.5;
	}

	.game-row-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.result-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.1rem;
	}

	.result-label {
		font-size: 0.875rem;
		font-weight: 700;
	}

	.result-reason {
		font-size: 0.7rem;
		color: var(--theme-text-secondary, #aaa);
		white-space: nowrap;
	}

	:global(.chevron-icon) {
		color: var(--theme-text-secondary, #666);
		flex-shrink: 0;
	}

	/* Responsive */
	@media (max-width: 767px) {
		.history-page {
			padding: 1rem 0.5rem;
		}

		.game-row {
			padding: 0.75rem;
		}
	}
</style>
