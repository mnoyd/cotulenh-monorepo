import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockSignup, mockLogin } = vi.hoisted(() => ({
  mockSignup: vi.fn(async () => ({ success: false })),
  mockLogin: vi.fn(async () => ({ success: false }))
}));

vi.mock('@/lib/actions/auth', () => ({
  initialAuthActionState: { success: false },
  signup: mockSignup,
  login: mockLogin
}));

import LoginPage from '@/app/(auth)/login/page';
import SignupPage from '@/app/(auth)/signup/page';

describe('Auth pages', () => {
  it('renders the signup form with Vietnamese labels and links', () => {
    render(<SignupPage />);

    expect(screen.getByRole('heading', { name: 'Đăng ký' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên hiển thị')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Đã có tài khoản? Đăng nhập' })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows signup validation errors on blur and enables submit when valid', async () => {
    render(<SignupPage />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'khong-hop-le' } });
    fireEvent.blur(emailInput);

    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'noy@example.com' } });
    fireEvent.blur(emailInput);
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
    fireEvent.blur(screen.getByLabelText('Mật khẩu'));
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Noy' } });
    fireEvent.blur(screen.getByLabelText('Tên hiển thị'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeEnabled();
    });
  });

  it('submits the signup form through the server action', async () => {
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'noy@example.com' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Noy' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng ký' }).closest('form')!);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalled();
    });
  });

  it('renders the login form with Vietnamese labels and links', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Chưa có tài khoản? Đăng ký' })).toHaveAttribute(
      'href',
      '/signup'
    );
    expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute(
      'href',
      '/reset-password'
    );
  });

  it('shows login validation feedback and enables submit when complete', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(page);

    fireEvent.blur(screen.getByLabelText('Email'));
    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'noy@example.com' } });
    fireEvent.blur(screen.getByLabelText('Email'));
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
    fireEvent.blur(screen.getByLabelText('Mật khẩu'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
    });
  });

  it('submits the login form through the server action', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(page);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'noy@example.com' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Đăng nhập' }).closest('form')!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('shows reset success banner when reset=success in searchParams', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ reset: 'success' }) });
    render(page);

    expect(screen.getByText('Mật khẩu đã được cập nhật. Vui lòng đăng nhập.')).toBeInTheDocument();
  });
});
