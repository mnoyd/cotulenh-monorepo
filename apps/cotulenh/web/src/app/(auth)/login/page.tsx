import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập để truy cập bảng điều khiển CoTuLenh.'
};

export default function LoginPage() {
  return (
    <PlaceholderPage
      title="Đăng nhập sắp sẵn sàng"
      description="Luồng đăng nhập đầy đủ sẽ được hoàn thiện ở story tiếp theo. Trang đích hiện đã tồn tại để điều hướng từ landing page không còn rơi vào 404."
      primaryAction={{ href: '/signup', label: 'Đăng ký trước' }}
      secondaryAction={{ href: '/', label: 'Về trang chủ' }}
    />
  );
}
