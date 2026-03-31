import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { GameResultBanner } from '../game-result-banner';

describe('GameResultBanner', () => {
  const ratingChanges = {
    red: { old: 1492, new: 1504, delta: 12 },
    blue: { old: 1510, new: 1498, delta: -12 }
  };

  const defaultProps = {
    status: 'checkmate' as const,
    winner: 'red' as const,
    myColor: 'red' as const,
    isRated: true,
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

  it('rematch button is enabled in idle state', () => {
    render(<GameResultBanner {...defaultProps} />);
    const rematch = screen.getByTestId('game-result-rematch');
    expect(rematch.hasAttribute('disabled')).toBe(false);
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

  it('renders resign method text', () => {
    render(<GameResultBanner {...defaultProps} status="resign" winner="blue" />);
    expect(screen.getByTestId('game-result-method').textContent).toBe('Đầu hàng');
    expect(screen.getByTestId('game-result-outcome').textContent).toBe('Bạn thua!');
  });

  it('shows the current player rating delta for rated games', () => {
    render(<GameResultBanner {...defaultProps} ratingChanges={ratingChanges} />);

    expect(screen.getByTestId('rating-change-display')).toBeDefined();
    expect(screen.getByTestId('rating-change-old').textContent).toBe('1492');
  });

  it('hides the rating delta for casual games', () => {
    render(<GameResultBanner {...defaultProps} isRated={false} ratingChanges={ratingChanges} />);

    expect(screen.queryByTestId('rating-change-display')).toBeNull();
  });

  it('renders mutual agreement draw method text', () => {
    render(
      <GameResultBanner
        {...defaultProps}
        status="draw"
        winner={null}
        resultReason="mutual_agreement"
      />
    );
    expect(screen.getByTestId('game-result-method').textContent).toBe('Đồng ý hòa');
    expect(screen.getByTestId('game-result-outcome').textContent).toBe('Hòa!');
  });

  it('applies win styling class for winner', () => {
    render(<GameResultBanner {...defaultProps} />);
    const outcome = screen.getByTestId('game-result-outcome');
    expect(outcome.className).toContain('text-[var(--color-success)]');
  });

  it('applies loss styling class for loser', () => {
    render(<GameResultBanner {...defaultProps} winner="blue" />);
    const outcome = screen.getByTestId('game-result-outcome');
    expect(outcome.className).toContain('text-[var(--color-error)]');
  });

  it('applies draw styling class for draw', () => {
    render(<GameResultBanner {...defaultProps} status="stalemate" winner={null} />);
    const outcome = screen.getByTestId('game-result-outcome');
    expect(outcome.className).toContain('text-[var(--color-warning)]');
  });

  describe('rematch states', () => {
    it('calls onRematch when rematch button clicked in idle state', () => {
      const onRematch = vi.fn();
      render(<GameResultBanner {...defaultProps} onRematch={onRematch} />);
      fireEvent.click(screen.getByTestId('game-result-rematch'));
      expect(onRematch).toHaveBeenCalledOnce();
    });

    it('shows sent state with countdown text', () => {
      render(<GameResultBanner {...defaultProps} rematchStatus="sent" />);
      const rematch = screen.getByTestId('game-result-rematch');
      expect(rematch.hasAttribute('disabled')).toBe(true);
      expect(rematch.textContent).toContain('Đã mời tái đấu');
      expect(rematch.textContent).toContain('s)');
    });

    it('shows received state with accept/decline buttons', () => {
      const onAcceptRematch = vi.fn();
      const onDeclineRematch = vi.fn();
      render(
        <GameResultBanner
          {...defaultProps}
          rematchStatus="received"
          onAcceptRematch={onAcceptRematch}
          onDeclineRematch={onDeclineRematch}
        />
      );
      expect(screen.getByTestId('game-result-rematch-received')).toBeDefined();
      expect(screen.getByText('Đối thủ mời tái đấu')).toBeDefined();

      fireEvent.click(screen.getByTestId('game-result-rematch-accept'));
      expect(onAcceptRematch).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByTestId('game-result-rematch-decline'));
      expect(onDeclineRematch).toHaveBeenCalledOnce();
    });

    it('shows accepted state with loading text', () => {
      render(<GameResultBanner {...defaultProps} rematchStatus="accepted" />);
      const rematch = screen.getByTestId('game-result-rematch');
      expect(rematch.hasAttribute('disabled')).toBe(true);
      expect(rematch.textContent).toBe('Đang tạo ván mới...');
    });

    it('shows declined state with declined text', () => {
      render(<GameResultBanner {...defaultProps} rematchStatus="declined" />);
      const rematch = screen.getByTestId('game-result-rematch');
      expect(rematch.hasAttribute('disabled')).toBe(true);
      expect(rematch.textContent).toBe('Đối thủ từ chối tái đấu');
    });

    it('hides rematch button for aborted games', () => {
      render(<GameResultBanner {...defaultProps} status="aborted" winner={null} />);
      expect(screen.queryByTestId('game-result-rematch')).toBeNull();
      expect(screen.queryByTestId('game-result-rematch-received')).toBeNull();
    });
  });
});
