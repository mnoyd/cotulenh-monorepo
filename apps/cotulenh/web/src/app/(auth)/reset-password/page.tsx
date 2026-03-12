import type { Metadata } from 'next';

import { ResetRequestForm } from '@/components/auth/reset-request-form';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Khôi phục quyền truy cập tài khoản CoTuLenh.'
};

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.reason === 'session_required'
      ? 'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.'
      : undefined;

  return <ResetRequestForm notice={notice} />;
}
