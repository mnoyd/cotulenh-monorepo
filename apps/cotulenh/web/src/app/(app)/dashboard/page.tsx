import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Bảng điều khiển',
  description: 'Điểm vào chính của người chơi CoTuLenh.'
};

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Bảng điều khiển đang được hoàn thiện"
      description="Người dùng đã đăng nhập hiện được chuyển tới đúng URL bảng điều khiển. Nội dung dashboard đầy đủ sẽ được xây ở story dashboard."
      primaryAction={{ href: '/', label: 'Về trang chủ' }}
      secondaryAction={{ href: '/learn', label: 'Khám phá khu học chơi' }}
    />
  );
}
