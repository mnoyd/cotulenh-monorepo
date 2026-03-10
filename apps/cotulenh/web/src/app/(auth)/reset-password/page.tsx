import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Khôi phục quyền truy cập tài khoản CoTuLenh.'
};

export default function ResetPasswordPage() {
  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-6)] sm:p-[var(--space-8)]">
      <div className="space-y-[var(--space-3)]">
        <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--color-text)]">
          Quên mật khẩu
        </h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-muted)]">
          Luồng đặt lại mật khẩu đầy đủ sẽ được hoàn thiện ở Story 1.4. Trang này hiện đã có điểm
          đến hợp lệ để liên kết từ màn hình đăng nhập không rơi vào 404.
        </p>
      </div>
      <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-3)] sm:flex-row">
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'w-full sm:w-auto')}
        >
          Quay lại đăng nhập
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
        >
          Về trang chủ
        </Link>
      </div>
    </section>
  );
}
