import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { GameResultBanner } from '../game-result-banner';

describe('GameResultBanner', () => {
  const defaultProps = {
    status: 'checkmate' as const,
    winner: 'red' as const,
    myColor: 'red' as const,
    resultReason: null,
    onNewGame: vi.fn(),
    onDismiss: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders win text when player wins by checkmate', () => {
    render(<GameResultBanner {...defaultProps} />);
    expect(screen.getByTestId('game-result-outcome').textContent).toBe('Bạn thắng!');
    expect(screen.getByTestId('game-result-method').textContent).toBe('Chiếu hết');
  });

  it('renders loss text when opponent wins', () => {
    render(<GameResultBanner {...defaultProps} winner="blue" />);
    expect(screen.getByTestId('game-result-outcome').textContent).toBe('Bạn thua!');
  });

  it('renders draw text for stalemate', () => {
    render(<GameResultBanner {...defaultProps} status="stalemate" winner={null} />);
    expect(screen.getByTestId('game-result-outcome').textContent).toBe('Hòa!');
    expect(screen.getByTestId('game-result-method').textContent).toBe('Bế tắc');
  });

  it('renders timeout method', () => {
    render(<GameResultBanner {...defaultProps} status="timeout" />);
    expect(screen.getByTestId('game-result-method').textContent).toBe('Hết giờ');
  });

  it('renders fifty-move rule draw', () => {
    render(
      <GameResultBanner
        {...defaultProps}
        status="draw"
        winner={null}
        resultReason="fifty_move_rule"
      />
    );
    expect(screen.getByTestId('game-result-method').textContent).toBe('Hòa theo luật 50 nước');
  });

  it('renders threefold repetition draw', () => {
    render(
      <GameResultBanner
        {...defaultProps}
        status="draw"
        winner={null}
        resultReason="threefold_repetition"
      />
    );
    expect(screen.getByTestId('game-result-method').textContent).toBe('Hòa do lặp lại 3 lần');
  });

  it('has correct accessibility attributes', () => {
    render(<GameResultBanner {...defaultProps} />);
    const banner = screen.getByTestId('game-result-banner');
    expect(banner.getAttribute('role')).toBe('alertdialog');
    expect(banner.getAttribute('aria-modal')).toBe('true');
  });

  it('calls onNewGame when new game button clicked', () => {
    const onNewGame = vi.fn();
    render(<GameResultBanner {...defaultProps} onNewGame={onNewGame} />);
    fireEvent.click(screen.getByTestId('game-result-new-game'));
    expect(onNewGame).toHaveBeenCalledOnce();
  });

  it('rematch button is disabled', () => {
    render(<GameResultBanner {...defaultProps} />);
    const rematch = screen.getByTestId('game-result-rematch');
    expect(rematch.hasAttribute('disabled')).toBe(true);
  });

  it('review button is disabled', () => {
    render(<GameResultBanner {...defaultProps} />);
    const review = screen.getByTestId('game-result-review');
    expect(review.hasAttribute('disabled')).toBe(true);
  });

  it('calls onDismiss when backdrop is clicked', () => {
    const onDismiss = vi.fn();
    render(<GameResultBanner {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('game-result-backdrop'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not dismiss when banner content is clicked', () => {
    const onDismiss = vi.fn();
    render(<GameResultBanner {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('game-result-banner'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('renders Vietnamese button labels', () => {
    render(<GameResultBanner {...defaultProps} />);
    expect(screen.getByText('Tái đấu')).toBeDefined();
    expect(screen.getByText('Ván mới')).toBeDefined();
    expect(screen.getByText('Xem lại')).toBeDefined();
  });

  it('applies win styling class for winner', () => {
    render(<GameResultBanner {...defaultProps} />);
    const outcome = screen.getByTestId('game-result-outcome');
    expect(outcome.className).toContain('text-green-400');
  });

  it('applies loss styling class for loser', () => {
    render(<GameResultBanner {...defaultProps} winner="blue" />);
    const outcome = screen.getByTestId('game-result-outcome');
    expect(outcome.className).toContain('text-red-400');
  });

  it('applies draw styling class for draw', () => {
    render(<GameResultBanner {...defaultProps} status="stalemate" winner={null} />);
    const outcome = screen.getByTestId('game-result-outcome');
    expect(outcome.className).toContain('text-yellow-400');
  });
});
