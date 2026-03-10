import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PublicLayout from '../layout';

describe('PublicLayout', () => {
  it('renders navigation and children within a main element', () => {
    render(
      <PublicLayout>
        <p>Test content</p>
      </PublicLayout>
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders the LandingNav inside the layout', () => {
    render(
      <PublicLayout>
        <div />
      </PublicLayout>
    );

    expect(screen.getByRole('link', { name: 'CoTuLenh' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Học' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
  });
});
