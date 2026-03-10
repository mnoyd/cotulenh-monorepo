import Link from 'next/link';

export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-6)]">
      <div className="mx-auto flex min-h-[calc(100vh-var(--space-12))] w-full max-w-[400px] flex-col justify-center">
        <header className="mb-[var(--space-6)]">
          <Link
            href="/"
            className="inline-block text-[var(--text-lg)] font-bold text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            CoTuLenh
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}
