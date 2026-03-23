import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import type { GameData } from '@/lib/types/game';
import { useGameStore } from '@/stores/game-store';

const mockPush = vi.fn();
const mockInvoke = vi.fn();

// Mock dynamic import for BoardContainer
vi.mock('next/dynamic', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // Return a simple placeholder for tests
    const Component = (props: Record<string, unknown>) => (
      <div
        data-testid="board-container"
        data-fen={props.fen}
        data-orientation={props.orientation}
      />
    );
    Component.displayName = 'DynamicBoardContainer';
    return Component;
  }
}));

// Mock useBoard hook
vi.mock('@/hooks/use-board', () => ({
  useBoard: () => null
}));

// Mock CoTuLenh engine
vi.mock('@cotulenh/core', () => ({
  CoTuLenh: vi.fn().mockImplementation(() => ({
    move: vi.fn(),
    undo: vi.fn(),
    commitSession: vi.fn().mockReturnValue({ success: false }),
    cancelSession: vi.fn(),
    getSession: vi.fn().mockReturnValue(null),
    getDeployState: vi.fn().mockReturnValue(null),
    canCommitSession: vi.fn().mockReturnValue(false),
    fen: vi.fn().mockReturnValue('start'),
    history: vi.fn().mockReturnValue([]),
    moves: vi.fn().mockReturnValue([]),
    turn: vi.fn().mockReturnValue('r')
  })),
  DEFAULT_POSITION: 'default_fen r - - 0 1'
}));

// Mock game channel hook
vi.mock('@/hooks/use-game-channel', () => ({
  useGameChannel: vi.fn()
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn()
  })
}));

// Mock supabase browser client
vi.mock('@/lib/supabase/browser', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) }
  })
}));

// Need to import after mocks
const { GamePageClient } = await import('../game-page-client');

const mockGameData: GameData = {
  id: 'game-abc',
  status: 'started',
  red_player: { id: 'p1', display_name: 'Nguoi choi Do', rating: 1500 },
  blue_player: { id: 'p2', display_name: 'Nguoi choi Xanh', rating: 1600 },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-03-17T00:00:00Z',
  winner: null,
  result_reason: null,
  game_state: {
    move_history: [],
    fen: 'start',
    phase: 'deploying',
    clocks: { red: 600000, blue: 600000 },
    pending_action: null
  }
};

