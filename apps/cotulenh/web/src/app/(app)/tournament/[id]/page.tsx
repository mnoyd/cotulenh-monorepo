import { createClient } from '@/lib/supabase/server';
import type { Tournament } from '@/lib/types/tournament';

import { TournamentDetailClient } from './tournament-detail-client';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', id).single();

  if (!tournament) {
    return (
      <div className="p-[var(--space-6)]">
        <p className="text-[var(--color-text-muted)]">Khong tim thay giai dau</p>
      </div>
    );
  }

  return <TournamentDetailClient tournament={tournament as Tournament} currentUserId={user?.id} />;
}
