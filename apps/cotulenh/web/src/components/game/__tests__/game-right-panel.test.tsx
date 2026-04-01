import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import type { GameData } from '@/lib/types/game';
import { GameRightPanel } from '../game-right-panel';

const baseProps = {
  moveHistory: ['e2e4', 'd7d5', 'g1f3'],
  phase: 'playing' as const,
  myColor: 'red' as const,
  pendingDrawOffer: null,
  pendingTakeback: null,
  onResign: vi.fn(),
  onOfferDraw: vi.fn(),
  onAcceptDraw: vi.fn(),
  onDeclineDraw: vi.fn(),
  onExpireDrawOffer: vi.fn(),
  onRequestTakeback: vi.fn(),
  onAcceptTakeback: vi.fn(),
  onDeclineTakeback: vi.fn(),
  onExpireTakeback: vi.fn()
};

const gameData: GameData = {
  id: 'game-1',
  status: 'checkmate',
  red_player: { id: 'red', display_name: 'Nguoi choi Do', rating: 1500 },
  blue_player: { id: 'blue', display_name: 'Nguoi choi Xanh', rating: 1500 },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-04-01T00:00:00Z',
  winner: 'red',
  result_reason: 'checkmate',
  game_state: {
    move_history: ['a1a2'],
    fen: 'fen',
    phase: 'playing',
    clocks: { red: 100, blue: 100 },
    pending_action: null
  }
};

describe('GameRightPanel', () => {
  it('renders move list and navigation buttons', () => {
    render(<GameRightPanel {...baseProps} />);

    expect(screen.getByText('e2e4')).toBeDefined();
    expect(screen.getByLabelText('Di den nuoc dau tien')).toBeDefined();
    expect(screen.getByLabelText('Nuoc truoc')).toBeDefined();
    expect(screen.getByLabelText('Nuoc tiep')).toBeDefined();
    expect(screen.getByLabelText('Di den nuoc cuoi cung')).toBeDefined();
  });

  it('shows game controls in live mode', () => {
    render(<GameRightPanel {...baseProps} />);
    expect(screen.getByTestId('resign-button')).toBeDefined();
  });

  it('hides game controls in review mode', () => {
    render(
      <GameRightPanel
        {...baseProps}
        isReviewMode
        currentMoveIndex={3}
        totalMoves={3}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.queryByTestId('resign-button')).toBeNull();
  });

  it('shows PGN export controls in review mode when game data is provided', () => {
    render(
      <GameRightPanel
        {...baseProps}
        isReviewMode
        gameData={gameData}
        currentMoveIndex={1}
        totalMoves={1}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByTestId('pgn-export-controls')).toBeDefined();
    expect(screen.getByText('Sao chep PGN')).toBeDefined();
    expect(screen.getByText('Tai xuong')).toBeDefined();
  });

  it('does not show PGN export controls in live mode', () => {
    render(<GameRightPanel {...baseProps} gameData={gameData} />);
    expect(screen.queryByTestId('pgn-export-controls')).toBeNull();
  });

  describe('review mode navigation buttons', () => {
    it('disables first/prev at index 0', () => {
      render(
        <GameRightPanel
          {...baseProps}
          isReviewMode
          currentMoveIndex={0}
          totalMoves={3}
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Di den nuoc dau tien')).toBeDisabled();
      expect(screen.getByLabelText('Nuoc truoc')).toBeDisabled();
      expect(screen.getByLabelText('Nuoc tiep')).not.toBeDisabled();
      expect(screen.getByLabelText('Di den nuoc cuoi cung')).not.toBeDisabled();
    });

    it('disables next/last at final move', () => {
      render(
        <GameRightPanel
          {...baseProps}
          isReviewMode
          currentMoveIndex={3}
          totalMoves={3}
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Di den nuoc dau tien')).not.toBeDisabled();
      expect(screen.getByLabelText('Nuoc truoc')).not.toBeDisabled();
      expect(screen.getByLabelText('Nuoc tiep')).toBeDisabled();
      expect(screen.getByLabelText('Di den nuoc cuoi cung')).toBeDisabled();
    });

    it('calls onNavigate with correct action', () => {
      const onNavigate = vi.fn();
      render(
        <GameRightPanel
          {...baseProps}
          isReviewMode
          currentMoveIndex={1}
          totalMoves={3}
          onNavigate={onNavigate}
        />
      );

      fireEvent.click(screen.getByLabelText('Di den nuoc dau tien'));
      expect(onNavigate).toHaveBeenCalledWith('first');

      fireEvent.click(screen.getByLabelText('Nuoc truoc'));
      expect(onNavigate).toHaveBeenCalledWith('prev');

      fireEvent.click(screen.getByLabelText('Nuoc tiep'));
      expect(onNavigate).toHaveBeenCalledWith('next');

      fireEvent.click(screen.getByLabelText('Di den nuoc cuoi cung'));
      expect(onNavigate).toHaveBeenCalledWith('last');
    });
  });
});
