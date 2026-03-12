import { describe, expect, it } from 'vitest';

import {
  loginSchema,
  resetRequestSchema,
  signupSchema,
  updatePasswordSchema
} from '@/lib/validators/auth';

describe('auth validators', () => {
  it('accepts a valid signup payload and trims the display name', () => {
    const parsed = signupSchema.safeParse({
      email: 'noy@example.com',
      password: 'matkhau123',
      display_name: '  Noy  '
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.display_name).toBe('Noy');
    }
  });

  it('returns Vietnamese signup validation messages', () => {
    const parsed = signupSchema.safeParse({
      email: 'khong-hop-le',
      password: '123',
      display_name: ''
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.email).toContain('Email không hợp lệ');
      expect(parsed.error.flatten().fieldErrors.password).toContain(
        'Mật khẩu phải có ít nhất 8 ký tự'
      );
      expect(parsed.error.flatten().fieldErrors.display_name).toContain(
        'Tên hiển thị không được để trống'
      );
    }
  });

  it('returns Vietnamese login validation messages', () => {
    const parsed = loginSchema.safeParse({
      email: 'khong-hop-le',
      password: ''
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.email).toContain('Email không hợp lệ');
      expect(parsed.error.flatten().fieldErrors.password).toContain('Vui lòng nhập mật khẩu');
    }
  });

  describe('resetRequestSchema', () => {
    it('accepts a valid email', () => {
      const parsed = resetRequestSchema.safeParse({ email: 'noy@example.com' });
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid email with Vietnamese message', () => {
      const parsed = resetRequestSchema.safeParse({ email: 'khong-hop-le' });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.email).toContain('Email không hợp lệ');
      }
    });

    it('rejects empty email', () => {
      const parsed = resetRequestSchema.safeParse({ email: '' });
      expect(parsed.success).toBe(false);
    });
  });

  describe('updatePasswordSchema', () => {
    it('accepts matching passwords with 8+ chars', () => {
      const parsed = updatePasswordSchema.safeParse({
        password: 'matkhau123',
        confirm_password: 'matkhau123'
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects password shorter than 8 chars', () => {
      const parsed = updatePasswordSchema.safeParse({
        password: '123',
        confirm_password: '123'
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.password).toContain(
          'Mật khẩu phải có ít nhất 8 ký tự'
        );
      }
    });

    it('rejects mismatched passwords', () => {
      const parsed = updatePasswordSchema.safeParse({
        password: 'matkhau123',
        confirm_password: 'matkhau456'
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        expect(fieldErrors.confirm_password).toContain('Mật khẩu không khớp');
      }
    });
  });
});