describe('GamePageClient', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    mockPush.mockReset();
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: {}, error: null });
  });

  it('renders board container', () => {
    render(<GamePageClient gameData={mockGameData} />);
    expect(screen.getByTestId('board-container')).toBeDefined();
  });

  it('renders both player info bars', () => {
    render(<GamePageClient gameData={mockGameData} />);
    // After store initialization, player names should appear
    expect(screen.getByText('Nguoi choi Do')).toBeDefined();
    expect(screen.getByText('Nguoi choi Xanh')).toBeDefined();
  });

  it('renders deploy UI in right panel during deploy phase', () => {
    render(<GamePageClient gameData={mockGameData} />);
    // During deploy phase, right panel shows deploy controls instead of move list
    expect(screen.getAllByText('Xac nhan').length).toBeGreaterThan(0);
  });

  it('shows move list in right panel during playing phase', () => {
    const playingData: GameData = {
      ...mockGameData,
      game_state: { ...mockGameData.game_state, phase: 'playing' }
    };
    render(<GamePageClient gameData={playingData} />);
    expect(screen.getByText('Nuoc di')).toBeDefined();
    expect(screen.getByText('Chua co nuoc di nao')).toBeDefined();
  });

  it('renders clock display for both players', () => {
    render(<GamePageClient gameData={mockGameData} />);
    const timers = screen.getAllByRole('timer');
    expect(timers.length).toBe(2);
  });

  it('hides clocks in AI games', () => {
    const aiGameData: GameData = {
      ...mockGameData,
      blue_player: {
        ...mockGameData.blue_player,
        id: 'ai_bot_1'
      }
    };

    render(<GamePageClient gameData={aiGameData} />);
    expect(screen.queryAllByRole('timer').length).toBe(0);
  });

  it('shows moves when game has move history', () => {
    const dataWithMoves: GameData = {
      ...mockGameData,
      game_state: {
        ...mockGameData.game_state,
        phase: 'playing',
        move_history: ['e2e4', 'd7d5']
      }
    };
    render(<GamePageClient gameData={dataWithMoves} />);
    // After initialization the moves should be rendered
    expect(screen.getByText(/e2e4/)).toBeDefined();
    expect(screen.getByText(/d7d5/)).toBeDefined();
  });

  it('has responsive layout classes', () => {
    const { container } = render(<GamePageClient gameData={mockGameData} />);
    const root = container.firstElementChild!;
    expect(root.className).toContain('flex');
    expect(root.className).toContain('flex-col');
    expect(root.className).toContain('lg:flex-row');

    const boardTrack = container.querySelector('.min-w-\\[min\\(60vw\\,60svh\\)\\]');
    expect(boardTrack).toBeTruthy();
  });

  it('uses viewer color for board orientation', () => {
    const bluePerspectiveData: GameData = {
      ...mockGameData,
      my_color: 'blue'
    };
    render(<GamePageClient gameData={bluePerspectiveData} />);

    const board = screen.getByTestId('board-container');
    expect(board.getAttribute('data-orientation')).toBe('blue');
  });

  it('claims timeout when opponent display clock reaches zero', () => {
    vi.useFakeTimers();
    const claimTimeout = vi.fn();
    useGameStore.setState({ claimTimeout });

    const timedOutOpponentData: GameData = {
      ...mockGameData,
      game_state: {
        ...mockGameData.game_state,
        phase: 'playing',
        clocks: { red: 600000, blue: 0 }
      }
    };

    render(<GamePageClient gameData={timedOutOpponentData} />);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(claimTimeout).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('navigates to the rematch game after a rematch is accepted', () => {
    const endedGameData: GameData = {
      ...mockGameData,
      status: 'checkmate',
      winner: 'red',
      game_state: {
        ...mockGameData.game_state,
        phase: 'playing'
      }
    };

    render(<GamePageClient gameData={endedGameData} />);

    act(() => {
      useGameStore.getState().handleGameEnd('checkmate', 'red', null);
      useGameStore.getState().handleRematchAccepted('rematch-123');
    });

    expect(mockPush).toHaveBeenCalledWith('/game/rematch-123');
    expect(useGameStore.getState().gameId).toBeNull();
  });

  it('expires a sent rematch through validate-move after 60 seconds', async () => {
    vi.useFakeTimers();
    const endedGameData: GameData = {
      ...mockGameData,
      status: 'checkmate',
      winner: 'red',
      game_state: {
        ...mockGameData.game_state,
        phase: 'playing'
      }
    };

    render(<GamePageClient gameData={endedGameData} />);

    act(() => {
      useGameStore.getState().handleGameEnd('checkmate', 'red', null);
      useGameStore.setState({ rematchStatus: 'sent' });
    });

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
      body: {
        game_id: 'game-abc',
        action: 'expire_pending_action',
        pending_type: 'rematch_offer'
      }
    });
    vi.useRealTimers();
  });

  it('returns the rematch CTA to idle three seconds after a decline', () => {
    vi.useFakeTimers();
    const endedGameData: GameData = {
      ...mockGameData,
      status: 'checkmate',
      winner: 'red',
      game_state: {
        ...mockGameData.game_state,
        phase: 'playing'
      }
    };

    render(<GamePageClient gameData={endedGameData} />);

    act(() => {
      useGameStore.getState().handleGameEnd('checkmate', 'red', null);
      useGameStore.getState().handleRematchDeclined();
    });

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(useGameStore.getState().rematchStatus).toBe('idle');
    vi.useRealTimers();
  });

  it('sends a best-effort rematch decline when unmounting with a received offer', () => {
    const endedGameData: GameData = {
      ...mockGameData,
      status: 'checkmate',
      winner: 'red',
      game_state: {
        ...mockGameData.game_state,
        phase: 'playing'
      }
    };

    const view = render(<GamePageClient gameData={endedGameData} />);

    act(() => {
      useGameStore.getState().handleGameEnd('checkmate', 'red', null);
      useGameStore.setState({ rematchStatus: 'received' });
    });

    view.unmount();

    expect(mockInvoke).toHaveBeenCalledWith('validate-move', {
      body: { game_id: 'game-abc', action: 'rematch_decline' }
    });
  });
});
