import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { Sidebar } from '@/components/layout/sidebar';

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <BottomTabBar />
      <main className="lg:ml-[48px] pb-[56px] lg:pb-0">{children}</main>
    </>
  );
}
