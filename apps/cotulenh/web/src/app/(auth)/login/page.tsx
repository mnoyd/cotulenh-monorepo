import type { Metadata } from 'next';

import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập để truy cập bảng điều khiển CoTuLenh.'
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
