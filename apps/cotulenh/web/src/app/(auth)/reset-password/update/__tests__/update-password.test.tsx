import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UpdatePasswordForm } from '@/components/auth/update-password-form';

const { mockUpdatePassword } = vi.hoisted(() => ({
  mockUpdatePassword: vi.fn(async () => ({ success: false }))
}));

vi.mock('@/lib/actions/auth', () => ({
  updatePassword: mockUpdatePassword,
  initialAuthActionState: { success: false }
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

describe('UpdatePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePassword.mockResolvedValue({ success: false });
  });

  it('renders the update password form', () => {
    render(<UpdatePasswordForm />);

    expect(screen.getByText('Đặt mật khẩu mới')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu mới')).toBeInTheDocument();
    expect(screen.getByLabelText('Xác nhận mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cập nhật mật khẩu' })).toBeInTheDocument();
  });

  it('disables submit when fields are empty', () => {
    render(<UpdatePasswordForm />);

    expect(screen.getByRole('button', { name: 'Cập nhật mật khẩu' })).toBeDisabled();
  });

  it('shows validation error for short password on blur', () => {
    render(<UpdatePasswordForm />);

    const passwordInput = screen.getByLabelText('Mật khẩu mới');
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.blur(passwordInput);

    expect(screen.getByText('Mật khẩu phải có ít nhất 8 ký tự')).toBeInTheDocument();
  });

  it('shows validation error for mismatched passwords', () => {
    render(<UpdatePasswordForm />);

    const passwordInput = screen.getByLabelText('Mật khẩu mới');
    const confirmInput = screen.getByLabelText('Xác nhận mật khẩu');
    fireEvent.change(passwordInput, { target: { value: 'matkhau123' } });
    fireEvent.change(confirmInput, { target: { value: 'matkhau456' } });
    fireEvent.blur(confirmInput);

    expect(screen.getByText('Mật khẩu không khớp')).toBeInTheDocument();
  });

  it('enables submit when passwords match and are valid', () => {
    render(<UpdatePasswordForm />);

    const passwordInput = screen.getByLabelText('Mật khẩu mới');
    const confirmInput = screen.getByLabelText('Xác nhận mật khẩu');
    fireEvent.change(passwordInput, { target: { value: 'matkhaumoi123' } });
    fireEvent.change(confirmInput, { target: { value: 'matkhaumoi123' } });

    expect(screen.getByRole('button', { name: 'Cập nhật mật khẩu' })).toBeEnabled();
  });

  it('has a link back to login', () => {
    render(<UpdatePasswordForm />);

    const link = screen.getByText('Quay lại đăng nhập');
    expect(link).toHaveAttribute('href', '/login');
  });

  it('submits update-password form through the server action', async () => {
    render(<UpdatePasswordForm />);

    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), {
      target: { value: 'matkhaumoi123' }
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
      target: { value: 'matkhaumoi123' }
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }).closest('form')!);

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalled();
    });
  });
});
