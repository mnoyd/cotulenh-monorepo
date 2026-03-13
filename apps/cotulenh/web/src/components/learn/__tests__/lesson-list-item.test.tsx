import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LessonListItem } from '../lesson-list-item';

const defaultProps = {
  subjectId: 'basic-movement',
  lessonId: 'bm-1-1',
  title: 'Tốt - Di chuyển cơ bản',
  description: 'Học cách di chuyển quân Tốt',
  index: 1
};

describe('LessonListItem', () => {
  it('renders lesson title and description', () => {
    render(<LessonListItem {...defaultProps} />);
    expect(screen.getByText('Tốt - Di chuyển cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Học cách di chuyển quân Tốt')).toBeInTheDocument();
  });

  it('renders lesson index', () => {
    render(<LessonListItem {...defaultProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows completion indicator when completed', () => {
    render(<LessonListItem {...defaultProps} completed />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('does not show completion indicator when not completed', () => {
    render(<LessonListItem {...defaultProps} />);
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });
});
