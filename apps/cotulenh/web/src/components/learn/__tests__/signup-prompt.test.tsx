import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SignupPrompt } from '../signup-prompt';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('SignupPrompt', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('shows when unauthenticated with 3+ completed lessons', () => {
    render(<SignupPrompt isAuthenticated={false} completedLessonCount={3} />);

    expect(screen.getByText('Sẵn sàng chơi với người thật?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng ký ngay' })).toHaveAttribute('href', '/signup');
  });

  it('hides when authenticated', () => {
    render(<SignupPrompt isAuthenticated={true} completedLessonCount={5} />);

    expect(screen.queryByText('Sẵn sàng chơi với người thật?')).not.toBeInTheDocument();
  });

  it('hides when fewer than 3 lessons completed', () => {
    render(<SignupPrompt isAuthenticated={false} completedLessonCount={2} />);

    expect(screen.queryByText('Sẵn sàng chơi với người thật?')).not.toBeInTheDocument();
  });

  it('hides when dismissed and stores in sessionStorage', () => {
    render(<SignupPrompt isAuthenticated={false} completedLessonCount={3} />);

    const dismissButton = screen.getByText('Để sau');
    fireEvent.click(dismissButton);

    expect(screen.queryByText('Sẵn sàng chơi với người thật?')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('signup-prompt-dismissed')).toBe('true');
  });

  it('does not show if already dismissed in this session', () => {
    sessionStorage.setItem('signup-prompt-dismissed', 'true');

    render(<SignupPrompt isAuthenticated={false} completedLessonCount={5} />);

    expect(screen.queryByText('Sẵn sàng chơi với người thật?')).not.toBeInTheDocument();
  });
});
