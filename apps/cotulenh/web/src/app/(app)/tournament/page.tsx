import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import type { Tournament } from '@/lib/types/tournament';
import { TournamentList } from '@/components/tournament/tournament-list';

export const metadata: Metadata = {
  title: 'Giải đấu',
  description: 'Xem và tham gia giải đấu arena.'
};

export default async function TournamentPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tournaments')
    .select('*')
    .in('status', ['upcoming', 'active', 'completed'])
    .order('status', { ascending: true })
    .order('start_time', { ascending: true });

  const tournaments: Tournament[] = (data as Tournament[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl p-[var(--space-4)]">
      <h1 className="mb-[var(--space-4)] text-[var(--text-lg)] font-bold text-[var(--color-text)]">
        Giải đấu
      </h1>
      <TournamentList initialTournaments={tournaments} />
    </div>
  );
}
