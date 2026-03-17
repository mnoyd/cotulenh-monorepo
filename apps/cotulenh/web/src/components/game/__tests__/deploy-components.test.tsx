import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DeployPieceTray } from '../deploy-piece-tray';
import { DeployProgressCounter } from '../deploy-progress-counter';
import { DeployControls } from '../deploy-controls';

describe('DeployPieceTray', () => {
  const mockPieces = [
    { type: 't', color: 'r' },
    { type: 'i', color: 'r' },
    { type: 'a', color: 'r' }
  ];

  it('renders piece buttons for each deployable piece', () => {
    render(<DeployPieceTray pieces={mockPieces} selectedPiece={null} onSelectPiece={() => {}} />);

    expect(screen.getByLabelText('Xe tang')).toBeDefined();
    expect(screen.getByLabelText('Bo binh')).toBeDefined();
    expect(screen.getByLabelText('Phao binh')).toBeDefined();
  });

  it('renders nothing when pieces array is empty', () => {
    const { container } = render(
      <DeployPieceTray pieces={[]} selectedPiece={null} onSelectPiece={() => {}} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('calls onSelectPiece when a piece is tapped', () => {
    const onSelect = vi.fn();
    render(<DeployPieceTray pieces={mockPieces} selectedPiece={null} onSelectPiece={onSelect} />);

    fireEvent.click(screen.getByLabelText('Xe tang'));
    expect(onSelect).toHaveBeenCalledWith('t-0');
  });

  it('marks selected piece with aria-pressed', () => {
    render(<DeployPieceTray pieces={mockPieces} selectedPiece="t-0" onSelectPiece={() => {}} />);

    expect(screen.getByLabelText('Xe tang').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Bo binh').getAttribute('aria-pressed')).toBe('false');
  });

  it('has accessible toolbar role', () => {
    render(<DeployPieceTray pieces={mockPieces} selectedPiece={null} onSelectPiece={() => {}} />);

    expect(screen.getByRole('toolbar')).toBeDefined();
  });
});

describe('DeployProgressCounter', () => {
  it('renders progress in Vietnamese format', () => {
    render(<DeployProgressCounter current={3} total={10} />);
    expect(screen.getByText('Bo tri — Quan 3/10')).toBeDefined();
  });

  it('renders zero progress', () => {
    render(<DeployProgressCounter current={0} total={10} />);
    expect(screen.getByText('Bo tri — Quan 0/10')).toBeDefined();
  });

  it('has aria-live assertive for screen readers', () => {
    render(<DeployProgressCounter current={3} total={10} />);
    const element = screen.getByRole('status');
    expect(element.getAttribute('aria-live')).toBe('assertive');
  });
});

describe('DeployControls', () => {
  it('renders commit and undo buttons when not submitted', () => {
    render(
      <DeployControls
        canCommit={true}
        deploySubmitted={false}
        opponentDeploySubmitted={false}
        onCommit={() => {}}
        onUndo={() => {}}
      />
    );

    expect(screen.getByText('Xac nhan')).toBeDefined();
    expect(screen.getByText('Hoan tac')).toBeDefined();
  });

  it('disables commit button when canCommit is false', () => {
    render(
      <DeployControls
        canCommit={false}
        deploySubmitted={false}
        opponentDeploySubmitted={false}
        onCommit={() => {}}
        onUndo={() => {}}
      />
    );

    const commitButton = screen.getByText('Xac nhan');
    expect(commitButton.hasAttribute('disabled')).toBe(true);
  });

  it('calls onCommit when commit button is clicked', () => {
    const onCommit = vi.fn();
    render(
      <DeployControls
        canCommit={true}
        deploySubmitted={false}
        opponentDeploySubmitted={false}
        onCommit={onCommit}
        onUndo={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Xac nhan'));
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it('calls onUndo when undo button is clicked', () => {
    const onUndo = vi.fn();
    render(
      <DeployControls
        canCommit={false}
        deploySubmitted={false}
        opponentDeploySubmitted={false}
        onCommit={() => {}}
        onUndo={onUndo}
      />
    );

    fireEvent.click(screen.getByText('Hoan tac'));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('shows waiting indicator when deploy is submitted', () => {
    render(
      <DeployControls
        canCommit={false}
        deploySubmitted={true}
        opponentDeploySubmitted={false}
        onCommit={() => {}}
        onUndo={() => {}}
      />
    );

    expect(screen.getByText('Dang cho doi thu...')).toBeDefined();
    expect(screen.queryByText('Xac nhan')).toBeNull();
    expect(screen.queryByText('Hoan tac')).toBeNull();
  });

  it('shows opponent confirmed text when both submitted', () => {
    render(
      <DeployControls
        canCommit={false}
        deploySubmitted={true}
        opponentDeploySubmitted={true}
        onCommit={() => {}}
        onUndo={() => {}}
      />
    );

    expect(screen.getByText('Dang cho doi thu...')).toBeDefined();
    expect(screen.getByText('Doi thu da xac nhan')).toBeDefined();
  });
});
