'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import {
  loginSchema,
  resetRequestSchema,
  signupSchema,
  updatePasswordSchema
} from '@/lib/validators/auth';

type AuthFieldName = 'email' | 'password' | 'display_name' | 'confirm_password';

type AuthValues = Partial<Record<AuthFieldName, string>>;

type AuthFieldErrors = Partial<Record<AuthFieldName, string>>;

type SignupValues = Pick<Required<AuthValues>, 'email' | 'password' | 'display_name'>;

export type AuthActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: AuthFieldErrors;
  values?: AuthValues;
};

export const initialAuthActionState: AuthActionState = {
  success: false
};

export async function signup(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const values = extractSignupValues(formData);
  const parsed = signupSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Vui lòng kiểm tra lại thông tin.',
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
      values
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.display_name
      }
    }
  });

  if (error) {
    return {
      success: false,
      error: mapSignupError(error),
      values
    };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function login(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const values = extractLoginValues(formData);
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Vui lòng kiểm tra lại thông tin.',
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
      values
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error) {
    return {
      success: false,
      error: mapLoginError(error),
      values
    };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

function extractSignupValues(formData: FormData): SignupValues {
  return {
    email: getString(formData.get('email')),
    password: getString(formData.get('password')),
    display_name: getString(formData.get('display_name'))
  };
}

function extractLoginValues(formData: FormData): Pick<Required<AuthValues>, 'email' | 'password'> {
  return {
    email: getString(formData.get('email')),
    password: getString(formData.get('password'))
  };
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : '';
}

function flattenFieldErrors(
  fieldErrors: Partial<Record<AuthFieldName, string[] | undefined>>
): AuthFieldErrors {
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, errors]) => errors && errors.length > 0)
      .map(([field, errors]) => [field, errors![0]])
  ) as AuthFieldErrors;
}

function mapSignupError(error: { message?: string; status?: number; code?: string }) {
  const message = error.message?.toLowerCase() ?? '';

  if (
    error.code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already exists')
  ) {
    return 'Email đã được sử dụng';
  }

  if (error.status === 429 || message.includes('rate limit')) {
    return 'Vui lòng thử lại sau';
  }

  return 'Không thể tạo tài khoản lúc này';
}

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const values = { email: getString(formData.get('email')) };
  const parsed = resetRequestSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Vui lòng kiểm tra lại thông tin.',
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
      values
    };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  // Always call Supabase but ignore errors to prevent email enumeration
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password/update`
  });

  return { success: true };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const values = {
    password: getString(formData.get('password')),
    confirm_password: getString(formData.get('confirm_password'))
  };
  const parsed = updatePasswordSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Vui lòng kiểm tra lại thông tin.',
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
      values: { password: values.password, confirm_password: values.confirm_password }
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return {
      success: false,
      error: mapUpdatePasswordError(error),
      values: { password: values.password, confirm_password: values.confirm_password }
    };
  }

  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    return {
      success: false,
      error: 'Không thể cập nhật mật khẩu lúc này',
      values: { password: values.password, confirm_password: values.confirm_password }
    };
  }

  redirect('/login?reset=success');
}

async function getOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (siteUrl) {
    try {
      return new URL(siteUrl).origin;
    } catch {
      // Fall through to localhost when NEXT_PUBLIC_SITE_URL is invalid.
    }
  }

  return 'http://localhost:3000';
}

function mapUpdatePasswordError(error: { message?: string; status?: number; code?: string }) {
  const message = error.message?.toLowerCase() ?? '';

  if (error.status === 429 || message.includes('rate limit')) {
    return 'Vui lòng thử lại sau';
  }

  return 'Không thể cập nhật mật khẩu lúc này';
}

function mapLoginError(error: { message?: string; status?: number; code?: string }) {
  const message = error.message?.toLowerCase() ?? '';

  if (
    error.status === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'Vui lòng thử lại sau';
  }

  if (
    error.code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'Email hoặc mật khẩu không đúng';
  }

  return 'Không thể đăng nhập lúc này';
}
