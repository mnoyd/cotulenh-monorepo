import { describe, it, expect } from 'vitest';
import { forgotPasswordSchema } from './validation';

describe('forgotPasswordSchema', () => {
  const validData = {
    email: 'test@example.com'
  };

  describe('email validation', () => {
    it('accepts a valid email', () => {
      const result = forgotPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty email', () => {
      const result = forgotPasswordSchema.safeParse({ email: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find((i) => i.path[0] === 'email');
        expect(emailError?.message).toBe('emailRequired');
      }
    });

    it('rejects invalid email format - missing @', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'notanemail' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find((i) => i.path[0] === 'email');
        expect(emailError?.message).toBe('emailInvalid');
      }
    });

    it('rejects invalid email format - missing domain', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'test@' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format - missing local part', () => {
      const result = forgotPasswordSchema.safeParse({ email: '@example.com' });
      expect(result.success).toBe(false);
    });
  });
});
