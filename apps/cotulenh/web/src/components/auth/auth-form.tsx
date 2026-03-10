'use client';

import {
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useActionState,
  useState
} from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';

import { type AuthActionState, initialAuthActionState, login, signup } from '@/lib/actions/auth';
import { loginSchema, signupSchema } from '@/lib/validators/auth';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

type AuthMode = 'login' | 'signup';

type AuthFormProps = {
  mode: AuthMode;
};

type FormValues = {
  email: string;
  password: string;
  display_name: string;
};

const defaultValues: FormValues = {
  email: '',
  password: '',
  display_name: ''
};

export function AuthForm({ mode }: AuthFormProps) {
  const [values, setValues] = useState<FormValues>(defaultValues);
  const [clientErrors, setClientErrors] = useState<Partial<FormValues>>({});
  const action = mode === 'signup' ? signup : login;
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    action,
    initialAuthActionState
  );
  const isSignup = mode === 'signup';
  const validation = isSignup
    ? signupSchema.safeParse(values)
    : loginSchema.safeParse({
        email: values.email,
        password: values.password
      });
  const isValid = validation.success;
  const isComplete = isSignup
    ? values.email.trim() !== '' && values.password !== '' && values.display_name.trim() !== ''
    : values.email.trim() !== '' && values.password !== '';
  const canSubmit = isComplete && isValid;
  const showFormError =
    Boolean(state.error) && !state.fieldErrors && hasMatchingValues(state.values, values);

  return (
    <div className="w-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-6)] sm:p-[var(--space-8)]">
      <div className="space-y-[var(--space-3)]">
        <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--color-text)]">
          {isSignup ? 'Đăng ký' : 'Đăng nhập'}
        </h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-muted)]">
          {isSignup
            ? 'Tạo tài khoản để chơi cùng bạn bè và lưu tiến độ học.'
            : 'Đăng nhập để vào bảng điều khiển CoTuLenh.'}
        </p>
      </div>

      <form action={formAction} className="mt-[var(--space-6)] space-y-[var(--space-4)]">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange(setValues, setClientErrors)}
          onBlur={() => validateField(mode, 'email', values, setClientErrors)}
          error={getFieldError('email', values, clientErrors, state)}
        />
        <Input
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={values.password}
          onChange={handleChange(setValues, setClientErrors)}
          onBlur={() => validateField(mode, 'password', values, setClientErrors)}
          error={getFieldError('password', values, clientErrors, state)}
        />
        {isSignup ? (
          <Input
            label="Tên hiển thị"
            name="display_name"
            type="text"
            autoComplete="nickname"
            maxLength={30}
            value={values.display_name}
            onChange={handleChange(setValues, setClientErrors)}
            onBlur={() => validateField(mode, 'display_name', values, setClientErrors)}
            error={getFieldError('display_name', values, clientErrors, state)}
          />
        ) : null}

        {showFormError ? (
          <p
            role="alert"
            className="border border-[var(--color-error)] bg-[color:color-mix(in_srgb,var(--color-error)_10%,transparent)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-error)]"
          >
            {state.error}
          </p>
        ) : null}

        <SubmitButton disabled={!canSubmit}>{isSignup ? 'Đăng ký' : 'Đăng nhập'}</SubmitButton>
      </form>

      <div className="mt-[var(--space-6)] flex flex-col items-start gap-[var(--space-3)]">
        {isSignup ? (
          <Link href="/login" className={cn(buttonVariants({ variant: 'link' }), 'px-0 text-left')}>
            Đã có tài khoản? Đăng nhập
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: 'link' }), 'px-0 text-left')}
            >
              Chưa có tài khoản? Đăng ký
            </Link>
            <Link
              href="/reset-password"
              className={cn(buttonVariants({ variant: 'link' }), 'px-0 text-left')}
            >
              Quên mật khẩu?
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={disabled || pending}>
      {pending ? 'Đang xử lý...' : children}
    </Button>
  );
}

function handleChange(
  setValues: Dispatch<SetStateAction<FormValues>>,
  setClientErrors: Dispatch<SetStateAction<Partial<FormValues>>>
) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value
    }));
    setClientErrors((currentErrors) => ({
      ...currentErrors,
      [name]: undefined
    }));
  };
}

function validateField(
  mode: AuthMode,
  field: keyof FormValues,
  values: FormValues,
  setClientErrors: Dispatch<SetStateAction<Partial<FormValues>>>
) {
  const result =
    mode === 'signup'
      ? signupSchema.safeParse(values)
      : loginSchema.safeParse({
          email: values.email,
          password: values.password
        });

  const message = result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;

  setClientErrors((currentErrors) => ({
    ...currentErrors,
    [field]: message
  }));
}

function getFieldError(
  field: keyof FormValues,
  values: FormValues,
  clientErrors: Partial<FormValues>,
  state: AuthActionState
) {
  if (clientErrors[field]) {
    return clientErrors[field];
  }

  if (!state.values || state.values[field] !== values[field]) {
    return undefined;
  }

  return state.fieldErrors?.[field];
}

function hasMatchingValues(stateValues: AuthActionState['values'], values: FormValues) {
  if (!stateValues) {
    return false;
  }

  return (
    stateValues.email === values.email &&
    stateValues.password === values.password &&
    (stateValues.display_name ?? '') === values.display_name
  );
}
