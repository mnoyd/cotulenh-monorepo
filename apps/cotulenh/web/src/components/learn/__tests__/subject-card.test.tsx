import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SubjectCard } from '../subject-card';

const defaultProps = {
  id: 'basic-movement',
  title: 'Di chuyển cơ bản',
  description: 'Tìm hiểu cách di chuyển các quân cờ',
  lessonCount: 5
};

describe('SubjectCard', () => {
  it('renders title and description', () => {
    render(<SubjectCard {...defaultProps} />);
    expect(screen.getByText('Di chuyển cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Tìm hiểu cách di chuyển các quân cờ')).toBeInTheDocument();
  });

  it('renders lesson count', () => {
    render(<SubjectCard {...defaultProps} />);
    expect(screen.getByText(/5 bài học/)).toBeInTheDocument();
  });

  it('links to subject page', () => {
    render(<SubjectCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/learn/basic-movement');
  });

  it('renders progress indicator when progress is provided', () => {
    render(<SubjectCard {...defaultProps} completedLessons={3} />);
    expect(screen.getByText(/3\/5 bài học/)).toBeInTheDocument();
  });

  it('does not show progress when no progress provided', () => {
    render(<SubjectCard {...defaultProps} />);
    expect(screen.queryByText(/3\/5/)).not.toBeInTheDocument();
  });
});
