'use client';

import { useState } from 'react';

export function ResetSuccessBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full border border-[var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-sm)] text-[var(--color-text)]">
      <div className="flex items-center justify-between">
        <span>Mật khẩu đã được cập nhật. Vui lòng đăng nhập.</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="ml-[var(--space-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          aria-label="Đóng"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
