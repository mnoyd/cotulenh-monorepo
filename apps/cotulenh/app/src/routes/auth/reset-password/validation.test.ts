import { describe, it, expect } from 'vitest';
import { resetPasswordSchema } from './validation';

describe('resetPasswordSchema', () => {
  const validData = {
    password: 'password123',
    confirmPassword: 'password123'
  };

  describe('password validation', () => {
    it('accepts valid matching passwords', () => {
      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        password: '',
        confirmPassword: ''
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwError = result.error.issues.find((i) => i.path[0] === 'password');
        expect(pwError?.message).toBe('passwordRequired');
      }
    });

    it('rejects short password', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        password: '1234567',
        confirmPassword: '1234567'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwError = result.error.issues.find((i) => i.path[0] === 'password');
        expect(pwError?.message).toBe('passwordMinLength');
      }
    });

    it('rejects passwords that do not match', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        password: 'password123',
        confirmPassword: 'password456'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
        expect(confirmError?.message).toBe('passwordMismatch');
      }
    });

    it('rejects empty confirmPassword', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        confirmPassword: ''
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
        expect(confirmError?.message).toBe('confirmPasswordRequired');
      }
    });

    it('accepts exactly 8 character matching passwords', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'abcdefgh',
        confirmPassword: 'abcdefgh'
      });
      expect(result.success).toBe(true);
    });
  });
});
