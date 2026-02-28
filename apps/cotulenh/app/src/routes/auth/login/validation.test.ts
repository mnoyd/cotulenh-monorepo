import { describe, it, expect } from 'vitest';
import { loginSchema } from './validation';

describe('loginSchema', () => {
  const validData = {
    email: 'test@example.com',
    password: 'password123'
  };

  describe('email validation', () => {
    it('accepts a valid email', () => {
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty email', () => {
      const result = loginSchema.safeParse({ ...validData, email: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find((i) => i.path[0] === 'email');
        expect(emailError?.message).toBe('emailRequired');
      }
    });

    it('rejects invalid email format - missing @', () => {
      const result = loginSchema.safeParse({ ...validData, email: 'notanemail' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format - missing domain', () => {
      const result = loginSchema.safeParse({ ...validData, email: 'test@' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format - missing local part', () => {
      const result = loginSchema.safeParse({ ...validData, email: '@example.com' });
      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('accepts any non-empty password', () => {
      const result = loginSchema.safeParse({ ...validData, password: 'a' });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ ...validData, password: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwError = result.error.issues.find((i) => i.path[0] === 'password');
        expect(pwError?.message).toBe('passwordRequired');
      }
    });
  });

  describe('combined validation', () => {
    it('rejects all empty fields', () => {
      const result = loginSchema.safeParse({ email: '', password: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('accepts valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@domain.org',
        password: 'mypassword'
      });
      expect(result.success).toBe(true);
    });
  });
});
