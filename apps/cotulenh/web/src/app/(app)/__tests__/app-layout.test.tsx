import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard')
}));

vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>
}));

vi.mock('@/components/layout/bottom-tab-bar', () => ({
  BottomTabBar: () => <nav data-testid="bottom-tab-bar">BottomTabBar</nav>
}));

// Import after mocks are set up
import AppLayout from '../layout';

describe('AppLayout', () => {
  it('renders Sidebar component', () => {
    render(
      <AppLayout>
        <div>Test content</div>
      </AppLayout>
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders BottomTabBar component', () => {
    render(
      <AppLayout>
        <div>Test content</div>
      </AppLayout>
    );
    expect(screen.getByTestId('bottom-tab-bar')).toBeInTheDocument();
  });

  it('renders children in main content area', () => {
    render(
      <AppLayout>
        <div>Test content</div>
      </AppLayout>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('wraps children in a main element with layout classes', () => {
    render(
      <AppLayout>
        <div>Test content</div>
      </AppLayout>
    );
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main.className).toContain('lg:ml-[48px]');
    expect(main.className).toContain('pb-[56px]');
    expect(main.className).toContain('lg:pb-0');
  });
});
