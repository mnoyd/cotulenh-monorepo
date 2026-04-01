import { CoTuLenh, DEFAULT_POSITION } from '@cotulenh/core';

import type { GameData, GameStatus } from '@/lib/types/game';

function toPgnDate(dateValue: string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '????.??.??';
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function toFilenameDate(dateValue: string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'unknown-date';
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toPgnResult(status: GameStatus, winner: 'red' | 'blue' | null): string {
  if ((status === 'checkmate' || status === 'resign' || status === 'timeout') && winner) {
    return winner === 'red' ? '1-0' : '0-1';
  }

  if (status === 'draw' || status === 'stalemate') {
    return '1/2-1/2';
  }

  return '*';
}

function sanitizeName(input: string): string {
  const value = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const compact = value.replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  return compact || 'player';
}

export function getPgnFilename(gameData: GameData): string {
  const red = sanitizeName(gameData.red_player.display_name);
  const blue = sanitizeName(gameData.blue_player.display_name);
  const date = toFilenameDate(gameData.created_at);
  return `${red}-vs-${blue}-${date}.pgn`;
}

export function generatePgn(gameData: GameData): string {
  const engine = new CoTuLenh(DEFAULT_POSITION);
  const eventName = gameData.is_rated ? 'Co Tu Lenh Rated Game' : 'Co Tu Lenh Casual Game';

  engine.setHeader('Event', eventName);
  engine.setHeader('Site', 'cotulenh.vn');
  engine.setHeader('Date', toPgnDate(gameData.created_at));
  engine.setHeader('Red', gameData.red_player.display_name);
  engine.setHeader('Blue', gameData.blue_player.display_name);
  engine.setHeader('Result', toPgnResult(gameData.status, gameData.winner));
  engine.setHeader('TimeControl', '15+10');

  for (const san of gameData.game_state.move_history) {
    const moveResult = engine.move(san);
    if (!moveResult) {
      throw new Error('Khong the tao PGN do lich su nuoc di khong hop le');
    }
  }

  return engine.pgn();
}
