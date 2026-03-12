import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Chơi',
  description: 'Sảnh tìm đối thủ đang được hoàn thiện.'
};

export default function PlayPage() {
  return (
    <PlaceholderPage
      title="Sảnh chơi đang được hoàn thiện"
      description="Bạn sẽ sớm có thể tạo và nhận thách đấu trực tiếp từ màn hình này."
      primaryAction={{ href: '/dashboard', label: 'Về bảng điều khiển' }}
      secondaryAction={{ href: '/learn', label: 'Tiếp tục học chơi' }}
    />
  );
}
