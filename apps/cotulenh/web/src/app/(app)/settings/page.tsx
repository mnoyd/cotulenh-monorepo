import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Cài đặt',
  description: 'Thiết lập cá nhân và tùy chọn hiển thị.'
};

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Trang cài đặt đang được hoàn thiện"
      description="Bạn sẽ sớm có thể chỉnh giao diện, hành vi trận đấu và tùy chọn tài khoản tại đây."
      primaryAction={{ href: '/dashboard', label: 'Về bảng điều khiển' }}
      secondaryAction={{ href: '/play', label: 'Mở sảnh chơi' }}
    />
  );
}
