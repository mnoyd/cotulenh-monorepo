import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tạo tài khoản CoTuLenh để lưu tiến độ và chơi cùng bạn bè.'
};

export default function SignupPage() {
  return (
    <PlaceholderPage
      title="Đăng ký sắp sẵn sàng"
      description="Luồng tạo tài khoản sẽ được hoàn thiện ở story xác thực người dùng. Trong lúc đó, liên kết từ landing page đã có điểm đến hợp lệ thay vì 404."
      primaryAction={{ href: '/', label: 'Về trang chủ' }}
      secondaryAction={{ href: '/learn', label: 'Xem khu học chơi' }}
    />
  );
}
