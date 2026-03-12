import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BottomTabBar } from '../bottom-tab-bar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard')
}));

describe('BottomTabBar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
  });

  it('renders a navigation landmark with correct aria-label', () => {
    render(<BottomTabBar />);
    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng' });
    expect(nav).toBeInTheDocument();
  });

  it('renders all 5 tabs with Vietnamese labels', () => {
    render(<BottomTabBar />);
    expect(screen.getByText('Trang chủ')).toBeInTheDocument();
    expect(screen.getByText('Chơi')).toBeInTheDocument();
    expect(screen.getByText('Bạn bè')).toBeInTheDocument();
    expect(screen.getByText('BXH')).toBeInTheDocument();
    expect(screen.getByText('Cài đặt')).toBeInTheDocument();
  });

  it('renders correct href for each tab', () => {
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Chơi' })).toHaveAttribute('href', '/play');
    expect(screen.getByRole('link', { name: 'Bạn bè' })).toHaveAttribute('href', '/friends');
    expect(screen.getByRole('link', { name: 'BXH' })).toHaveAttribute('href', '/leaderboard');
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('href', '/settings');
  });

  it('highlights active tab with aria-current="page"', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Chơi' })).not.toHaveAttribute('aria-current');
  });

  it('highlights different tab when pathname changes', () => {
    vi.mocked(usePathname).mockReturnValue('/friends');
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: 'Bạn bè' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
  });

  it('treats nested route segments as active for parent tab', () => {
    vi.mocked(usePathname).mockReturnValue('/friends/requests');
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: 'Bạn bè' })).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark similarly prefixed routes as active', () => {
    vi.mocked(usePathname).mockReturnValue('/playground');
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: 'Chơi' })).not.toHaveAttribute('aria-current');
  });

  it('renders links in logical keyboard tab order', () => {
    render(<BottomTabBar />);
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard',
      '/play',
      '/friends',
      '/leaderboard',
      '/settings'
    ]);
  });

  it('is visible on mobile and hidden on desktop', () => {
    render(<BottomTabBar />);
    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng' });
    expect(nav.className).toContain('lg:hidden');
    expect(nav.className).toContain('flex');
    expect(nav.className).toContain('h-[calc(56px+env(safe-area-inset-bottom))]');
  });

  it('all links have visible focus indicators', () => {
    render(<BottomTabBar />);
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.className).toContain('focus-visible');
    });
  });

  it('tab links have correct aria-labels', () => {
    render(<BottomTabBar />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    const labels = links.map((link) => link.getAttribute('aria-label'));
    expect(labels).toEqual(['Trang chủ', 'Chơi', 'Bạn bè', 'BXH', 'Cài đặt']);
  });
});
