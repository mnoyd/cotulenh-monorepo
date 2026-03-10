import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Học Cờ Tư Lệnh',
  description: 'Khám phá luật chơi và các bài học nhập môn Cờ Tư Lệnh.'
};

export default function LearnPage() {
  return (
    <PlaceholderPage
      title="Khu học chơi đang được chuẩn bị"
      description="Các bài học tương tác sẽ xuất hiện ở đây. Trước mắt, bạn vẫn có thể khám phá trang chủ hoặc tạo tài khoản để theo dõi tiến độ khi khu học chơi hoàn thiện."
      primaryAction={{ href: '/signup', label: 'Đăng ký' }}
      secondaryAction={{ href: '/', label: 'Về trang chủ' }}
    />
  );
}
