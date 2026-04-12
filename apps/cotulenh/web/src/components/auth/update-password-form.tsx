'use client';

import { type ChangeEvent, type ReactNode, useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';

import { type AuthActionState, initialAuthActionState } from '@/lib/actions/auth-action-state';
import { updatePassword } from '@/lib/actions/auth';
import { updatePasswordSchema } from '@/lib/validators/auth';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

type FieldName = 'password' | 'confirm_password';

export function UpdatePasswordForm() {
  const [values, setValues] = useState({ password: '', confirm_password: '' });
  const [clientErrors, setClientErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    updatePassword,
    initialAuthActionState
  );

  const validation = updatePasswordSchema.safeParse(values);
  const canSubmit = values.password !== '' && values.confirm_password !== '' && validation.success;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.currentTarget;
    setValues((prev) => ({ ...prev, [name]: value }));
    setClientErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validateField(field: FieldName) {
    const result = updatePasswordSchema.safeParse(values);
    const message = result.success
      ? undefined
      : result.error.issues.find((i) => i.path[0] === field)?.message;
    setClientErrors((prev) => ({ ...prev, [field]: message }));
  }

  function getFieldError(field: FieldName) {
    if (clientErrors[field]) return clientErrors[field];
    return state.fieldErrors?.[field] || undefined;
  }

  return (
    <div className="w-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-6)] sm:p-[var(--space-8)]">
      <div className="space-y-[var(--space-3)]">
        <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--color-text)]">
          Đặt mật khẩu mới
        </h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-muted)]">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>
      </div>

      <form action={formAction} className="mt-[var(--space-6)] space-y-[var(--space-4)]">
        <Input
          label="Mật khẩu mới"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          onBlur={() => validateField('password')}
          error={getFieldError('password')}
        />
        <Input
          label="Xác nhận mật khẩu"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          value={values.confirm_password}
          onChange={handleChange}
          onBlur={() => validateField('confirm_password')}
          error={getFieldError('confirm_password')}
        />

        {state.error && !state.fieldErrors ? (
          <p
            role="alert"
            className="border border-[var(--color-error)] bg-[color:color-mix(in_srgb,var(--color-error)_10%,transparent)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-error)]"
          >
            {state.error}
          </p>
        ) : null}

        <SubmitButton disabled={!canSubmit}>Cập nhật mật khẩu</SubmitButton>
      </form>

      <div className="mt-[var(--space-6)]">
        <Link href="/login" className={cn(buttonVariants({ variant: 'link' }), 'px-0 text-left')}>
          Quay lại đăng nhập
        </Link>
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
