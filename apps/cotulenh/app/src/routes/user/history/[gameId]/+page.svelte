<script lang="ts">
	import '$lib/styles/board.css';
	import { getI18n } from '$lib/i18n/index.svelte';
	import { GameSession } from '$lib/game-session.svelte';
	import { extractLastMoveSquares } from '$lib/game-session-helpers';
	import { mapLastMoveToBoardFormat } from '$lib/features/game/utils';
	import BoardContainer from '$lib/components/BoardContainer.svelte';
	import MoveHistory from '$lib/components/MoveHistory.svelte';
	import CommandCenter from '$lib/components/CommandCenter.svelte';
	import TabPanel from '$lib/components/TabPanel.svelte';
	import {
		getGameHistoryReasonKey,
		getDurationParts,
		formatTimeControl
	} from '$lib/game/history';
	import { toast } from 'svelte-sonner';
	import {
		applyReplayNavigation,
		getReplayActionFromKey,
		isReplayAtEnd,
		isReplayAtStart,
		syncStartPositionWithHistory,
		type ReplayNavigationAction
	} from './replay-controls';
	import type { PageData } from './$types';

	import '$lib/styles/command-center.css';

	const i18n = getI18n();

	let { data }: { data: PageData } = $props();

	// Initialize game session and capture starting FEN before PGN load
	const { session, startingFen } = (() => {
		const replaySession = new GameSession();
		const initialFen = replaySession.fen;
		replaySession.loadFromSync(data.game.pgn);
		return { session: replaySession, startingFen: initialFen };
	})();

	// Track whether we're showing the starting position (before first move)
	let showStartPosition = $state(session.history.length > 0);

	// Derive viewIndex from session's historyViewIndex
	let viewIndex = $derived(session.historyViewIndex);

	// Compute board FEN based on navigation state
	let boardFen = $derived(
		showStartPosition
			? startingFen
			: viewIndex !== -1
				? session.history[viewIndex]?.after ?? startingFen
				: session.fen
	);

	// Compute last move highlighting
	let currentLastMove = $derived.by(() => {
		if (showStartPosition) return undefined;
		if (viewIndex !== -1) {
			const move = session.history[viewIndex];
			return move ? mapLastMoveToBoardFormat(extractLastMoveSquares(move)) : undefined;
		}
		if (session.history.length > 0) {
			return mapLastMoveToBoardFormat(
				extractLastMoveSquares(session.history[session.history.length - 1])
			);
		}
		return undefined;
	});

	// Board orientation: show player's color if they're a participant
	let boardOrientation = $derived.by(() => {
		if (data.currentUserId === data.game.bluePlayer.id) return 'blue' as const;
		return 'red' as const;
	});

	// Build replay board config (simpler than session.boardConfig - no movable pieces)
	let replayBoardConfig = $derived({
		fen: boardFen,
		viewOnly: true,
		lastMove: currentLastMove,
		orientation: boardOrientation,
		check: false
	});

	// Move counter display
	let moveStatusText = $derived.by(() => {
		if (showStartPosition) return i18n.t('gameReplay.startPosition');
		if (viewIndex === -1) return i18n.t('gameReplay.finalPosition');
		return i18n
			.t('gameReplay.moveOf')
			.replace('{current}', String(viewIndex + 1))
			.replace('{total}', String(session.history.length));
	});

	// Navigation disabled states
	let atStart = $derived(
		isReplayAtStart({
			showStartPosition,
			viewIndex,
			historyLength: session.history.length
		})
	);
	let atEnd = $derived(
		isReplayAtEnd({
			showStartPosition,
			viewIndex,
			historyLength: session.history.length
		})
	);

	function applyNavigation(action: ReplayNavigationAction) {
		const nextState = applyReplayNavigation(
			{
				showStartPosition,
				viewIndex,
				historyLength: session.history.length
			},
			action
		);

		showStartPosition = nextState.showStartPosition;

		if (nextState.viewIndex === -1) {
			if (session.historyViewIndex !== -1) {
				session.cancelPreview();
			}
			return;
		}

		if (session.historyViewIndex !== nextState.viewIndex) {
			session.previewMove(nextState.viewIndex);
		}
	}

	// Sync showStartPosition when MoveHistory clicks a move
	$effect(() => {
		showStartPosition = syncStartPositionWithHistory(
			showStartPosition,
			session.historyViewIndex
		);
	});

	// Keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		const action = getReplayActionFromKey({
			key: e.key,
			targetTagName: (e.target as HTMLElement | null)?.tagName,
			metaKey: e.metaKey,
			ctrlKey: e.ctrlKey,
			altKey: e.altKey
		});

		if (action) {
			e.preventDefault();
			applyNavigation(action);
		}
	}

	// Copy PGN
	async function copyPgn() {
		try {
			await navigator.clipboard.writeText(data.game.pgn);
			toast.success(i18n.t('gameReplay.pgnCopied'));
		} catch {
			toast.error(i18n.t('share.toastCopyFailed'));
		}
	}

	// Game metadata helpers
	function getViewerColor(): 'red' | 'blue' | null {
		if (data.currentUserId === data.game.redPlayer.id) return 'red';
		if (data.currentUserId === data.game.bluePlayer.id) return 'blue';
		return null;
	}

	function getResultLabel(): string {
		const game = data.game;
		if (game.status === 'aborted') return i18n.t('gameHistory.result.aborted');
		if (game.winner === null) return i18n.t('gameHistory.result.draw');

		const viewerColor = getViewerColor();
		if (!viewerColor) {
			return game.winner === 'red'
				? `${i18n.t('common.red')} ${i18n.t('gameHistory.result.win')}`
				: `${i18n.t('common.blue')} ${i18n.t('gameHistory.result.win')}`;
		}

		return game.winner === viewerColor
			? i18n.t('gameHistory.result.win')
			: i18n.t('gameHistory.result.loss');
	}

	function getResultColor(): string {
		const game = data.game;
		if (game.status === 'aborted') return 'var(--theme-text-secondary, #aaa)';
		if (game.winner === null) return '#f59e0b';

		const viewerColor = getViewerColor();
		if (!viewerColor) return 'var(--theme-text-primary, #eee)';
		return game.winner === viewerColor ? '#22c55e' : 'var(--theme-text-primary, #eee)';
	}

	function getReasonText(): string {
		const key = getGameHistoryReasonKey(data.game.resultReason);
		if (!key) return '';
		return i18n.t(key);
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

	function getDurationLabel(): string {
		const duration = getDurationParts(data.game.startedAt, data.game.endedAt);
		if (!duration) return '—';
		return i18n
			.t('gameHistory.duration')
			.replace('{minutes}', String(duration.minutes))
			.replace('{seconds}', String(duration.seconds));
	}

	const tabs = $derived([
		{ id: 'moves', label: i18n.t('tabs.moves') },
		{ id: 'info', label: i18n.t('tabs.game') }
	]);
</script>

<svelte:head>
	<title>{i18n.t('gameReplay.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<CommandCenter center={centerContent} right={rightContent} />

{#snippet centerContent()}
	<div class="replay-center">
		<a href="/user/history" class="text-link">{i18n.t('gameReplay.backToHistory')}</a>

		<div class="board-wrapper">
			<BoardContainer config={replayBoardConfig} />
		</div>

		<div class="player-bar">
			<span class="color-dot red"></span>
			<span class="player-name">{data.game.redPlayer.displayName}</span>
			<span class="vs-text">{i18n.t('gameHistory.vs')}</span>
			<span class="color-dot blue"></span>
			<span class="player-name">{data.game.bluePlayer.displayName}</span>
		</div>
	</div>
{/snippet}

{#snippet rightContent()}
	<TabPanel {tabs} let:activeTab>
		{#if activeTab === 'moves'}
			<div class="moves-tab">
				<div class="move-history-wrapper">
					<MoveHistory {session} highlightLatestWhenNotPreviewing={!showStartPosition} />
				</div>
				<div class="nav-controls">
					<button
						class="text-link"
						onclick={() => applyNavigation('first')}
						disabled={atStart}
						aria-label={i18n.t('gameReplay.firstMove')}
					>|&lt;</button>
					<button
						class="text-link"
						onclick={() => applyNavigation('prev')}
						disabled={atStart}
						aria-label={i18n.t('gameReplay.previousMove')}
					>&lt;</button>
					<span class="move-status">{moveStatusText}</span>
					<button
						class="text-link"
						onclick={() => applyNavigation('next')}
						disabled={atEnd}
						aria-label={i18n.t('gameReplay.nextMove')}
					>&gt;</button>
					<button
						class="text-link"
						onclick={() => applyNavigation('last')}
						disabled={atEnd}
						aria-label={i18n.t('gameReplay.lastMove')}
					>&gt;|</button>
				</div>
			</div>
		{:else if activeTab === 'info'}
			<div class="info-tab">
				<span class="result-text" style="color: {getResultColor()}">{getResultLabel()}</span>
				{#if getReasonText()}
					<span class="text-secondary">{getReasonText()}</span>
				{/if}

				<hr class="divider" />

				<div class="meta-row">
					<span class="text-secondary">{formatTimeControl(data.game.timeControl)}</span>
					<span class="text-secondary">·</span>
					<span class="text-secondary">{formatDate(data.game.endedAt ?? data.game.startedAt)}</span>
					<span class="text-secondary">·</span>
					<span class="text-secondary">{getDurationLabel()}</span>
				</div>

				<hr class="divider" />

				<button class="text-link" onclick={copyPgn}>{i18n.t('gameReplay.copyPgn')}</button>
			</div>
		{/if}
	</TabPanel>
{/snippet}

<style>
	.replay-center {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.5rem;
	}

	.board-wrapper {
		container-type: size;
		width: 100%;
		aspect-ratio: 12 / 13;
	}

	.player-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}

	.color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.color-dot.red { background: #ef4444; }
	.color-dot.blue { background: #3b82f6; }

	.player-name {
		font-weight: 600;
		color: var(--theme-text-primary, #eee);
	}

	.vs-text {
		color: var(--theme-text-secondary, #aaa);
		font-size: 0.75rem;
	}

	.text-secondary {
		color: var(--theme-text-secondary, #aaa);
		font-size: 0.8125rem;
	}

	.moves-tab {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 100%;
	}

	.move-history-wrapper {
		flex: 1;
		min-height: 120px;
	}

	.nav-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.375rem 0;
	}

	.move-status {
		font-size: 0.75rem;
		color: var(--theme-text-secondary, #aaa);
		text-align: center;
		min-width: 80px;
		white-space: nowrap;
	}

	.info-tab {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.result-text {
		font-size: 1rem;
		font-weight: 700;
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
</style>
