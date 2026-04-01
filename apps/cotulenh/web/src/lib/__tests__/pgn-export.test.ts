import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameData } from '@/lib/types/game';
import { generatePgn, getPgnFilename } from '../pgn-export';

const {
  CoTuLenhMock,
  setHeaderMock,
  moveMock,
  pgnMock
}: {
  CoTuLenhMock: ReturnType<typeof vi.fn>;
  setHeaderMock: ReturnType<typeof vi.fn>;
  moveMock: ReturnType<typeof vi.fn>;
  pgnMock: ReturnType<typeof vi.fn>;
} = vi.hoisted(() => ({
  CoTuLenhMock: vi.fn(),
  setHeaderMock: vi.fn(),
  moveMock: vi.fn(),
  pgnMock: vi.fn()
}));

vi.mock('@cotulenh/core', () => ({
  DEFAULT_POSITION: 'default-position',
  CoTuLenh: CoTuLenhMock
}));

const baseGameData: GameData = {
  id: 'game-1',
  status: 'checkmate',
  red_player: {
    id: 'red',
    display_name: 'Red Commander',
    rating: 1500
  },
  blue_player: {
    id: 'blue',
    display_name: 'Blue Commander',
    rating: 1500
  },
  my_color: 'red',
  is_rated: true,
  created_at: '2026-04-01T12:00:00.000Z',
  winner: 'red',
  result_reason: 'checkmate',
  game_state: {
    move_history: ['a1a2', 'b1b2'],
    fen: 'fen',
    phase: 'playing',
    clocks: { red: 10, blue: 10 },
    pending_action: null
  }
};

describe('pgn-export', () => {
  beforeEach(() => {
    setHeaderMock.mockReset();
    moveMock.mockReset();
    pgnMock.mockReset();
    CoTuLenhMock.mockReset();

    moveMock.mockReturnValue({ san: 'a1a2' });
    pgnMock.mockReturnValue('[Event "Co Tu Lenh Rated Game"]');
    CoTuLenhMock.mockImplementation(() => ({
      setHeader: setHeaderMock,
      move: moveMock,
      pgn: pgnMock
    }));
  });

  it('generates PGN using core engine with metadata headers', () => {
    const result = generatePgn(baseGameData);

    expect(CoTuLenhMock).toHaveBeenCalledWith('default-position');
    expect(setHeaderMock.mock.calls).toEqual(
      expect.arrayContaining([
        ['Event', 'Co Tu Lenh Rated Game'],
        ['Site', 'cotulenh.vn'],
        ['Date', '2026.04.01'],
        ['Red', 'Red Commander'],
        ['Blue', 'Blue Commander'],
        ['Result', '1-0'],
        ['TimeControl', '15+10']
      ])
    );
    expect(moveMock).toHaveBeenNthCalledWith(1, 'a1a2');
    expect(moveMock).toHaveBeenNthCalledWith(2, 'b1b2');
    expect(pgnMock).toHaveBeenCalledTimes(1);
    expect(result).toBe('[Event "Co Tu Lenh Rated Game"]');
  });

  it('maps draw-like outcomes to 1/2-1/2', () => {
    generatePgn({
      ...baseGameData,
      status: 'draw',
      winner: null
    });

    expect(setHeaderMock).toHaveBeenCalledWith('Result', '1/2-1/2');
  });

  it('maps non-terminal outcomes to *', () => {
    generatePgn({
      ...baseGameData,
      status: 'aborted',
      winner: null
    });

    expect(setHeaderMock).toHaveBeenCalledWith('Result', '*');
  });

  it('throws when move history contains invalid move', () => {
    moveMock.mockReturnValueOnce(null);

    expect(() => generatePgn(baseGameData)).toThrow('Khong the tao PGN');
  });

  it('builds sanitized download filename', () => {
    const filename = getPgnFilename({
      ...baseGameData,
      red_player: { ...baseGameData.red_player, display_name: 'Nguoi Do #1' },
      blue_player: { ...baseGameData.blue_player, display_name: 'Nguoi Xanh @ 2' }
    });

    expect(filename).toBe('nguoi-do-1-vs-nguoi-xanh-2-2026-04-01.pgn');
  });
});
