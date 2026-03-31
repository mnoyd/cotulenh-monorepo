import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  getGameResult,
  getResultReasonLabel,
  formatTimeControl,
  formatRelativeDate
} from '../game-history';

describe('getGameResult', () => {
  it('returns win when player color matches winner', () => {
    expect(getGameResult('red', 'red', 'checkmate')).toBe('win');
    expect(getGameResult('blue', 'blue', 'resign')).toBe('win');
  });

  it('returns loss when player color does not match winner', () => {
    expect(getGameResult('red', 'blue', 'checkmate')).toBe('loss');
    expect(getGameResult('blue', 'red', 'timeout')).toBe('loss');
  });

  it('returns draw when winner is null', () => {
    expect(getGameResult('red', null, 'draw')).toBe('draw');
    expect(getGameResult('blue', null, 'stalemate')).toBe('draw');
  });

  it('returns aborted when status is aborted', () => {
    expect(getGameResult('red', null, 'aborted')).toBe('aborted');
    expect(getGameResult('red', 'red', 'aborted')).toBe('aborted');
  });
});

describe('getResultReasonLabel', () => {
  it('returns Vietnamese label for known reasons', () => {
    expect(getResultReasonLabel('checkmate')).toBe('Chiếu hết');
    expect(getResultReasonLabel('resign')).toBe('Đầu hàng');
    expect(getResultReasonLabel('timeout')).toBe('Hết giờ');
    expect(getResultReasonLabel('stalemate')).toBe('Hòa bí');
    expect(getResultReasonLabel('draw_by_agreement')).toBe('Hòa thuận');
    expect(getResultReasonLabel('commander_captured')).toBe('Bắt tướng');
    expect(getResultReasonLabel('abandonment')).toBe('Bỏ trận');
  });

  it('returns empty string for null', () => {
    expect(getResultReasonLabel(null)).toBe('');
  });

  it('returns raw value for unknown reasons', () => {
    expect(getResultReasonLabel('unknown_reason')).toBe('unknown_reason');
  });
});

describe('formatTimeControl', () => {
  it('formats minutes and increment', () => {
    expect(formatTimeControl({ timeMinutes: 15, incrementSeconds: 10 })).toBe('15+10');
    expect(formatTimeControl({ timeMinutes: 5, incrementSeconds: 0 })).toBe('5+0');
    expect(formatTimeControl({ timeMinutes: 1, incrementSeconds: 1 })).toBe('1+1');
  });

  it('returns dash for null', () => {
    expect(formatTimeControl(null)).toBe('—');
  });
});

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-31T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns dash for null', () => {
    expect(formatRelativeDate(null)).toBe('—');
  });

  it('returns "Vừa xong" for less than a minute ago', () => {
    expect(formatRelativeDate('2026-03-31T11:59:30Z')).toBe('Vừa xong');
  });

  it('returns minutes for less than an hour ago', () => {
    expect(formatRelativeDate('2026-03-31T11:30:00Z')).toBe('30 phút trước');
    expect(formatRelativeDate('2026-03-31T11:55:00Z')).toBe('5 phút trước');
  });

  it('returns hours for less than a day ago', () => {
    expect(formatRelativeDate('2026-03-31T09:00:00Z')).toBe('3 giờ trước');
  });

  it('returns days for less than a month ago', () => {
    expect(formatRelativeDate('2026-03-28T12:00:00Z')).toBe('3 ngày trước');
  });

  it('returns months for less than a year ago', () => {
    expect(formatRelativeDate('2026-01-31T12:00:00Z')).toBe('1 tháng trước');
  });

  it('returns dash for future dates', () => {
    expect(formatRelativeDate('2026-04-01T12:00:00Z')).toBe('—');
  });
});
