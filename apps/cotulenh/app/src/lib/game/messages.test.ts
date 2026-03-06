import { describe, it, expect } from 'vitest';
import { isGameMessage } from './messages';

describe('isGameMessage – takeback events', () => {
  const base = { senderId: 'user-123' };

  it('validates takeback-request', () => {
    expect(isGameMessage({ ...base, event: 'takeback-request' })).toBe(true);
  });

  it('validates takeback-accept', () => {
    expect(isGameMessage({ ...base, event: 'takeback-accept' })).toBe(true);
  });

  it('validates takeback-decline', () => {
    expect(isGameMessage({ ...base, event: 'takeback-decline' })).toBe(true);
  });

  it('rejects unknown event', () => {
    expect(isGameMessage({ ...base, event: 'takeback-cancel' })).toBe(false);
  });
});
