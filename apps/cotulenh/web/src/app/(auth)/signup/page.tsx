import type { Metadata } from 'next';

import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tạo tài khoản CoTuLenh để lưu tiến độ và chơi cùng bạn bè.'
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
