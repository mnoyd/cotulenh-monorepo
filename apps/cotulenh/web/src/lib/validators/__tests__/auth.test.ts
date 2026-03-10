import { describe, expect, it } from 'vitest';

import { loginSchema, signupSchema } from '@/lib/validators/auth';

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
});
