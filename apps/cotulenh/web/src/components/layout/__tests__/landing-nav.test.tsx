import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LandingNav } from '../landing-nav';

describe('LandingNav', () => {
  it('renders the logo text as a link to home', () => {
    render(<LandingNav />);
    const logo = screen.getByRole('link', { name: 'CoTuLenh' });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('href', '/');
  });

  it('renders the "Học" (Learn) navigation link pointing to /learn', () => {
    render(<LandingNav />);
    const learnLink = screen.getByRole('link', { name: 'Học' });
    expect(learnLink).toBeInTheDocument();
    expect(learnLink).toHaveAttribute('href', '/learn');
  });

  it('renders the "Đăng nhập" (Sign In) link pointing to /login', () => {
    render(<LandingNav />);
    const signInLink = screen.getByRole('link', { name: 'Đăng nhập' });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('has an accessible navigation landmark', () => {
    render(<LandingNav />);
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(nav).toBeInTheDocument();
  });

  it('renders all links with visible focus indicators', () => {
    render(<LandingNav />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    links.forEach((link) => {
      expect(link.className).toContain('focus-visible');
    });
  });
});
