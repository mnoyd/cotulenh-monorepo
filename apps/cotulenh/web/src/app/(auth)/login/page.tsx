import type { Metadata } from 'next';

import { AuthForm } from '@/components/auth/auth-form';
import { ResetSuccessBanner } from '@/components/auth/reset-success-banner';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập để truy cập bảng điều khiển CoTuLenh.'
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;
  const showResetSuccess = params.reset === 'success';

  return (
    <>
      {showResetSuccess ? <ResetSuccessBanner /> : null}
      <AuthForm mode="login" />
    </>
  );
}
