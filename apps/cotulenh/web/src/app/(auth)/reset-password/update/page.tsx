import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { UpdatePasswordForm } from '@/components/auth/update-password-form';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Đặt mật khẩu mới',
  description: 'Nhập mật khẩu mới cho tài khoản CoTuLenh.'
};

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/reset-password?reason=session_required');
  }

  return <UpdatePasswordForm />;
}
