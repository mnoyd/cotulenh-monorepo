import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PlayerInfoBar } from '../player-info-bar';

describe('PlayerInfoBar', () => {
  const defaultProps = {
    name: 'Nguoi choi 1',
    rating: 1500,
    color: 'red' as const,
    isActive: false,
    clock: 600000
  };

  it('renders player name', () => {
    render(<PlayerInfoBar {...defaultProps} />);
    expect(screen.getByText('Nguoi choi 1')).toBeDefined();
  });

  it('renders rating on desktop', () => {
    render(<PlayerInfoBar {...defaultProps} />);
    expect(screen.getByText('(1500)')).toBeDefined();
  });

  it('renders formatted clock', () => {
    render(<PlayerInfoBar {...defaultProps} />);
    expect(screen.getByText('10:00')).toBeDefined();
  });

  it('formats clock with leading zero seconds', () => {
    render(<PlayerInfoBar {...defaultProps} clock={65000} />);
    expect(screen.getByText('1:05')).toBeDefined();
  });

  it('does not render clock when null', () => {
    render(<PlayerInfoBar {...defaultProps} clock={null} />);
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('applies active turn border for red', () => {
    const { container } = render(<PlayerInfoBar {...defaultProps} isActive={true} />);
    const bar = container.firstElementChild!;
    expect(bar.className).toContain('border-l-4');
    expect(bar.className).toContain('border-l-[hsl(0,70%,50%)]');
  });

  it('applies active turn border for blue', () => {
    const { container } = render(<PlayerInfoBar {...defaultProps} color="blue" isActive={true} />);
    const bar = container.firstElementChild!;
    expect(bar.className).toContain('border-l-[hsl(210,70%,50%)]');
  });

  it('has aria-label with status text', () => {
    render(<PlayerInfoBar {...defaultProps} isActive={true} />);
    const bar = screen.getByLabelText('Nguoi choi 1, 1500 diem, dang di');
    expect(bar).toBeDefined();
  });

  it('has aria-label without active indicator when not active', () => {
    render(<PlayerInfoBar {...defaultProps} />);
    const bar = screen.getByLabelText('Nguoi choi 1, 1500 diem');
    expect(bar).toBeDefined();
  });

  it('shows initials from name', () => {
    render(<PlayerInfoBar {...defaultProps} />);
    expect(screen.getByText('NC')).toBeDefined();
  });

  it('clock has aria-live polite when under 30s', () => {
    render(<PlayerInfoBar {...defaultProps} clock={25000} />);
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-live')).toBe('polite');
  });

  it('clock has aria-live off when above 30s', () => {
    render(<PlayerInfoBar {...defaultProps} clock={600000} />);
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-live')).toBe('off');
  });
});
