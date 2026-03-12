import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Bạn bè',
  description: 'Quản lý bạn bè và thách đấu trực tiếp.'
};

export default function FriendsPage() {
  return (
    <PlaceholderPage
      title="Trang bạn bè đang được hoàn thiện"
      description="Tính năng quản lý bạn bè, trạng thái online và thách đấu sẽ xuất hiện tại đây."
      primaryAction={{ href: '/dashboard', label: 'Về bảng điều khiển' }}
      secondaryAction={{ href: '/play', label: 'Mở sảnh chơi' }}
    />
  );
}
