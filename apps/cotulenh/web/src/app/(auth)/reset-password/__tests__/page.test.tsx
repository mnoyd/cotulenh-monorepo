import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ResetPasswordPage from '../page';

describe('ResetPasswordPage', () => {
  it('shows a session-expired notice when redirected from update page', async () => {
    const page = await ResetPasswordPage({
      searchParams: Promise.resolve({ reason: 'session_required' })
    });
    render(page);

    expect(
      screen.getByText(
        'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.'
      )
    ).toBeInTheDocument();
  });

  it('renders default form state without notice', async () => {
    const page = await ResetPasswordPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText('Quên mật khẩu')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.'
      )
    ).not.toBeInTheDocument();
  });
});
