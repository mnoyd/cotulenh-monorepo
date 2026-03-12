import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ResetRequestForm } from '@/components/auth/reset-request-form';

const { mockRequestPasswordReset } = vi.hoisted(() => ({
  mockRequestPasswordReset: vi.fn(async () => ({ success: false }))
}));

vi.mock('@/lib/actions/auth', () => ({
  requestPasswordReset: mockRequestPasswordReset,
  initialAuthActionState: { success: false }
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

describe('ResetRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestPasswordReset.mockResolvedValue({ success: false });
  });

  it('renders the reset password request form', () => {
    render(<ResetRequestForm />);

    expect(screen.getByText('Quên mật khẩu')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' })).toBeInTheDocument();
    expect(screen.getByText('Quay lại đăng nhập')).toBeInTheDocument();
  });

  it('disables submit button when email is empty', () => {
    render(<ResetRequestForm />);

    expect(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' })).toBeDisabled();
  });

  it('shows validation error on blur for invalid email', () => {
    render(<ResetRequestForm />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'khong-hop-le' } });
    fireEvent.blur(emailInput);

    expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
  });

  it('enables submit button for valid email', () => {
    render(<ResetRequestForm />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'noy@example.com' } });

    expect(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' })).toBeEnabled();
  });

  it('has a link back to login', () => {
    render(<ResetRequestForm />);

    const link = screen.getByText('Quay lại đăng nhập');
    expect(link).toHaveAttribute('href', '/login');
  });

  it('submits the reset request form through the server action', async () => {
    render(<ResetRequestForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'noy@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }).closest('form')!);

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalled();
    });
  });

  it('shows confirmation state after successful submission', async () => {
    mockRequestPasswordReset.mockResolvedValue({ success: true });
    render(<ResetRequestForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'noy@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }).closest('form')!);

    expect(
      await screen.findByText('Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.')
    ).toBeInTheDocument();
  });

  it('shows a notice message when provided', () => {
    render(
      <ResetRequestForm notice="Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới." />
    );

    expect(
      screen.getByText(
        'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.'
      )
    ).toBeInTheDocument();
  });
});
