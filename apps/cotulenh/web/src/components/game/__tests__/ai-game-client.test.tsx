import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// --- hoisted mocks ---
const { useAiGameStoreMock, routerPushMock } = vi.hoisted(() => ({
  useAiGameStoreMock: vi.fn(),
  routerPushMock: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock })
}));

vi.mock('@/stores/ai-game-store', () => ({
  useAiGameStore: useAiGameStoreMock
}));

vi.mock('@/components/game/board-container', () => ({
  BoardContainer: (props: Record<string, unknown>) => (
    <div data-testid="board-container" data-view-only={String(props.viewOnly)} />
  )
}));

vi.mock('@/components/game/player-info-bar', () => ({
  PlayerInfoBar: (props: Record<string, unknown>) => (
    <div data-testid={`player-bar-${props.color}`}>{String(props.name)}</div>
  )
}));

vi.mock('@/components/game/game-right-panel', () => ({
  GameRightPanel: () => <div data-testid="game-right-panel" />
}));

vi.mock('@/components/game/game-result-banner', () => ({
  GameResultBanner: (props: Record<string, unknown>) => (
    <div data-testid="game-result-banner">
      <button onClick={props.onNewGame as () => void}>Chơi lại</button>
    </div>
  )
}));

vi.mock('@/components/game/deploy-piece-tray', () => ({
  DeployPieceTray: () => <div data-testid="deploy-piece-tray" />
}));

vi.mock('@/components/game/deploy-progress-counter', () => ({
  DeployProgressCounter: () => <div data-testid="deploy-progress" />
}));

vi.mock('@/components/game/deploy-controls', () => ({
  DeployControls: () => <div data-testid="deploy-controls" />
}));

vi.mock('@/components/game/ai-difficulty-selector', () => ({
  AiDifficultySelector: (props: { onSelect: (d: string) => void }) => (
    <div data-testid="difficulty-selector">
      <button data-testid="select-easy" onClick={() => props.onSelect('easy')}>
        Dễ
      </button>
    </div>
  )
}));

import { AiGameClient } from '../ai-game-client';

function createStoreMock(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    engine: null,
    phase: 'idle',
    difficulty: null,
    playerColor: null,
    moveHistory: [],
    winner: null,
    gameStatus: null,
    resultReason: null,
    aiThinking: false,
    deploySubmitted: false,
    moveError: null,
    deployMove: vi.fn(),
    cancelDeploy: vi.fn(),
    commitDeploy: vi.fn(),
    submitDeploy: vi.fn(),
    getDeployablePieces: vi.fn().mockReturnValue([]),
    getDeployProgress: vi.fn().mockReturnValue({ current: 0, total: 0 }),
    makePlayerMove: vi.fn().mockReturnValue({ success: true }),
    resign: vi.fn(),
    startGame: vi.fn(),
    reset: vi.fn()
  };

  const merged = { ...defaults, ...overrides };

  useAiGameStoreMock.mockImplementation((selector: (state: typeof merged) => unknown) =>
    selector(merged)
  );
}

