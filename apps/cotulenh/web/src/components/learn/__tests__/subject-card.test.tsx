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

  it('renders star aggregate when earnedStars and totalStars provided', () => {
    render(<SubjectCard {...defaultProps} completedLessons={3} earnedStars={7} totalStars={15} />);
    expect(screen.getByText(/★ 7\/15/)).toBeInTheDocument();
  });

  it('does not render star aggregate when no star data provided', () => {
    render(<SubjectCard {...defaultProps} completedLessons={3} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('renders star aggregate with earnedStars=0 when there is progress', () => {
    render(<SubjectCard {...defaultProps} completedLessons={2} earnedStars={0} totalStars={15} />);
    expect(screen.getByText(/★ 0\/15/)).toBeInTheDocument();
  });

  it('does not render star aggregate when no progress even with star data', () => {
    render(<SubjectCard {...defaultProps} earnedStars={0} totalStars={15} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('renders loading placeholders while progress is hydrating', () => {
    render(<SubjectCard {...defaultProps} progressPending />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/5 bài học/)).not.toBeInTheDocument();
  });
});
