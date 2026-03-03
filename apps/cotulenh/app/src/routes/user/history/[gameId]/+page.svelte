<script lang="ts">
	import '$lib/styles/board.css';
	import { getI18n } from '$lib/i18n/index.svelte';
	import { GameSession } from '$lib/game-session.svelte';
	import { extractLastMoveSquares } from '$lib/game-session-helpers';
	import { mapLastMoveToBoardFormat } from '$lib/features/game/utils';
	import BoardContainer from '$lib/components/BoardContainer.svelte';
	import MoveHistory from '$lib/components/MoveHistory.svelte';
	import {
		getGameHistoryReasonKey,
		getDurationParts,
		formatTimeControl
	} from '$lib/game/history';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		ChevronFirst,
		ChevronLast,
		ChevronLeft,
		ChevronRight,
		Copy
	} from 'lucide-svelte';
	import {
		applyReplayNavigation,
		getReplayActionFromKey,
		isReplayAtEnd,
		isReplayAtStart,
		syncStartPositionWithHistory,
		type ReplayNavigationAction
	} from './replay-controls';
	import type { PageData } from './$types';

	const i18n = getI18n();

	let { data }: { data: PageData } = $props();

	// Initialize game session and capture starting FEN before PGN load
	const session = new GameSession();
	const startingFen = session.fen;
	session.loadFromSync(data.game.pgn);

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
</script>

