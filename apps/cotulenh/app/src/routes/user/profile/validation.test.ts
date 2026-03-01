import { describe, it, expect } from 'vitest';
import { displayNameSchema } from './validation';

describe('displayNameSchema', () => {
  it('accepts a valid display name (3-50 characters)', () => {
    const result = displayNameSchema.safeParse({ displayName: 'Commander' });
    expect(result.success).toBe(true);
  });

  it('accepts exactly 3 character display name', () => {
    const result = displayNameSchema.safeParse({ displayName: 'Bob' });
    expect(result.success).toBe(true);
  });

  it('accepts exactly 50 character display name', () => {
    const result = displayNameSchema.safeParse({ displayName: 'A'.repeat(50) });
    expect(result.success).toBe(true);
  });

  it('accepts Vietnamese characters', () => {
    const result = displayNameSchema.safeParse({ displayName: 'Nguyễn Văn Anh' });
    expect(result.success).toBe(true);
  });

  it('accepts Unicode characters', () => {
    const result = displayNameSchema.safeParse({ displayName: '指揮官テスト' });
    expect(result.success).toBe(true);
  });

  it('rejects empty display name with displayNameRequired', () => {
    const result = displayNameSchema.safeParse({ displayName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path[0] === 'displayName');
      expect(nameError?.message).toBe('displayNameRequired');
    }
  });

  it('rejects display name < 3 characters with displayNameMinLength', () => {
    const result = displayNameSchema.safeParse({ displayName: 'AB' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path[0] === 'displayName');
      expect(nameError?.message).toBe('displayNameMinLength');
    }
  });

  it('rejects display name > 50 characters with displayNameMaxLength', () => {
    const result = displayNameSchema.safeParse({ displayName: 'A'.repeat(51) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path[0] === 'displayName');
      expect(nameError?.message).toBe('displayNameMaxLength');
    }
  });

  it('rejects 1 character display name', () => {
    const result = displayNameSchema.safeParse({ displayName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects 2 character display name', () => {
    const result = displayNameSchema.safeParse({ displayName: 'AB' });
    expect(result.success).toBe(false);
  });

  it('accepts display name with spaces', () => {
    const result = displayNameSchema.safeParse({ displayName: 'General Tướng' });
    expect(result.success).toBe(true);
  });

  it('accepts display name with numbers', () => {
    const result = displayNameSchema.safeParse({ displayName: 'Player123' });
    expect(result.success).toBe(true);
  });

  it('normalizes whitespace in display name', () => {
    const result = displayNameSchema.safeParse({ displayName: '  Commander   Name  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Commander Name');
    }
  });

  it('rejects display name with blocked characters', () => {
    const result = displayNameSchema.safeParse({ displayName: '<b>Commander</b>' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path[0] === 'displayName');
      expect(nameError?.message).toBe('displayNameInvalidChars');
    }
  });
});