describe('AiGameClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows difficulty selector when phase is idle', () => {
    createStoreMock({ phase: 'idle' });
    render(<AiGameClient />);
    expect(screen.getByTestId('difficulty-selector')).toBeInTheDocument();
  });

  it('calls startGame when difficulty is selected', () => {
    const startGame = vi.fn();
    createStoreMock({ phase: 'idle', startGame });
    render(<AiGameClient />);
    fireEvent.click(screen.getByTestId('select-easy'));
    expect(startGame).toHaveBeenCalledWith('easy');
  });

  it('shows board and player bars when game is playing', () => {
    const mockEngine = {
      fen: vi.fn().mockReturnValue('test-fen'),
      turn: vi.fn().mockReturnValue('r'),
      moves: vi.fn().mockReturnValue([]),
      canCommitSession: vi.fn().mockReturnValue(false)
    };
    createStoreMock({
      phase: 'playing',
      difficulty: 'easy',
      playerColor: 'red',
      engine: mockEngine
    });
    render(<AiGameClient />);

    expect(screen.getByTestId('board-container')).toBeInTheDocument();
    expect(screen.getByTestId('player-bar-red')).toHaveTextContent('Bạn');
    expect(screen.getByTestId('player-bar-blue')).toHaveTextContent('AI — Dễ');
  });

  it('shows AI thinking indicator when aiThinking is true', () => {
    const mockEngine = {
      fen: vi.fn().mockReturnValue('fen'),
      turn: vi.fn().mockReturnValue('b'),
      moves: vi.fn().mockReturnValue([]),
      canCommitSession: vi.fn().mockReturnValue(false)
    };
    createStoreMock({
      phase: 'playing',
      difficulty: 'medium',
      playerColor: 'red',
      engine: mockEngine,
      aiThinking: true
    });
    render(<AiGameClient />);
    expect(screen.getByTestId('ai-thinking')).toHaveTextContent('AI đang suy nghĩ...');
  });

  it('shows game result banner when game ends', () => {
    const mockEngine = {
      fen: vi.fn().mockReturnValue('fen'),
      turn: vi.fn().mockReturnValue('b'),
      moves: vi.fn().mockReturnValue([]),
      canCommitSession: vi.fn().mockReturnValue(false)
    };
    createStoreMock({
      phase: 'ended',
      difficulty: 'hard',
      playerColor: 'red',
      engine: mockEngine,
      gameStatus: 'checkmate',
      winner: 'red'
    });
    render(<AiGameClient />);
    expect(screen.getByTestId('game-result-banner')).toBeInTheDocument();
  });

  it('shows post-game action buttons when game ends', () => {
    const mockEngine = {
      fen: vi.fn().mockReturnValue('fen'),
      turn: vi.fn().mockReturnValue('b'),
      moves: vi.fn().mockReturnValue([]),
      canCommitSession: vi.fn().mockReturnValue(false)
    };
    createStoreMock({
      phase: 'ended',
      difficulty: 'easy',
      playerColor: 'red',
      engine: mockEngine,
      gameStatus: 'resign',
      winner: 'blue'
    });
    render(<AiGameClient />);

    expect(screen.getByTestId('play-again-ai')).toHaveTextContent('Chơi lại với AI');
    expect(screen.getByTestId('change-difficulty')).toHaveTextContent('Đổi độ khó');
    expect(screen.getByTestId('find-opponent')).toHaveTextContent('Tìm đối thủ');
    expect(screen.getByTestId('review-game')).toHaveTextContent('Xem lại');
  });

  it('shows deploy controls during deploy phase', () => {
    const mockEngine = {
      fen: vi.fn().mockReturnValue('fen'),
      turn: vi.fn().mockReturnValue('r'),
      moves: vi.fn().mockReturnValue([]),
      canCommitSession: vi.fn().mockReturnValue(false)
    };
    createStoreMock({
      phase: 'deploying',
      difficulty: 'easy',
      playerColor: 'red',
      engine: mockEngine,
      deploySubmitted: false
    });
    render(<AiGameClient />);
    expect(screen.getByTestId('ai-game-page')).toBeInTheDocument();
  });

  it('board is viewOnly when it is not player turn', () => {
    const mockEngine = {
      fen: vi.fn().mockReturnValue('fen'),
      turn: vi.fn().mockReturnValue('b'), // AI's turn
      moves: vi.fn().mockReturnValue([]),
      canCommitSession: vi.fn().mockReturnValue(false)
    };
    createStoreMock({
      phase: 'playing',
      difficulty: 'easy',
      playerColor: 'red',
      engine: mockEngine,
      aiThinking: true
    });
    render(<AiGameClient />);
    expect(screen.getByTestId('board-container')).toHaveAttribute('data-view-only', 'true');
  });
});
