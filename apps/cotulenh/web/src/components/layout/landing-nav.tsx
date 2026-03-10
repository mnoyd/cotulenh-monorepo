import Link from 'next/link';

export function LandingNav() {
  return (
    <nav
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-4)]"
      aria-label="Điều hướng chính"
    >
      <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-[var(--text-lg)] font-bold text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          CoTuLenh
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-[var(--space-4)]">
          <Link
            href="/learn"
            className="text-[var(--text-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Học
          </Link>
          <Link
            href="/login"
            className="text-[var(--text-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </nav>
  );
}
