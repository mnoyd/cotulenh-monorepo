import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlaceholderPage } from '../placeholder-page';

describe('PlaceholderPage', () => {
  it('renders as a labeled section instead of a main landmark', () => {
    render(
      <PlaceholderPage
        title="Tiêu đề"
        description="Mô tả"
        primaryAction={{ href: '/dashboard', label: 'Về bảng điều khiển' }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Tiêu đề' })).toHaveAttribute(
      'id',
      'placeholder-page-title'
    );
    expect(
      screen.getByRole('region', {
        name: 'Tiêu đề'
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });
});
