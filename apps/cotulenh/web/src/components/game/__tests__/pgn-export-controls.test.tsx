import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { GameData } from '@/lib/types/game';
import { PgnExportControls } from '../pgn-export-controls';

const generatePgnMock = vi.fn();
const getPgnFilenameMock = vi.fn();

vi.mock('@/lib/pgn-export', () => ({
  generatePgn: (...args: unknown[]) => generatePgnMock(...args),
  getPgnFilename: (...args: unknown[]) => getPgnFilenameMock(...args)
}));

const gameData: GameData = {
  id: 'game-1',
  status: 'checkmate',
  red_player: {
    id: 'red',
    display_name: 'Red Player',
    rating: 1500
  },
  blue_player: {
    id: 'blue',
    display_name: 'Blue Player',
    rating: 1500
  },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-04-01T00:00:00.000Z',
  winner: 'red',
  result_reason: 'checkmate',
  game_state: {
    move_history: ['a1a2'],
    fen: 'fen',
    phase: 'playing',
    clocks: { red: 10, blue: 10 },
    pending_action: null
  }
};

describe('PgnExportControls', () => {
  beforeEach(() => {
    generatePgnMock.mockReset();
    getPgnFilenameMock.mockReset();
    generatePgnMock.mockReturnValue('PGN_CONTENT');
    getPgnFilenameMock.mockReturnValue('red-vs-blue-2026-04-01.pgn');

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it('copies generated PGN and reports success', async () => {
    const onCopySuccess = vi.fn();
    const onError = vi.fn();

    render(
      <PgnExportControls gameData={gameData} onCopySuccess={onCopySuccess} onError={onError} />
    );
    fireEvent.click(screen.getByTestId('pgn-copy'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('PGN_CONTENT');
    });

    expect(generatePgnMock).toHaveBeenCalledWith(gameData);
    expect(onCopySuccess).toHaveBeenCalledWith('Da sao chep PGN');
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports error when clipboard copy fails', async () => {
    const onError = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('copy-failed'))
      }
    });

    render(<PgnExportControls gameData={gameData} onError={onError} />);
    fireEvent.click(screen.getByTestId('pgn-copy'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Khong the sao chep');
    });
  });

  it('downloads a pgn file with generated filename', () => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: () => 'blob:0'
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: () => {}
      });
    }

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:1');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<PgnExportControls gameData={gameData} />);
    fireEvent.click(screen.getByTestId('pgn-download'));

    expect(generatePgnMock).toHaveBeenCalledWith(gameData);
    expect(getPgnFilenameMock).toHaveBeenCalledWith(gameData);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:1');

    clickSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    createObjectURLSpy.mockRestore();
  });
});
