'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { loginSchema, signupSchema } from '@/lib/validators/auth';

type AuthFieldName = 'email' | 'password' | 'display_name';

type AuthValues = Partial<Record<AuthFieldName, string>>;

type AuthFieldErrors = Partial<Record<AuthFieldName, string>>;

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

function extractSignupValues(formData: FormData): Required<AuthValues> {
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
