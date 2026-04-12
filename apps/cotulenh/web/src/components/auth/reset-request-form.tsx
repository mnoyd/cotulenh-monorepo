'use client';

import { type ChangeEvent, type ReactNode, useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';

import { type AuthActionState, initialAuthActionState } from '@/lib/actions/auth-action-state';
import { requestPasswordReset } from '@/lib/actions/auth';
import { resetRequestSchema } from '@/lib/validators/auth';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

type ResetRequestFormProps = {
  notice?: string;
};

export function ResetRequestForm({ notice }: ResetRequestFormProps) {
  const [email, setEmail] = useState('');
  const [clientError, setClientError] = useState<string | undefined>();
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    requestPasswordReset,
    initialAuthActionState
  );

  const validation = resetRequestSchema.safeParse({ email });
  const canSubmit = email.trim() !== '' && validation.success;

  // Show confirmation after successful submission
  if (state.success) {
    return (
      <div className="w-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-6)] sm:p-[var(--space-8)]">
        <div className="space-y-[var(--space-3)]">
          <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--color-text)]">
            Kiểm tra email
          </h1>
          <div className="border border-[var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text)]">
            Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.
          </div>
        </div>
        <div className="mt-[var(--space-6)]">
          <Link href="/login" className={cn(buttonVariants({ variant: 'link' }), 'px-0 text-left')}>
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-6)] sm:p-[var(--space-8)]">
      <div className="space-y-[var(--space-3)]">
        <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--color-text)]">
          Quên mật khẩu
        </h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-muted)]">
          Nhập email để nhận liên kết đặt lại mật khẩu.
        </p>
        {notice ? (
          <p
            role="status"
            className="border border-[var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text)]"
          >
            {notice}
          </p>
        ) : null}
      </div>

      <form action={formAction} className="mt-[var(--space-6)] space-y-[var(--space-4)]">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setEmail(e.currentTarget.value);
            setClientError(undefined);
          }}
          onBlur={() => {
            const result = resetRequestSchema.safeParse({ email });
            setClientError(
              result.success
                ? undefined
                : result.error.issues.find((i) => i.path[0] === 'email')?.message
            );
          }}
          error={clientError ?? (state.fieldErrors?.email || undefined)}
        />

        {state.error && !state.fieldErrors ? (
          <p
            role="alert"
            className="border border-[var(--color-error)] bg-[color:color-mix(in_srgb,var(--color-error)_10%,transparent)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-error)]"
          >
            {state.error}
          </p>
        ) : null}

        <SubmitButton disabled={!canSubmit}>Gửi liên kết đặt lại</SubmitButton>
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
