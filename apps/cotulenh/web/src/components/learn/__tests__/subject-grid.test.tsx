import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SubjectGrid } from '../subject-grid';

const subjects = [
  { id: 'basic-movement', title: 'Di chuyển cơ bản', description: 'Desc 1', lessonCount: 5 },
  { id: 'terrain', title: 'Địa hình', description: 'Desc 2', lessonCount: 3 }
];

describe('SubjectGrid', () => {
  it('renders all subject cards', () => {
    render(<SubjectGrid subjects={subjects} />);
    expect(screen.getByText('Di chuyển cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Địa hình')).toBeInTheDocument();
  });

  it('renders correct number of links', () => {
    render(<SubjectGrid subjects={subjects} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });
});
