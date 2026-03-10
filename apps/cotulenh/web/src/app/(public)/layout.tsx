import { LandingNav } from '@/components/layout/landing-nav';

export default function PublicLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LandingNav />
      <main>{children}</main>
    </>
  );
}