<svelte:head>
	<title>{i18n.t('gameReplay.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="replay-page">
	<!-- Back link -->
	<a href="/user/history" class="back-link">
		<ArrowLeft size={18} />
		<span>{i18n.t('gameReplay.backToHistory')}</span>
	</a>

	<div class="replay-layout">
		<!-- Board area -->
		<div class="board-area">
			<div class="board-wrapper">
				<BoardContainer config={replayBoardConfig} />
			</div>

			<!-- Navigation controls (below board on mobile, in sidebar on desktop) -->
			<div class="nav-controls mobile-only">
				<button
					class="nav-btn"
					onclick={() => applyNavigation('first')}
					disabled={atStart}
					aria-label={i18n.t('gameReplay.firstMove')}
				>
					<ChevronFirst size={22} />
				</button>
				<button
					class="nav-btn"
					onclick={() => applyNavigation('prev')}
					disabled={atStart}
					aria-label={i18n.t('gameReplay.previousMove')}
				>
					<ChevronLeft size={22} />
				</button>
				<span class="move-status">{moveStatusText}</span>
				<button
					class="nav-btn"
					onclick={() => applyNavigation('next')}
					disabled={atEnd}
					aria-label={i18n.t('gameReplay.nextMove')}
				>
					<ChevronRight size={22} />
				</button>
				<button
					class="nav-btn"
					onclick={() => applyNavigation('last')}
					disabled={atEnd}
					aria-label={i18n.t('gameReplay.lastMove')}
				>
					<ChevronLast size={22} />
				</button>
			</div>
		</div>

		<!-- Sidebar -->
		<div class="sidebar">
			<!-- Game metadata -->
			<div class="metadata-panel">
				<div class="players-row">
					<div class="player">
						<span class="color-dot red"></span>
						<span class="player-name">{data.game.redPlayer.displayName}</span>
					</div>
					<span class="vs-label">{i18n.t('gameHistory.vs')}</span>
					<div class="player">
						<span class="color-dot blue"></span>
						<span class="player-name">{data.game.bluePlayer.displayName}</span>
					</div>
				</div>

				<div class="result-row">
					<span class="result-badge" style="color: {getResultColor()}">
						{getResultLabel()}
					</span>
					{#if getReasonText()}
						<span class="result-reason">{getReasonText()}</span>
					{/if}
				</div>

				<div class="meta-details">
					<span class="meta-item">{formatTimeControl(data.game.timeControl)}</span>
					<span class="meta-sep">·</span>
					<span class="meta-item">{formatDate(data.game.endedAt ?? data.game.startedAt)}</span>
					<span class="meta-sep">·</span>
					<span class="meta-item">{getDurationLabel()}</span>
				</div>

				<button class="copy-pgn-btn" onclick={copyPgn}>
					<Copy size={16} />
					<span>{i18n.t('gameReplay.copyPgn')}</span>
				</button>
			</div>

			<!-- Move history -->
			<div class="move-history-wrapper">
				<MoveHistory {session} highlightLatestWhenNotPreviewing={!showStartPosition} />
			</div>

			<!-- Navigation controls (in sidebar on desktop) -->
			<div class="nav-controls desktop-only">
				<button
					class="nav-btn"
					onclick={() => applyNavigation('first')}
					disabled={atStart}
					aria-label={i18n.t('gameReplay.firstMove')}
				>
					<ChevronFirst size={22} />
				</button>
				<button
					class="nav-btn"
					onclick={() => applyNavigation('prev')}
					disabled={atStart}
					aria-label={i18n.t('gameReplay.previousMove')}
				>
					<ChevronLeft size={22} />
				</button>
				<span class="move-status">{moveStatusText}</span>
				<button
					class="nav-btn"
					onclick={() => applyNavigation('next')}
					disabled={atEnd}
					aria-label={i18n.t('gameReplay.nextMove')}
				>
					<ChevronRight size={22} />
				</button>
				<button
					class="nav-btn"
					onclick={() => applyNavigation('last')}
					disabled={atEnd}
					aria-label={i18n.t('gameReplay.lastMove')}
				>
					<ChevronLast size={22} />
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.replay-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		min-height: 100vh;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--theme-text-secondary, #aaa);
		text-decoration: none;
		font-size: 0.875rem;
		min-height: 44px;
		min-width: 44px;
		padding: 0.25rem 0;
		transition: color 0.15s;
	}

	.back-link:hover {
		color: var(--theme-text-primary, #eee);
	}

	/* Layout */
	.replay-layout {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.board-area {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.board-wrapper {
		container-type: size;
		width: 100%;
		max-width: 600px;
		aspect-ratio: 12 / 13;
		margin: 0 auto;
	}

	/* Sidebar */
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Metadata panel */
	.metadata-panel {
		background: var(--theme-bg-panel, #222);
		border: 1px solid var(--theme-border, #444);
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.players-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.player {
		display: flex;
		align-items: center;
		gap: 0.4rem;
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

	.player-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--theme-text-primary, #eee);
	}

	.vs-label {
		font-size: 0.75rem;
		color: var(--theme-text-secondary, #aaa);
	}

	.result-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.result-badge {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.result-reason {
		font-size: 0.75rem;
		color: var(--theme-text-secondary, #aaa);
	}

	.meta-details {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--theme-text-secondary, #aaa);
	}

	.meta-sep {
		opacity: 0.5;
	}

	.copy-pgn-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.75rem;
		background: var(--theme-bg-dark, #111);
		border: 1px solid var(--theme-border, #444);
		border-radius: 8px;
		color: var(--theme-text-secondary, #aaa);
		font-size: 0.8rem;
		cursor: pointer;
		min-height: 44px;
		min-width: 44px;
		transition:
			border-color 0.15s,
			color 0.15s;
		align-self: flex-start;
	}

	.copy-pgn-btn:hover {
		border-color: var(--theme-primary, #06b6d4);
		color: var(--theme-text-primary, #eee);
	}

	/* Move history wrapper */
	.move-history-wrapper {
		height: 200px;
		min-height: 120px;
	}

	/* Navigation controls */
	.nav-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.5rem;
		background: var(--theme-bg-panel, #222);
		border: 1px solid var(--theme-border, #444);
		border-radius: 12px;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		min-width: 44px;
		padding: 0.5rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		color: var(--theme-text-primary, #eee);
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--theme-bg-dark, #111);
		border-color: var(--theme-border, #444);
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.move-status {
		font-size: 0.75rem;
		color: var(--theme-text-secondary, #aaa);
		text-align: center;
		min-width: 100px;
		white-space: nowrap;
	}

	/* Mobile/Desktop visibility */
	.mobile-only {
		display: flex;
	}
	.desktop-only {
		display: none;
	}

	/* Desktop layout */
	@media (min-width: 768px) {
		.replay-layout {
			flex-direction: row;
			align-items: flex-start;
		}

		.board-area {
			flex: 0 0 62%;
			max-width: 62%;
		}

		.board-wrapper {
			max-width: 100%;
		}

		.sidebar {
			flex: 1;
			min-width: 0;
		}

		.move-history-wrapper {
			height: 300px;
		}

		.mobile-only {
			display: none;
		}
		.desktop-only {
			display: flex;
		}
	}

	@media (min-width: 1024px) {
		.replay-page {
			padding: 1.5rem 2rem;
		}

		.board-area {
			flex: 0 0 60%;
			max-width: 60%;
		}
	}
</style>
