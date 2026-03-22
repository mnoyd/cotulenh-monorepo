import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { GameControls } from '../game-controls';

const defaultProps = {
  phase: 'playing' as const,
  myColor: 'red' as const,
  pendingDrawOffer: null,
  pendingTakeback: null,
  moveHistoryLength: 5,
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

describe('GameControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders three buttons in default state', () => {
    render(<GameControls {...defaultProps} />);

    expect(screen.getByTestId('resign-button')).toHaveTextContent('Đầu hàng');
    expect(screen.getByTestId('draw-button')).toHaveTextContent('Xin hòa');
    expect(screen.getByTestId('takeback-button')).toHaveTextContent('Xin đi lại');
  });

  it('disables all controls when phase is not playing', () => {
    render(<GameControls {...defaultProps} phase="ended" />);

    expect(screen.getByTestId('resign-button')).toBeDisabled();
    expect(screen.getByTestId('draw-button')).toBeDisabled();
    expect(screen.getByTestId('takeback-button')).toBeDisabled();
  });

  it('disables takeback when no moves exist', () => {
    render(<GameControls {...defaultProps} moveHistoryLength={0} />);

    expect(screen.getByTestId('resign-button')).not.toBeDisabled();
    expect(screen.getByTestId('draw-button')).not.toBeDisabled();
    expect(screen.getByTestId('takeback-button')).toBeDisabled();
  });

  describe('resign inline confirmation', () => {
    it('shows confirmation buttons on resign click', () => {
      render(<GameControls {...defaultProps} />);

      fireEvent.click(screen.getByTestId('resign-button'));

      expect(screen.getByTestId('resign-confirm-text')).toHaveTextContent('Đầu hàng?');
      expect(screen.getByTestId('resign-confirm-yes')).toHaveTextContent('Có');
      expect(screen.getByTestId('resign-confirm-no')).toHaveTextContent('Không');
    });

    it('calls onResign when confirmed', () => {
      render(<GameControls {...defaultProps} />);

      fireEvent.click(screen.getByTestId('resign-button'));
      fireEvent.click(screen.getByTestId('resign-confirm-yes'));

      expect(defaultProps.onResign).toHaveBeenCalledOnce();
    });

    it('reverts on cancel', () => {
      render(<GameControls {...defaultProps} />);

      fireEvent.click(screen.getByTestId('resign-button'));
      fireEvent.click(screen.getByTestId('resign-confirm-no'));

      expect(screen.getByTestId('resign-button')).toBeInTheDocument();
      expect(defaultProps.onResign).not.toHaveBeenCalled();
    });

    it('auto-reverts after 10 seconds', () => {
      render(<GameControls {...defaultProps} />);

      fireEvent.click(screen.getByTestId('resign-button'));
      expect(screen.getByTestId('resign-confirm-text')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(screen.getByTestId('resign-button')).toBeInTheDocument();
    });
  });

  describe('draw offer states', () => {
    it('shows disabled button when draw offer sent', () => {
      render(<GameControls {...defaultProps} pendingDrawOffer="sent" />);

      const btn = screen.getByTestId('draw-button');
      expect(btn).toBeDisabled();
      expect(btn.textContent).toMatch(/Đã xin hòa/);
    });

    it('clears local draw state when countdown expires', () => {
      render(<GameControls {...defaultProps} pendingDrawOffer="sent" />);

      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      expect(defaultProps.onExpireDrawOffer).toHaveBeenCalledOnce();
    });

    it('shows accept/decline when draw offer received', () => {
      render(<GameControls {...defaultProps} pendingDrawOffer="received" />);

      expect(screen.getByTestId('draw-received')).toBeInTheDocument();
      expect(screen.getByTestId('draw-accept')).toHaveTextContent('Chấp nhận');
      expect(screen.getByTestId('draw-decline')).toHaveTextContent('Từ chối');
    });

    it('calls onAcceptDraw when accept clicked', () => {
      render(<GameControls {...defaultProps} pendingDrawOffer="received" />);

      fireEvent.click(screen.getByTestId('draw-accept'));
      expect(defaultProps.onAcceptDraw).toHaveBeenCalledOnce();
    });

    it('calls onDeclineDraw when decline clicked', () => {
      render(<GameControls {...defaultProps} pendingDrawOffer="received" />);

      fireEvent.click(screen.getByTestId('draw-decline'));
      expect(defaultProps.onDeclineDraw).toHaveBeenCalledOnce();
    });
  });

  describe('takeback states', () => {
    it('shows disabled button when takeback sent', () => {
      render(<GameControls {...defaultProps} pendingTakeback="sent" />);

      const btn = screen.getByTestId('takeback-button');
      expect(btn).toBeDisabled();
      expect(btn.textContent).toMatch(/Đã xin đi lại/);
    });

    it('clears local takeback state when countdown expires', () => {
      render(<GameControls {...defaultProps} pendingTakeback="sent" />);

      act(() => {
        vi.advanceTimersByTime(30_000);
      });

      expect(defaultProps.onExpireTakeback).toHaveBeenCalledOnce();
    });

    it('shows accept/decline when takeback received', () => {
      render(<GameControls {...defaultProps} pendingTakeback="received" />);

      expect(screen.getByTestId('takeback-received')).toBeInTheDocument();
      expect(screen.getByTestId('takeback-accept')).toHaveTextContent('Chấp nhận');
      expect(screen.getByTestId('takeback-decline')).toHaveTextContent('Từ chối');
    });

    it('calls onAcceptTakeback when accept clicked', () => {
      render(<GameControls {...defaultProps} pendingTakeback="received" />);

      fireEvent.click(screen.getByTestId('takeback-accept'));
      expect(defaultProps.onAcceptTakeback).toHaveBeenCalledOnce();
    });

    it('calls onDeclineTakeback when decline clicked', () => {
      render(<GameControls {...defaultProps} pendingTakeback="received" />);

      fireEvent.click(screen.getByTestId('takeback-decline'));
      expect(defaultProps.onDeclineTakeback).toHaveBeenCalledOnce();
    });
  });

  describe('button click handlers', () => {
    it('calls onOfferDraw when draw button clicked', () => {
      render(<GameControls {...defaultProps} />);

      fireEvent.click(screen.getByTestId('draw-button'));
      expect(defaultProps.onOfferDraw).toHaveBeenCalledOnce();
    });

    it('calls onRequestTakeback when takeback button clicked', () => {
      render(<GameControls {...defaultProps} />);

      fireEvent.click(screen.getByTestId('takeback-button'));
      expect(defaultProps.onRequestTakeback).toHaveBeenCalledOnce();
    });
  });

  it('has aria-live region for state changes', () => {
    render(<GameControls {...defaultProps} />);

    const container = screen.getByTestId('game-controls');
    expect(container.getAttribute('aria-live')).toBe('polite');
  });
});
