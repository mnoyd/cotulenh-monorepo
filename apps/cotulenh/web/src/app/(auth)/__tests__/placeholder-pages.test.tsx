import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DashboardPage from '@/app/(app)/dashboard/page';
import LearnPage from '@/app/(public)/learn/page';
import LoginPage from '@/app/(auth)/login/page';
import SignupPage from '@/app/(auth)/signup/page';

describe('Landing route targets', () => {
  it('renders the learn destination page', () => {
    render(<LearnPage />);

    expect(
      screen.getByRole('heading', { name: 'Khu học chơi đang được chuẩn bị' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/signup');
  });

  it('renders the login destination page', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Đăng nhập sắp sẵn sàng' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng ký trước' })).toHaveAttribute('href', '/signup');
  });

  it('renders the signup destination page', () => {
    render(<SignupPage />);

    expect(screen.getByRole('heading', { name: 'Đăng ký sắp sẵn sàng' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem khu học chơi' })).toHaveAttribute(
      'href',
      '/learn'
    );
  });

  it('renders the dashboard destination page', () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole('heading', { name: 'Bảng điều khiển đang được hoàn thiện' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá khu học chơi' })).toHaveAttribute(
      'href',
      '/learn'
    );
  });
});
