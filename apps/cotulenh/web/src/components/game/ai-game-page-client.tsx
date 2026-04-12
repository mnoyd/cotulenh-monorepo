'use client';

import dynamic from 'next/dynamic';

const AiGameClient = dynamic(
  () => import('./ai-game-client').then((mod) => ({ default: mod.AiGameClient })),
  { ssr: false }
);

export function AiGamePageClient() {
  return <AiGameClient />;
}
