import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ResetSuccessBanner } from '@/components/auth/reset-success-banner';

describe('ResetSuccessBanner', () => {
  it('displays the success message', () => {
    render(<ResetSuccessBanner />);

    expect(screen.getByText('Mật khẩu đã được cập nhật. Vui lòng đăng nhập.')).toBeInTheDocument();
  });

  it('can be dismissed', () => {
    render(<ResetSuccessBanner />);

    const closeButton = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeButton);

    expect(
      screen.queryByText('Mật khẩu đã được cập nhật. Vui lòng đăng nhập.')
    ).not.toBeInTheDocument();
  });
});
