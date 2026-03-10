import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AuthLayout from '../layout';

describe('AuthLayout', () => {
  it('renders a centered auth shell with the logo link and content', () => {
    render(
      <AuthLayout>
        <p>Auth content</p>
      </AuthLayout>
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CoTuLenh' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Auth content')).toBeInTheDocument();
  });
});
