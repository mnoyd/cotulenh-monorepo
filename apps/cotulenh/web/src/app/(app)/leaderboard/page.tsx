import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Bảng xếp hạng',
  description: 'Xếp hạng hoạt động theo tháng.'
};

export default function LeaderboardPage() {
  return (
    <PlaceholderPage
      title="Bảng xếp hạng đang được hoàn thiện"
      description="Bảng xếp hạng theo số trận đã chơi trong tháng sẽ được hiển thị tại đây."
      primaryAction={{ href: '/dashboard', label: 'Về bảng điều khiển' }}
      secondaryAction={{ href: '/play', label: 'Tìm đối thủ ngay' }}
    />
  );
}
