import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from '../sidebar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard')
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
  });

  it('renders a navigation landmark with correct aria-label', () => {
    render(<Sidebar />);
    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng' });
    expect(nav).toBeInTheDocument();
  });

  it('renders all 5 nav items with correct aria-labels', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chơi' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bạn bè' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bảng xếp hạng' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toBeInTheDocument();
  });

  it('renders correct href for each nav item', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Chơi' })).toHaveAttribute('href', '/play');
    expect(screen.getByRole('link', { name: 'Bạn bè' })).toHaveAttribute('href', '/friends');
    expect(screen.getByRole('link', { name: 'Bảng xếp hạng' })).toHaveAttribute(
      'href',
      '/leaderboard'
    );
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('href', '/settings');
  });

  it('highlights active route with aria-current="page"', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Chơi' })).not.toHaveAttribute('aria-current');
  });

  it('highlights different route when pathname changes', () => {
    vi.mocked(usePathname).mockReturnValue('/leaderboard');
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Bảng xếp hạng' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
  });

  it('renders links in logical keyboard tab order', () => {
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard',
      '/play',
      '/friends',
      '/leaderboard',
      '/settings'
    ]);
  });

  it('has hidden class for mobile and flex for desktop', () => {
    render(<Sidebar />);
    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng' });
    expect(nav.className).toContain('hidden');
    expect(nav.className).toContain('lg:flex');
  });

  it('all links have visible focus indicators', () => {
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.className).toContain('focus-visible');
    });
  });

  it('renders links with title attribute for tooltips', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('title', 'Trang chủ');
    expect(screen.getByRole('link', { name: 'Chơi' })).toHaveAttribute('title', 'Chơi');
  });
});
