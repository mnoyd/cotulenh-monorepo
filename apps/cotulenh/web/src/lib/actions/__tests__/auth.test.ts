import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialAuthActionState } from '../auth-action-state';

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args)
    }
  })
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  }
}));

const loadActions = () => import('../auth');

describe('auth actions', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('returns field errors for invalid signup input', async () => {
    const { signup } = await loadActions();
    const formData = new FormData();
    formData.set('email', 'sai');
    formData.set('password', '123');
    formData.set('display_name', '');

    const result = await signup(initialAuthActionState, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.email).toBe('Email không hợp lệ');
    expect(result.fieldErrors?.password).toBe('Mật khẩu phải có ít nhất 8 ký tự');
    expect(result.fieldErrors?.display_name).toBe('Tên hiển thị không được để trống');
  });

  it('maps duplicate signup errors to Vietnamese', async () => {
    mockSignUp.mockResolvedValue({
      error: {
        message: 'User already registered',
        status: 422,
        code: 'user_already_exists'
      }
    });
    const { signup } = await loadActions();
    const formData = new FormData();
    formData.set('email', 'noy@example.com');
    formData.set('password', 'matkhau123');
    formData.set('display_name', 'Noy');

    const result = await signup(initialAuthActionState, formData);

    expect(result).toEqual({
      success: false,
      error: 'Email đã được sử dụng',
      values: {
        email: 'noy@example.com',
        password: 'matkhau123',
        display_name: 'Noy'
      }
    });
  });

  it('signs up successfully and redirects to the dashboard', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    const { signup } = await loadActions();
    const formData = new FormData();
    formData.set('email', 'noy@example.com');
    formData.set('password', 'matkhau123');
    formData.set('display_name', 'Noy');

    await expect(signup(initialAuthActionState, formData)).rejects.toThrow(
      'NEXT_REDIRECT:/dashboard'
    );

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'noy@example.com',
      password: 'matkhau123',
      options: {
        data: {
          display_name: 'Noy'
        }
      }
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('maps invalid credential login errors to Vietnamese', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: {
        message: 'Invalid login credentials',
        status: 400,
        code: 'invalid_credentials'
      }
    });
    const { login } = await loadActions();
    const formData = new FormData();
    formData.set('email', 'noy@example.com');
    formData.set('password', 'sai-mat-khau');

    const result = await login(initialAuthActionState, formData);

    expect(result).toEqual({
      success: false,
      error: 'Email hoặc mật khẩu không đúng',
      values: {
        email: 'noy@example.com',
        password: 'sai-mat-khau'
      }
    });
  });

  it('maps login rate limiting to Vietnamese', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: {
        message: 'Rate limit exceeded',
        status: 429
      }
    });
    const { login } = await loadActions();
    const formData = new FormData();
    formData.set('email', 'noy@example.com');
    formData.set('password', 'matkhau123');

    const result = await login(initialAuthActionState, formData);

    expect(result.error).toBe('Vui lòng thử lại sau');
  });

  it('logs in successfully and redirects to the dashboard', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const { login } = await loadActions();
    const formData = new FormData();
    formData.set('email', 'noy@example.com');
    formData.set('password', 'matkhau123');

    await expect(login(initialAuthActionState, formData)).rejects.toThrow(
      'NEXT_REDIRECT:/dashboard'
    );

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'noy@example.com',
      password: 'matkhau123'
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  describe('requestPasswordReset', () => {
    it('returns field errors for invalid email', async () => {
      const { requestPasswordReset } = await loadActions();
      const formData = new FormData();
      formData.set('email', 'khong-hop-le');

      const result = await requestPasswordReset(initialAuthActionState, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toBe('Email không hợp lệ');
    });

    it('always returns success message regardless of email existence', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });
      const { requestPasswordReset } = await loadActions();
      const formData = new FormData();
      formData.set('email', 'noy@example.com');

      const result = await requestPasswordReset(initialAuthActionState, formData);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('noy@example.com', {
        redirectTo: expect.stringContaining('/auth/callback?next=/reset-password/update')
      });
    });

    it('returns success even when Supabase returns error (no email enumeration)', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found', status: 404 }
      });
      const { requestPasswordReset } = await loadActions();
      const formData = new FormData();
      formData.set('email', 'khong-ton-tai@example.com');

      const result = await requestPasswordReset(initialAuthActionState, formData);

      expect(result.success).toBe(true);
    });

    it('uses NEXT_PUBLIC_SITE_URL as redirect origin when configured', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://cotulenh.vn';
      mockResetPasswordForEmail.mockResolvedValue({ error: null });
      const { requestPasswordReset } = await loadActions();
      const formData = new FormData();
      formData.set('email', 'noy@example.com');

      const result = await requestPasswordReset(initialAuthActionState, formData);

      expect(result.success).toBe(true);
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('noy@example.com', {
        redirectTo: 'https://cotulenh.vn/auth/callback?next=/reset-password/update'
      });
    });
  });

  describe('updatePassword', () => {
    it('returns field errors for mismatched passwords', async () => {
      const { updatePassword } = await loadActions();
      const formData = new FormData();
      formData.set('password', 'matkhau123');
      formData.set('confirm_password', 'matkhau456');

      const result = await updatePassword(initialAuthActionState, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.confirm_password).toBe('Mật khẩu không khớp');
    });

    it('updates password and redirects to login with success', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      const { updatePassword } = await loadActions();
      const formData = new FormData();
      formData.set('password', 'matkhaumoi123');
      formData.set('confirm_password', 'matkhaumoi123');

      await expect(updatePassword(initialAuthActionState, formData)).rejects.toThrow(
        'NEXT_REDIRECT:/login?reset=success'
      );

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'matkhaumoi123' });
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('returns Vietnamese error on Supabase failure', async () => {
      mockUpdateUser.mockResolvedValue({
        error: { message: 'Auth session missing', status: 401 }
      });
      const { updatePassword } = await loadActions();
      const formData = new FormData();
      formData.set('password', 'matkhaumoi123');
      formData.set('confirm_password', 'matkhaumoi123');

      const result = await updatePassword(initialAuthActionState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Không thể cập nhật mật khẩu lúc này');
    });

    it('returns error when sign-out fails after update', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      mockSignOut.mockResolvedValue({ error: { message: 'Sign out failed', status: 500 } });
      const { updatePassword } = await loadActions();
      const formData = new FormData();
      formData.set('password', 'matkhaumoi123');
      formData.set('confirm_password', 'matkhaumoi123');

      const result = await updatePassword(initialAuthActionState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Không thể cập nhật mật khẩu lúc này');
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
