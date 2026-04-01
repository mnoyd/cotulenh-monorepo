import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AiDifficultySelector } from '../ai-difficulty-selector';

describe('AiDifficultySelector', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three difficulty buttons', () => {
    render(<AiDifficultySelector onSelect={onSelect} />);

    expect(screen.getByTestId('difficulty-easy')).toHaveTextContent('Dễ');
    expect(screen.getByTestId('difficulty-medium')).toHaveTextContent('Trung bình');
    expect(screen.getByTestId('difficulty-hard')).toHaveTextContent('Khó');
  });

  it('renders Vietnamese descriptions for each difficulty', () => {
    render(<AiDifficultySelector onSelect={onSelect} />);

    expect(screen.getByTestId('difficulty-easy')).toHaveTextContent('Nước đi ngẫu nhiên');
    expect(screen.getByTestId('difficulty-medium')).toHaveTextContent('Ưu tiên bắt quân');
    expect(screen.getByTestId('difficulty-hard')).toHaveTextContent('Tính trước 1 nước');
  });

  it('calls onSelect with "easy" when Dễ is clicked', () => {
    render(<AiDifficultySelector onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('difficulty-easy'));
    expect(onSelect).toHaveBeenCalledWith('easy');
  });

  it('calls onSelect with "medium" when Trung bình is clicked', () => {
    render(<AiDifficultySelector onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('difficulty-medium'));
    expect(onSelect).toHaveBeenCalledWith('medium');
  });

  it('calls onSelect with "hard" when Khó is clicked', () => {
    render(<AiDifficultySelector onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    expect(onSelect).toHaveBeenCalledWith('hard');
  });

  it('renders a heading', () => {
    render(<AiDifficultySelector onSelect={onSelect} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Chọn độ khó');
  });

  it('disables buttons when disabled prop is true', () => {
    render(<AiDifficultySelector onSelect={onSelect} disabled />);

    expect(screen.getByTestId('difficulty-easy')).toBeDisabled();
    expect(screen.getByTestId('difficulty-medium')).toBeDisabled();
    expect(screen.getByTestId('difficulty-hard')).toBeDisabled();
  });
});
