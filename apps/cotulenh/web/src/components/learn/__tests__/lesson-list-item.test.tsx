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

  it('renders filled stars for completed lesson with stars=3', () => {
    render(<LessonListItem {...defaultProps} completed stars={3} />);
    const starContainer = screen.getByLabelText('3 sao');
    expect(starContainer).toBeInTheDocument();
    const stars = starContainer.querySelectorAll('span');
    expect(stars).toHaveLength(3);
    stars.forEach((star) => {
      expect(star.textContent).toBe('★');
    });
  });

  it('renders mixed filled and empty stars for stars=1', () => {
    render(<LessonListItem {...defaultProps} completed stars={1} />);
    const starContainer = screen.getByLabelText('1 sao');
    expect(starContainer).toBeInTheDocument();
  });

  it('renders mixed filled and empty stars for stars=2', () => {
    render(<LessonListItem {...defaultProps} completed stars={2} />);
    const starContainer = screen.getByLabelText('2 sao');
    expect(starContainer).toBeInTheDocument();
  });

  it('renders 3 empty stars when stars=0 (valid zero-star rating)', () => {
    render(<LessonListItem {...defaultProps} completed stars={0} />);
    const starContainer = screen.getByLabelText('0 sao');
    expect(starContainer).toBeInTheDocument();
    // All 3 stars should be present (all empty/muted)
    const stars = starContainer.querySelectorAll('span');
    expect(stars).toHaveLength(3);
  });

  it('does not render stars when not completed even if stars provided', () => {
    render(<LessonListItem {...defaultProps} stars={3} />);
    expect(screen.queryByLabelText(/sao/)).not.toBeInTheDocument();
  });

  it('does not render stars when stars prop is not provided', () => {
    render(<LessonListItem {...defaultProps} completed />);
    expect(screen.queryByLabelText(/sao/)).not.toBeInTheDocument();
  });

  it('renders progress placeholders while hydration is pending', () => {
    render(<LessonListItem {...defaultProps} progressPending />);
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/sao/)).not.toBeInTheDocument();
  });
});
