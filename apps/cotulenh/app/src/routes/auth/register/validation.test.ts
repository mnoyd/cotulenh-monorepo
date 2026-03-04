import { describe, it, expect } from 'vitest';
import { registerSchema } from './validation';

describe('registerSchema', () => {
  const validData = {
    email: 'test@example.com',
    password: 'password123',
    displayName: 'Commander'
  };

  describe('email validation', () => {
    it('accepts a valid email', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty email', () => {
      const result = registerSchema.safeParse({ ...validData, email: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find((i) => i.path[0] === 'email');
        expect(emailError?.message).toBe('emailRequired');
      }
    });

    it('rejects invalid email format - missing @', () => {
      const result = registerSchema.safeParse({ ...validData, email: 'notanemail' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format - missing domain', () => {
      const result = registerSchema.safeParse({ ...validData, email: 'test@' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format - missing local part', () => {
      const result = registerSchema.safeParse({ ...validData, email: '@example.com' });
      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('accepts password with 8+ characters', () => {
      const result = registerSchema.safeParse({ ...validData, password: '12345678' });
      expect(result.success).toBe(true);
    });

    it('rejects password with < 8 characters', () => {
      const result = registerSchema.safeParse({ ...validData, password: '1234567' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwError = result.error.issues.find((i) => i.path[0] === 'password');
        expect(pwError?.message).toBe('passwordMinLength');
      }
    });

    it('rejects empty password', () => {
      const result = registerSchema.safeParse({ ...validData, password: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwError = result.error.issues.find((i) => i.path[0] === 'password');
        expect(pwError?.message).toBe('passwordRequired');
      }
    });

    it('accepts exactly 8 character password', () => {
      const result = registerSchema.safeParse({ ...validData, password: 'abcdefgh' });
      expect(result.success).toBe(true);
    });
  });

  describe('displayName validation', () => {
    it('accepts display name 3-50 characters', () => {
      const result = registerSchema.safeParse({ ...validData, displayName: 'Bob' });
      expect(result.success).toBe(true);
    });

    it('rejects display name < 3 characters', () => {
      const result = registerSchema.safeParse({ ...validData, displayName: 'AB' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find((i) => i.path[0] === 'displayName');
        expect(nameError?.message).toBe('displayNameMinLength');
      }
    });

    it('rejects display name > 50 characters', () => {
      const result = registerSchema.safeParse({
        ...validData,
        displayName: 'A'.repeat(51)
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find((i) => i.path[0] === 'displayName');
        expect(nameError?.message).toBe('displayNameMaxLength');
      }
    });

    it('rejects empty display name', () => {
      const result = registerSchema.safeParse({ ...validData, displayName: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find((i) => i.path[0] === 'displayName');
        expect(nameError?.message).toBe('displayNameRequired');
      }
    });

    it('accepts exactly 50 character display name', () => {
      const result = registerSchema.safeParse({
        ...validData,
        displayName: 'A'.repeat(50)
      });
      expect(result.success).toBe(true);
    });

    it('accepts exactly 3 character display name', () => {
      const result = registerSchema.safeParse({ ...validData, displayName: 'ABC' });
      expect(result.success).toBe(true);
    });

    it('normalizes whitespace in display name', () => {
      const result = registerSchema.safeParse({ ...validData, displayName: '  Commander   One  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('Commander One');
      }
    });

    it('rejects display name with blocked characters', () => {
      const result = registerSchema.safeParse({ ...validData, displayName: '<b>Commander</b>' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find((i) => i.path[0] === 'displayName');
        expect(nameError?.message).toBe('displayNameInvalidChars');
      }
    });
  });

  describe('empty fields', () => {
    it('rejects all empty fields', () => {
      const result = registerSchema.safeParse({
        email: '',
        password: '',
        displayName: ''
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
      }
    });
  });
});
