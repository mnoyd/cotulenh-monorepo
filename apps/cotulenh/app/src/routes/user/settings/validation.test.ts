import { describe, it, expect } from 'vitest';
import { emailUpdateSchema, passwordChangeSchema } from './validation';

describe('emailUpdateSchema', () => {
  it('accepts a valid email', () => {
    const result = emailUpdateSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = emailUpdateSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'email');
      expect(issue?.message).toBe('emailRequired');
    }
  });

  it('rejects invalid email format', () => {
    const result = emailUpdateSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'email');
      expect(issue?.message).toBe('emailInvalid');
    }
  });

  it('rejects email without domain', () => {
    const result = emailUpdateSchema.safeParse({ email: 'user@' });
    expect(result.success).toBe(false);
  });

  it('accepts email with subdomain', () => {
    const result = emailUpdateSchema.safeParse({ email: 'user@sub.example.com' });
    expect(result.success).toBe(true);
  });
});

describe('passwordChangeSchema', () => {
  it('accepts valid matching passwords', () => {
    const result = passwordChangeSchema.safeParse({
      newPassword: 'securepass123',
      confirmPassword: 'securepass123'
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty new password', () => {
    const result = passwordChangeSchema.safeParse({
      newPassword: '',
      confirmPassword: ''
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'newPassword');
      expect(issue?.message).toBe('passwordRequired');
    }
  });

  it('rejects password shorter than 8 characters', () => {
    const result = passwordChangeSchema.safeParse({
      newPassword: 'short',
      confirmPassword: 'short'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'newPassword');
      expect(issue?.message).toBe('passwordMinLength');
    }
  });

  it('rejects mismatched passwords', () => {
    const result = passwordChangeSchema.safeParse({
      newPassword: 'securepass123',
      confirmPassword: 'differentpass'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue?.message).toBe('passwordMismatch');
    }
  });

  it('rejects empty confirm password', () => {
    const result = passwordChangeSchema.safeParse({
      newPassword: 'securepass123',
      confirmPassword: ''
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue).toBeDefined();
    }
  });

  it('accepts exactly 8 character password', () => {
    const result = passwordChangeSchema.safeParse({
      newPassword: '12345678',
      confirmPassword: '12345678'
    });
    expect(result.success).toBe(true);
  });
});
