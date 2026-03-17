import { describe, expect, it } from 'vitest';

import { createGameSchema, invitationGameConfigSchema } from '@/lib/validators/game';

describe('createGameSchema', () => {
  it('accepts a valid UUID', () => {
    const parsed = createGameSchema.safeParse({
      invitationId: '550e8400-e29b-41d4-a716-446655440000'
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects non-UUID string', () => {
    const parsed = createGameSchema.safeParse({
      invitationId: 'not-a-uuid'
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.invitationId).toContain('ID lời mời không hợp lệ');
    }
  });

  it('rejects empty string', () => {
    const parsed = createGameSchema.safeParse({
      invitationId: ''
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects missing invitationId', () => {
    const parsed = createGameSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});

describe('invitationGameConfigSchema', () => {
  it('accepts valid game_config payload', () => {
    const parsed = invitationGameConfigSchema.safeParse({
      timeMinutes: 10,
      incrementSeconds: 5,
      isRated: true
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects malformed game_config payload', () => {
    const parsed = invitationGameConfigSchema.safeParse({
      timeMinutes: '10',
      incrementSeconds: -1
    });
    expect(parsed.success).toBe(false);
  });
});
