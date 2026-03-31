import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
