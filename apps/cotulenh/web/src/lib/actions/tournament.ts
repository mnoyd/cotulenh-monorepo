'use server';

import { createClient } from '@/lib/supabase/server';
import type { Tournament } from '@/lib/types/tournament';
import { tournamentIdSchema } from '@/lib/validators/tournament';

type GetTournamentsResult =
  | { success: true; data: Tournament[] }
  | { success: false; error: string };

export async function getTournaments(): Promise<GetTournamentsResult> {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Vui lòng đăng nhập' };
  }

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .in('status', ['upcoming', 'active', 'completed'])
    .order('status', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    return { success: false, error: 'Không thể tải giải đấu' };
  }

  return { success: true, data: data as Tournament[] };
}

type GetTournamentDetailResult =
  | { success: true; data: Tournament }
  | { success: false; error: string };

export async function getTournamentDetail(
  tournamentId: string
): Promise<GetTournamentDetailResult> {
  const parsed = tournamentIdSchema.safeParse({ tournamentId });
  if (!parsed.success) {
    return { success: false, error: 'ID giai dau khong hop le' };
  }

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Vui long dang nhap' };
  }

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Khong the tai giai dau' };
  }

  return { success: true, data: data as Tournament };
}

type JoinLeaveResult = { success: true } | { success: false; error: string };

export async function joinTournament(tournamentId: string): Promise<JoinLeaveResult> {
  const parsed = tournamentIdSchema.safeParse({ tournamentId });
  if (!parsed.success) {
    return { success: false, error: 'ID giải đấu không hợp lệ' };
  }

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Vui lòng đăng nhập' };
  }

  const { error } = await supabase.from('tournament_participants').insert({
    tournament_id: tournamentId,
    user_id: user.id
  });

  if (error) {
    return { success: false, error: 'Không thể tham gia giải đấu' };
  }

  return { success: true };
}

export async function leaveTournament(tournamentId: string): Promise<JoinLeaveResult> {
  const parsed = tournamentIdSchema.safeParse({ tournamentId });
  if (!parsed.success) {
    return { success: false, error: 'ID giải đấu không hợp lệ' };
  }

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Vui lòng đăng nhập' };
  }

  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Không thể rời giải đấu' };
  }

  return { success: true };
}
