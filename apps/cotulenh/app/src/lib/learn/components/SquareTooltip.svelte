<script lang="ts">
  import { onMount } from 'svelte';
  import type { Square } from '@cotulenh/core';
  import type { Api } from '@cotulenh/board';
  import type { LearnSession } from '../learn-session.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    session: LearnSession;
    boardApi: Api | null;
  }

  let { session, boardApi }: Props = $props();

  const i18n = getI18n();

  let tooltip = $state<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
    square: Square | null;
  }>({
    visible: false,
    content: '',
    x: 0,
    y: 0,
    square: null
  });

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  function showTooltip(square: Square, x: number, y: number) {
    if (!session || !session.lesson || session.status !== 'ready') {
      return;
    }

    // Get detailed square information from engine
    const info = session.getSquareInfo(square);
    if (!info) return;

    let content = '';

    // Priority 1: Target square - most important hint
    if (info.isTarget) {
      content = i18n.t('learn.tooltip.target');
    }
    // Priority 2: Piece that can move - encourage interaction
    else if (info.hasPiece && info.feedbackCode === 'hint.pieceSelected') {
      content = i18n.t('learn.tooltip.clickToMove');
    }
    // Priority 3: Valid destination - guide correct moves
    else if (info.isValidDest) {
      content = i18n.t('learn.tooltip.validMove');
    }

    // Only show tooltip if we have content
    if (content) {
      tooltip = {
        visible: true,
        content,
        x,
        y,
        square
      };

      // Clear any pending hide
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    }
  }

  function hideTooltip() {
    // Delay hiding to prevent flickering when moving between squares
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    hideTimeout = setTimeout(() => {
      tooltip = { ...tooltip, visible: false };
    }, 100);
  }

  function getSquareFromElement(element: HTMLElement): Square | null {
    // Try to find the square key from the element
    const square = element.closest('[data-square]');
    if (square) {
      return square.getAttribute('data-square') as Square;
    }

    // Fallback: try cgKey attribute
    const cgKey = (element as any).cgKey;
    if (cgKey && cgKey !== 'a0') {
      return cgKey as Square;
    }

    return null;
  }

  function getSquarePosition(square: Square): { x: number; y: number } | null {
    if (!boardApi) return null;

    const boardElement = boardApi.state.dom?.elements?.board;
    if (!boardElement) return null;

    // Find the square element
    const squareEl = boardElement.querySelector(`square[data-square="${square}"]`) as HTMLElement;
    if (!squareEl) return null;

    const rect = squareEl.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top
    };
  }

  function handleMouseMove(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Check if hovering over a square or piece
    const squareEl = target.closest('square, piece') as HTMLElement;
    if (!squareEl) {
      hideTooltip();
      return;
    }

    // Get the square key
    const square = getSquareFromElement(squareEl);
    if (!square) {
      hideTooltip();
      return;
    }

    // If same square, don't update
    if (tooltip.square === square && tooltip.visible) {
      return;
    }

    // Show tooltip for this square
    const rect = squareEl.getBoundingClientRect();
    showTooltip(square, rect.left + rect.width / 2, rect.top);
  }

  onMount(() => {
    const boardElement = boardApi?.state.dom?.elements?.container;
    if (!boardElement) return;

    boardElement.addEventListener('mousemove', handleMouseMove);
    boardElement.addEventListener('mouseleave', hideTooltip);

    return () => {
      boardElement.removeEventListener('mousemove', handleMouseMove);
      boardElement.removeEventListener('mouseleave', hideTooltip);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  });
</script>

{#if tooltip.visible}
  <div
    class="square-tooltip"
    style="left: {tooltip.x}px; top: {tooltip.y}px"
  >
    {tooltip.content}
  </div>
{/if}

<style>
  .square-tooltip {
    position: fixed;
    z-index: 10000;
    pointer-events: none;
    transform: translate(-50%, -100%);
    margin-top: -8px;
    
    background: var(--theme-bg-elevated, rgba(17, 24, 39, 0.98));
    border: 1px solid var(--theme-primary, #3b82f6);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text-primary, #f3f4f6);
    white-space: pre-line;
    text-align: center;
    
    box-shadow: 
      0 0 10px rgba(59, 130, 246, 0.3),
      0 4px 6px rgba(0, 0, 0, 0.5);
    
    animation: tooltip-appear 0.15s ease-out;
    max-width: 200px;
  }

  @keyframes tooltip-appear {
    from {
      opacity: 0;
      transform: translate(-50%, -90%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -100%);
    }
  }
</style>
