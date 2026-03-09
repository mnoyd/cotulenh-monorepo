import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Co Tu Lenh',
  description: 'Nền tảng Cờ Tư Lệnh trực tuyến'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
